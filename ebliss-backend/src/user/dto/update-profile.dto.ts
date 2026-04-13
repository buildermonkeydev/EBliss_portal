import { IsOptional, IsString, IsPhoneNumber, Length, IsISO31661Alpha2 } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Length(8, 15)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  company?: string;

  @IsOptional()
  @IsString()
  @Length(5, 30)
  tax_id?: string;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  state?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  postal_code?: string;
}