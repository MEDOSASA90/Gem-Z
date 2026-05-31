import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
  UpdateQuantityDto,
  UpdateRatingDto,
  CreateCategoryDto,
} from './product.dto';

/**
 * متحكم المنتجات - Product Controller
 */
@ApiTags('المنتجات - Products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء منتج جديد' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المنتجات' })
  @ApiResponse({ status: 200 })
  async list(@Query() filters: ProductFiltersDto) {
    return this.productService.list(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل المنتج' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'تحديث منتج' })
  @ApiResponse({ status: 200 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف منتج' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.productService.delete(id);
  }

  @Post(':id/quantity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحديث كمية المنتج' })
  async updateQuantity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    await this.productService.updateQuantity(id, dto.quantity);
    return { product_id: id, quantity: dto.quantity };
  }

  @Post(':id/rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحديث تقييم المنتج' })
  async updateRating(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRatingDto,
  ) {
    await this.productService.updateRating(id, dto.rating);
    return { product_id: id, rating: dto.rating };
  }
}

/**
 * متحكم الفئات - Category Controller
 */
@ApiTags('الفئات - Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء فئة جديدة' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.productService.createCategory({
      name: dto.name,
      slug: dto.slug,
      parent_id: dto.parent_id ?? null,
      description: dto.description ?? null,
      image_url: dto.image_url ?? null,
      sort_order: dto.sort_order ?? 0,
    });
  }

  @Get()
  @ApiOperation({ summary: 'قائمة الفئات' })
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل الفئة' })
  async getCategoryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getCategoryById(id);
  }
}
