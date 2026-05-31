/**
 * Attendance Repository - طبقة الوصول لسجلات الحضور
 */
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';

@Injectable()
export class AttendanceRepository extends Repository<AttendanceRecord> {
  constructor(private dataSource: DataSource) {
    super(AttendanceRecord, dataSource.createEntityManager());
  }

  /** سجل دخول جديد */
  async recordEntry(
    userId: string,
    gymId: string,
    method: string,
    branchId?: string,
    qrCode?: string,
  ): Promise<AttendanceRecord> {
    const record = this.create({
      user_id: userId,
      gym_id: gymId,
      branch_id: branchId || null,
      entry_time: new Date(),
      exit_time: null,
      method: method as any,
      qr_code: qrCode || null,
      verified_by: null,
    });
    return this.save(record);
  }

  /** تسجيل خروج - تحديث exit_time */
  async recordExit(userId: string, gymId: string): Promise<AttendanceRecord | null> {
    // جلب آخر سجل دخول بدون خروج
    const record = await this.createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.gym_id = :gymId', { gymId })
      .andWhere('a.exit_time IS NULL')
      .orderBy('a.entry_time', 'DESC')
      .getOne();

    if (!record) return null;

    record.exit_time = new Date();
    return this.save(record);
  }

  /** تاريخ الحضور لمستخدم مع فلترة */
  async findByUser(
    userId: string,
    gymId?: string,
    page = 1,
    limit = 20,
  ): Promise<[AttendanceRecord[], number]> {
    const qb = this.createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .orderBy('a.entry_time', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (gymId) {
      qb.andWhere('a.gym_id = :gymId', { gymId });
    }

    return qb.getManyAndCount();
  }

  /** إحصائيات حضور يومية للجيم */
  async getGymDailyStats(gymId: string, date: Date): Promise<{
    totalEntries: number;
    uniqueUsers: number;
    avgDurationMinutes: number | null;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await this.find({
      where: {
        gym_id: gymId,
        entry_time: Between(startOfDay, endOfDay),
      },
    });

    const totalEntries = records.length;
    const uniqueUsers = new Set(records.map((r) => r.user_id)).size;

    const completedRecords = records.filter((r) => r.exit_time !== null);
    let avgDurationMinutes: number | null = null;
    if (completedRecords.length > 0) {
      const totalMinutes = completedRecords.reduce((sum, r) => {
        return sum + (r.exit_time!.getTime() - r.entry_time.getTime()) / (1000 * 60);
      }, 0);
      avgDurationMinutes = Math.round(totalMinutes / completedRecords.length);
    }

    return { totalEntries, uniqueUsers, avgDurationMinutes };
  }

  /** آخر سجل دخول لمستخدم */
  async findLatestEntry(userId: string): Promise<AttendanceRecord | null> {
    return this.findOne({
      where: { user_id: userId },
      order: { entry_time: 'DESC' },
    });
  }
}
