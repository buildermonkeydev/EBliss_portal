import { IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class AssignServerDto {
  @IsNumber()
  user_id: number;

  @IsOptional()
  @IsDateString()
  contract_start?: string;

  @IsOptional()
  @IsDateString()
  contract_end?: string;

  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}