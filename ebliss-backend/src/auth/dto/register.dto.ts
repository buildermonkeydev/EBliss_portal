// src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsPhoneNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @ApiProperty({ example: 'Your Name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'My Company', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ example: '22AAAAA0000A1Z5', required: false })
  @IsOptional()
  @IsString()
  tax_id?: string; // GST Number

  @ApiProperty({ example: 'Maharashtra', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: '400001', required: false })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiProperty({ example: 'IN', required: false })
  @IsOptional()
  @IsString()
  country?: string;
}