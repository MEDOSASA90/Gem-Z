/**
 * Attendance Module - وحدة الحضور و QR Check-in
 * تدير: سجلات الدخول/الخروج + أكواد QR
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { QRService } from './qr.service';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceRecord } from './attendance.entity';
import { EventBusModule } from '../../../core/event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord]),
    JwtModule.register({}),
    EventBusModule,
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    QRService,
    AttendanceRepository,
  ],
  exports: [AttendanceService, QRService],
})
export class AttendanceModule {}
