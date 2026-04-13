import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { Prisma } from '@prisma/client';
import { EmailService } from '../auth/services/email.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly LOW_BALANCE_THRESHOLD = 500;
  private readonly CRITICAL_BALANCE_THRESHOLD = 5;

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private notificationService: NotificationService,
        private emailService: EmailService,

  ) {}

  async getWalletBalance(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { wallet_balance: true, email: true, id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      balance: user.wallet_balance,
      currency: 'INR',
      low_balance_threshold: this.LOW_BALANCE_THRESHOLD,
    };
  }

  async creditWallet(
    userId: number,
    amount: number,
    description: string,
    refId?: string,
    isAdminCredit: boolean = false,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const newBalance = user.wallet_balance.toNumber() + amount;

      const transaction = await tx.transaction.create({
        data: {
          user_id: userId,
          type: 'credit',
          amount,
          balance_after: newBalance,
          description,
          ref_id: refId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { wallet_balance: newBalance },
      });

      await this.checkLowBalanceAlert(userId, newBalance);

      this.eventEmitter.emit('wallet.credited', {
        userId,
        amount,
        newBalance,
        description,
      });

      if (isAdminCredit) {
        this.eventEmitter.emit('admin.wallet.credited', {
          userId,
          amount,
          description,
        });
      }

      return transaction;
    });
  }

  async debitWallet(
    userId: number,
    amount: number,
    description: string,
    refId?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const currentBalance = user.wallet_balance.toNumber();
      
      if (currentBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = currentBalance - amount;

      const transaction = await tx.transaction.create({
        data: {
          user_id: userId,
          type: 'debit',
          amount,
          balance_after: newBalance,
          description,
          ref_id: refId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { wallet_balance: newBalance },
      });

      await this.checkLowBalanceAlert(userId, newBalance);

      this.eventEmitter.emit('wallet.debited', {
        userId,
        amount,
        newBalance,
        description,
      });

      return transaction;
    });
  }

  async getTransactionHistory(
    userId: number,
    page: number = 1,
    limit: number = 50,
    type?: 'credit' | 'debit',
  ) {
    // Convert page and limit to numbers
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.TransactionWhereInput = {
      user_id: userId,
      ...(type && { type }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  private async checkLowBalanceAlert(userId: number, balance: number) {
    if (balance <= this.CRITICAL_BALANCE_THRESHOLD && balance > 0) {
      await this.notificationService.sendLowBalanceAlert(
        userId,
        balance,
        'critical',
      );
    } else if (balance <= this.LOW_BALANCE_THRESHOLD) {
      await this.notificationService.sendLowBalanceAlert(
        userId,
        balance,
        'warning',
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAllLowBalances() {
    const users = await this.prisma.user.findMany({
      where: {
        wallet_balance: {
          lte: this.LOW_BALANCE_THRESHOLD,
          gt: 0,
        },
      },
      select: { id: true, wallet_balance: true, email: true },
    });

    for (const user of users) {
      await this.checkLowBalanceAlert(user.id, user.wallet_balance.toNumber());
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async suspendUsersWithInsufficientBalance() {
    const users = await this.prisma.user.findMany({
      where: {
        wallet_balance: {
          lt: 0,
        },
        vms: {
          some: {
            status: 'running',
          },
        },
      },
      include: {
        vms: true,
      },
    });

    for (const user of users) {
      await this.suspendUserVMs(user.id);
      await this.notificationService.sendSuspensionNotice(user.id);
    }
  }

  async suspendUserVMs(userId: number) {
    const vms = await this.prisma.vM.updateMany({
      where: {
        user_id: userId,
        status: 'running',
      },
      data: {
        status: 'suspended',
      },
    });

    this.eventEmitter.emit('vms.suspend', { userId });

    return vms;
  }

  async resumeUserVMs(userId: number) {
    const vms = await this.prisma.vM.updateMany({
      where: {
        user_id: userId,
        status: 'suspended',
      },
      data: {
        status: 'stopped',
      },
    });

    return vms;
  }

  async getWalletSummary(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vms: {
          where: { status: 'running' },
        },
        transactions: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const monthlyCost = user.vms.reduce((sum, vm) => {
      return sum + vm.hourly_rate.toNumber() * 24 * 30;
    }, 0);

    const estimatedDays = user.wallet_balance.toNumber() / (monthlyCost / 30);

    return {
      currentBalance: user.wallet_balance,
      activeVMs: user.vms.length,
      monthlyEstimatedCost: monthlyCost,
      estimatedDaysLeft: estimatedDays,
      recentTransactions: user.transactions,
    };
  }

  async adminCreditWallet(
    adminId: number,
    userId: number,
    amount: number,
    description: string,
  ) {
    const transaction = await this.creditWallet(
      userId,
      amount,
      description,
      `admin_credit_${Date.now()}`,
      true,
    );

    await this.prisma.auditLog.create({
      data: {
        admin_id: adminId,
        action: 'WALLET_CREDIT',
        target_type: 'user',
        target_id: userId.toString(),
        payload_json: { amount, description },
        ip: 'admin_action',
      },
    });

    return transaction;
  }
// src/wallet/wallet.service.ts (add these methods)

async applyPromoCode(userId: number, code: string, topUpAmount: number) {
  const coupon = await this.prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) {
    throw new BadRequestException('Invalid promo code');
  }

  if (coupon.used_count >= coupon.max_uses) {
    throw new BadRequestException('Promo code has reached maximum usage');
  }

  if (new Date() > coupon.expires_at) {
    throw new BadRequestException('Promo code has expired');
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = (topUpAmount * coupon.value.toNumber()) / 100;
  } else {
    discountAmount = Math.min(coupon.value.toNumber(), topUpAmount);
  }

  const finalAmount = topUpAmount - discountAmount;

  // Update coupon usage
  await this.prisma.coupon.update({
    where: { id: coupon.id },
    data: { used_count: { increment: 1 } },
  });

  // Record promo code usage
  // await this.prisma.promoCodeUsage.create({
  //   data: {
  //     user_id: userId,
  //     coupon_id: coupon.id,
  //     discount_amount: discountAmount,
  //     original_amount: topUpAmount,
  //     final_amount: finalAmount,
  //   },
  // });

  return {
    originalAmount: topUpAmount,
    discountAmount,
    finalAmount,
    couponCode: coupon.code,
  };
}

async getWalletStats(userId: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [transactions, runningVMs, suspendedVMs] = await Promise.all([
    this.prisma.transaction.findMany({
      where: {
        user_id: userId,
        created_at: { gte: thirtyDaysAgo },
      },
      orderBy: { created_at: 'desc' },
    }),
    this.prisma.vM.count({
      where: { user_id: userId, status: 'running' },
    }),
    this.prisma.vM.count({
      where: { user_id: userId, status: 'suspended' },
    }),
  ]);

  const totalSpent = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const totalCredited = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  return {
    totalSpent,
    totalCredited,
    runningVMs,
    suspendedVMs,
    transactionCount: transactions.length,
    averageDailySpend: totalSpent / 30,
  };
}

async generateMonthlyStatement(userId: number, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const transactions = await this.prisma.transaction.findMany({
    where: {
      user_id: userId,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { created_at: 'asc' },
  });

  const summary = {
    openingBalance: 0,
    totalCredits: 0,
    totalDebits: 0,
    closingBalance: 0,
    vms: [] as any[],
  };

  let runningBalance = 0;
  for (const tx of transactions) {
    if (tx.type === 'credit') {
      summary.totalCredits += tx.amount.toNumber();
    } else {
      summary.totalDebits += Math.abs(tx.amount.toNumber());
    }
    runningBalance += tx.type === 'credit' ? tx.amount.toNumber() : -Math.abs(tx.amount.toNumber());
  }

  summary.openingBalance = runningBalance - summary.totalCredits + summary.totalDebits;
  summary.closingBalance = runningBalance;

  // Get VM usage for the month
  const vms = await this.prisma.vM.findMany({
    where: {
      user_id: userId,
      created_at: { lte: endDate },
      OR: [
        { terminated_at: null },
        { terminated_at: { gte: startDate } },
      ],
    },
  });

  summary.vms = vms.map(vm => ({
    name: vm.name,
    hourlyRate: vm.hourly_rate.toNumber(),
    hoursRunning: 0, // Calculate based on metrics
  }));

  return {
    period: { year, month },
    summary,
    transactions,
  };
}
// Add these missing methods to your WalletService

async debitWalletWithEvents(
  userId: number,
  amount: number,
  description: string,
  refId?: string,
) {
  if (amount <= 0) {
    throw new BadRequestException('Amount must be greater than 0');
  }

  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = user.wallet_balance.toNumber();
    
    if (currentBalance < amount) {
      // Emit insufficient balance event
      this.eventEmitter.emit('wallet.insufficient', {
        userId,
        currentBalance,
        requiredAmount: amount,
        description,
      });
      throw new BadRequestException('Insufficient balance');
    }

    const newBalance = currentBalance - amount;

    const transaction = await tx.transaction.create({
      data: {
        user_id: userId,
        type: 'debit',
        amount,
        balance_after: newBalance,
        description,
        ref_id: refId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { wallet_balance: newBalance },
    });

    // Check and emit low balance events
    await this.checkAndEmitBalanceEvents(userId, newBalance);

    this.eventEmitter.emit('wallet.debited', {
      userId,
      amount,
      newBalance,
      description,
      refId,
    });

    return transaction;
  });
}

private async checkAndEmitBalanceEvents(userId: number, balance: number) {
  if (balance <= this.CRITICAL_BALANCE_THRESHOLD && balance > 0) {
    this.eventEmitter.emit('wallet.critical_balance', {
      userId,
      balance,
      threshold: this.CRITICAL_BALANCE_THRESHOLD,
    });
    await this.notificationService.sendLowBalanceAlert(userId, balance, 'critical');
  } else if (balance <= this.LOW_BALANCE_THRESHOLD) {
    this.eventEmitter.emit('wallet.low_balance', {
      userId,
      balance,
      threshold: this.LOW_BALANCE_THRESHOLD,
    });
    await this.notificationService.sendLowBalanceAlert(userId, balance, 'warning');
  }
}

async getTransactionDetails(userId: number, transactionId: number) {
  const transaction = await this.prisma.transaction.findFirst({
    where: {
      id: transactionId,
      user_id: userId,
    },
  });

  if (!transaction) {
    throw new NotFoundException('Transaction not found');
  }

  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
    balance_after: transaction.balance_after.toNumber(),
  };
}

async getBalanceHistory(userId: number, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const transactions = await this.prisma.transaction.findMany({
    where: {
      user_id: userId,
      created_at: { gte: startDate },
    },
    orderBy: { created_at: 'asc' },
  });

  const history: Array<{ date: string; balance: number }> = [];
  let currentBalance = 0;

  for (const tx of transactions) {
    currentBalance = tx.balance_after.toNumber();
    history.push({
      date: tx.created_at.toISOString(),
      balance: currentBalance,
    });
  }

  return history;
}


// src/wallet/wallet.service.ts - Add these methods

async getAdminWalletStats() {
  const users = await this.prisma.user.findMany({
    select: {
      wallet_balance: true,
      status: true,
    },
  });

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const transactions = await this.prisma.transaction.findMany({
    where: {
      created_at: { gte: thisMonth },
    },
    select: {
      type: true,
      amount: true,
    },
  });

  const lastMonthTransactions = await this.prisma.transaction.findMany({
    where: {
      created_at: {
        gte: lastMonth,
        lt: thisMonth,
      },
    },
    select: {
      type: true,
      amount: true,
    },
  });

  const totalBalance = users.reduce((sum, u) => sum + u.wallet_balance.toNumber(), 0);
  const activeUsers = users.filter(u => u.status === 'active').length;
  
  const monthlyCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);
    
  const lastMonthCredits = lastMonthTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);
    
  const growthPercentage = lastMonthCredits > 0 
    ? ((monthlyCredits - lastMonthCredits) / lastMonthCredits) * 100 
    : 0;

  const totalCredits = await this.prisma.transaction.aggregate({
    where: { type: 'credit' },
    _sum: { amount: true },
  });

  const totalDebits = await this.prisma.transaction.aggregate({
    where: { type: 'debit' },
    _sum: { amount: true },
  });

  const pendingTransactions = await this.prisma.transaction.count({
    where: { status: 'pending' },
  });

  const avgBalance = activeUsers > 0 ? totalBalance / activeUsers : 0;

  return {
    total_balance: totalBalance,
    total_credits: totalCredits._sum.amount?.toNumber() || 0,
    total_debits: totalDebits._sum.amount?.toNumber() || 0,
    active_users: activeUsers,
    monthly_revenue: monthlyCredits,
    growth_percentage: parseFloat(growthPercentage.toFixed(1)),
    pending_transactions: pendingTransactions,
    avg_balance: parseFloat(avgBalance.toFixed(2)),
  };
}

async getAdminTransactions(params: {
  page: number;
  limit: number;
  type?: 'credit' | 'debit';
  userId?: number;
  search?: string;
}) {
  const { page, limit, type, userId, search } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (type) {
    where.type = type;
  }
  
  if (userId) {
    where.user_id = userId;
  }
  
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { full_name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [transactions, total] = await Promise.all([
    this.prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
      },
    }),
    this.prisma.transaction.count({ where }),
  ]);

  const transformedTransactions = transactions.map(t => ({
    id: t.id,
    user_id: t.user_id,
    user_email: t.user?.email || 'Unknown',
    user_name: t.user?.full_name || 'Unknown',
    type: t.type,
    amount: t.amount.toNumber(),
    balance_after: t.balance_after.toNumber(),
    description: t.description,
    ref_id: t.ref_id,
    metadata: t.metadata,
    created_at: t.created_at,
    admin_name: t.ref_id?.startsWith('admin_') ? 'Admin' : null,
  }));

  return {
    data: transformedTransactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async getAdminUserWallets(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  minBalance?: number;
}) {
  const { page, limit, search, status, minBalance } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (status) {
    where.status = status;
  }
  
  if (minBalance !== undefined) {
    where.wallet_balance = { gte: minBalance };
  }
  
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { full_name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        full_name: true,
        wallet_balance: true,
        status: true,
        verified: true,
        created_at: true,
        _count: {
          select: { vms: true },
        },
        transactions: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: { created_at: true },
        },
      },
    }),
    this.prisma.user.count({ where }),
  ]);

  const transformedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    balance: u.wallet_balance.toNumber(),
    status: u.status as 'active' | 'suspended',
    verified: u.verified,
    vms_count: u._count.vms,
    last_transaction: u.transactions[0]?.created_at || null,
  }));

  return {
    data: transformedUsers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async getPromoCodes() {
  const promos = await this.prisma.coupon.findMany({
    orderBy: { created_at: 'desc' },
  });

  return promos.map(p => ({
    id: p.id,
    code: p.code,
    discount_type: p.discount_type,
    value: p.value.toNumber(),
    max_uses: p.max_uses,
    used_count: p.used_count,
    expires_at: p.expires_at,
    created_at: p.created_at,
    is_active: p.used_count < p.max_uses && new Date() < p.expires_at,
  }));
}

async createPromoCode(data: {
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  max_uses?: number;
  expires_at?: string;
}) {
  const existing = await this.prisma.coupon.findUnique({
    where: { code: data.code.toUpperCase() },
  });

  if (existing) {
    throw new BadRequestException('Promo code already exists');
  }

  const promo = await this.prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      value: data.value,
      max_uses: data.max_uses || 1000,
      expires_at: data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  this.logger.log(`Promo code created: ${promo.code}`);

  return promo;
}

async deletePromoCode(id: number) {
  const promo = await this.prisma.coupon.findUnique({
    where: { id },
  });

  if (!promo) {
    throw new NotFoundException('Promo code not found');
  }

  await this.prisma.coupon.delete({
    where: { id },
  });

  this.logger.log(`Promo code deleted: ${promo.code}`);

  return { success: true, message: 'Promo code deleted' };
}

// src/wallet/wallet.service.ts

async sendUserAlert(userId: number, subject: string, message: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, full_name: true },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Create HTML content for the alert
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">${subject}</h2>
      <p style="color: #4b5563;">Dear ${user.full_name || 'User'},</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #374151; white-space: pre-wrap;">${message}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Best regards,<br>Ebliss Cloud Team</p>
    </div>
  `;

  // Use the EmailService directly for custom HTML content
  if (this.emailService) {
    await this.emailService.sendCustomEmail(user.email, subject, htmlContent);
  } else {
    // Fallback to notification service if email service not available
    await this.notificationService.sendEmail(
      user.email,
      subject,
      'default',
      { message, subject }
    );
  }

  this.logger.log(`Alert sent to user ${userId}: ${subject}`);

  return { success: true, message: 'Alert sent successfully' };
}
















}