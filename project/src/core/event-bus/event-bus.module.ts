/**
 * =============================================================================
 * EventBusModule - موديول الأحداث المركزي
 * =============================================================================
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventBusService } from './event-bus.service';
import { EventStoreService } from './event.store';

@Global() // جعل الموديول global للوصول من كل الموديولات
@Module({
  imports: [ConfigModule],
  providers: [EventBusService, EventStoreService],
  exports: [EventBusService, EventStoreService],
})
export class EventBusModule {}
