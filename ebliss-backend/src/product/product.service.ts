// src/product/product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StockStatus, ProductStatus } from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  BulkUpdateProductsDto,
  BulkDeleteProductsDto,
} from './dto/product.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper method to generate unique slug
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  // Helper method to calculate stock status
  private calculateStockStatus(stock: number, threshold: number = 5): StockStatus {
    if (stock <= 0) return StockStatus.out_of_stock;
    if (stock <= threshold) return StockStatus.low_stock;
    return StockStatus.in_stock;
  }

  // Helper method to format product response
  private formatProductResponse(product: any) {
    return {
      ...product,
      price: parseFloat(product.price.toString()),
      discount_price: product.discount_price ? parseFloat(product.discount_price.toString()) : null,
      cost_price: product.cost_price ? parseFloat(product.cost_price.toString()) : null,
      specifications: product.specifications || {},
      images: product.images || [],
    };
  }

  // ==================== ADMIN METHODS ====================

  async createProduct(adminId: number, dto: CreateProductDto, files?: Express.Multer.File[]) {
    // Check if SKU already exists
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new BadRequestException('Product with this SKU already exists');
    }

    // Generate slug
    const slug = await this.generateUniqueSlug(dto.name);

    // Process uploaded images
    const imageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    
    if (dto.thumbnail && !imageUrls.includes(dto.thumbnail)) {
      imageUrls.unshift(dto.thumbnail);
    }

    // Calculate stock status - FIX: Provide default values
    const stockQuantity = dto.stock_quantity ?? 0;
    const lowStockThreshold = dto.low_stock_threshold ?? 5;
    const stockStatus = this.calculateStockStatus(stockQuantity, lowStockThreshold);

    // Create product
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        sku: dto.sku,
        short_description: dto.short_description,
        description: dto.description,
        price: dto.price,
        discount_price: dto.discount_price,
        cost_price: dto.cost_price,
        tax_rate: dto.tax_rate || 0,
        tax_inclusive: dto.tax_inclusive || false,
        stock_quantity: stockQuantity,
        low_stock_threshold: lowStockThreshold,
        stock_status: stockStatus,
        backorder_allowed: dto.backorder_allowed || false,
        weight_kg: dto.weight_kg,
        dimensions_cm: dto.dimensions_cm,
        shipping_class: dto.shipping_class,
        featured: dto.featured || false,
        is_active: dto.is_active ?? true,
        status: dto.status || ProductStatus.draft,
        images: imageUrls,
        thumbnail: dto.thumbnail || imageUrls[0] || null,
        specifications: dto.specifications || {},
        meta_title: dto.meta_title,
        meta_description: dto.meta_description,
        meta_keywords: dto.meta_keywords,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Add categories if provided
    if (dto.category_ids && dto.category_ids.length > 0) {
      await this.prisma.productCategoryRelation.createMany({
        data: dto.category_ids.map((categoryId, index) => ({
          product_id: product.id,
          category_id: categoryId,
          is_primary: index === 0, // First category is primary
        })),
      });
    }

    // Log admin action - FIX: Use correct AuditLog field names
    await this.logAdminAction(adminId, 'CREATE_PRODUCT', product.id, { productName: dto.name });

    return this.formatProductResponse(product);
  }

async getAdminProducts(query: QueryProductsDto) {
  const {
    page = 1,
    limit = 20,
    search,
    category_id,
    status,
    stock_status,
    featured,
    is_active,
    min_price,
    max_price,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = query;

  // FIX: Convert to numbers (query params come as strings)
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

  // Build where conditions
  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { short_description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category_id) {
    where.categories = {
      some: {
        category_id,
      },
    };
  }

  if (status) {
    where.status = status as any;
  }

  if (stock_status) {
    where.stock_status = stock_status as any;
  }

  if (featured !== undefined) {
    where.featured = Boolean(featured);
  }

  if (is_active !== undefined) {
    where.is_active = Boolean(is_active);
  }

  if (min_price !== undefined || max_price !== undefined) {
    where.price = {};
    if (min_price !== undefined) where.price.gte = Number(min_price);
    if (max_price !== undefined) where.price.lte = Number(max_price);
  }

  // Build order by
  let orderBy: Prisma.ProductOrderByWithRelationInput = {};
  switch (sort_by) {
    case 'name':
      orderBy = { name: sort_order as any };
      break;
    case 'price':
      orderBy = { price: sort_order as any };
      break;
    case 'stock':
      orderBy = { stock_quantity: sort_order as any };
      break;
    case 'created_at':
    default:
      orderBy = { created_at: sort_order as any };
  }

  // Get total count
  const total = await this.prisma.product.count({ where });

  // Get products
  const products = await this.prisma.product.findMany({
    where,
    skip,
    take, // Now this is a number
    orderBy,
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  const totalPages = Math.ceil(total / limitNum);

  return {
    data: products.map(p => this.formatProductResponse(p)),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  };
}

  async getAdminProduct(adminId: number, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                // FIX: User model might not have 'name' field, use available fields
                email: true,
                // Add other available user fields as needed
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProductResponse(product);
  }

  async updateProduct(adminId: number, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check SKU uniqueness if being updated
    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });

      if (existingSku) {
        throw new BadRequestException('Product with this SKU already exists');
      }
    }

    // Generate new slug if name changed
    let slug = product.slug;
    if (dto.name && dto.name !== product.name) {
      slug = await this.generateUniqueSlug(dto.name);
    }

    // Calculate stock status if stock related fields updated
    let stockStatus = product.stock_status;
    if (dto.stock_quantity !== undefined || dto.low_stock_threshold !== undefined) {
      const stock = dto.stock_quantity ?? product.stock_quantity;
      const threshold = dto.low_stock_threshold ?? product.low_stock_threshold;
      stockStatus = this.calculateStockStatus(stock, threshold);
    }

    // Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        slug,
        sku: dto.sku,
        short_description: dto.short_description,
        description: dto.description,
        price: dto.price,
        discount_price: dto.discount_price,
        cost_price: dto.cost_price,
        tax_rate: dto.tax_rate,
        tax_inclusive: dto.tax_inclusive,
        stock_quantity: dto.stock_quantity,
        low_stock_threshold: dto.low_stock_threshold,
        stock_status: stockStatus,
        backorder_allowed: dto.backorder_allowed,
        weight_kg: dto.weight_kg,
        dimensions_cm: dto.dimensions_cm,
        shipping_class: dto.shipping_class,
        featured: dto.featured,
        is_active: dto.is_active,
        status: dto.status,
        specifications: dto.specifications,
        meta_title: dto.meta_title,
        meta_description: dto.meta_description,
        meta_keywords: dto.meta_keywords,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Update categories if provided
    if (dto.category_ids) {
      // Remove existing category relations
      await this.prisma.productCategoryRelation.deleteMany({
        where: { product_id: productId },
      });

      // Add new category relations
      if (dto.category_ids.length > 0) {
        await this.prisma.productCategoryRelation.createMany({
          data: dto.category_ids.map((categoryId, index) => ({
            product_id: productId,
            category_id: categoryId,
            is_primary: index === 0,
          })),
        });
      }
    }

    // Log admin action
    await this.logAdminAction(adminId, 'UPDATE_PRODUCT', productId, { 
      before: product.name,
      after: updatedProduct.name,
    });

    return this.formatProductResponse(updatedProduct);
  }

  async updateProductStatus(adminId: number, productId: string, status: ProductStatus) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    await this.logAdminAction(adminId, 'UPDATE_PRODUCT_STATUS', productId, { status });

    return this.formatProductResponse(updatedProduct);
  }

  async updateProductImages(adminId: number, productId: string, files: Express.Multer.File[]) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newImages = files.map(file => `/uploads/products/${file.filename}`);
    const images = [...product.images, ...newImages];

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        images,
        thumbnail: product.thumbnail || images[0] || null,
      },
    });

    await this.logAdminAction(adminId, 'UPDATE_PRODUCT_IMAGES', productId, {});

    return this.formatProductResponse(updatedProduct);
  }

  async deleteProductImage(adminId: number, productId: string, imageUrl: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const images = product.images.filter(img => img !== imageUrl);
    const thumbnail = product.thumbnail === imageUrl ? (images[0] || null) : product.thumbnail;

    // Try to delete file from filesystem
    try {
      const filePath = path.join(process.cwd(), 'public', imageUrl);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to delete image file:', error);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        images,
        thumbnail,
      },
    });

    await this.logAdminAction(adminId, 'DELETE_PRODUCT_IMAGE', productId, {});

    return this.formatProductResponse(updatedProduct);
  }

  async deleteProduct(adminId: number, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete product images from filesystem
    for (const imageUrl of product.images) {
      try {
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Failed to delete image file:', error);
      }
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    await this.logAdminAction(adminId, 'DELETE_PRODUCT', productId, { name: product.name });

    return { success: true, message: 'Product deleted successfully' };
  }

  async bulkUpdateProducts(adminId: number, dto: BulkUpdateProductsDto) {
    const { ids, data } = dto;

    const updates = await this.prisma.$transaction(
      ids.map(id => {
        // FIX: Calculate stock status only if stock_quantity is provided
let stockStatus: StockStatus | undefined = undefined;
        if (data.stock_quantity !== undefined) {
          const threshold = data.low_stock_threshold ?? 5;
          stockStatus = this.calculateStockStatus(data.stock_quantity, threshold);
        }

        return this.prisma.product.update({
          where: { id },
          data: {
            status: data.status,
            featured: data.featured,
            is_active: data.is_active,
            stock_status: stockStatus,
            stock_quantity: data.stock_quantity,
            low_stock_threshold: data.low_stock_threshold,
          },
        });
      })
    );

    await this.logAdminAction(adminId, 'BULK_UPDATE_PRODUCTS', null, { count: ids.length });

    return {
      success: true,
      updated: updates.length,
      products: updates.map(p => this.formatProductResponse(p)),
    };
  }

  async bulkDeleteProducts(adminId: number, dto: BulkDeleteProductsDto) {
    const { ids } = dto;

    // Get products to delete their images
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });

    // Delete images from filesystem
    for (const product of products) {
      for (const imageUrl of product.images) {
        try {
          const filePath = path.join(process.cwd(), 'public', imageUrl);
          await fs.unlink(filePath);
        } catch (error) {
          console.warn('Failed to delete image file:', error);
        }
      }
    }

    const result = await this.prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    await this.logAdminAction(adminId, 'BULK_DELETE_PRODUCTS', null, { count: result.count });

    return {
      success: true,
      deleted: result.count,
      message: `${result.count} products deleted successfully`,
    };
  }

  async getProductStats(adminId: number) {
    const [
      total,
      active,
      draft,
      outOfStock,
      lowStock,
      featured,
      totalValue,
      categories,
      recentProducts,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.active } }),
      this.prisma.product.count({ where: { status: ProductStatus.draft } }),
      this.prisma.product.count({ where: { stock_status: StockStatus.out_of_stock } }),
      this.prisma.product.count({ where: { stock_status: StockStatus.low_stock } }),
      this.prisma.product.count({ where: { featured: true } }),
      this.prisma.product.aggregate({
        _sum: {
          stock_quantity: true,
        },
        _avg: {
          price: true,
        },
      }),
      this.prisma.productCategory.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: {
          products: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.product.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total,
      active,
      draft,
      outOfStock,
      lowStock,
      featured,
      totalStock: totalValue._sum.stock_quantity || 0,
      averagePrice: totalValue._avg.price || 0,
      topCategories: categories,
      recentProducts: recentProducts.map(p => this.formatProductResponse(p)),
    };
  }

  // ==================== CUSTOMER METHODS ====================

  async getPublicProducts(query: QueryProductsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category_id,
      min_price,
      max_price,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where conditions - only show active products
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.active,
      is_active: true,
      stock_status: { not: StockStatus.out_of_stock },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { short_description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category_id) {
      where.categories = {
        some: {
          category_id,
        },
      };
    }

    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) where.price.gte = min_price;
      if (max_price !== undefined) where.price.lte = max_price;
    }

    // Build order by
    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sort_by) {
      case 'name':
        orderBy = { name: sort_order };
        break;
      case 'price':
        orderBy = { price: sort_order };
        break;
      case 'popularity':
        orderBy = { reviews: { _count: sort_order } };
        break;
      case 'created_at':
      default:
        orderBy = { created_at: sort_order };
    }

    // Get total count
    const total = await this.prisma.product.count({ where });

    // Get products
    const products = await this.prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        short_description: true,
        price: true,
        discount_price: true,
        stock_quantity: true,
        stock_status: true,
        featured: true,
        images: true,
        thumbnail: true,
        specifications: true,
        weight_kg: true,
        shipping_class: true,
        created_at: true,
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: products.map(p => ({
        ...p,
        price: parseFloat(p.price.toString()),
        discount_price: p.discount_price ? parseFloat(p.discount_price.toString()) : null,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getPublicProduct(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        slug,
        status: ProductStatus.active,
        is_active: true,
      },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
        reviews: {
          where: {
            is_approved: true,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                // FIX: Use available user fields
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // FIX: Access reviews from the included relation
    const reviews = product.reviews || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      ...product,
      price: parseFloat(product.price.toString()),
      discount_price: product.discount_price ? parseFloat(product.discount_price.toString()) : null,
      avg_rating: avgRating,
    };
  }

  async getFeaturedProducts(limit: number = 8) {
    const products = await this.prisma.product.findMany({
      where: {
        featured: true,
        status: ProductStatus.active,
        is_active: true,
        stock_status: { not: StockStatus.out_of_stock },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        short_description: true,
        price: true,
        discount_price: true,
        stock_status: true,
        images: true,
        thumbnail: true,
        created_at: true,
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
    });

    return products.map(p => ({
      ...p,
      price: parseFloat(p.price.toString()),
      discount_price: p.discount_price ? parseFloat(p.discount_price.toString()) : null,
    }));
  }

  async getRelatedProducts(productId: string, limit: number = 4) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const categoryIds = product.categories.map(c => c.category_id);

    const relatedProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        status: ProductStatus.active,
        is_active: true,
        stock_status: { not: StockStatus.out_of_stock },
        categories: {
          some: {
            category_id: { in: categoryIds },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        short_description: true,
        price: true,
        discount_price: true,
        stock_status: true,
        images: true,
        thumbnail: true,
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      take: limit,
    });

    return relatedProducts.map(p => ({
      ...p,
      price: parseFloat(p.price.toString()),
      discount_price: p.discount_price ? parseFloat(p.discount_price.toString()) : null,
    }));
  }

private async logAdminAction(
  adminId: number,
  action: string,
  entityId: string | null,
  metadata?: any
) {
  try {
    if (this.prisma.auditLog) {
      await this.prisma.auditLog.create({
        data: {
          adminId: adminId, // or admin_user_id depending on schema
          action,
          entityType: 'product',
          entityId,
          metadata: metadata || {},
          createdAt: new Date(),
        } as any,
      });
    } else {
      // Fallback to console logging
      console.log('Audit Log:', { adminId, action, entityId, metadata });
    }
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
}