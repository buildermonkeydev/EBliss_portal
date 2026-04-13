import { Controller, Post, Headers, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import crypto from 'crypto';

@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    const webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');
    
    if (expectedSignature !== signature) {
      return { status: 'invalid signature' };
    }
    
    const { event, payload } = body;
    
    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload.payment.entity);
        break;
      case 'refund.created':
        await this.handleRefundCreated(payload.refund.entity);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
    
    return { status: 'success' };
  }

  private async handlePaymentCaptured(payment: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { transaction_id: payment.id },
    });
    
    if (paymentRecord && paymentRecord.status === 'pending') {
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'completed',
          completed_at: new Date(),
        },
      });
    }
  }

  private async handlePaymentFailed(payment: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { transaction_id: payment.id },
    });
    
    if (paymentRecord) {
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'failed',
          failure_reason: payment.error_reason || 'Payment failed',
        },
      });
    }
  }

  private async handleRefundCreated(refund: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { transaction_id: refund.payment_id },
    });
    
    if (paymentRecord) {
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'refunded',
        },
      });
    }
  }
}