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
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles , AdminRole } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @Public() // Make this public for validation
  async validateCoupon(
    @Body() body: { code: string; amount: number },
  ) {
    return this.couponService.validateCoupon(body.code, body.amount);
  }

  @Get()
  @Roles(AdminRole.SUPER_ADMIN,  AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  async getAllCoupons(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.couponService.getAllCoupons(page, limit);
  }

  @Get(':code')
  @Public()
  async getCoupon(@Param('code') code: string) {
    return this.couponService.getCouponByCode(code);
  }
}