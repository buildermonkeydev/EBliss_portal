// src/product/dto/product.dto.ts
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, IsDecimal, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, StockStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tax_rate?: number;

  @IsOptional()
  @IsBoolean()
  tax_inclusive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  low_stock_threshold?: number;

  @IsOptional()
  @IsBoolean()
  backorder_allowed?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weight_kg?: number;

  @IsOptional()
  @IsObject()
  dimensions_cm?: any;

  @IsOptional()
  @IsString()
  shipping_class?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category_ids?: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

  @IsOptional()
  @IsString()
  meta_title?: string;

  @IsOptional()
  @IsString()
  meta_description?: string;

  @IsOptional()
  @IsString()
  meta_keywords?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tax_rate?: number;

  @IsOptional()
  @IsBoolean()
  tax_inclusive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  low_stock_threshold?: number;

  @IsOptional()
  @IsBoolean()
  backorder_allowed?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weight_kg?: number;

  @IsOptional()
  @IsObject()
  dimensions_cm?: any;

  @IsOptional()
  @IsString()
  shipping_class?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category_ids?: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

  @IsOptional()
  @IsString()
  meta_title?: string;

  @IsOptional()
  @IsString()
  meta_description?: string;

  @IsOptional()
  @IsString()
  meta_keywords?: string;
}

export class QueryProductsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsEnum(StockStatus)
  stock_status?: StockStatus;

  @IsOptional()
  @Type(() => Boolean)
  featured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_price?: number;

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'price' | 'stock' | 'created_at' | 'popularity';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';
}

export class BulkUpdateProductsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsObject()
  data: {
    status?: ProductStatus;
    featured?: boolean;
    is_active?: boolean;
    stock_quantity?: number;
    low_stock_threshold?: number;
  };
}

export class BulkDeleteProductsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  status: ProductStatus;
}