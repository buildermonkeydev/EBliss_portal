import { IsString, IsOptional, IsEnum, IsObject, IsIP } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ActivityType {
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  START = 'start',
  STOP = 'stop',
  REBOOT = 'reboot',
  SECURITY = 'security',
  OTHER = 'other',
}

export enum ServiceType {
  VPS = 'vps',
  FIREWALL = 'firewall',
  SSH = 'ssh',
  BILLING = 'billing',
  ACCOUNT = 'account',
  OTHER = 'other',
}

export enum ActivityStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  WARNING = 'warning',
}

export class CreateActivityLogDto {
  @ApiProperty()
  @IsString()
  action: string;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  action_type: ActivityType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  service_type: ServiceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  service_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIP()
  ip_address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiProperty({ enum: ActivityStatus })
  @IsEnum(ActivityStatus)
  status: ActivityStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryActivityLogsDto {
   @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  service_type?: ServiceType;

  @ApiProperty({ required: false, enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  start_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  end_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  date_range?: 'today' | 'week' | 'month' | 'all';
}