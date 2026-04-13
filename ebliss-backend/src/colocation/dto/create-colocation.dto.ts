import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CabinetType, AccessLevel } from '@prisma/client';

export class PowerFeedDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(110)
  @Max(480)
  voltage: number;

  @IsNumber()
  @Min(10)
  @Max(63)
  amperage: number;

  @IsString()
  phase: string;

  @IsOptional()
  @IsNumber()
  power_kw?: number;
}

export class CreateColocationDto {
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @IsString()
  datacenter: string;

  @IsString()
  rack_id: string;

  @IsOptional()
  @IsString()
  rack_name?: string;

  @IsString()
  unit_position: string;

  @IsNumber()
  @Min(1)
  @Max(48)
  unit_size: number;

  @IsOptional()
  @IsEnum(CabinetType)
  cabinet_type?: CabinetType;

  @IsOptional()
  @IsNumber()
  power_capacity_kw?: number;

  @IsOptional()
  @IsString()
  network_port?: string;

  @IsOptional()
  @IsNumber()
  bandwidth_mbps?: number;

  @IsOptional()
  @IsNumber()
  cross_connects?: number;

  @IsOptional()
  @IsString()
  ipv4_allocation?: string;

  @IsOptional()
  @IsString()
  ipv6_allocation?: string;

  @IsOptional()
  @IsNumber()
  asn?: number;

  @IsOptional()
  @IsEnum(AccessLevel)
  access_level?: AccessLevel;

  @IsOptional()
  @IsBoolean()
  biometric_access?: boolean;

  @IsOptional()
  @IsBoolean()
  security_camera?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PowerFeedDto)
  power_feeds?: PowerFeedDto[];

  @IsOptional()
  @IsString()
  cooling_type?: string;

  @IsNumber()
  @Min(0)
  monthly_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  setup_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  power_cost_per_kwh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cross_connect_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(90)
  @Max(100)
  sla_uptime_guarantee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sla_credit_percent?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}