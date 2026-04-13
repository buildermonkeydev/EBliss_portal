import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  Min,
  Max,
  IsIn,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
    @ApiProperty({ description: 'Location name (must match Proxmox node name)', example: 'proxmox-node-01' })
  @IsString()
  @IsNotEmpty()
  id?: string;
  @ApiProperty({ description: 'Location name (must match Proxmox node name)', example: 'proxmox-node-01' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Display name', example: 'US East Coast' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'Country', example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Flag emoji', example: '🇺🇸' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiProperty({ description: 'Latency in ms', example: 15, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  latency?: number;

  @ApiProperty({ description: 'Price multiplier', example: 1.0, minimum: 0.5, maximum: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  priceMultiplier?: number;

  @ApiProperty({ description: 'Location features', example: ['DDoS Protection', 'NVMe Storage'] })
  @IsOptional()
  features?: string[];

  @ApiProperty({ description: 'Is location available for deployment', default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateLocationDto {
   @ApiProperty({ description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  name?: string;
  @ApiProperty({ description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Flag emoji', required: false })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiProperty({ description: 'Latency in ms', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  latency?: number;

  @ApiProperty({ description: 'Price multiplier', required: false, minimum: 0.5, maximum: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  priceMultiplier?: number;

  @ApiProperty({ description: 'Location features', required: false })
  @IsOptional()
  features?: string[];

  @ApiProperty({ description: 'Is location available for deployment', required: false })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class LocationResponseDto {
  id: string;
  name: string;
  displayName: string;
  country: string;
  city: string;
  flag: string;
  latency: number;
  priceMultiplier: number;
  available: boolean;
  features: string[];
  status: {
    online: boolean;
    cpu: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
    uptime: number;
    loadavg: number[];
  };
  hardware: {
    cpus: number;
    sockets: number;
    cores: number;
    threads: number;
    model: string;
  };
  network: {
    interfaces: Array<{
      name: string;
      type: string;
      active: boolean;
      address: string;
      netmask: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Location {
  id: string;
  name: string;
  displayName?: string;
  country?: string;
  city?: string;
  flag?: string;
  latency?: number;
  priceMultiplier: number;
  available: boolean;
  features?: string[];
  status: {
    online: boolean;
    cpu: number;
    memory: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
    uptime: number;
    loadavg: number[];
  };
  hardware: {
    cpus: number;
    sockets: number;
    cores: number;
    threads: number;
    model: string;
  };
  network: {
    interfaces: Array<{
      name: string;
      type: string;
      active: boolean;
      address: string;
      netmask: string;
      mac: string;
    }>;
    dns: string[];
  };
  version: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}