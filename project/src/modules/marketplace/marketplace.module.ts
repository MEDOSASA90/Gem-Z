import { Module } from '@nestjs/common';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';

/**
 * وحدة المتجر الرئيسية - Marketplace Module
 * 
 * تجمع:
 * - Product Catalog: إدارة المنتجات والفئات
 * - Order Management: إدارة الطلبات وOMS
 */
@Module({
  imports: [ProductModule, OrderModule],
  exports: [ProductModule, OrderModule],
})
export class MarketplaceModule {}
