// src/product/admin-product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  BulkUpdateProductsDto,
  BulkDeleteProductsDto,
  UpdateProductStatusDto,
} from './dto/product.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

interface RequestWithUser extends Request {
  user: {
    id: string | number;
    [key: string]: any;
  };
}

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './public/uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `product-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async createProduct(
    @Req() req: RequestWithUser,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const adminId = parseInt(req.user.id.toString());
    const product = await this.productService.createProduct(adminId, dto, files);
    return { success: true, product };
  }

  @Get()
  async getAdminProducts(@Req() req: RequestWithUser, @Query() query: QueryProductsDto) {
    const adminId = parseInt(req.user.id.toString());
    const result = await this.productService.getAdminProducts(query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getProductStats(@Req() req: RequestWithUser) {
    const adminId = parseInt(req.user.id.toString());
    const stats = await this.productService.getProductStats(adminId);
    return { success: true, stats };
  }

  @Get(':id')
  async getAdminProduct(@Req() req: RequestWithUser, @Param('id') id: string) {
    const adminId = parseInt(req.user.id.toString());
    const product = await this.productService.getAdminProduct(adminId, id);
    return { success: true, product };
  }

  @Put(':id')
  async updateProduct(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const product = await this.productService.updateProduct(adminId, id, dto);
    return { success: true, product };
  }

  @Patch(':id/status')
  async updateProductStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const product = await this.productService.updateProductStatus(adminId, id, dto.status);
    return { success: true, product };
  }

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './public/uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `product-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async updateProductImages(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const adminId = parseInt(req.user.id.toString());
    const product = await this.productService.updateProductImages(adminId, id, files);
    return { success: true, product };
  }

  @Delete(':id/images')
  async deleteProductImage(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    const adminId = parseInt(req.user.id.toString());
    const product = await this.productService.deleteProductImage(adminId, id, imageUrl);
    return { success: true, product };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Req() req: RequestWithUser, @Param('id') id: string) {
    const adminId = parseInt(req.user.id.toString());
    const result = await this.productService.deleteProduct(adminId, id);
    return result;
  }

  @Post('bulk-update')
  async bulkUpdateProducts(@Req() req: RequestWithUser, @Body() dto: BulkUpdateProductsDto) {
    const adminId = parseInt(req.user.id.toString());
    const result = await this.productService.bulkUpdateProducts(adminId, dto);
    return result;
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDeleteProducts(@Req() req: RequestWithUser, @Body() dto: BulkDeleteProductsDto) {
    const adminId = parseInt(req.user.id.toString());
    const result = await this.productService.bulkDeleteProducts(adminId, dto);
    return result;
  }
}