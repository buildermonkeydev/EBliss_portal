import { IsString, IsNumber, IsOptional, IsEnum, IsObject, Min, Max } from 'class-validator';
import { DeviceType, DeviceStatus } from '@prisma/client';

export class CreateRackDeviceDto {
  @IsString()
  name: string;

  @IsEnum(DeviceType)
  type: DeviceType;

  @IsNumber()
  @Min(1)
  position: number;

  @IsNumber()
  @Min(1)
  @Max(52)
  size_u: number;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsNumber()
  power_draw_watts?: number;

  @IsOptional()
  @IsObject()
  metadata?: any;
}