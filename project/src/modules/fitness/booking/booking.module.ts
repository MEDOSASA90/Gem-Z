/**
 * Booking Module - وحدة محرك الحجوزات
 * تشمل: Slots + Bookings + Waitlist
 * CRITICAL: يستخدم Redis Lock لمنع الحجز المزدوج
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BookingController } from './booking.controller';
import { SlotService, BookingService, WaitlistService } from './booking.service';
import {
  SlotRepository,
  BookingRepository,
  WaitlistRepository,
} from './booking.repository';
import { ClassSlot } from './slot.entity';
import { Booking } from './booking.entity';
import { WaitlistEntry } from './waitlist.entity';
import { EventBusModule } from '../../../core/event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassSlot, Booking, WaitlistEntry]),
    EventBusModule,
    RedisModule,
  ],
  controllers: [BookingController],
  providers: [
    SlotService,
    BookingService,
    WaitlistService,
    SlotRepository,
    BookingRepository,
    WaitlistRepository,
  ],
  exports: [SlotService, BookingService, WaitlistService],
})
export class BookingModule {}
