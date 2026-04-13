// src/wallet/admin-wallet.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin - Wallet')
@Controller('wallet/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get wallet statistics (Admin)' })
  async getAdminStats() {
    return this.walletService.getAdminWalletStats();
  }

  @Get('transactions')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all transactions (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['credit', 'debit'] })
  @ApiQuery({ name: 'user_id', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAdminTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('type') type?: 'credit' | 'debit',
    @Query('user_id') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.walletService.getAdminTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      userId: userId ? parseInt(userId) : undefined,
      search,
    });
  }

  @Get('users')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all user wallets (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'min_balance', required: false, type: Number })
  async getAdminUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('min_balance') minBalance?: string,
  ) {
    return this.walletService.getAdminUserWallets({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      minBalance: minBalance ? parseFloat(minBalance) : undefined,
    });
  }

  @Get('users/:userId/balance-history')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get user balance history (Admin)' })
  async getUserBalanceHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('days') days: string = '30',
  ) {
    return this.walletService.getBalanceHistory(userId, parseInt(days));
  }

  @Get('users/:userId/monthly-statement')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get user monthly statement (Admin)' })
  async getUserMonthlyStatement(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.walletService.generateMonthlyStatement(
      userId,
      parseInt(year),
      parseInt(month),
    );
  }

  @Get('promos')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all promo codes (Admin)' })
  async getPromoCodes() {
    return this.walletService.getPromoCodes();
  }

  @Post('promos')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create promo code (Admin)' })
  async createPromoCode(
    @Body() data: {
      code: string;
      discount_type: 'percentage' | 'fixed';
      value: number;
      max_uses?: number;
      expires_at?: string;
    },
  ) {
    return this.walletService.createPromoCode(data);
  }

  @Delete('promos/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete promo code (Admin)' })
  async deletePromoCode(@Param('id', ParseIntPipe) id: number) {
    return this.walletService.deletePromoCode(id);
  }
@Post('users/:userId/alert')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
@ApiOperation({ summary: 'Send alert to user (Admin)' })
async sendUserAlert(
  @Param('userId', ParseIntPipe) userId: number,
  @Body() data: { subject: string; message: string },
) {
  return this.walletService.sendUserAlert(userId, data.subject, data.message);
}




}