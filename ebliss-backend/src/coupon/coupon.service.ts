import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(code: string, amount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
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

  async applyCoupon(userId: number, code: string, amount: number) {
    const validation = await this.validateCoupon(code, amount);

    // Record usage
    await this.prisma.coupon.update({
      where: { id: validation.coupon.id },
      data: { used_count: { increment: 1 } },
    });

    // Log coupon usage
    await this.prisma.auditLog.create({
      data: {
        admin_id: userId,
        action: 'COUPON_APPLIED',
        target_type: 'user',
        target_id: userId.toString(),
        payload_json: { code, discount: validation.discountAmount },
        ip: 'user_action',
      },
    });

    return validation;
  }

  async createCoupon(data: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    value: number;
    max_uses: number;
    expires_at: Date;
    adminId: number;
  }) {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        value: data.value,
        max_uses: data.max_uses,
        expires_at: data.expires_at,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        admin_id: data.adminId,
        action: 'COUPON_CREATED',
        target_type: 'coupon',
        target_id: coupon.id.toString(),
        payload_json: { code: coupon.code },
        ip: 'admin_action',
      },
    });

    return coupon;
  }
async getCouponByCode(code: string) {
  const coupon = await this.prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      discount_type: true,
      value: true,
      max_uses: true,
      used_count: true,
      expires_at: true,
      created_at: true,
    }
  });

  if (!coupon) {
    throw new NotFoundException('Coupon not found');
  }

  // Check if coupon is expired
  if (coupon.expires_at < new Date()) {
    throw new BadRequestException('Coupon has expired');
  }

  // Check if coupon has reached max uses
  if (coupon.used_count >= coupon.max_uses) {
    throw new BadRequestException('Coupon has reached maximum usage limit');
  }

  return {
    ...coupon,
    is_valid: true,
    valid_until: coupon.expires_at,
    remaining_uses: coupon.max_uses - coupon.used_count,
  };
}



  async getAllCoupons(page: number = 1, limit: number = 50) {
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coupon.count(),
    ]);

    return {
      data: coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteCoupon(id: number, adminId: number) {
    const coupon = await this.prisma.coupon.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        admin_id: adminId,
        action: 'COUPON_DELETED',
        target_type: 'coupon',
        target_id: id.toString(),
        payload_json: { code: coupon.code },
        ip: 'admin_action',
      },
    });

    return coupon;
  }
}