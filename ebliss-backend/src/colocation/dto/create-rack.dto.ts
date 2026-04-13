import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { RackStatus } from '@prisma/client';

export class CreateRackDto {
  @IsString()
  name: string;

  @IsString()
  datacenter: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  total_units?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  power_capacity_kw?: number;

  @IsOptional()
  @IsNumber()
  temperature_c?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity_percent?: number;

  @IsOptional()
  @IsEnum(RackStatus)
  status?: RackStatus;
}