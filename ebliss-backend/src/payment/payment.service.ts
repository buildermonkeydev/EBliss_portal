import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { InvoiceService } from '../invoice/invoice.service';



@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private razorpay: Razorpay;

// In payment.service.ts constructor
constructor(
  private configService: ConfigService,
  private prisma: PrismaService,
  private walletService: WalletService,
  private invoiceService:InvoiceService,
  private notificationService: NotificationService,
  private eventEmitter: EventEmitter2,
) {
  const keyId = this.configService.get('RAZORPAY_KEY_ID');
  const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
  
  console.log('Razorpay Config Debug:');
  console.log('RAZORPAY_KEY_ID:', keyId);
  console.log('RAZORPAY_KEY_SECRET:', keySecret ? '***SET***' : 'MISSING');
  console.log('RAZORPAY_KEY_ID length:', keyId?.length);
  console.log('RAZORPAY_KEY_SECRET length:', keySecret?.length);
  
  if (!keyId || !keySecret) {
    this.logger.error('Razorpay credentials are missing!');
    throw new Error('Razorpay credentials not configured');
  }
  
  if (!keyId.startsWith('rzp_test') && !keyId.startsWith('rzp_live')) {
    this.logger.warn('Razorpay key format looks incorrect');
  }
  
  if (keyId && keySecret) {
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    this.logger.log('Razorpay client initialized successfully');
  } else {
    this.logger.warn('Razorpay credentials not configured');
  }
}

  async createOrder(userId: number, createOrderDto: any) {
    try {
      const { amount, currency = 'INR', receipt, coupon_code } = createOrderDto;
      
      let finalAmount = amount;
      let discountAmount = 0;
      let coupon: any | null = null;
      
      // Validate amount
      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }
      
      // Apply coupon if provided
      if (coupon_code) {
        const couponValidation = await this.validateCoupon(coupon_code, amount);
        coupon = couponValidation.coupon;
        discountAmount = couponValidation.discountAmount;
        finalAmount = couponValidation.finalAmount;
      }
      
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      const options = {
        amount: Math.round(finalAmount * 100),
        currency,
        receipt: receipt || `order_${Date.now()}_${userId}`,
        notes: {
          user_id: userId.toString(),
          user_email: user.email,
          original_amount: amount.toString(),
          discount_amount: discountAmount.toString(),
          coupon_code: coupon_code || '',
          type: 'wallet_topup',
        },
      };
      
      const order = await this.razorpay.orders.create(options);
      
      // Store order in database
      const payment = await this.prisma.payment.create({
        data: {
          user_id: userId,
          amount: finalAmount,
          original_amount: amount,
          currency,
          payment_method: 'razorpay',
          status: 'pending',
          reference_id: order.id,
          coupon_code: coupon_code,
          coupon_discount: discountAmount,
          metadata: {
            razorpay_order: {
              id: order.id,
              amount: order.amount,
              currency: order.currency,
              receipt: order.receipt,
            },
            user_email: user.email,
          },
        },
      });
      
      // Create activity log
      await this.prisma.activityLog.create({
        data: {
          user_id: userId,
          action: 'PAYMENT_INITIATED',
          action_type: 'create',
          description: `Initiated payment of ₹${finalAmount} via Razorpay`,
          service_type: 'billing',
          status: 'success',
          metadata: {
            order_id: order.id,
            amount: finalAmount,
          },
        },
      });
      
      return {
        success: true,
        order,
        key_id: this.configService.get('RAZORPAY_KEY_ID'),
        amount: finalAmount,
        original_amount: amount,
        discount: discountAmount,
        payment_id: payment.id,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order:', error);
      throw new BadRequestException(error.message || 'Failed to create payment order');
    }
  }

  /**
   * Verify Payment Signature and Credit Wallet
   */
  async verifyPayment(userId: number, verifyPaymentDto: any) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifyPaymentDto;
      
      // Verify signature
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
      
      if (!keySecret) {
        throw new BadRequestException('Razorpay key secret not configured');
      }
      
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');
      
      if (expectedSignature !== razorpay_signature) {
        this.logger.error(`Invalid payment signature for order: ${razorpay_order_id}`);
        throw new BadRequestException('Invalid payment signature');
      }
      
      // Get payment record
      const payment = await this.prisma.payment.findFirst({
        where: { reference_id: razorpay_order_id, user_id: userId },
      });
      
      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }
      
      // Check if already processed
      if (payment.status === 'completed') {
        throw new BadRequestException('Payment already processed');
      }
      
      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          transaction_id: razorpay_payment_id,
          completed_at: new Date(),
        },
      });
      
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Credit user's wallet
      const walletBalance = await this.walletService.creditWallet(
        userId,
        payment.amount.toNumber(),
        `Wallet top-up via Razorpay (Payment ID: ${razorpay_payment_id})`,
        razorpay_payment_id,
      );
        try {
      // Generate invoice for this payment
      await this.invoiceService.generatePaymentInvoice(userId, {
        amount: payment.amount.toNumber(),
        paymentId: razorpay_payment_id,
        paymentMethod: 'razorpay',
        description: `Wallet top-up of ₹${payment.amount.toNumber()}`,
      });
      this.logger.log(`Payment invoice generated for user ${userId}, payment: ${razorpay_payment_id}`);
    } catch (invoiceError) {
      this.logger.error(`Failed to generate payment invoice: ${invoiceError.message}`);
      // Don't fail the payment if invoice generation fails
    }
     const previousPayments = await this.prisma.payment.count({
      where: { user_id: userId, status: 'completed', id: { not: payment.id } },
    });
    
    if (previousPayments === 0) {
      try {
        await this.invoiceService.generateFirstInvoice(userId);
        this.logger.log(`First invoice generated for user ${userId}`);
      } catch (firstInvoiceError) {
        this.logger.error(`Failed to generate first invoice: ${firstInvoiceError.message}`);
      }
    }
      // Create transaction record if not already created by wallet service
      const existingTransaction = await this.prisma.transaction.findFirst({
        where: { ref_id: razorpay_payment_id },
      });
      
      if (!existingTransaction) {
        await this.prisma.transaction.create({
          data: {
            user_id: userId,
            type: 'credit',
            amount: payment.amount,
          balance_after: user.wallet_balance,
            description: `Wallet top-up via Razorpay (Payment ID: ${razorpay_payment_id})`,
            ref_id: razorpay_payment_id,
          },
        });
      }
      
      // Update coupon usage if applied
      if (payment.coupon_code) {
        await this.prisma.coupon.update({
          where: { code: payment.coupon_code },
          data: { used_count: { increment: 1 } },
        });
      }
      
      // Create activity log
      await this.prisma.activityLog.create({
        data: {
          user_id: userId,
          action: 'WALLET_TOPUP',
          action_type: 'create',
          description: `Added ₹${payment.amount} to wallet via Razorpay`,
          service_type: 'billing',
          status: 'success',
          metadata: {
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            amount: payment.amount,
          },
        },
      });
      
      // Send notification
      await this.notificationService.sendPaymentConfirmation(
        userId,
        payment.amount.toNumber(),
        razorpay_payment_id,
      );
      
      // Emit event for other services
      this.eventEmitter.emit('payment.success', {
        userId,
        amount: payment.amount.toNumber(),
        paymentId: payment.id,
        transactionId: razorpay_payment_id,
      });
      
      return {
        success: true,
        message: 'Payment verified and wallet credited successfully',
        balance: walletBalance,
        amount: payment.amount,
      };
    } catch (error) {
      this.logger.error('Failed to verify payment:', error);
      
      // Mark payment as failed
      if (verifyPaymentDto.razorpay_order_id) {
        await this.prisma.payment.updateMany({
          where: { reference_id: verifyPaymentDto.razorpay_order_id, user_id: userId },
          data: {
            status: 'failed',
            failure_reason: error.message,
          },
        });
      }
      
      throw new BadRequestException(error.message || 'Failed to verify payment');
    }
  }
0.
  /**
   * Handle Razorpay Webhook
   */
  async handleWebhook(payload: any, signature: string) {
    try {
      // Verify webhook signature
      const webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        this.logger.warn('Webhook secret not configured, skipping verification');
      } else {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex');

        if (signature !== expectedSignature) {
          this.logger.error('Invalid webhook signature');
          throw new BadRequestException('Invalid signature');
        }
      }

      const event = payload.event;
      const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity;

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(entity);
          break;
          
        case 'payment.failed':
          await this.handlePaymentFailed(entity);
          break;
          
        case 'refund.created':
          await this.handleRefundCreated(entity);
          break;
          
        case 'order.paid':
          await this.handleOrderPaid(entity);
          break;
          
        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private async handlePaymentCaptured(payment: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { reference_id: payment.order_id },
    });
    
    if (paymentRecord && paymentRecord.status === 'pending') {
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'completed',
          transaction_id: payment.id,
          completed_at: new Date(),
        },
      });
      
      // Credit wallet if not already credited
      const userId = parseInt(payment.notes?.user_id);
      if (userId && paymentRecord.status === 'pending') {
        await this.walletService.creditWallet(
          userId,
          paymentRecord.amount.toNumber(),
          `Wallet top-up via Razorpay (Webhook)`,
          payment.id,
        );
        
        await this.notificationService.sendPaymentConfirmation(
          userId,
          paymentRecord.amount.toNumber(),
          payment.id,
        );
      }
    }
  }

  private async handlePaymentFailed(payment: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { reference_id: payment.order_id },
    });
    
    if (paymentRecord) {
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'failed',
          failure_reason: payment.error_reason || 'Payment failed',
        },
      });
      
      // Notify user about failed payment
      await this.notificationService.sendPaymentFailedNotification(
        paymentRecord.user_id,
        paymentRecord.amount.toNumber(),
        payment.id,
      );
    }
  }

  private async handleRefundCreated(refund: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { transaction_id: refund.payment_id },
    });
    
    if (paymentRecord && paymentRecord.metadata) {
      const metadata = paymentRecord.metadata as any;
      const refundAmount = refund.amount ? refund.amount / 100 : 0;
      
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'refunded',
          metadata: {
            ...metadata,
            refund_id: refund.id,
            refund_amount: refundAmount,
          },
        },
      });
      
      // Deduct from wallet
      await this.walletService.debitWallet(
        paymentRecord.user_id,
        refundAmount,
        `Refund for payment ${refund.payment_id}`,
        refund.id,
      );
    }
  }

  private async handleOrderPaid(order: any) {
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { reference_id: order.id },
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

  /**
   * Validate Coupon Code
   */
  private async validateCoupon(code: string, amount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    if (coupon.used_count >= coupon.max_uses) {
      throw new BadRequestException('Coupon has reached maximum usage limit');
    }

    if (coupon.expires_at < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }

    let discountAmount = 0;

    if (coupon.discount_type === 'percentage') {
      discountAmount = (amount * coupon.value.toNumber()) / 100;
    } else {
      discountAmount = Math.min(coupon.value.toNumber(), amount);
    }

    return {
      coupon,
      discountAmount,
      finalAmount: amount - discountAmount,
    };
  }

  /**
   * Get Payment Status
   */
  async getPaymentStatus(userId: number, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { reference_id: paymentId },
          { transaction_id: paymentId },
        ],
        user_id: userId,
      },
    });
    
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    
    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        original_amount: payment.original_amount,
        status: payment.status,
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        completed_at: payment.completed_at,
        coupon_discount: payment.coupon_discount,
      },
    };
  }

  /**
   * Get Payment History
   */
  async getPaymentHistory(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { user_id: userId } }),
    ]);
    
    return {
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process Refund
   */
  async processRefund(userId: number, paymentId: string, reason?: string) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { reference_id: paymentId, user_id: userId, status: 'completed' },
      });
      
      if (!payment) {
        throw new NotFoundException('Payment not found or not eligible for refund');
      }
      
      if (!payment.completed_at) {
        throw new BadRequestException('Payment completion date not found');
      }
      
      // Check refund window (30 days)
      const daysSincePayment = Math.floor(
        (Date.now() - payment.completed_at.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSincePayment > 30) {
        throw new BadRequestException('Refund window has expired (30 days)');
      }
      
      if (!payment.transaction_id) {
        throw new BadRequestException('Transaction ID not found for refund');
      }
      
      // Call Razorpay refund API
      const refund = await this.razorpay.payments.refund(payment.transaction_id, {
        amount: Math.round(payment.amount.toNumber() * 100),
        notes: {
          user_id: userId.toString(),
          reason: reason || 'Customer requested refund',
        },
      });
      
      const refundAmount = refund.amount ? refund.amount / 100 : payment.amount.toNumber();
      const metadata = payment.metadata as any || {};
      
      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'refunded',
          metadata: {
            ...metadata,
            refund_id: refund.id,
            refund_reason: reason,
            refund_amount: refundAmount,
          },
        },
      });
      
      // Deduct from wallet
      await this.walletService.debitWallet(
        userId,
        payment.amount.toNumber(),
        `Refund for payment ${paymentId}`,
        refund.id,
      );
      
      // Send notification
      await this.notificationService.sendRefundNotification(
        userId,
        payment.amount.toNumber(),
        refund.id,
      );
      
      return {
        success: true,
        message: 'Refund processed successfully',
        refund_id: refund.id,
        amount: refundAmount,
      };
    } catch (error) {
      this.logger.error('Failed to process refund:', error);
      throw new BadRequestException(error.message || 'Failed to process refund');
    }
  }

  /**
   * Get Razorpay Payment Details
   */
  async getRazorpayPaymentDetails(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Razorpay payment:', error);
      throw new BadRequestException('Failed to fetch payment details');
    }
  }

  /**
   * Get Payment Statistics for Admin
   */
  async getPaymentStats() {
    const [totalPayments, totalAmount, recentPayments, monthlyStats] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'completed' } }),
      this.prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'completed' },
        orderBy: { completed_at: 'desc' },
        take: 10,
        include: {
          user: {
            select: { email: true, full_name: true },
          },
        },
      }),
      this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', completed_at) as month,
          COUNT(*) as count,
          SUM(amount) as total
        FROM payments
        WHERE status = 'completed'
          AND completed_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', completed_at)
        ORDER BY month DESC
      `,
    ]);

    return {
      success: true,
      stats: {
        total_payments: totalPayments,
        total_revenue: totalAmount._sum.amount || 0,
        recent_payments: recentPayments,
        monthly_stats: monthlyStats,
      },
    };
  }
}