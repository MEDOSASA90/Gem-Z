/**
 * Attendance Controller - نقاط النهاية للحضور والـ QR
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { QRService } from './qr.service';
import { CheckInMethod } from '../../../common/enums/gym.enum';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly qrService: QRService,
  ) {}

  @Post('checkin')
  @ApiOperation({ summary: 'تسجيل دخول (Check-in)' })
  async checkIn(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body('gym_id', ParseUUIDPipe) gymId: string,
    @Body('method') method: CheckInMethod,
    @Body('branch_id', ParseUUIDPipe) branchId?: string,
    @Body('qr_code') qrCode?: string,
  ) {
    return this.attendanceService.recordEntry(userId, gymId, method, branchId, qrCode);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'تسجيل خروج (Check-out)' })
  async checkOut(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body('gym_id', ParseUUIDPipe) gymId: string,
  ) {
    return this.attendanceService.recordExit(userId, gymId);
  }

  @Get('history')
  @ApiOperation({ summary: 'تاريخ الحضور' })
  async getHistory(
    @Query('user_id', ParseUUIDPipe) userId: string,
    @Query('gym_id', ParseUUIDPipe) gymId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.attendanceService.getHistory(userId, gymId, +page, +limit);
  }

  @Get('stats/:gymId')
  @ApiOperation({ summary: 'إحصائيات حضور يومية للجيم' })
  async getGymAttendance(
    @Param('gymId', ParseUUIDPipe) gymId: string,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.attendanceService.getGymAttendance(gymId, date);
  }

  // ─── QR Codes ───────────────────────────────────────────────────

  @Post('qr/generate')
  @ApiOperation({ summary: 'إنشاء QR code للـ Check-in (صالح 5 دقائق)' })
  async generateQR(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body('gym_id', ParseUUIDPipe) gymId: string,
  ) {
    const code = await this.qrService.generateCheckInCode(userId, gymId);
    return { code, expires_in_seconds: 300 };
  }

  @Post('qr/validate')
  @ApiOperation({ summary: 'التحقق من QR code' })
  async validateQR(@Body('code') code: string) {
    const isValid = await this.qrService.validateCode(code);
    return { valid: isValid };
  }

  @Post('membership-card')
  @ApiOperation({ summary: 'إنشاء بطاقة عضوية رقمية' })
  async generateMembershipCard(
    @Body('user_id', ParseUUIDPipe) userId: string,
  ) {
    const card = await this.qrService.generateMembershipCard(userId);
    return { card_token: card };
  }
}
