import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../auth/services/email.service';
import * as nodemailer from 'nodemailer';
import twilio from 'twilio';
import moment from 'moment';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any;
  private emailTemplates: Map<string, string> = new Map();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
  ) {}

  async onModuleInit() {
    // Initialize email transporter
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      this.logger.log('Email transporter initialized');
    }

    // Initialize Twilio for SMS
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (twilioSid && twilioToken && twilioSid.startsWith('AC') && twilioSid.length > 10) {
      try {
        this.twilioClient = twilio(twilioSid, twilioToken);
        this.logger.log('Twilio client initialized');
      } catch (error) {
        this.logger.warn(`Twilio initialization failed: ${error.message}`);
      }
    } else {
      this.logger.warn('Twilio not configured - SMS notifications disabled');
    }

    // Load email templates
    await this.loadEmailTemplates();
  }

  private async loadEmailTemplates() {
    this.emailTemplates.set('welcome', this.getWelcomeTemplate());
    this.emailTemplates.set('low_balance', this.getLowBalanceTemplate());
    this.emailTemplates.set('invoice', this.getInvoiceTemplate());
    this.emailTemplates.set('suspension', this.getSuspensionTemplate());
    this.emailTemplates.set('payment_confirmation', this.getPaymentConfirmationTemplate());
    this.emailTemplates.set('payment_failed', this.getPaymentFailedTemplate());
    this.emailTemplates.set('refund_processed', this.getRefundProcessedTemplate());
  }

  async sendEmail(to: string, subject: string, template: string, data?: any): Promise<void> {
    if (!this.emailTransporter) {
      this.logger.warn('Email transporter not configured');
      return;
    }

    try {
      let html = this.emailTemplates.get(template) || this.getDefaultTemplate();
      
      // Replace variables in template
      if (data) {
        Object.keys(data).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          html = html.replace(regex, data[key]);
        });
      }

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@ebliss.com',
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
      
      // Log notification
      await this.logNotification(to, 'email', subject, data);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.warn('Twilio client not configured');
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: message,
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      this.logger.log(`SMS sent to ${to}`);
      
      // Log notification
      await this.logNotification(to, 'sms', message.substring(0, 50));
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
    }
  }

  private async logNotification(recipient: string, type: string, content: string, data?: any) {
    try {
      await this.prisma.notificationLog.create({
        data: {
          recipient,
          type,
          content,
          metadata: data || {},
          sent_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log notification: ${error.message}`);
    }
  }

  // ============ PAYMENT NOTIFICATION METHODS ============

  async sendPaymentConfirmation(userId: number, amount: number, transactionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      this.logger.warn(`User ${userId} not found for payment confirmation`);
      return;
    }
    
    const data = {
      name: user.full_name || user.email.split('@')[0],
      amount: amount.toFixed(2),
      transaction_id: transactionId,
      date: moment().format('MMMM DD, YYYY HH:mm:ss'),
      wallet_url: `${process.env.APP_URL || 'http://localhost:3000'}/wallet`,
      support_email: process.env.SUPPORT_EMAIL || 'support@ebliss.com',
    };

    await this.sendEmail(
      user.email,
      'Payment Confirmation',
      'payment_confirmation',
      data,
    );

    // Send SMS if phone exists
    if (user.phone) {
      const smsMessage = `Payment of ₹${amount.toFixed(2)} confirmed. Transaction ID: ${transactionId}. Thank you for using eBliss!`;
      await this.sendSMS(user.phone, smsMessage);
    }

    this.logger.log(`Payment confirmation sent to user ${userId} for ₹${amount}`);
  }

  async sendPaymentFailedNotification(userId: number, amount: number, transactionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      this.logger.warn(`User ${userId} not found for payment failed notification`);
      return;
    }
    
    const data = {
      name: user.full_name || user.email.split('@')[0],
      amount: amount.toFixed(2),
      transaction_id: transactionId,
      date: moment().format('MMMM DD, YYYY HH:mm:ss'),
      retry_url: `${process.env.APP_URL || 'http://localhost:3000'}/wallet/topup`,
      support_email: process.env.SUPPORT_EMAIL || 'support@ebliss.com',
    };

    await this.sendEmail(
      user.email,
      'Payment Failed',
      'payment_failed',
      data,
    );

    // Send SMS if phone exists
    if (user.phone) {
      const smsMessage = `Payment of ₹${amount.toFixed(2)} failed. Please try again or contact support.`;
      await this.sendSMS(user.phone, smsMessage);
    }

    this.logger.log(`Payment failed notification sent to user ${userId} for ₹${amount}`);
  }

  async sendRefundNotification(userId: number, amount: number, refundId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      this.logger.warn(`User ${userId} not found for refund notification`);
      return;
    }
    
    const data = {
      name: user.full_name || user.email.split('@')[0],
      amount: amount.toFixed(2),
      refund_id: refundId,
      date: moment().format('MMMM DD, YYYY HH:mm:ss'),
      wallet_url: `${process.env.APP_URL || 'http://localhost:3000'}/wallet`,
      support_email: process.env.SUPPORT_EMAIL || 'support@ebliss.com',
    };

    await this.sendEmail(
      user.email,
      'Refund Processed',
      'refund_processed',
      data,
    );

    // Send SMS if phone exists
    if (user.phone) {
      const smsMessage = `Refund of ₹${amount.toFixed(2)} has been processed. Refund ID: ${refundId}.`;
      await this.sendSMS(user.phone, smsMessage);
    }

    this.logger.log(`Refund notification sent to user ${userId} for ₹${amount}`);
  }

  // ============ EXISTING NOTIFICATION METHODS ============

  async sendWelcomeEmail(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const data = {
      name: user.full_name || user.email.split('@')[0],
      email: user.email,
      login_url: `${process.env.APP_URL || 'http://localhost:3000'}/login`,
      support_email: process.env.SUPPORT_EMAIL || 'support@ebliss.com',
    };

    await this.sendEmail(
      user.email,
      'Welcome to eBliss Cloud',
      'welcome',
      data,
    );
  }

  async sendLowBalanceAlert(userId: number, balance: number, level: 'warning' | 'critical') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const subject = level === 'critical' 
      ? 'URGENT: Critical Low Balance Alert'
      : 'Low Balance Alert';
    
    const data = {
      name: user.full_name || user.email.split('@')[0],
      balance: balance.toFixed(2),
      threshold: level === 'critical' ? '5' : '10',
      topup_url: `${process.env.APP_URL || 'http://localhost:3000'}/wallet/topup`,
      support_email: process.env.SUPPORT_EMAIL,
    };

    await this.sendEmail(user.email, subject, 'low_balance', data);

    // Send SMS if phone exists
    if (user.phone) {
      const smsMessage = level === 'critical'
        ? `URGENT: Your eBliss wallet balance is critically low at ₹${balance}. Please top up immediately.`
        : `Alert: Your eBliss wallet balance is low at ₹${balance}. Please consider topping up.`;
      
      await this.sendSMS(user.phone, smsMessage);
    }

    this.eventEmitter.emit('alert.sent', {
      userId,
      type: 'low_balance',
      level,
      balance,
    });
  }

  async sendInvoiceNotification(userId: number, invoiceId: number, total: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!user || !invoice) return;

    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_number: invoice.invoice_number,
      amount: total.toFixed(2),
      due_date: moment(invoice.due_date).format('MMMM DD, YYYY'),
      invoice_url: `${process.env.APP_URL || 'http://localhost:3000'}/invoices/${invoiceId}`,
      support_email: process.env.SUPPORT_EMAIL,
    };

    await this.sendEmail(
      user.email,
      `New Invoice #${invoice.invoice_number}`,
      'invoice',
      data,
    );

    if (user.phone) {
      const smsMessage = `New invoice #${invoice.invoice_number} for ₹${total}. Due ${moment(invoice.due_date).format('MM/DD/YYYY')}. Pay now: ${process.env.APP_URL || 'http://localhost:3000'}/invoices/${invoiceId}`;
      await this.sendSMS(user.phone, smsMessage);
    }
  }

  async sendSuspensionNotice(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vms: {
          where: { status: 'suspended' },
        },
      },
    });

    if (!user) return;

    const data = {
      name: user.full_name || user.email.split('@')[0],
      suspended_vms: user.vms.length,
      reason: user.suspension_reason || 'insufficient balance',
      topup_url: `${process.env.APP_URL || 'http://localhost:3000'}/wallet/topup`,
      support_email: process.env.SUPPORT_EMAIL,
    };

    await this.sendEmail(
      user.email,
      'Service Suspension Notice',
      'suspension',
      data,
    );

    if (user.phone) {
      const smsMessage = `Your services have been suspended due to insufficient balance. Please top up to restore services.`;
      await this.sendSMS(user.phone, smsMessage);
    }
  }

  async sendOverdueNotice(userId: number, invoiceId: number, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_id: invoiceId,
      amount: amount.toFixed(2),
      invoice_url: `${process.env.APP_URL || 'http://localhost:3000'}/invoices/${invoiceId}`,
      support_email: process.env.SUPPORT_EMAIL,
    };

    await this.sendEmail(
      user.email,
      `Overdue Invoice #${invoiceId}`,
      'overdue',
      data,
    );
  }

  async sendInvoiceReminder(userId: number, invoiceId: number, amount: number, dueDate: Date) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const daysLeft = moment(dueDate).diff(moment(), 'days');
    
    const data = {
      name: user.full_name || user.email.split('@')[0],
      invoice_id: invoiceId,
      amount: amount.toFixed(2),
      days_left: daysLeft,
      due_date: moment(dueDate).format('MMMM DD, YYYY'),
      invoice_url: `${process.env.APP_URL || 'http://localhost:3000'}/invoices/${invoiceId}`,
      support_email: process.env.SUPPORT_EMAIL,
    };

    await this.sendEmail(
      user.email,
      `Invoice Reminder: ${daysLeft} days until due`,
      'invoice_reminder',
      data,
    );
  }

  async sendAdminAlert(adminId: number, subject: string, message: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) return;

    await this.sendEmail(admin.email, `Admin Alert: ${subject}`, 'admin_alert', {
      message,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }






















  
  // ============ EMAIL TEMPLATES ============

  private getPaymentConfirmationTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }\n' +
      '.content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }\n' +
      '.payment-details { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }\n' +
      '.amount { font-size: 32px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }\n' +
      '.button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; text-decoration: none; border-radius: 8px; }\n' +
      '.footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>Payment Confirmed!</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<div class="amount">₹{{amount}}</div>\n' +
      '<div class="payment-details">\n' +
      '<p><strong>Transaction ID:</strong> {{transaction_id}}</p>\n' +
      '<p><strong>Date:</strong> {{date}}</p>\n' +
      '</div>\n' +
      '<p>Your payment has been successfully processed. The funds have been added to your wallet.</p>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{wallet_url}}" class="button">View Wallet</a>\n' +
      '</p>\n' +
      '<p>Thank you for choosing eBliss Cloud!</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '<p>Need help? Contact us at <a href="mailto:{{support_email}}">{{support_email}}</a></p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getPaymentFailedTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }\n' +
      '.content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }\n' +
      '.payment-details { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; }\n' +
      '.button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #EF4444, #DC2626); color: white; text-decoration: none; border-radius: 8px; }\n' +
      '.footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>Payment Failed</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<div class="payment-details">\n' +
      '<p><strong>Amount:</strong> ₹{{amount}}</p>\n' +
      '<p><strong>Transaction ID:</strong> {{transaction_id}}</p>\n' +
      '<p><strong>Date:</strong> {{date}}</p>\n' +
      '</div>\n' +
      '<p>We were unable to process your payment. Please check your payment method and try again.</p>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{retry_url}}" class="button">Try Again</a>\n' +
      '</p>\n' +
      '<p>If the issue persists, please contact our support team.</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '<p>Need help? Contact us at <a href="mailto:{{support_email}}">{{support_email}}</a></p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getRefundProcessedTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }\n' +
      '.content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }\n' +
      '.refund-details { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }\n' +
      '.footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>Refund Processed</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<div class="refund-details">\n' +
      '<p><strong>Amount Refunded:</strong> ₹{{amount}}</p>\n' +
      '<p><strong>Refund ID:</strong> {{refund_id}}</p>\n' +
      '<p><strong>Date:</strong> {{date}}</p>\n' +
      '</div>\n' +
      '<p>Your refund has been processed successfully. The amount has been deducted from your wallet balance.</p>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{wallet_url}}" class="button">View Wallet</a>\n' +
      '</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '<p>Need help? Contact us at <a href="mailto:{{support_email}}">{{support_email}}</a></p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getWelcomeTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }\n' +
      '.content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }\n' +
      '.button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; text-decoration: none; border-radius: 8px; }\n' +
      '.footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>Welcome to eBliss Cloud!</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<p>Thank you for joining eBliss Cloud! We\'re excited to have you on board.</p>\n' +
      '<p>Your account has been successfully created with email: <strong>{{email}}</strong></p>\n' +
      '<p>You can now:</p>\n' +
      '<ul>\n' +
      '<li>Deploy virtual machines in seconds</li>\n' +
      '<li>Manage your services from our intuitive dashboard</li>\n' +
      '<li>Top up your wallet and pay as you go</li>\n' +
      '<li>Access 24/7 customer support</li>\n' +
      '</ul>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{login_url}}" class="button">Get Started</a>\n' +
      '</p>\n' +
      '<p>If you have any questions, feel free to contact our support team.</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getLowBalanceTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: #ff9800; color: white; padding: 20px; text-align: center; }\n' +
      '.warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }\n' +
      '.button { display: inline-block; padding: 10px 20px; background: #ff9800; color: white; text-decoration: none; border-radius: 5px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>Low Balance Alert</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<div class="warning">\n' +
      '<p><strong>Your current balance: ₹{{balance}}</strong></p>\n' +
      '<p>This is below the recommended threshold of ₹{{threshold}}.</p>\n' +
      '</div>\n' +
      '<p>To ensure uninterrupted service, please top up your wallet as soon as possible.</p>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{topup_url}}" class="button">Top Up Now</a>\n' +
      '</p>\n' +
      '<p>If you have any questions, please contact our support team.</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getInvoiceTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: #2196F3; color: white; padding: 20px; text-align: center; }\n' +
      '.invoice-details { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }\n' +
      '.button { display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>New Invoice</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<div class="invoice-details">\n' +
      '<p><strong>Invoice #: {{invoice_number}}</strong></p>\n' +
      '<p><strong>Amount: ₹{{amount}}</strong></p>\n' +
      '<p><strong>Due Date: {{due_date}}</strong></p>\n' +
      '</div>\n' +
      '<p>Please ensure payment is made by the due date to avoid service interruption.</p>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{invoice_url}}" class="button">View Invoice</a>\n' +
      '</p>\n' +
      '<p>If you have any questions, please contact our support team.</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getSuspensionTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: #dc3545; color: white; padding: 20px; text-align: center; }\n' +
      '.alert { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }\n' +
      '.button { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>Service Suspension Notice</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '<p>Hello {{name}},</p>\n' +
      '<div class="alert">\n' +
      '<p><strong>Your services have been suspended due to: {{reason}}</strong></p>\n' +
      '<p><strong>Suspended VMs: {{suspended_vms}}</strong></p>\n' +
      '</div>\n' +
      '<p>To restore your services, please top up your wallet balance.</p>\n' +
      '<p style="text-align: center;">\n' +
      '<a href="{{topup_url}}" class="button">Top Up Now</a>\n' +
      '</p>\n' +
      '<p>If you have any questions, please contact our support team.</p>\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  private getDefaultTemplate(): string {
    return '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '<style>\n' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }\n' +
      '.header { background: #4CAF50; color: white; padding: 20px; text-align: center; }\n' +
      '.content { padding: 20px; }\n' +
      '.footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '<div class="header">\n' +
      '<h1>eBliss Cloud</h1>\n' +
      '</div>\n' +
      '<div class="content">\n' +
      '{{message}}\n' +
      '</div>\n' +
      '<div class="footer">\n' +
      '<p>© 2024 eBliss Cloud. All rights reserved.</p>\n' +
      '</div>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  // ============ EVENT HANDLERS ============

  @OnEvent('user.created')
  async handleUserCreated(payload: any) {
    await this.sendWelcomeEmail(payload.userId);
  }

  @OnEvent('wallet.credited')
  async handleWalletCredited(payload: any) {
    await this.sendPaymentConfirmation(
      payload.userId,
      payload.amount,
      `wallet_${payload.userId}_${Date.now()}`,
    );
  }

  @OnEvent('invoice.generated')
  async handleInvoiceGenerated(payload: any) {
    await this.sendInvoiceNotification(
      payload.userId,
      payload.invoiceId,
      payload.total,
    );
  }

  @OnEvent('wallet.debited')
  async handleWalletDebited(payload: any) {
    if (payload.newBalance < 10) {
      await this.sendLowBalanceAlert(
        payload.userId,
        payload.newBalance,
        payload.newBalance < 5 ? 'critical' : 'warning',
      );
    }
  }

  @OnEvent('vms.suspended')
  async handleVMsSuspended(payload: any) {
    await this.sendSuspensionNotice(payload.userId);
  }

  @OnEvent('payment.success')
  async handlePaymentSuccess(payload: any) {
    await this.sendPaymentConfirmation(
      payload.userId,
      payload.amount,
      payload.transactionId,
    );
  }
  // Add these event handlers to your NotificationService

@OnEvent('payment.failed')
async handlePaymentFailed(payload: any) {
  await this.sendPaymentFailedNotification(
    payload.userId,
    payload.amount,
    payload.transactionId,
  );
}

@OnEvent('refund.processed')
async handleRefundProcessed(payload: any) {
  await this.sendRefundNotification(
    payload.userId,
    payload.amount,
    payload.refundId,
  );
}

@OnEvent('invoice.overdue')
async handleInvoiceOverdue(payload: any) {
  await this.sendOverdueNotice(
    payload.userId,
    payload.invoiceId,
    payload.amount,
  );
}

@OnEvent('invoice.reminder')
async handleInvoiceReminder(payload: any) {
  await this.sendInvoiceReminder(
    payload.userId,
    payload.invoiceId,
    payload.amount,
    payload.dueDate,
  );
}

@OnEvent('vm.suspended')
async handleVMSuspended(payload: any) {
  await this.sendSuspensionNotice(payload.userId);
}

@OnEvent('vm.billed')
async handleVMBilled(payload: any) {
  // Optional: Send notification for high-value bills
  if (payload.amount > 100) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });
    
    if (user) {
      await this.sendEmail(
        user.email,
        'High Billing Alert',
        'high_billing',
        {
          amount: payload.amount.toFixed(2),
          vm_name: payload.vmName,
          date: moment().format('MMMM DD, YYYY HH:mm:ss'),
        }
      );
    }
  }
}

@OnEvent('admin.wallet.credited')
async handleAdminWalletCredited(payload: any) {
  await this.sendEmail(
    payload.userEmail,
    'Admin Credit Added to Your Wallet',
    'admin_credit',
    {
      amount: payload.amount.toFixed(2),
      description: payload.description,
      date: moment().format('MMMM DD, YYYY HH:mm:ss'),
      new_balance: payload.newBalance.toFixed(2),
    }
  );
}
}