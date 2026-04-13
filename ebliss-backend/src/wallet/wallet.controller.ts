import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles , AdminRole } from '../auth/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Req() req) {
    // Convert user ID to number
    const userId = parseInt(req.user.id);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.walletService.getWalletBalance(userId);
  }

  @Get('summary')
  async getSummary(@Req() req) {
    const userId = parseInt(req.user.id);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.walletService.getWalletSummary(userId);
  }

  @Get('transactions')
  async getTransactions(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('type') type?: 'credit' | 'debit',
  ) {
    const userId = parseInt(req.user.id);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.walletService.getTransactionHistory(
      userId,
      page,
      limit,
      type,
    );
  }

  @Post('credit')
  @Throttle({ default: { ttl: 60, limit: 3 } })
  async creditWallet(
    @Req() req,
    @Body('amount') amount: number,
    @Body('payment_method') paymentMethod: string,
    @Body('payment_details') paymentDetails: any,
  ) {
    const userId = parseInt(req.user.id);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    // This would typically be handled by payment gateway
    return this.walletService.creditWallet(
      userId,
      amount,
      `Wallet top-up via ${paymentMethod}`,
      `payment_${Date.now()}`,
    );
  }

  @Post('admin/credit/:userId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  async adminCredit(
    @Req() req,
    @Param('userId', ParseIntPipe) userId: number,
    @Body('amount') amount: number,
    @Body('description') description: string,
  ) {
    const adminId = parseInt(req.user.id);
    if (isNaN(adminId)) {
      throw new BadRequestException('Invalid admin ID');
    }
    return this.walletService.adminCreditWallet(
      adminId,
      userId,
      amount,
      description,
    );
  }

  @Post('admin/debit/:userId')
  @Roles(AdminRole.SUPER_ADMIN,  AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  async adminDebit(
    @Req() req,
    @Param('userId', ParseIntPipe) userId: number,
    @Body('amount') amount: number,
    @Body('description') description: string,
  ) {
    const adminId = parseInt(req.user.id);
    if (isNaN(adminId)) {
      throw new BadRequestException('Invalid admin ID');
    }
    return this.walletService.debitWallet(
      userId,
      amount,
      description,
      `admin_debit_${Date.now()}`,
    );
  }
  // src/wallet/wallet.controller.ts - Add these methods

@Post('apply-promo')
@Throttle({ default: { ttl: 60, limit: 5 } })
async applyPromoCode(
  @Req() req,
  @Body('code') code: string,
  @Body('amount') amount: number,
) {
  const userId = parseInt(req.user.id);
  if (isNaN(userId)) {
    throw new BadRequestException('Invalid user ID');
  }
  return this.walletService.applyPromoCode(userId, code, amount);
}

@Get('stats')
async getWalletStats(@Req() req) {
  const userId = parseInt(req.user.id);
  if (isNaN(userId)) {
    throw new BadRequestException('Invalid user ID');
  }
  return this.walletService.getWalletStats(userId);
}

@Get('balance-history')
async getBalanceHistory(
  @Req() req,
  @Query('days') days: number = 30,
) {
  const userId = parseInt(req.user.id);
  if (isNaN(userId)) {
    throw new BadRequestException('Invalid user ID');
  }
  return this.walletService.getBalanceHistory(userId, days);
}

@Get('monthly-statement')
async getMonthlyStatement(
  @Req() req,
  @Query('year') year: number,
  @Query('month') month: number,
) {
  const userId = parseInt(req.user.id);
  if (isNaN(userId)) {
    throw new BadRequestException('Invalid user ID');
  }
  
  if (!year || !month) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  
  return this.walletService.generateMonthlyStatement(userId, year, month);
}

@Get('transactions/:id')
async getTransactionDetails(
  @Req() req,
  @Param('id', ParseIntPipe) transactionId: number,
) {
  const userId = parseInt(req.user.id);
  if (isNaN(userId)) {
    throw new BadRequestException('Invalid user ID');
  }
  return this.walletService.getTransactionDetails(userId, transactionId);
}

@Post('debit')
@Throttle({ default: { ttl: 60, limit: 10 } })
async debitWallet(
  @Req() req,
  @Body('amount') amount: number,
  @Body('description') description: string,
) {
  const userId = parseInt(req.user.id);
  if (isNaN(userId)) {
    throw new BadRequestException('Invalid user ID');
  }
  return this.walletService.debitWallet(
    userId,
    amount,
    description,
    `debit_${Date.now()}`,
  );
}
}