import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  RawBody,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create Razorpay Order for Wallet Top-up
   */
  @Post('create-order')
  async createOrder(@Req() req, @Body() body: any) {
    const userId = parseInt(req.user.id);
    const result = await this.paymentService.createOrder(userId, body);
    return result;
  }

  /**
   * Verify Payment
   */
  @Post('verify')
  async verifyPayment(@Req() req, @Body() body: any) {
    const userId = parseInt(req.user.id);
    const result = await this.paymentService.verifyPayment(userId, body);
    return result;
  }

  /**
   * Get Payment Status
   */
  @Get('status/:paymentId')
  async getPaymentStatus(@Req() req, @Param('paymentId') paymentId: string) {
    const userId = parseInt(req.user.id);
    const result = await this.paymentService.getPaymentStatus(userId, paymentId);
    return result;
  }

  /**
   * Get Payment History
   */
  @Get('history')
  async getPaymentHistory(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = parseInt(req.user.id);
    const result = await this.paymentService.getPaymentHistory(userId, page, limit);
    return result;
  }

  /**
   * Process Refund
   */
  @Post('refund/:paymentId')
  async processRefund(
    @Req() req,
    @Param('paymentId') paymentId: string,
    @Body('reason') reason?: string,
  ) {
    const userId = parseInt(req.user.id);
    const result = await this.paymentService.processRefund(userId, paymentId, reason);
    return result;
  }

  /**
   * Razorpay Webhook (No Auth - Public Endpoint)
   */
  @Post('webhook/razorpay')
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @RawBody() rawBody: Buffer,
  ) {
    const payload = JSON.parse(rawBody.toString());
    const result = await this.paymentService.handleWebhook(payload, signature);
    return result;
  }

  /**
   * Admin: Get Payment Statistics
   */
  @Get('admin/stats')
  @Roles('super', 'accountant')
  @UseGuards(RolesGuard)
  async getPaymentStats() {
    const result = await this.paymentService.getPaymentStats();
    return result;
  }
}