// src/scheduler/billing.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(
    @InjectQueue('billing-queue') private billingQueue: Queue,
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processHourlyBilling() {
    this.logger.log('Starting hourly billing cycle');
    
    const runningVMs = await this.prisma.vM.findMany({
      where: {
        status: 'running',
        plan_type: 'hourly',
        terminated_at: null,
      },
      include: {
        user: true,
      },
    });

    this.logger.log(`Found ${runningVMs.length} VMs to bill hourly`);

    for (const vm of runningVMs) {
      await this.billingQueue.add('bill-hourly-vm', {
        vmId: vm.id,
        userId: vm.user_id,
        amount: vm.hourly_rate.toNumber(),
        vmName: vm.name,
      });
    }
  }

  @Cron('0 0 1 * *') // 1st of every month
  async processMonthlyBilling() {
    this.logger.log('Starting monthly billing cycle');
    
    const monthlyVMs = await this.prisma.vM.findMany({
      where: {
        status: 'running',
        plan_type: 'monthly',
        terminated_at: null,
      },
      include: {
        user: true,
        plan: true,
      },
    });

    // Group by user - FIXED: Check if map entry exists before pushing
    const userVMMap = new Map<number, any[]>();
    for (const vm of monthlyVMs) {
      const existingVMs = userVMMap.get(vm.user_id);
      if (existingVMs) {
        existingVMs.push(vm);
      } else {
        userVMMap.set(vm.user_id, [vm]);
      }
    }

    for (const [userId, vms] of userVMMap) {
      const totalAmount = vms.reduce((sum, vm) => {
        const rate = vm.monthly_rate?.toNumber() || vm.plan?.monthly_price?.toNumber() || 0;
        return sum + rate;
      }, 0);

      if (totalAmount > 0) {
        await this.billingQueue.add('bill-monthly-user', {
          userId,
          totalAmount,
          vms: vms.map(vm => ({ 
            id: vm.id, 
            name: vm.name, 
            rate: vm.hourly_rate?.toNumber() || 0 
          })),
        });
      }
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async checkLowBalanceAndSuspend() {
    this.logger.log('Checking for VMs to suspend due to low balance');
    
    // Find users with negative balance
    const negativeBalanceUsers = await this.prisma.user.findMany({
      where: {
        wallet_balance: { lt: 0 },
        vms: { some: { status: 'running' } },
      },
      include: {
        vms: {
          where: { status: 'running' },
        },
      },
    });

    for (const user of negativeBalanceUsers) {
      for (const vm of user.vms) {
        await this.billingQueue.add('suspend-vm', {
          vmId: vm.id,
          userId: user.id,
          vmName: vm.name,
          reason: 'Insufficient wallet balance',
          balance: user.wallet_balance.toNumber(),
        });
      }
    }
  }

  @Cron('0 0 * * *') // Every day at midnight
  async generateDailyInvoices() {
    this.logger.log('Generating daily invoices');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTransactions = await this.prisma.transaction.groupBy({
      by: ['user_id'],
      where: {
        created_at: {
          gte: yesterday,
          lt: today,
        },
        type: 'debit',
      },
      _sum: {
        amount: true,
      },
    });

    for (const transaction of dailyTransactions) {
      if (transaction._sum.amount && transaction.user_id) {
        const totalAmount = Math.abs(transaction._sum.amount.toNumber());
        if (totalAmount > 0) {
          await this.billingQueue.add('generate-daily-invoice', {
            userId: transaction.user_id,
            totalAmount: totalAmount,
            date: yesterday,
          });
        }
      }
    }
  }

  // Optional: Weekly summary emails
  @Cron('0 9 * * 1') // Every Monday at 9 AM
  async sendWeeklySummary() {
    this.logger.log('Sending weekly summary emails');
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const users = await this.prisma.user.findMany({
      where: {
        vms: { some: {} },
      },
      select: {
        id: true,
        email: true,
        full_name: true,
      },
    });

    for (const user of users) {
      const weeklySpend = await this.prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: 'debit',
          created_at: { gte: lastWeek },
        },
        _sum: { amount: true },
      });

      const totalSpend = Math.abs(weeklySpend._sum.amount?.toNumber() || 0);
      
      if (totalSpend > 0) {
        await this.notificationService.sendEmail(
          user.email,
          'Weekly Spending Summary',
          'weekly_summary',
          {
            name: user.full_name || user.email.split('@')[0],
            amount: totalSpend.toFixed(2),
            period: 'last 7 days',
          }
        );
      }
    }
  }
}