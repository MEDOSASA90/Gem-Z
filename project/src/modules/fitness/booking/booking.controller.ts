/**
 * Booking Controller - نقاط النهاية للحجوزات
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SlotService, BookingService, WaitlistService } from './booking.service';
import {
  CreateSlotDto,
  UpdateSlotDto,
  BookSlotDto,
  CancelBookingDto,
  CheckInDto,
  SlotFilterDto,
  BookingFilterDto,
  JoinWaitlistDto,
} from './booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('api/v1')
export class BookingController {
  constructor(
    private readonly slotService: SlotService,
    private readonly bookingService: BookingService,
    private readonly waitlistService: WaitlistService,
  ) {}

  // ─── Slots ──────────────────────────────────────────────────────

  @Post('slots')
  @ApiOperation({ summary: 'إنشاء حصة تدريبية' })
  async createSlot(@Body() dto: CreateSlotDto) {
    return this.slotService.create(dto);
  }

  @Get('slots')
  @ApiOperation({ summary: 'الحصص المتاحة لجيم في يوم معين' })
  async listSlots(@Query() filters: SlotFilterDto) {
    return this.slotService.listAvailable(
      filters.gym_id,
      filters.date || new Date().toISOString().split('T')[0],
      filters.category,
    );
  }

  @Get('slots/:id')
  @ApiOperation({ summary: 'تفاصيل حصة' })
  async getSlot(@Param('id', ParseUUIDPipe) id: string) {
    return this.slotService.getById(id);
  }

  @Put('slots/:id')
  @ApiOperation({ summary: 'تحديث حصة' })
  async updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.slotService.update(id, dto);
  }

  @Post('slots/:id/cancel')
  @ApiOperation({ summary: 'إلغاء حصة' })
  async cancelSlot(@Param('id', ParseUUIDPipe) id: string) {
    return this.slotService.cancelSlot(id);
  }

  // ─── Bookings ───────────────────────────────────────────────────

  @Post('slots/:id/book')
  @ApiOperation({ summary: 'حجز حصة' })
  async book(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: BookSlotDto,
  ) {
    return this.bookingService.book(userId, dto);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'حجوزات المستخدم' })
  async getBookings(@Query() filters: BookingFilterDto) {
    if (!filters.user_id) throw new Error('user_id is required');
    return this.bookingService.getUserBookings(
      filters.user_id,
      filters.status,
      filters.page,
      filters.limit,
    );
  }

  @Get('bookings/upcoming')
  @ApiOperation({ summary: 'الحجوزات القادمة' })
  async getUpcoming(@Query('user_id', ParseUUIDPipe) userId: string) {
    return this.bookingService.getUpcoming(userId);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'تفاصيل حجز' })
  async getBooking(@Param('id', ParseUUIDPipe) id: string) {
    // يمكن إضافة دالة findById في الـ service
    return { id };
  }

  @Put('bookings/:id/cancel')
  @ApiOperation({ summary: 'إلغاء حجز' })
  async cancel(
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancel(bookingId, userId, dto);
  }

  @Post('bookings/:id/checkin')
  @ApiOperation({ summary: 'تسجيل دخول (Check-in)' })
  async checkIn(
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.bookingService.checkIn(bookingId, userId, dto);
  }

  @Post('bookings/:id/noshow')
  @ApiOperation({ summary: 'تسجيل غياب (No-show)' })
  async markNoShow(@Param('id', ParseUUIDPipe) bookingId: string) {
    return this.bookingService.markNoShow(bookingId);
  }

  // ─── Waitlist ───────────────────────────────────────────────────

  @Post('waitlist')
  @ApiOperation({ summary: 'الانضمام لقائمة الانتظار' })
  async joinWaitlist(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: JoinWaitlistDto,
  ) {
    return this.waitlistService.join(userId, dto);
  }

  @Post('waitlist/:id/leave')
  @ApiOperation({ summary: 'مغادرة قائمة الانتظار' })
  async leaveWaitlist(
    @Param('id', ParseUUIDPipe) waitlistId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
  ) {
    return this.waitlistService.leave(waitlistId, userId);
  }
}
