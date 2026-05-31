/**
 * Fitness Module - الوحدة الرئيسية للياقة البدنية
 * تجمع: Gym + Booking + Attendance + Nutrition
 */
import { Module } from '@nestjs/common';
import { GymModule } from './gym/gym.module';
import { BookingModule } from './booking/booking.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NutritionModule } from './nutrition/nutrition.module';

@Module({
  imports: [
    GymModule,
    BookingModule,
    AttendanceModule,
    NutritionModule,
  ],
  exports: [
    GymModule,
    BookingModule,
    AttendanceModule,
    NutritionModule,
  ],
})
export class FitnessModule {}
