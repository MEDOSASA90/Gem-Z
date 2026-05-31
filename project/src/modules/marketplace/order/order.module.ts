import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OMSService } from './oms.service';
import { OrderController } from './order.controller';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderRepository, OrderItemRepository } from './order.repository';
import { ProductModule } from '../product/product.module';
import { EscrowModule } from '../../economy/escrow/escrow.module';
import { WalletModule } from '../../economy/wallet/wallet.module';
import { RewardsModule } from '../../economy/rewards/rewards.module';

/**
 * وحدة الطلبات - Order Management Module
 * 
 * توفر إدارة الطلبات مع:
 * - CRUD للطلبات وعناصرها
 * - دورة حياة الطلب مع التحقق من الانتقالات
 * - تكامل مع المخزون والضمان
 * - OMS (Order Management System) لمعالجة الأحداث
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ProductModule,
    EscrowModule,
    WalletModule,
    RewardsModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OMSService,
    OrderRepository,
    OrderItemRepository,
  ],
  exports: [OrderService, OMSService, OrderRepository],
})
export class OrderModule {}
