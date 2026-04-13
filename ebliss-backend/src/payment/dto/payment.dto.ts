import { IsNumber, IsOptional, IsString, IsEnum, Min, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Amount in INR', example: 1000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Currency', default: 'INR', required: false })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiProperty({ description: 'Payment receipt ID', required: false })
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiProperty({ description: 'Coupon code', required: false })
  @IsOptional()
  @IsString()
  coupon_code?: string;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  razorpay_order_id: string;

  @ApiProperty()
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty()
  @IsString()
  razorpay_signature: string;
}

export class AddFundsDto {
  @ApiProperty({ description: 'Amount to add', example: 500 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Coupon code', required: false })
  @IsOptional()
  @IsString()
  coupon_code?: string;
}

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  plan_id: string;

  @ApiProperty()
  @IsNumber()
  total_amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coupon_code?: string;
}

export class PaymentResponseDto {
  success: boolean;
  message?: string;
  data?: any;
}