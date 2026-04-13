import { IsOptional, IsUUID } from 'class-validator';

export class CreateVmDto {
  @IsOptional()
  @IsUUID()
  plan_id?: string;
}