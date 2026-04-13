// src/product/product.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { QueryProductsDto } from './dto/product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getProducts(@Query() query: QueryProductsDto) {
    const result = await this.productService.getPublicProducts(query);
    return { success: true, ...result };
  }

  @Get('featured')
  async getFeaturedProducts(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    const products = await this.productService.getFeaturedProducts(limit || 8);
    return { success: true, products };
  }

  @Get(':slug')
  async getProduct(@Param('slug') slug: string) {
    const product = await this.productService.getPublicProduct(slug);
    return { success: true, product };
  }

  @Get(':id/related')
  async getRelatedProducts(
    @Param('id') id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const products = await this.productService.getRelatedProducts(id, limit || 4);
    return { success: true, products };
  }
}