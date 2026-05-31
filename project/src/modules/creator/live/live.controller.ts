/**
 * =============================================================================
 * Live Controller - متحكم الجلسات المباشرة
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LiveService } from './live.service';
import {
  ScheduleSessionDto,
  UpdateSessionDto,
  PurchaseTicketDto,
  StartSessionDto,
  EndSessionDto,
  CreateReplayDto,
  GetUpcomingSessionsDto,
  LiveSessionResponseDto,
  LiveTicketResponseDto,
  SessionReplayResponseDto,
} from './live.dto';
import { LiveSession } from './live-session.entity';
import { LiveTicket } from './live-ticket.entity';
import { SessionReplay } from './session-replay.entity';

@ApiTags('Creator Live Sessions')
@Controller('creator/live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  // ── إدارة الجلسات ──────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Schedule a live session',
    description: 'جدولة جلسة مباشرة جديدة',
  })
  @ApiResponse({ status: 201, description: 'Session scheduled', type: LiveSessionResponseDto })
  async scheduleSession(
    @Body('creator_id', ParseUUIDPipe) creatorId: string,
    @Body() dto: ScheduleSessionDto,
  ): Promise<LiveSession> {
    return this.liveService.scheduleSession(creatorId, dto);
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming sessions',
    description: 'جلب الجلسات المباشرة القادمة',
  })
  @ApiResponse({ status: 200, description: 'List of upcoming sessions' })
  async getUpcomingSessions(@Query() query: GetUpcomingSessionsDto): Promise<{
    items: LiveSession[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.liveService.getUpcomingSessions(query);
  }

  @Get('creator/:creatorId')
  @ApiOperation({
    summary: "Get creator's live sessions",
    description: 'جلب جلسات صانع محتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async getCreatorSessions(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<LiveSession[]> {
    return this.liveService.getCreatorSessions(creatorId);
  }

  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get session details',
    description: 'جلب تفاصيل جلسة مباشرة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<LiveSession> {
    return this.liveService.getSession(sessionId);
  }

  @Patch(':sessionId')
  @ApiOperation({
    summary: 'Update scheduled session',
    description: 'تحديث جلسة مجدولة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 200, description: 'Session updated' })
  async updateSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<LiveSession> {
    return this.liveService.updateSession(sessionId, dto);
  }

  @Post(':sessionId/cancel')
  @ApiOperation({
    summary: 'Cancel scheduled session',
    description: 'إلغاء جلسة مجدولة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 200, description: 'Session cancelled' })
  async cancelSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<LiveSession> {
    return this.liveService.cancelSession(sessionId);
  }

  // ── شراء التذاكر ───────────────────────────────────────────────

  @Post(':sessionId/ticket')
  @ApiOperation({
    summary: 'Purchase ticket for live session',
    description: 'شراء تذكرة لجلسة مباشرة مدفوعة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 201, description: 'Ticket purchased', type: LiveTicketResponseDto })
  @ApiResponse({ status: 400, description: 'Session is sold out or not paid' })
  async purchaseTicket(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: PurchaseTicketDto,
  ): Promise<LiveTicket> {
    return this.liveService.purchaseTicket(dto.user_id, sessionId, dto);
  }

  @Post('ticket/:ticketId/refund')
  @ApiOperation({
    summary: 'Refund a ticket',
    description: 'استرداد تذكرة',
  })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket refunded' })
  async refundTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ): Promise<LiveTicket> {
    return this.liveService.refundTicket(ticketId);
  }

  @Get('tickets/:userId')
  @ApiOperation({
    summary: "Get user's tickets",
    description: 'جلب تذاكر مستخدم',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async getUserTickets(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<LiveTicket[]> {
    return this.liveService.getUserTickets(userId);
  }

  // ── بدء وإنهاء البث ────────────────────────────────────────────

  @Post(':sessionId/start')
  @ApiOperation({
    summary: 'Start live session',
    description: 'بدء البث المباشر',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 200, description: 'Session started' })
  async startSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: StartSessionDto,
  ): Promise<LiveSession> {
    return this.liveService.startSession(sessionId, dto);
  }

  @Post(':sessionId/end')
  @ApiOperation({
    summary: 'End live session',
    description: 'إنهاء البث المباشر وتوليد الإعادة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async endSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: EndSessionDto,
  ): Promise<LiveSession> {
    return this.liveService.endSession(sessionId, dto);
  }

  // ── إدارة الإعادات ─────────────────────────────────────────────

  @Post(':sessionId/replay')
  @ApiOperation({
    summary: 'Create session replay',
    description: 'إنشاء تسجيل إعادة للجلسة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 201, description: 'Replay created', type: SessionReplayResponseDto })
  async createReplay(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: CreateReplayDto,
  ): Promise<SessionReplay> {
    return this.liveService.createReplay(sessionId, dto);
  }

  @Get(':sessionId/replay')
  @ApiOperation({
    summary: 'Get session replay',
    description: 'جلب إعادة الجلسة',
  })
  @ApiParam({ name: 'sessionId', description: 'Live session ID' })
  @ApiResponse({ status: 200, description: 'Replay details' })
  @ApiResponse({ status: 404, description: 'Replay not found or expired' })
  async getReplay(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionReplay | null> {
    return this.liveService.getReplay(sessionId);
  }
}
