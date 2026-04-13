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
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSSHKeyDto {
  @ApiProperty({ description: 'Key name', example: 'My Laptop' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Public SSH key', example: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ description: 'Key description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSSHKeyDto {
  @ApiProperty({ description: 'Key name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Key description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Is key active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ssh-key.dto.ts - Update AddSSHKeyToVMDto

export class AddSSHKeyToVMDto {
  @ApiProperty({ description: 'VM ID (Proxmox ID)', example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(100)
  vmid?: number;

  @ApiProperty({ description: 'VM Database ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  vmId?: number;

  @ApiProperty({ description: 'SSH key IDs to add', type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  keyIds: number[];
}

export class ValidateSSHKeyDto {
  @ApiProperty({ description: 'Public SSH key to validate' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export interface SSHKey {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  type: string;
  description?: string;
  isActive: boolean;
  lastUsed?: Date;
  usedCount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface SSHKeyWithProxmox extends SSHKey {
  proxmoxUserId: string;
  proxmoxSynced: boolean;
  syncedAt?: Date;
}