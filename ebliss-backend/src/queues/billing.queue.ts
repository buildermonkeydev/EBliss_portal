import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('billing-queue')
@Injectable()
export class BillingQueue extends WorkerHost {
  private readonly logger = new Logger(BillingQueue.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    switch (job.name) {
      case 'bill-hourly-vm':
        return this.processHourlyBilling(job.data);
      case 'bill-monthly-vm':
        return this.processMonthlyBilling(job.data);
      case 'bill-monthly-user':
        return this.processMonthlyUserBilling(job.data);
      case 'suspend-vm':
        return this.suspendVM(job.data.vmId, job.data.userId, job.data.vmName);
      case 'generate-daily-invoice':
        return this.generateDailyInvoice(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async processHourlyBilling(data: { 
    vmId: number; 
    userId: number; 
    amount: number; 
    vmName: string 
  }) {
    this.logger.log(`Processing hourly billing for VM ${data.vmId}`);

    try {
      // Check if VM still exists and is running
      const vm = await this.prisma.vM.findUnique({
        where: { id: data.vmId },
      });

      if (!vm || vm.status !== 'running') {
        this.logger.log(`VM ${data.vmId} is not running, skipping billing`);
        return;
      }

      // Debit wallet
      await this.walletService.debitWallet(
        data.userId,
        data.amount,
        `Hourly billing - VM ${data.vmName} (${vm.proxmox_vmid})`,
        `vm_${data.vmId}_hourly_${Date.now()}`,
      );

      // Update last billed time
      await this.prisma.vM.update({
        where: { id: data.vmId },
        data: { last_billed_at: new Date() },
      });

      // Record VM metrics
      await this.recordVMMetrics(data.vmId);

      // Emit billing success event
      this.eventEmitter.emit('billing.success', {
        userId: data.userId,
        vmId: data.vmId,
        vmName: data.vmName,
        amount: data.amount,
        type: 'hourly',
        timestamp: new Date(),
      });

      this.logger.log(`Successfully billed user ${data.userId} for VM ${data.vmName}`);
    } catch (error) {
      this.logger.error(`Failed to bill VM ${data.vmId}: ${error.message}`);

      this.eventEmitter.emit('billing.failed', {
        userId: data.userId,
        vmId: data.vmId,
        vmName: data.vmName,
        amount: data.amount,
        error: error.message,
        timestamp: new Date(),
      });

      // Suspend VM if billing fails due to insufficient balance
      if (error.message.includes('Insufficient balance')) {
        await this.suspendVM(data.vmId, data.userId, data.vmName);
      }
    }
  }

  private async processMonthlyBilling(data: { 
    vmId: number; 
    userId: number; 
    amount: number; 
    vmName: string 
  }) {
    this.logger.log(`Processing monthly billing for VM ${data.vmId}`);

    try {
      const vm = await this.prisma.vM.findUnique({
        where: { id: data.vmId },
      });

      if (!vm) {
        this.logger.log(`VM ${data.vmId} not found, skipping monthly billing`);
        return;
      }

      // Debit wallet
      await this.walletService.debitWallet(
        data.userId,
        data.amount,
        `Monthly billing - VM ${data.vmName} (${vm.proxmox_vmid})`,
        `vm_${data.vmId}_monthly_${Date.now()}`,
      );

      this.eventEmitter.emit('vm.billed', {
        userId: data.userId,
        vmId: data.vmId,
        vmName: data.vmName,
        amount: data.amount,
        type: 'monthly',
      });

      this.logger.log(`Successfully processed monthly billing for VM ${data.vmName}`);
    } catch (error) {
      this.logger.error(`Failed to bill VM ${data.vmId} monthly: ${error.message}`);

      if (error.message.includes('Insufficient balance')) {
        await this.suspendVM(data.vmId, data.userId, data.vmName);
      }
    }
  }

  private async processMonthlyUserBilling(data: { 
    userId: number; 
    totalAmount: number; 
    vms: Array<{ id: number; name: string; rate: number }> 
  }) {
    this.logger.log(`Processing monthly billing for user ${data.userId} - Total: $${data.totalAmount}`);

    try {
      // Debit wallet for total amount
      await this.walletService.debitWallet(
        data.userId,
        data.totalAmount,
        `Monthly billing for ${data.vms.length} VM(s)`,
        `user_${data.userId}_monthly_${Date.now()}`,
      );

      // Update last billed time for all VMs
      for (const vm of data.vms) {
        await this.prisma.vM.update({
          where: { id: vm.id },
          data: { last_billed_at: new Date() },
        });
      }

      this.eventEmitter.emit('billing.monthly.success', {
        userId: data.userId,
        totalAmount: data.totalAmount,
        vmCount: data.vms.length,
        vms: data.vms,
      });

      this.logger.log(`Successfully processed monthly billing for user ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process monthly billing for user ${data.userId}: ${error.message}`);

      this.eventEmitter.emit('billing.monthly.failed', {
        userId: data.userId,
        totalAmount: data.totalAmount,
        error: error.message,
      });

      // Suspend all VMs if insufficient balance
      if (error.message.includes('Insufficient balance')) {
        for (const vm of data.vms) {
          await this.suspendVM(vm.id, data.userId, vm.name);
        }
      }
    }
  }

  private async suspendVM(vmId: number, userId: number, vmName: string) {
    this.logger.log(`Suspending VM ${vmId} (${vmName}) due to insufficient balance`);

    try {
      const vm = await this.prisma.vM.update({
        where: { id: vmId },
        data: {
          status: 'suspended',
          suspended_at: new Date(),
          suspension_reason: 'Insufficient wallet balance',
        },
      });

      const balance = await this.getUserBalance(userId);

      // Emit suspension event
      this.eventEmitter.emit('vm.suspended', {
        userId,
        vmId,
        vmName,
        reason: 'insufficient_balance',
        balance,
        timestamp: new Date(),
      });

      this.logger.log(`VM ${vmId} suspended successfully`);
    } catch (error) {
      this.logger.error(`Failed to suspend VM ${vmId}: ${error.message}`);
    }
  }

  private async generateDailyInvoice(data: { 
    userId: number; 
    totalAmount: number; 
    date: Date 
  }) {
    this.logger.log(`Generating daily invoice for user ${data.userId}`);

    try {
      const dateStr = data.date.toISOString().split('T')[0];
      const invoiceNumber = `INV-${dateStr.replace(/-/g, '')}-${data.userId}`;

      // Check if invoice already exists
      const existingInvoice = await this.prisma.invoice.findUnique({
        where: { invoice_number: invoiceNumber },
      });

      if (existingInvoice) {
        this.logger.log(`Invoice ${invoiceNumber} already exists, skipping`);
        return;
      }

      const invoice = await this.prisma.invoice.create({
        data: {
          user_id: data.userId,
          invoice_number: invoiceNumber,
          items_json: [
            {
              description: `Daily VM usage - ${dateStr}`,
              amount: data.totalAmount,
              date: data.date,
            },
          ],
          subtotal: data.totalAmount,
          tax_rate: 18,
          tax_amount: data.totalAmount * 0.18,
          total: data.totalAmount * 1.18,
          status: 'paid',
          due_date: new Date(data.date.getTime() + 30 * 24 * 60 * 60 * 1000),
          billing_period_start: data.date,
          billing_period_end: new Date(data.date.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      this.eventEmitter.emit('invoice.generated', {
        userId: data.userId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        total: invoice.total.toNumber(),
        period: dateStr,
      });

      this.logger.log(`Daily invoice ${invoiceNumber} generated for user ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to generate invoice for user ${data.userId}: ${error.message}`);
    }
  }

  private async recordVMMetrics(vmId: number) {
    try {
      const vm = await this.prisma.vM.findUnique({
        where: { id: vmId },
        include: { node: true },
      });

      if (!vm) return;

      // In production, fetch actual metrics from Proxmox
      const metrics = {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        bandwidth_in_mb: Math.random() * 100,
        bandwidth_out_mb: Math.random() * 100,
      };

      await this.prisma.vMMetric.create({
        data: {
          vm_id: vmId,
          cpu_usage: metrics.cpu_usage,
          memory_usage: metrics.memory_usage,
          disk_usage: metrics.disk_usage,
          bandwidth_in_mb: metrics.bandwidth_in_mb,
          bandwidth_out_mb: metrics.bandwidth_out_mb,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record VM metrics for VM ${vmId}: ${error.message}`);
    }
  }

  private async getUserBalance(userId: number): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { wallet_balance: true },
      });
      return user?.wallet_balance.toNumber() || 0;
    } catch (error) {
      this.logger.error(`Failed to get user balance: ${error.message}`);
      return 0;
    }
  }
}