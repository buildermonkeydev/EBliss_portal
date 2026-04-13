// src/invoice/invoice.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import moment from 'moment';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly invoiceDir: string;

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private notificationService: NotificationService,
    private walletService: WalletService,
  ) {
    this.invoiceDir = path.join(process.cwd(), 'uploads', 'invoices');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
    }
  }


  @Cron('0 0 1 * *') // Run on 1st of every month at midnight
  async autoGenerateMonthlyInvoices() {
    this.logger.log('Auto-generating monthly invoices for all users');
    
    const { startDate, endDate } = this.getPreviousMonthRange();
    const users = await this.getUsersWithActivity(startDate);
    
    let generated = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.generateMonthlyInvoice(user.id, startDate);
        generated++;
      } catch (error) {
        this.logger.error(`Failed to generate invoice for user ${user.id}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Monthly invoices generated: ${generated} success, ${failed} failed`);
    return { generated, failed };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDueInvoices() {
    const dueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'pending',
        due_date: { lt: new Date() },
      },
      include: { user: true },
    });

    for (const invoice of dueInvoices) {
      await this.processDueInvoice(invoice);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async sendUpcomingInvoiceReminders() {
    const upcomingInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'pending',
        due_date: {
          lte: moment().add(3, 'days').toDate(),
          gte: new Date(),
        },
      },
      include: { user: true },
    });

    for (const invoice of upcomingInvoices) {
      await this.notificationService.sendInvoiceReminder(
        invoice.user_id,
        invoice.id,
        invoice.total.toNumber(),
        invoice.due_date,
      );
    }
  }

  // ============ MAIN BUSINESS LOGIC ============

  async generateMonthlyInvoice(userId: number, date?: Date): Promise<any> {
    const { startDate, endDate } = this.getMonthRange(date);
    
    this.logger.log(`Generating invoice for user ${userId} for period ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const existingInvoice = await this.findExistingInvoice(userId, startDate, endDate);
    if (existingInvoice) {
      this.logger.log(`Invoice already exists for user ${userId}`);
      return existingInvoice;
    }

    const user = await this.getUserWithDetails(userId);
    const transactions = await this.getMonthlyTransactions(userId, startDate, endDate);

    if (transactions.length === 0) {
      this.logger.log(`No transactions found for user ${userId}`);
      return null;
    }

    const { subtotal, taxAmount, total } = this.calculateInvoiceAmounts(transactions, user.tax_rate);
    const items = await this.buildInvoiceItems(transactions);
    const vmSummary = this.buildVMSummary(items);

    const invoice = await this.createInvoiceRecord(userId, {
      invoiceNumber: this.generateInvoiceNumber(userId, startDate),
      items,
      vmSummary,
      period: { start: startDate, end: endDate },
      userDetails: this.getUserDetails(user),
      subtotal,
      taxRate: user.tax_rate || 18,
      taxAmount,
      total,
      dueDate: new Date(endDate.getTime() + 15 * 24 * 60 * 60 * 1000),
      periodStart: startDate,
      periodEnd: endDate,
    });

    const pdfUrl = await this.generatePDF(invoice, user);
    await this.updateInvoicePdfUrl(invoice.id, pdfUrl);
    await this.sendInvoiceEmail(user, invoice);

    this.eventEmitter.emit('invoice.generated', {
      userId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      total: invoice.total.toNumber(),
    });

    return invoice;
  }

  async getAllInvoices(
    userId?: number,
    page: number = 1,
    limit: number = 50,
    status?: string,
    fromDate?: Date,
    toDate?: Date,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where = this.buildInvoiceWhereClause(userId, status, fromDate, toDate);

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { user: { select: { full_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices: this.formatInvoices(invoices),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getInvoiceById(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { user: { select: { full_name: true, email: true, company: true, tax_id: true, address: true, city: true, state: true, country: true, postal_code: true } } },
    });
    
    if (!invoice) throw new NotFoundException('Invoice not found');
    
    return this.formatInvoice(invoice);
  }

  async updateInvoiceStatus(id: number, status: string, adminId?: number) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { 
        status: status as InvoiceStatus,
        paid_at: status === 'paid' ? new Date() : undefined,
      },
    });
    
    this.eventEmitter.emit('invoice.status.updated', { invoiceId: id, status, adminId });
    
    if (status === 'paid') {
      await this.handlePaidInvoice(invoice);
    }
    
    return invoice;
  }

  async voidInvoice(id: number, adminId: number, reason: string) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'voided' as InvoiceStatus },
    });
    
    await this.logAdminAction(adminId, 'INVOICE_VOIDED', id, { reason });
    this.logger.log(`Invoice ${id} voided by admin ${adminId}. Reason: ${reason}`);
    
    return invoice;
  }

  async resendInvoice(id: number, adminId: number) {
    const invoice = await this.getInvoiceById(id);
    const user = await this.prisma.user.findUnique({ where: { id: invoice.user_id } });
    
    if (user) {
      await this.sendInvoiceEmail(user, invoice);
    }
    
    await this.logAdminAction(adminId, 'INVOICE_RESENT', id);
    
    return { success: true, message: 'Invoice email resent' };
  }

  async getInvoiceStats(fromDate?: Date, toDate?: Date) {
    const where = this.buildDateWhereClause(fromDate, toDate);

    const stats = await this.prisma.invoice.groupBy({
      by: ['status'],
      where,
      _sum: { total: true },
      _count: true,
    });

    const totalAmount = await this.prisma.invoice.aggregate({
      where,
      _sum: { total: true },
    });

    const monthlyRevenue = await this.getMonthlyRevenue(fromDate, toDate);

    return {
      summary: {
        total_invoices: stats.reduce((sum, s) => sum + s._count, 0),
        total_amount: totalAmount._sum.total?.toNumber() || 0,
        by_status: stats.map(s => ({
          status: s.status,
          count: s._count,
          total: s._sum.total?.toNumber() || 0,
        })),
      },
      monthly_revenue: monthlyRevenue,
    };
  }
// src/invoice/invoice.service.ts

async createCustomInvoice(
  data: {
    user_id: number;
    items: Array<{ description: string; quantity: number; unit_price: number }>;
    tax_rate?: number;
    due_date?: string;
  },
  adminId: number,
) {
  const user = await this.prisma.user.findUnique({
    where: { id: data.user_id },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxRate = data.tax_rate ?? user.tax_rate ?? 18;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // FIX: Pass userId and date to generateInvoiceNumber
  const invoiceNumber = this.generateCustomInvoiceNumber(data.user_id, new Date());

  const invoice = await this.prisma.invoice.create({
    data: {
      user_id: data.user_id,
      invoice_number: invoiceNumber,
      items_json: {
        transactions: data.items.map((item, index) => ({
          id: `custom-${index}`,
          date: new Date(),
          description: item.description,
          amount: item.quantity * item.unit_price,
          quantity: item.quantity,
          unit_price: item.unit_price,
          type: 'custom',
        })),
        vm_summary: [],
        period: {
          start: new Date(),
          end: data.due_date ? new Date(data.due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        user_details: this.getUserDetails(user),
        type: 'custom',
      },
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status: 'pending',
      due_date: data.due_date ? new Date(data.due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await this.prisma.auditLog.create({
    data: {
      admin_id: adminId,
      action: 'INVOICE_CREATED',
      target_type: 'invoice',
      target_id: invoice.id.toString(),
      payload_json: { user_id: data.user_id, amount: total },
      ip: 'admin_action',
    },
  });

  this.logger.log(`Custom invoice created for user ${data.user_id} by admin ${adminId}`);

  return invoice;
}

// Add this helper method
private generateCustomInvoiceNumber(userId: number, date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const userSuffix = userId.toString().padStart(4, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CUST-${year}${month}${day}-${userSuffix}-${random}`;
}

// Also fix the sendPaymentReminder method
async sendPaymentReminder(invoiceId: number) {
  const invoice = await this.prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { user: true },
  });

  if (!invoice) {
    throw new NotFoundException('Invoice not found');
  }

  // Send reminder email
  await this.notificationService.sendEmail(
    invoice.user.email,
    `Payment Reminder: Invoice ${invoice.invoice_number}`,
    'invoice_reminder',
    {
      name: invoice.user.full_name || invoice.user.email,
      invoice_number: invoice.invoice_number,
      amount: invoice.total.toNumber().toFixed(2),
      due_date: new Date(invoice.due_date).toLocaleDateString(),
      invoice_url: `${process.env.APP_URL}/invoices/${invoice.id}`,
    },
  );

  this.logger.log(`Payment reminder sent for invoice ${invoiceId}`);

  return { success: true, message: 'Reminder sent successfully' };
}

async generatePDF(invoice: any, user?: any): Promise<string> {
    const fileName = `invoice_${invoice.id}_${invoice.user_id}.pdf`;
    const filePath = path.join(this.invoiceDir, fileName);
    const pdfUrl = `/uploads/invoices/${fileName}`;

    const userDetails = user || await this.prisma.user.findUnique({
      where: { id: invoice.user_id },
    });

    const items = invoice.items_json?.transactions || [];
    const vmSummary = invoice.items_json?.vm_summary || [];
    const html = this.generateInvoiceHTML(invoice, userDetails, items, vmSummary);
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      await browser.close();
      
      return pdfUrl;
    } catch (error) {
      this.logger.error(`PDF generation failed: ${error.message}`);
      return '';
    }
  }

  async sendInvoiceEmail(user: any, invoice: any) {
    const subject = `Your Invoice #${invoice.invoice_number} from eBliss Cloud`;
    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_number: invoice.invoice_number,
      amount: invoice.total.toNumber(),
      due_date: new Date(invoice.due_date).toLocaleDateString(),
      invoice_url: `${process.env.APP_URL}/invoices/${invoice.id}`,
      pdf_url: invoice.pdf_url,
    };
    
    await this.notificationService.sendEmail(user.email, subject, 'invoice', data);
  }

  async generateAllMonthlyInvoices() {
    return this.autoGenerateMonthlyInvoices();
  }

  // ============ TESTING METHODS ============

  @Cron('0 * * * *') // Every hour for testing - REMOVE IN PRODUCTION
  async testHourlyInvoiceGeneration() {
    if (process.env.NODE_ENV === 'production') return;
    
    this.logger.log('TEST: Hourly invoice generation triggered');
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const usersWithTransactions = await this.prisma.user.findMany({
      where: {
        transactions: {
          some: {
            created_at: { gte: startOfDay, lte: endOfDay },
            type: 'debit',
          },
        },
      },
      distinct: ['id'],
    });
    
    for (const user of usersWithTransactions) {
      await this.generateDailyInvoice(user.id, startOfDay, endOfDay);
    }
    
    this.logger.log(`TEST: Generated ${usersWithTransactions.length} test invoices`);
  }

  async generateDailyInvoice(userId: number, startDate: Date, endDate: Date): Promise<any> {
    this.logger.log(`Generating daily test invoice for user ${userId}`);
    
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        user_id: userId,
        billing_period_start: startDate,
        billing_period_end: endDate,
      },
    });
    
    if (existingInvoice) {
      return existingInvoice;
    }
    
    const user = await this.getUserWithDetails(userId);
    const transactions = await this.getDailyTransactions(userId, startDate, endDate);
    
    if (transactions.length === 0) return null;
    
    const { subtotal, taxAmount, total } = this.calculateInvoiceAmounts(transactions, user.tax_rate);
    const items = await this.buildInvoiceItems(transactions);
    const vmSummary = this.buildVMSummary(items);
    
    const invoice = await this.createInvoiceRecord(userId, {
      invoiceNumber: this.generateTestInvoiceNumber(userId, startDate),
      items,
      vmSummary,
      period: { start: startDate, end: endDate },
      userDetails: this.getUserDetails(user),
      subtotal,
      taxRate: user.tax_rate || 18,
      taxAmount,
      total,
      dueDate: new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      periodStart: startDate,
      periodEnd: endDate,
    });
    
    const pdfUrl = await this.generatePDF(invoice, user);
    await this.updateInvoicePdfUrl(invoice.id, pdfUrl);
    
    return invoice;
  }

  async generateFirstInvoice(userId: number): Promise<any> {
    this.logger.log(`Generating first invoice for user ${userId}`);
    
    const user = await this.getUserWithDetails(userId);
    
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
    
    if (existingInvoice) return null;
    
    const now = new Date();
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    
    const items = [{
      id: 'welcome',
      date: now,
      description: `Welcome to eBliss Cloud - Account created`,
      amount: 0,
      vm_name: 'Account Setup',
      type: 'welcome',
    }];
    
    const invoice = await this.prisma.invoice.create({
      data: {
        user_id: userId,
        invoice_number: this.generateWelcomeInvoiceNumber(userId, now),
        items_json: {
          transactions: items,
          vm_summary: [],
          period: { start: now, end: nextMonthEnd },
          user_details: this.getUserDetails(user),
          type: 'welcome',
        },
        subtotal: 0,
        tax_rate: user.tax_rate || 18,
        tax_amount: 0,
        total: 0,
        status: 'paid',
        due_date: nextMonthEnd,
        billing_period_start: now,
        billing_period_end: nextMonthEnd,
        paid_at: now,
      },
    });
    
    const pdfUrl = await this.generatePDF(invoice, user);
    await this.updateInvoicePdfUrl(invoice.id, pdfUrl);
    await this.sendWelcomeInvoiceEmail(user, invoice);
    
    return invoice;
  }

  async generatePaymentInvoice(userId: number, paymentData: {
    amount: number;
    paymentId: string;
    paymentMethod: string;
    description?: string;
  }): Promise<any> {
    this.logger.log(`Generating payment invoice for user ${userId}`);
    
    const user = await this.getUserWithDetails(userId);
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const items = [{
      id: paymentData.paymentId,
      date: now,
      description: paymentData.description || `Wallet top-up via ${paymentData.paymentMethod}`,
      amount: paymentData.amount,
      payment_id: paymentData.paymentId,
      payment_method: paymentData.paymentMethod,
      type: 'payment',
    }];
    
    const subtotal = paymentData.amount;
    const taxRate = user.tax_rate || 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    
    const invoice = await this.prisma.invoice.create({
      data: {
        user_id: userId,
        invoice_number: this.generatePaymentInvoiceNumber(userId, now, paymentData.paymentId),
        items_json: {
          transactions: items,
          vm_summary: [],
          period: { start: now, end: endOfMonth },
          user_details: this.getUserDetails(user),
          payment_details: {
            payment_id: paymentData.paymentId,
            payment_method: paymentData.paymentMethod,
            amount: paymentData.amount,
          },
        },
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,
        status: 'paid',
        due_date: endOfMonth,
        billing_period_start: now,
        billing_period_end: endOfMonth,
        paid_at: now,
      },
    });
    
    const pdfUrl = await this.generatePDF(invoice, user);
    await this.updateInvoicePdfUrl(invoice.id, pdfUrl);
    await this.sendPaymentInvoiceEmail(user, invoice, paymentData);
    
    return invoice;
  }

  async generateSubscriptionStartInvoice(userId: number, subscriptionData: {
    planName: string;
    amount: number;
    vmId?: number;
    billingCycle: 'monthly' | 'yearly';
  }): Promise<any> {
    this.logger.log(`Generating subscription start invoice for user ${userId}`);
    
    const user = await this.getUserWithDetails(userId);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const endDate = subscriptionData.billingCycle === 'monthly' ? nextMonth : nextYear;
    
    const items = [{
      id: subscriptionData.vmId || 'subscription',
      date: now,
      description: `${subscriptionData.planName} - ${subscriptionData.billingCycle} subscription`,
      amount: subscriptionData.amount,
      billing_cycle: subscriptionData.billingCycle,
      type: 'subscription_start',
    }];
    
    const subtotal = subscriptionData.amount;
    const taxRate = user.tax_rate || 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    
    const invoice = await this.prisma.invoice.create({
      data: {
        user_id: userId,
        invoice_number: this.generateSubscriptionInvoiceNumber(userId, now, subscriptionData.billingCycle),
        items_json: {
          transactions: items,
          vm_summary: [],
          period: { start: now, end: endDate },
          user_details: this.getUserDetails(user),
          subscription_details: {
            plan_name: subscriptionData.planName,
            billing_cycle: subscriptionData.billingCycle,
            vm_id: subscriptionData.vmId,
          },
        },
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,
        status: 'paid',
        due_date: endDate,
        billing_period_start: now,
        billing_period_end: endDate,
        paid_at: now,
      },
    });
    
    const pdfUrl = await this.generatePDF(invoice, user);
    await this.updateInvoicePdfUrl(invoice.id, pdfUrl);
    await this.sendSubscriptionInvoiceEmail(user, invoice, subscriptionData);
    
    return invoice;
  }

  // ============ PRIVATE HELPER METHODS ============

  private getPreviousMonthRange(): { startDate: Date; endDate: Date } {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    return { startDate, endDate };
  }

  private getMonthRange(date?: Date): { startDate: Date; endDate: Date } {
    const targetDate = date || new Date();
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
    return { startDate, endDate };
  }

  private async getUsersWithActivity(startDate: Date) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { vms: { some: { terminated_at: null } } },
          { transactions: { some: { created_at: { gte: startDate } } } }
        ],
      },
      distinct: ['id'],
    });
  }

  private async findExistingInvoice(userId: number, startDate: Date, endDate: Date) {
    return this.prisma.invoice.findFirst({
      where: {
        user_id: userId,
        billing_period_start: startDate,
        billing_period_end: endDate,
      },
    });
  }

  private async getUserWithDetails(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        company: true,
        tax_id: true,
        tax_rate: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postal_code: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async getMonthlyTransactions(userId: number, startDate: Date, endDate: Date) {
    return this.prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: 'debit',
        created_at: { gte: startDate, lte: endDate },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  private async getDailyTransactions(userId: number, startDate: Date, endDate: Date) {
    return this.prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: 'debit',
        created_at: { gte: startDate, lte: endDate },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  private async buildInvoiceItems(transactions: any[]) {
    const vmIds = [...new Set(transactions.map(t => t.ref_id).filter(id => id))];
    const vms = await this.prisma.vM.findMany({
      where: { id: { in: vmIds.map(id => parseInt(id)) } },
      select: { id: true, name: true, hourly_rate: true },
    });
    const vmMap = new Map(vms.map(v => [v.id.toString(), v]));

    return transactions.map(tx => {
      const vm = vmMap.get(tx.ref_id || '');
      return {
        id: tx.id,
        date: tx.created_at,
        description: tx.description,
        amount: Math.abs(tx.amount.toNumber()),
        vm_name: vm?.name || 'VM Service',
        hourly_rate: vm?.hourly_rate?.toNumber(),
        ref_id: tx.ref_id,
      };
    });
  }

  private buildVMSummary(items: any[]) {
    const summary: Record<string, any> = {};
    
    for (const item of items) {
      if (item.ref_id && item.vm_name) {
        if (!summary[item.ref_id]) {
          summary[item.ref_id] = {
            vm_id: item.ref_id,
            vm_name: item.vm_name,
            hourly_rate: item.hourly_rate,
            total_hours: 0,
            total_cost: 0,
          };
        }
        summary[item.ref_id].total_hours += 1;
        summary[item.ref_id].total_cost += item.amount;
      }
    }
    
    return Object.values(summary);
  }

  private calculateInvoiceAmounts(transactions: any[], taxRate: number | null) {
    const subtotal = transactions.reduce((sum, t) => sum + Math.abs(t.amount.toNumber()), 0);
    const rate = taxRate || 18;
    const taxAmount = (subtotal * rate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }

  private getUserDetails(user: any) {
    return {
      name: user.full_name,
      email: user.email,
      company: user.company,
      tax_id: user.tax_id,
      address: user.address,
      city: user.city,
      state: user.state,
      country: user.country,
      postal_code: user.postal_code,
    };
  }

  private generateInvoiceNumber(userId: number, date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const userSuffix = userId.toString().padStart(4, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${userSuffix}-${random}`;
  }

  private generateTestInvoiceNumber(userId: number, date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const userSuffix = userId.toString().padStart(4, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `TEST-${year}${month}${day}-${userSuffix}-${timestamp}`;
  }

  private generateWelcomeInvoiceNumber(userId: number, date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const userSuffix = userId.toString().padStart(4, '0');
    return `WELCOME-${year}${month}-${userSuffix}`;
  }

  private generatePaymentInvoiceNumber(userId: number, date: Date, paymentId: string): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const userSuffix = userId.toString().padStart(4, '0');
    const shortPaymentId = paymentId.slice(-8);
    return `PAY-${year}${month}-${userSuffix}-${shortPaymentId}`;
  }

  private generateSubscriptionInvoiceNumber(userId: number, date: Date, cycle: string): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const userSuffix = userId.toString().padStart(4, '0');
    const cycleCode = cycle === 'monthly' ? 'M' : 'Y';
    return `SUB-${cycleCode}-${year}${month}-${userSuffix}`;
  }

  private async createInvoiceRecord(userId: number, data: any) {
    return this.prisma.invoice.create({
      data: {
        user_id: userId,
        invoice_number: data.invoiceNumber,
        items_json: {
          transactions: data.items,
          vm_summary: data.vmSummary,
          period: data.period,
          user_details: data.userDetails,
        },
        subtotal: data.subtotal,
        tax_rate: data.taxRate,
        tax_amount: data.taxAmount,
        total: data.total,
        status: 'pending',
        due_date: data.dueDate,
        billing_period_start: data.periodStart,
        billing_period_end: data.periodEnd,
      },
    });
  }

  private async updateInvoicePdfUrl(invoiceId: number, pdfUrl: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdf_url: pdfUrl },
    });
  }

  private async processDueInvoice(invoice: any) {
    try {
      await this.walletService.debitWallet(
        invoice.user_id,
        invoice.total.toNumber(),
        `Auto-payment for invoice #${invoice.invoice_number}`,
        `invoice_${invoice.id}`,
      );
      await this.updateInvoiceStatus(invoice.id, 'paid');
      
      this.eventEmitter.emit('invoice.paid', {
        userId: invoice.user_id,
        invoiceId: invoice.id,
        amount: invoice.total,
      });
    } catch (error) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'overdue' as InvoiceStatus },
      });
      
      this.eventEmitter.emit('invoice.overdue', {
        userId: invoice.user_id,
        invoiceId: invoice.id,
        amount: invoice.total,
      });
      
      await this.notificationService.sendOverdueNotice(
        invoice.user_id,
        invoice.id,
        invoice.total.toNumber(),
      );
    }
  }

  private async handlePaidInvoice(invoice: any) {
    await this.walletService.creditWallet(
      invoice.user_id,
      invoice.total.toNumber(),
      `Payment for invoice #${invoice.invoice_number}`,
      `invoice_${invoice.id}`,
    );
    
    await this.notificationService.sendPaymentConfirmation(
      invoice.user_id,
      invoice.total.toNumber(),
      invoice.invoice_number,
    );
  }

  private async logAdminAction(adminId: number, action: string, targetId: number, metadata?: any) {
    await this.prisma.auditLog.create({
      data: {
        admin_id: adminId,
        action,
        target_type: 'invoice',
        target_id: targetId.toString(),
        payload_json: metadata || {},
        ip: 'admin_action',
      },
    });
  }

  private async getMonthlyRevenue(fromDate?: Date, toDate?: Date) {
    const where: any = { status: 'paid' };
    if (fromDate || toDate) {
      where.paid_at = {};
      if (fromDate) where.paid_at.gte = fromDate;
      if (toDate) where.paid_at.lte = toDate;
    }

    const revenue = await this.prisma.invoice.groupBy({
      by: ['paid_at'],
      where,
      _sum: { total: true },
      orderBy: { paid_at: 'desc' },
      take: 12,
    });

    return revenue.map(r => ({
      month: moment(r.paid_at).format('YYYY-MM'),
      revenue: r._sum.total?.toNumber() || 0,
    }));
  }

  private buildInvoiceWhereClause(userId?: number, status?: string, fromDate?: Date, toDate?: Date) {
    const where: any = {};
    if (userId) where.user_id = userId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = fromDate;
      if (toDate) where.created_at.lte = toDate;
    }
    return where;
  }

  private buildDateWhereClause(fromDate?: Date, toDate?: Date) {
    const where: any = {};
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = fromDate;
      if (toDate) where.created_at.lte = toDate;
    }
    return where;
  }

  private formatInvoices(invoices: any[]) {
    return invoices.map(i => this.formatInvoice(i));
  }

  private formatInvoice(invoice: any) {
    return {
      ...invoice,
      total: invoice.total.toNumber(),
      subtotal: invoice.subtotal.toNumber(),
      tax_amount: invoice.tax_amount.toNumber(),
    };
  }

  private async sendWelcomeInvoiceEmail(user: any, invoice: any) {
    const subject = `Welcome to eBliss Cloud - Your Account is Ready!`;
    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_number: invoice.invoice_number,
      message: 'Your account has been successfully created.',
      login_url: `${process.env.APP_URL}/login`,
      support_email: process.env.SUPPORT_EMAIL,
    };
    
    await this.notificationService.sendEmail(user.email, subject, 'welcome_invoice', data);
  }

  private async sendPaymentInvoiceEmail(user: any, invoice: any, paymentData: any) {
    const subject = `Payment Confirmation - Invoice #${invoice.invoice_number}`;
    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_number: invoice.invoice_number,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      payment_id: paymentData.paymentId,
      date: new Date().toLocaleDateString(),
      invoice_url: `${process.env.APP_URL}/invoices/${invoice.id}`,
    };
    
    await this.notificationService.sendEmail(user.email, subject, 'payment_invoice', data);
  }

  private async sendSubscriptionInvoiceEmail(user: any, invoice: any, subscriptionData: any) {
    const subject = `Subscription Confirmation - ${subscriptionData.planName}`;
    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_number: invoice.invoice_number,
      plan_name: subscriptionData.planName,
      amount: subscriptionData.amount,
      billing_cycle: subscriptionData.billingCycle,
      invoice_url: `${process.env.APP_URL}/invoices/${invoice.id}`,
    };
    
    await this.notificationService.sendEmail(user.email, subject, 'subscription_invoice', data);
  }

  // ============ HTML TEMPLATE ============

  private generateInvoiceHTML(invoice: any, user: any, items: any[], vmSummary: any[]): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; padding: 40px; }
        .invoice-container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .invoice-header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; }
        .invoice-header h1 { font-size: 28px; margin-bottom: 10px; }
        .invoice-header p { opacity: 0.9; font-size: 14px; }
        .invoice-body { padding: 30px; }
        .company-details { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
        .company-details h3 { color: #333; margin-bottom: 10px; }
        .company-details p { color: #666; font-size: 14px; line-height: 1.6; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .info-group p { margin: 5px 0; font-size: 14px; }
        .info-group strong { color: #333; }
        .info-group .label { color: #666; }
        .vm-summary { margin-bottom: 30px; }
        .vm-summary h3 { color: #333; margin-bottom: 15px; }
        .vm-table { width: 100%; border-collapse: collapse; }
        .vm-table th, .vm-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        .vm-table th { background: #f8f9fa; font-weight: 600; color: #555; }
        .transactions-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .transactions-table th, .transactions-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
        .transactions-table th { background: #f8f9fa; font-weight: 600; color: #555; }
        .totals { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: right; }
        .totals-row { display: flex; justify-content: flex-end; margin: 10px 0; }
        .totals-label { width: 150px; font-weight: normal; color: #666; }
        .totals-value { width: 120px; text-align: right; font-weight: bold; }
        .grand-total { font-size: 20px; color: #4F46E5; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e0e0e0; }
        .footer { text-align: center; padding: 20px 30px; background: #f8f9fa; font-size: 12px; color: #999; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-paid { background: #d4edda; color: #155724; }
        .status-overdue { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <h1>INVOICE</h1>
          <p>${invoice.invoice_number}</p>
        </div>
        
        <div class="invoice-body">
          <div class="company-details">
            <h3>eBliss Cloud</h3>
            <p>123 Cloud Street, Tech Park<br>Bangalore, India - 560001<br>support@ebliss.com | +91 80 1234 5678<br>GST: 29ABCDE1234F1Z5</p>
          </div>
          
          <div class="invoice-info">
            <div class="info-group">
              <p><span class="label">Bill To:</span></p>
              <p><strong>${user.full_name || 'N/A'}</strong></p>
              <p>${user.email || ''}</p>
              <p>${user.company || ''}</p>
              <p>${user.address || ''} ${user.city || ''} ${user.state || ''} ${user.country || ''}</p>
              <p>GST: ${user.tax_id || 'Not Registered'}</p>
            </div>
            <div class="info-group">
              <p><span class="label">Invoice Details:</span></p>
              <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
              <p><strong>Period:</strong> ${new Date(invoice.billing_period_start).toLocaleDateString()} - ${new Date(invoice.billing_period_end).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span></p>
            </div>
          </div>
          
          ${vmSummary.length > 0 ? `
          <div class="vm-summary">
            <h3>VM Usage Summary</h3>
            <table class="vm-table">
              <thead>
                <tr><th>VM Name</th><th>Hourly Rate</th><th>Hours</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${vmSummary.map((vm: any) => `
                  <tr><td>${vm.vm_name}</td><td>₹${vm.hourly_rate?.toFixed(4) || '0'}</td><td>${vm.total_hours}</td><td>₹${vm.total_cost.toFixed(2)}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <h3>Transaction Details</h3>
          <table class="transactions-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>VM</th><th>Amount</th></tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td>${new Date(item.date).toLocaleDateString()}</td>
                  <td>${item.description}</td>
                  <td>${item.vm_name || '-'}</td>
                  <td>₹${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row"><span class="totals-label">Subtotal:</span><span class="totals-value">₹${invoice.subtotal.toFixed(2)}</span></div>
            <div class="totals-row"><span class="totals-label">GST (${invoice.tax_rate}%):</span><span class="totals-value">₹${invoice.tax_amount.toFixed(2)}</span></div>
            <div class="totals-row grand-total"><span class="totals-label">Total:</span><span class="totals-value">₹${invoice.total.toFixed(2)}</span></div>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
            <p style="font-size: 14px; color: #0066cc;"><strong>Payment Instructions:</strong></p>
            <p style="font-size: 13px; color: #333;">This amount will be automatically deducted from your wallet balance. If you have sufficient balance, no action is required.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing eBliss Cloud! For any queries, contact support@ebliss.com</p>
          <p>This is a system generated invoice and does not require a physical signature.</p>
        </div>
      </div>
    </body>
    </html>`;
  }
}