/**
 * Booking Service - محرك الحجوزات
 * يدير Slots + Bookings + Waitlist مع منع الحجز المزدوج عبر Redis Lock
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { SlotRepository, BookingRepository, WaitlistRepository } from './booking.repository';
import { ClassSlot } from './slot.entity';
import { Booking } from './booking.entity';
import { WaitlistEntry } from './waitlist.entity';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import {
  BookingCreatedEvent,
  BookingCancelledEvent,
  BookingCheckedInEvent,
  WaitlistConvertedEvent,
  EventType,
} from '../../../core/event-bus/event.types';
import {
  SlotStatus,
  BookingStatus,
  WaitlistStatus,
  CheckInMethod,
} from '../../../common/enums/gym.enum';
import {
  CreateSlotDto,
  UpdateSlotDto,
  BookSlotDto,
  CancelBookingDto,
  CheckInDto,
  SlotFilterDto,
  JoinWaitlistDto,
} from './booking.dto';

/** مدة قفل Redis بالمللي ثانية (10 ثوانٍ) */
const REDIS_LOCK_TTL_MS = 10000;

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    private readonly slotRepo: SlotRepository,
    private readonly eventBus: EventBusService,
  ) {}

  /** إنشاء حصة جديدة */
  async create(dto: CreateSlotDto): Promise<ClassSlot> {
    if (dto.end_time <= dto.start_time) {
      throw new BadRequestException('End time must be after start time');
    }

    const slot = this.slotRepo.create({
      ...dto,
      booked_count: 0,
      waitlist_count: 0,
      status: SlotStatus.AVAILABLE,
    });

    return this.slotRepo.save(slot);
  }

  /** تحديث حصة */
  async update(id: string, dto: UpdateSlotDto): Promise<ClassSlot> {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');

    Object.assign(slot, dto);
    return this.slotRepo.save(slot);
  }

  /** قائمة الحصص المتاحة لجيم في يوم معين */
  async listAvailable(
    gymId: string,
    dateStr: string,
    category?: string,
  ): Promise<ClassSlot[]> {
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    return this.slotRepo.findAvailable(gymId, startOfDay, endOfDay, category);
  }

  /** جلب تفاصيل حصة مع عدد الحجوزات */
  async getById(id: string): Promise<ClassSlot> {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  /** إلغاء حصة وإشعار المحجوزين */
  async cancelSlot(slotId: string): Promise<ClassSlot> {
    const slot = await this.getById(slotId);
    slot.status = SlotStatus.CANCELLED;
    const saved = await this.slotRepo.save(slot);

    // TODO: إشعار جميع المحجوزين بالإلغاء
    this.logger.log(`Slot ${slotId} cancelled, notifying bookers...`);

    return saved;
  }
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly slotRepo: SlotRepository,
    private readonly bookingRepo: BookingRepository,
    private readonly eventBus: EventBusService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * حجز حصة - مع منع الحجز المزدوج عبر Redis Lock وقائمة انتظار متزامنة في Redis
   * CRITICAL: Uses lock:slot:{slotId} for atomicity and prevention of overbooking
   */
  async book(userId: string, dto: BookSlotDto): Promise<any> {
    const slotId = dto.slot_id;
    const lockKey = `lock:slot:${slotId}`;
    const lockValue = `${Date.now()}:${userId}`;

    // Acquire Redis Distributed Lock instantly
    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'PX', // TTL in milliseconds
      REDIS_LOCK_TTL_MS,
      'NX', // Only if not exists
    );

    if (!acquired) {
      throw new HttpException('Transaction in progress', HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      // التحقق من عدم وجود حجز مكرر
      const hasExisting = await this.bookingRepo.hasExistingBooking(userId, slotId);
      if (hasExisting) {
        throw new ConflictException('You already have a booking for this slot');
      }

      // جلب الحصة والتحقق من السعة
      const slot = await this.slotRepo.findOne({ where: { id: slotId } });
      if (!slot) throw new NotFoundException('Slot not found');
      if (slot.status === SlotStatus.CANCELLED) {
        throw new BadRequestException('This slot has been cancelled');
      }

      const waitlistKey = `waitlist:class:${slotId}`;

      // IF booked_slots >= max_capacity
      if (slot.booked_count >= slot.max_capacity) {
        // Push user's actor_id into the Redis Waitlist Queue for this class
        await this.redis.rpush(waitlistKey, userId);
        const queuePosition = await this.redis.llen(waitlistKey);

        // Update waitlist count in slot
        slot.waitlist_count = queuePosition;
        await this.slotRepo.save(slot);

        this.logger.log(`Slot ${slotId} is full. User ${userId} pushed to Redis waitlist queue position ${queuePosition}.`);

        // Return status WAITLIST_ASSIGNED with their exact queue position index number
        return {
          status: 'WAITLIST_ASSIGNED',
          position: queuePosition,
          userId,
          slotId,
        };
      }

      // IF booked_slots < max_capacity => Increment booked_slots by 1
      slot.booked_count += 1;
      await this.slotRepo.save(slot);

      const booking = this.bookingRepo.create({
        user_id: userId,
        slot_id: slotId,
        status: BookingStatus.CONFIRMED,
        check_in_time: null,
        check_in_method: null,
        cancellation_reason: null,
        penalty_amount: 0,
        correlation_id: crypto.randomUUID(),
      });

      const saved = await this.bookingRepo.save(booking);
      await this.slotRepo.syncStatusFromCount(slotId);

      // Emit BookingCreated event
      const event: BookingCreatedEvent = {
        booking_id: saved.id,
        user_id: saved.user_id,
        slot_id: saved.slot_id,
        gym_id: slot.gym_id,
        booked_at: saved.created_at.toISOString(),
      };
      await this.eventBus.publishSimple(EventType.BOOKING_CREATED, event, saved.user_id, 'fitness');

      return saved;
    } finally {
      // Release the Redis lock
      const current = await this.redis.get(lockKey);
      if (current === lockValue) {
        await this.redis.del(lockKey);
      }
    }
  }

  /**
   * إلغاء حجز + معالجة قائمة الانتظار الذرية
   */
  async cancel(
    bookingId: string,
    userId: string,
    dto: CancelBookingDto,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be cancelled');
    }

    const slotId = booking.slot_id;
    const slot = await this.slotRepo.findOne({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');

    // حساب غرامة الإلغاء المتأخر
    let penalty = 0;
    const hoursUntilStart = (slot.start_time.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilStart < 4) {
      penalty = slot.max_capacity > 10 ? 5 : 10;
    }

    // Process cancellation: status to CANCELLED, penalty set
    booking.status = BookingStatus.CANCELLED;
    booking.cancellation_reason = dto.reason || null;
    booking.penalty_amount = penalty;
    const saved = await this.bookingRepo.save(booking);

    // Decrement booked_slots by 1
    slot.booked_count = Math.max(0, slot.booked_count - 1);
    await this.slotRepo.save(slot);

    // Emit BookingCancelledEvent
    const cancelEvent: BookingCancelledEvent = {
      booking_id: saved.id,
      user_id: saved.user_id,
      slot_id: saved.slot_id,
      reason: dto.reason ?? '',
      penalty_amount: penalty,
    };
    await this.eventBus.publishSimple(EventType.BOOKING_CANCELLED, cancelEvent, saved.user_id, 'fitness');

    // Evaluate the Redis Waitlist Queue
    const waitlistKey = `waitlist:class:${slotId}`;
    const waitlistLength = await this.redis.llen(waitlistKey);

    if (waitlistLength > 0) {
      // Shift the first user from the queue
      const nextUserId = await this.redis.lpop(waitlistKey);
      
      if (nextUserId) {
        this.logger.log(`Waitlist candidate [${nextUserId}] found in Redis queue. Upgrading status atomically...`);

        // Open an isolated database transaction to upgrade their status atomically
        const queryRunner = this.bookingRepo.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Re-fetch slot within transaction to ensure safety
          const txSlot = await queryRunner.manager.findOne(ClassSlot, {
            where: { id: slotId },
            lock: { mode: 'pessimistic_write' },
          });

          if (txSlot && txSlot.booked_count < txSlot.max_capacity) {
            txSlot.booked_count += 1;
            txSlot.waitlist_count = Math.max(0, txSlot.waitlist_count - 1);
            await queryRunner.manager.save(ClassSlot, txSlot);

            const nextBooking = queryRunner.manager.create(Booking, {
              user_id: nextUserId,
              slot_id: slotId,
              status: BookingStatus.CONFIRMED,
              check_in_time: null,
              check_in_method: null,
              cancellation_reason: null,
              penalty_amount: 0,
              correlation_id: crypto.randomUUID(),
            });

            const savedTxBooking = await queryRunner.manager.save(Booking, nextBooking);
            await queryRunner.commitTransaction();

            this.logger.log(`Atomically upgraded waitlisted user ${nextUserId} to confirmed booking ${savedTxBooking.id}`);

            // Dispatch a high-priority push notification / Event
            const upgradedEvent: BookingCreatedEvent = {
              booking_id: savedTxBooking.id,
              user_id: savedTxBooking.user_id,
              slot_id: savedTxBooking.slot_id,
              gym_id: txSlot.gym_id,
              booked_at: savedTxBooking.created_at?.toISOString() || new Date().toISOString(),
            };
            await this.eventBus.publishSimple(EventType.BOOKING_CREATED, upgradedEvent, nextUserId, 'fitness');

            // Dispatch push notification
            this.logger.log(`[PUSH NOTIFICATION] High-Priority dispatch: User ${nextUserId} upgraded from Waitlist to Booked Slot ${slotId}`);
          } else {
            this.logger.warn(`Could not upgrade user ${nextUserId}: Slot capacity saturated.`);
            await queryRunner.rollbackTransaction();
          }
        } catch (err: any) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`Failed atomic waitlist upgrade transaction: ${err.message}`);
        } finally {
          await queryRunner.release();
        }
      }
    }

    await this.slotRepo.syncStatusFromCount(slotId);
    return saved;
  }

  /** Check-in للحجز */
  async checkIn(
    bookingId: string,
    userId: string,
    dto: CheckInDto,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    booking.status = BookingStatus.ATTENDED;
    booking.check_in_time = new Date();
    booking.check_in_method = dto.method;
    const saved = await this.bookingRepo.save(booking);

    const event: BookingCheckedInEvent = {
      booking_id: saved.id,
      user_id: saved.user_id,
      slot_id: saved.slot_id,
      check_in_time: saved.check_in_time!.toISOString(),
      method: saved.check_in_method!,
    };
    await this.eventBus.publishSimple(EventType.BOOKING_CONFIRMED, event, saved.user_id, 'fitness');

    return saved;
  }

  /** تسجيل غياب */
  async markNoShow(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking must be confirmed to mark no-show');
    }

    booking.status = BookingStatus.NO_SHOW;
    return this.bookingRepo.save(booking);
  }

  /** حجوزات المستخدم */
  async getUserBookings(
    userId: string,
    status?: BookingStatus,
    page = 1,
    limit = 20,
  ) {
    const [items, total] = await this.bookingRepo.findByUser(
      userId, status, page, limit,
    );
    return { items, total, page, limit };
  }

  /** الحجوزات القادمة */
  async getUpcoming(userId: string): Promise<Booking[]> {
    return this.bookingRepo.findUpcoming(userId);
  }
}

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly waitlistRepo: WaitlistRepository,
    private readonly bookingRepo: BookingRepository,
    private readonly slotRepo: SlotRepository,
    private readonly eventBus: EventBusService,
  ) {}

  /** الانضمام لقائمة الانتظار */
  async join(userId: string, dto: JoinWaitlistDto): Promise<WaitlistEntry> {
    const { slot_id } = dto;

    // التحقق من أن الحصة ممتلئة
    const slot = await this.slotRepo.findOne({ where: { id: slot_id } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== SlotStatus.FULL) {
      throw new BadRequestException('Slot is not full yet. You can book directly.');
    }

    // التحقق من عدم التكرار
    const existing = await this.waitlistRepo.findOne({
      where: { user_id: userId, slot_id, status: WaitlistStatus.WAITING },
    });
    if (existing) {
      throw new ConflictException('You are already on the waitlist for this slot');
    }

    // حساب الموقع الجديد
    const waitingCount = await this.waitlistRepo.count({
      where: { slot_id, status: WaitlistStatus.WAITING },
    });

    const entry = this.waitlistRepo.create({
      user_id: userId,
      slot_id,
      position: waitingCount + 1,
      status: WaitlistStatus.WAITING,
    });

    // زيادة عداد الانتظار
    slot.waitlist_count = waitingCount + 1;
    await this.slotRepo.save(slot);

    return this.waitlistRepo.save(entry);
  }

  /** مغادرة قائمة الانتظار */
  async leave(waitlistId: string, userId: string): Promise<void> {
    const entry = await this.waitlistRepo.findOne({
      where: { id: waitlistId, user_id: userId },
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.status !== WaitlistStatus.WAITING) {
      throw new BadRequestException('Cannot leave a processed waitlist');
    }

    entry.status = WaitlistStatus.EXPIRED;
    await this.waitlistRepo.save(entry);

    // إعادة الترتيب
    await this.waitlistRepo.reindexPositions(entry.slot_id);
  }

  /**
   * معالجة قائمة الانتظار - تحويل أول شخص عند توفر مكان
   * يُستدعى تلقائياً عند إلغاء حجز
   */
  async processWaitlist(slotId: string): Promise<Booking | null> {
    const firstWaiting = await this.waitlistRepo.findFirstWaiting(slotId);
    if (!firstWaiting) return null;

    // إنشاء حجز للشخص الأول
    const booking = this.bookingRepo.create({
      user_id: firstWaiting.user_id,
      slot_id: slotId,
      status: BookingStatus.CONFIRMED,
      check_in_time: null,
      check_in_method: null,
      cancellation_reason: null,
      penalty_amount: 0,
    });

    const saved = await this.bookingRepo.save(booking);

    // تحديث حالة الانتظار
    firstWaiting.status = WaitlistStatus.CONVERTED;
    await this.waitlistRepo.save(firstWaiting);

    // نشر حدث التحويل
    const event: WaitlistConvertedEvent = {
      waitlist_id: firstWaiting.id,
      booking_id: saved.id,
      user_id: saved.user_id,
      slot_id: saved.slot_id,
    };
    await this.eventBus.publishSimple(EventType.WAITLIST_CONVERTED, event, saved.user_id, 'fitness');

    this.logger.log(
      `Waitlist entry ${firstWaiting.id} converted to booking ${saved.id}`,
    );

    return saved;
  }
}
