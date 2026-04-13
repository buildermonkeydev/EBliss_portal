import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, IsObject, Min, Max } from 'class-validator';
import { StorageType } from '@prisma/client';

export class StorageDto {
  @IsEnum(StorageType)
  type: StorageType;

  @IsNumber()
  @Min(1)
  size_gb: number;

  @IsOptional()
  @IsString()
  raid_level?: string;

  @IsOptional()
  @IsNumber()
  drive_count?: number;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class CreateDedicatedServerDto {
  @IsString()
  name: string;

  @IsString()
  hostname: string;

  @IsOptional()
  @IsNumber()
  user_id?: number;

  // Hardware
  @IsString()
  cpu_model: string;

  @IsNumber()
  @Min(1)
  cpu_cores: number;

  @IsNumber()
  @Min(1)
  cpu_threads: number;

  @IsString()
  cpu_speed: string;

  @IsNumber()
  @Min(1)
  ram_gb: number;

  @IsOptional()
  @IsString()
  ram_type?: string;

  @IsOptional()
  @IsString()
  ram_speed?: string;

  // Storage
  @IsArray()
  storage: StorageDto[];

  // Network
  @IsOptional()
  @IsString()
  network_port?: string;

  @IsOptional()
  @IsNumber()
  bandwidth_tb?: number;

  @IsOptional()
  @IsNumber()
  ipv4_count?: number;

  @IsOptional()
  @IsNumber()
  ipv6_count?: number;

  // Location
  @IsString()
  datacenter: string;

  @IsOptional()
  @IsString()
  rack_id?: string;

  @IsOptional()
  @IsString()
  rack_position?: string;

  // OS
  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  os_version?: string;

  @IsOptional()
  @IsString()
  root_password?: string;

  // Pricing
  @IsNumber()
  @Min(0)
  monthly_price: number;

  @IsOptional()
  @IsNumber()
  setup_fee?: number;

  // Features
  @IsOptional()
  @IsBoolean()
  ddos_protection?: boolean;

  @IsOptional()
  @IsBoolean()
  backup_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  monitoring_enabled?: boolean;

  // IPMI/KVM
  @IsOptional()
  @IsString()
  ipmi_ip?: string;

  @IsOptional()
  @IsString()
  ipmi_user?: string;

  @IsOptional()
  @IsString()
  ipmi_password?: string;

  @IsOptional()
  @IsBoolean()
  kvm_enabled?: boolean;

  @IsOptional()
  @IsString()
  kvm_type?: string;

  // Notes
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}