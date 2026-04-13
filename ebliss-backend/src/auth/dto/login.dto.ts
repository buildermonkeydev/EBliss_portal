// src/auth/dto/login.dto.ts
import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  password: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}