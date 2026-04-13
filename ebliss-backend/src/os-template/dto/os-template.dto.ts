import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  IsUrl,
  Min,
  Max,
  IsIn,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'ubuntu-22.04' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template version', example: '22.04' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'OS family', example: 'ubuntu', enum: ['ubuntu', 'debian', 'centos', 'rocky', 'almalinux', 'windows', 'alpine'] })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiProperty({ description: 'Category', example: 'linux', enum: ['linux', 'windows'] })
  @IsOptional()
  @IsString()
  @IsIn(['linux', 'windows'])
  category?: string;

  @ApiProperty({ description: 'Minimum disk space in GB', example: 20, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minDisk?: number;

  @ApiProperty({ description: 'Minimum memory in GB', example: 1, minimum: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  minMemory?: number;

  @ApiProperty({ description: 'Is this template recommended', default: false })
  @IsOptional()
  @IsBoolean()
  recommended?: boolean;

  @ApiProperty({ description: 'Template tags', required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UploadTemplateDto {
  @ApiProperty({ description: 'Node name', example: 'proxmox-node-01' })
  @IsString()
  @IsNotEmpty()
  node: string;

  @ApiProperty({ description: 'Storage name', example: 'local' })
  @IsString()
  @IsNotEmpty()
  storage: string;

  @ApiProperty({ description: 'File path to upload', type: 'string', format: 'binary' })
  file: any;
}

export class DownloadTemplateDto {
  @ApiProperty({ description: 'Node name', example: 'proxmox-node-01' })
  @IsString()
  @IsNotEmpty()
  node: string;

  @ApiProperty({ description: 'Storage name', example: 'local' })
  @IsString()
  @IsNotEmpty()
  storage: string;

  @ApiProperty({ description: 'Template URL', example: 'https://example.com/ubuntu-22.04.tar.gz' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Filename', example: 'ubuntu-22.04.tar.gz' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'Checksum for verification', required: false })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiProperty({ description: 'Checksum algorithm', required: false, enum: ['md5', 'sha1', 'sha256'] })
  @IsOptional()
  @IsString()
  @IsIn(['md5', 'sha1', 'sha256'])
  checksumAlgorithm?: string;
}

export class CloneTemplateDto {
  @ApiProperty({ description: 'Target node', example: 'proxmox-node-01' })
  @IsString()
  @IsNotEmpty()
  targetNode: string;

  @ApiProperty({ description: 'Target storage', example: 'local-lvm' })
  @IsString()
  @IsNotEmpty()
  targetStorage: string;

  @ApiProperty({ description: 'New VM ID', example: 100 })
  @IsNumber()
  @Min(100)
  vmid: number;

  @ApiProperty({ description: 'VM name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Full clone (vs linked clone)', default: true })
  @IsOptional()
  @IsBoolean()
  full?: boolean;
}

export class UpdateTemplateMetadataDto {
  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'Template version', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'OS family', required: false })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiProperty({ description: 'Minimum disk space', required: false })
  @IsOptional()
  @IsNumber()
  minDisk?: number;

  @ApiProperty({ description: 'Minimum memory', required: false })
  @IsOptional()
  @IsNumber()
  minMemory?: number;

  @ApiProperty({ description: 'Is recommended', required: false })
  @IsOptional()
  @IsBoolean()
  recommended?: boolean;

  @ApiProperty({ description: 'Tags', required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export interface OTTemplate {
  id: string;
  name: string;
  displayName?: string;
  volumeId: string;
  node: string;
  storage: string;
  size: number;
  format: string;
  contentType: string;
  description?: string;
  version?: string;
  family?: string;
  category: 'linux' | 'windows';
  minDisk: number;
  minMemory: number;
  recommended: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}