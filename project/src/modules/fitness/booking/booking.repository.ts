/**
 * Booking Repository - طبقة الوصول لبيانات الحجوزات
 */
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan, MoreThan } from 'typeorm';
import { ClassSlot } from './slot.entity';
import { Booking } from './booking.entity';
import { WaitlistEntry } from './waitlist.entity';
import { SlotStatus, BookingStatus, WaitlistStatus } from '../../../common/enums/gym.enum';

@Injectable()
export class SlotRepository extends Repository<ClassSlot> {
  constructor(private dataSource: DataSource) {
    super(ClassSlot, dataSource.createEntityManager());
  }

  /** جلب Slots متاحة لجيم في تاريخ معين */
  async findAvailable(
    gymId: string,
    startOfDay: Date,
    endOfDay: Date,
    category?: string,
  ): Promise<ClassSlot[]> {
    const qb = this.createQueryBuilder('slot')
      .where('slot.gym_id = :gymId', { gymId })
      .andWhere('slot.start_time >= :startOfDay', { startOfDay })
      .andWhere('slot.start_time <= :endOfDay', { endOfDay })
      .andWhere('slot.status IN (:...statuses)', {
        statuses: [SlotStatus.AVAILABLE, SlotStatus.FULL],
      })
      .orderBy('slot.start_time', 'ASC');

    if (category) {
      qb.andWhere('slot.category = :category', { category });
    }

    return qb.getMany();
  }

  /** زيادة عدد الحجوزات بأمان (atomic) */
  async incrementBookedCount(slotId: string): Promise<void> {
    await this.increment({ id: slotId }, 'booked_count', 1);
  }

  /** إنقاص عدد الحجوزات */
  async decrementBookedCount(slotId: string): Promise<void> {
    await this.decrement({ id: slotId }, 'booked_count', 1);
  }

  /** تحديث الحالة بناءً على العدد */
  async syncStatusFromCount(slotId: string): Promise<void> {
    const slot = await this.findOne({ where: { id: slotId } });
    if (!slot) return;

    if (slot.booked_count >= slot.max_capacity) {
      slot.status = SlotStatus.FULL;
    } else if (slot.status === SlotStatus.FULL) {
      slot.status = SlotStatus.AVAILABLE;
    }
    await this.save(slot);
  }
}

@Injectable()
export class BookingRepository extends Repository<Booking> {
  constructor(private dataSource: DataSource) {
    super(Booking, dataSource.createEntityManager());
  }

  /** جلب حجوزات مستخدم مع فلترة */
  async findByUser(
    userId: string,
    status?: BookingStatus,
    page = 1,
    limit = 20,
  ): Promise<[Booking[], number]> {
    const qb = this.createQueryBuilder('b')
      .where('b.user_id = :userId', { userId })
      .orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('b.status = :status', { status });
    }

    return qb.getManyAndCount();
  }

  /** جلب الحجوزات القادمة لمستخدم */
  async findUpcoming(userId: string): Promise<Booking[]> {
    return this.createQueryBuilder('b')
      .innerJoinAndSelect('class_slots', 's', 'b.slot_id = s.id')
      .where('b.user_id = :userId', { userId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('s.start_time > :now', { now: new Date() })
      .orderBy('s.start_time', 'ASC')
      .getMany();
  }

  /** جلب حجوزات حصة معينة */
  async findBySlot(slotId: string): Promise<Booking[]> {
    return this.find({
      where: { slot_id: slotId },
      order: { created_at: 'DESC' },
    });
  }

  /** التحقق من عدم وجود حجز مكرر */
  async hasExistingBooking(userId: string, slotId: string): Promise<boolean> {
    const count = await this.count({
      where: {
        user_id: userId,
        slot_id: slotId,
        status: BookingStatus.CONFIRMED,
      },
    });
    return count > 0;
  }
}

@Injectable()
export class WaitlistRepository extends Repository<WaitlistEntry> {
  constructor(private dataSource: DataSource) {
    super(WaitlistEntry, dataSource.createEntityManager());
  }

  /** جلب قائمة الانتظار لحصة معينة مرتبة حسب الموقع */
  async findBySlotOrdered(slotId: string): Promise<WaitlistEntry[]> {
    return this.find({
      where: { slot_id: slotId, status: WaitlistStatus.WAITING },
      order: { position: 'ASC' },
    });
  }

  /** جلب أول شخص في قائمة الانتظار */
  async findFirstWaiting(slotId: string): Promise<WaitlistEntry | null> {
    return this.findOne({
      where: { slot_id: slotId, status: WaitlistStatus.WAITING },
      order: { position: 'ASC' },
    });
  }

  /** إعادة ترتيب المواقع بعد تحويل أو مغادرة */
  async reindexPositions(slotId: string): Promise<void> {
    const entries = await this.findBySlotOrdered(slotId);
    for (let i = 0; i < entries.length; i++) {
      entries[i].position = i + 1;
      await this.save(entries[i]);
    }
  }
}
