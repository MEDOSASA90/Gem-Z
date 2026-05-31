/**
 * AttendanceService - خدمة إدارة الحضور والانصراف
 * تتكامل مع QRService للتحقق من أكواد QR
 */
import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { QRService } from './qr.service';
import { AttendanceRecord } from './attendance.entity';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { GymCheckedInEvent, EventType } from '../../../core/event-bus/event.types';
import { CheckInMethod } from '../../../common/enums/gym.enum';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly qrService: QRService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * تسجيل دخول مستخدم
   * method: QR | MANUAL | BIOMETRIC
   */
  async recordEntry(
    userId: string,
    gymId: string,
    method: CheckInMethod,
    branchId?: string,
    qrCode?: string,
  ): Promise<AttendanceRecord> {
    // التحقق من صلاحية QR إذا كانت الطريقة QR
    if (method === CheckInMethod.QR && qrCode) {
      const isValid = await this.qrService.validateCode(qrCode);
      if (!isValid) {
        throw new Error('Invalid or expired QR code');
      }
    }

    const record = await this.attendanceRepo.recordEntry(
      userId,
      gymId,
      method,
      branchId,
      qrCode || undefined,
    );

    // نشر حدث الدخول
    const event: GymCheckedInEvent = {
      attendance_id: record.id,
      user_id: record.user_id,
      gym_id: record.gym_id,
      branch_id: record.branch_id || '',
      entry_time: record.entry_time.toISOString(),
      method: record.method,
    };
    await this.eventBus.publishSimple(EventType.GYM_CHECKED_IN, event, record.user_id, 'fitness');

    this.logger.log(
      `User ${userId} checked in to gym ${gymId} via ${method}`,
    );

    return record;
  }

  /** تسجيل خروج مستخدم */
  async recordExit(userId: string, gymId: string): Promise<AttendanceRecord | null> {
    const record = await this.attendanceRepo.recordExit(userId, gymId);
    if (!record) {
      this.logger.warn(`No active entry found for user ${userId} at gym ${gymId}`);
      return null;
    }

    this.logger.log(
      `User ${userId} checked out from gym ${gymId} after ${
        Math.round((record.exit_time!.getTime() - record.entry_time.getTime()) / (1000 * 60))
      } minutes`,
    );

    return record;
  }

  /** تاريخ الحضور لمستخدم */
  async getHistory(
    userId: string,
    gymId?: string,
    page = 1,
    limit = 20,
  ) {
    const [items, total] = await this.attendanceRepo.findByUser(
      userId, gymId, page, limit,
    );
    return { items, total, page, limit };
  }

  /** إحصائيات الحضور اليومية للجيم */
  async getGymAttendance(gymId: string, date: Date) {
    return this.attendanceRepo.getGymDailyStats(gymId, date);
  }
}
