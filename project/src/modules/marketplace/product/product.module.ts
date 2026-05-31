import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController, CategoryController } from './product.controller';
import { Product } from './product.entity';
import { ProductCategory } from './category.entity';
import { ProductRepository, CategoryRepository } from './product.repository';

/**
 * وحدة المنتجات - Product Catalog Module
 * 
 * توفر إدارة كتالوج المنتجات مع:
 * - CRUD للمنتجات والفئات
 * - البحث والتصفية
 * - إدارة المخزون
 * - تقييمات المنتجات
 */
@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory])],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, ProductRepository, CategoryRepository],
  exports: [ProductService, ProductRepository, CategoryRepository],
})
export class ProductModule {}
