/**
 * =============================================================================
 * Live Service - خدمة الجلسات المباشرة
 * =============================================================================
 * تدير عمليات جدولة الجلسات، شراء التذاكر، بدء/إنهاء البث، وتوليد الإعادات
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveSession, LiveSessionStatus } from './live-session.entity';
import { LiveTicket, TicketStatus } from './live-ticket.entity';
import { SessionReplay } from './session-replay.entity';
import {
  ScheduleSessionDto,
  UpdateSessionDto,
  PurchaseTicketDto,
  StartSessionDto,
  EndSessionDto,
  CreateReplayDto,
  GetUpcomingSessionsDto,
} from './live.dto';

// ── الأحداث ─────────────────────────────────────────────────────

/** حدث بدء جلسة مباشرة */
export class LiveSessionStartedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly creatorId: string,
    public readonly title: string,
    public readonly startedAt: Date,
    public readonly streamUrl: string | null,
  ) {}
}

/** حدث انتهاء جلسة مباشرة */
export class LiveSessionEndedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly creatorId: string,
    public readonly title: string,
    public readonly endedAt: Date,
    public readonly actualDurationMinutes: number | null,
    public readonly replayUrl: string | null,
  ) {}
}

/** حدث شراء تذكرة */
export class TicketPurchasedEvent {
  constructor(
    public readonly ticketId: string,
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly creatorId: string,
    public readonly price: number,
    public readonly currency: string,
  ) {}
}

@Injectable()
export class LiveService {
  constructor(
    @InjectRepository(LiveSession)
    private readonly sessionRepo: Repository<LiveSession>,
    @InjectRepository(LiveTicket)
    private readonly ticketRepo: Repository<LiveTicket>,
    @InjectRepository(SessionReplay)
    private readonly replayRepo: Repository<SessionReplay>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── إدارة الجلسات ──────────────────────────────────────────────

  /**
   * جدولة جلسة مباشرة جديدة
   */
  async scheduleSession(
    creatorId: string,
    dto: ScheduleSessionDto,
  ): Promise<LiveSession> {
    const scheduledAt = new Date(dto.scheduled_at);

    // التحقق من أن التاريخ في المستقبل
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled date must be in the future');
    }

    // التحقق من عدم وجود جلسة متعارضة (في نفس الوقت تقريباً)
    const conflictingSession = await this.sessionRepo.findOne({
      where: {
        creator_id: creatorId,
        status: LiveSessionStatus.SCHEDULED,
      },
    });

    // فحص التعارض: جلسة ضمن نطاق +/- 2 ساعة
    if (conflictingSession) {
      const diffMs = Math.abs(
        scheduledAt.getTime() - conflictingSession.scheduled_at.getTime(),
      );
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 2) {
        throw new ConflictException(
          'You have another session scheduled within 2 hours of this time',
        );
      }
    }

    const session = this.sessionRepo.create({
      creator_id: creatorId,
      title: dto.title,
      description: dto.description ?? null,
      cover_image: dto.cover_image ?? null,
      scheduled_at: scheduledAt,
      duration_minutes: dto.duration_minutes ?? 60,
      status: LiveSessionStatus.SCHEDULED,
      is_paid: dto.is_paid ?? false,
      ticket_price: dto.is_paid ? (dto.ticket_price ?? 0) : 0,
      currency: dto.currency ?? 'USD',
      max_attendees: dto.max_attendees ?? 1000,
    });

    return this.sessionRepo.save(session);
  }

  /**
   * تحديث جلسة مجدولة
   */
  async updateSession(
    sessionId: string,
    dto: UpdateSessionDto,
  ): Promise<LiveSession> {
    const session = await this.getSession(sessionId);

    // لا يمكن تحديث جلسة منتهية أو ملغاة أو مباشرة
    if (
      session.status === LiveSessionStatus.ENDED ||
      session.status === LiveSessionStatus.CANCELLED ||
      session.status === LiveSessionStatus.LIVE
    ) {
      throw new BadRequestException(
        `Cannot update a ${session.status.toLowerCase()} session`,
      );
    }

    Object.assign(session, {
      title: dto.title ?? session.title,
      description: dto.description ?? session.description,
      cover_image: dto.cover_image ?? session.cover_image,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : session.scheduled_at,
      duration_minutes: dto.duration_minutes ?? session.duration_minutes,
      is_paid: dto.is_paid ?? session.is_paid,
      ticket_price: dto.is_paid !== undefined
        ? (dto.is_paid ? (dto.ticket_price ?? session.ticket_price) : 0)
        : session.ticket_price,
      max_attendees: dto.max_attendees ?? session.max_attendees,
    });

    return this.sessionRepo.save(session);
  }

  /**
   * جلب جلسة بواسطة المعرف
   */
  async getSession(sessionId: string): Promise<LiveSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['creator', 'tickets', 'replays'],
    });
    if (!session) {
      throw new NotFoundException(`Live session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * إلغاء جلسة مجدولة
   */
  async cancelSession(sessionId: string): Promise<LiveSession> {
    const session = await this.getSession(sessionId);

    if (session.status !== LiveSessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be cancelled');
    }

    session.status = LiveSessionStatus.CANCELLED;
    return this.sessionRepo.save(session);
  }

  // ── شراء التذاكر ───────────────────────────────────────────────

  /**
   * شراء تذكرة لجلسة مدفوعة
   */
  async purchaseTicket(
    userId: string,
    sessionId: string,
    dto?: PurchaseTicketDto,
  ): Promise<LiveTicket> {
    const session = await this.getSession(sessionId);

    // التحقق من أن الجلسة مدفوعة
    if (!session.is_paid) {
      throw new BadRequestException('This session is free, no ticket needed');
    }

    // التحقق من أن الجلسة لم تنتهِ أو تُلغَ
    if (
      session.status === LiveSessionStatus.ENDED ||
      session.status === LiveSessionStatus.CANCELLED
    ) {
      throw new BadRequestException('This session is no longer available');
    }

    // التحقق من عدم شراء تذكرة مسبقة
    const existingTicket = await this.ticketRepo.findOne({
      where: { session_id: sessionId, user_id: userId },
    });
    if (existingTicket && existingTicket.status !== TicketStatus.REFUNDED) {
      throw new ConflictException('You already have a ticket for this session');
    }

    // التحقق من عدم تجاوز الحد الأقصى
    if (session.tickets_sold >= session.max_attendees) {
      throw new BadRequestException('This session is sold out');
    }

    const ticket = this.ticketRepo.create({
      session_id: sessionId,
      user_id: userId,
      status: TicketStatus.PURCHASED,
      price: session.ticket_price,
      currency: session.currency,
      payment_transaction_id: dto?.payment_transaction_id ?? null,
    });

    const saved = await this.ticketRepo.save(ticket);

    // تحديث عداد التذاكر المباعة
    session.tickets_sold += 1;
    await this.sessionRepo.save(session);

    // نشر حدث الشراء
    this.eventEmitter.emit(
      'live.ticket.purchased',
      new TicketPurchasedEvent(
        saved.id,
        sessionId,
        userId,
        session.creator_id,
        Number(session.ticket_price),
        session.currency,
      ),
    );

    return saved;
  }

  /**
   * استرداد تذكرة
   */
  async refundTicket(ticketId: string): Promise<LiveTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['session'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    // لا يمكن استرداد تذكرة مستخدمة
    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Cannot refund a used ticket');
    }

    ticket.status = TicketStatus.REFUNDED;
    const saved = await this.ticketRepo.save(ticket);

    // تقليل عداد التذاكر المباعة
    const session = ticket.session;
    session.tickets_sold = Math.max(0, session.tickets_sold - 1);
    await this.sessionRepo.save(session);

    return saved;
  }

  /**
   * التحقق من وجود تذكرة صالحة
   */
  async validateTicket(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    const ticket = await this.ticketRepo.findOne({
      where: {
        session_id: sessionId,
        user_id: userId,
        status: TicketStatus.PURCHASED,
      },
    });
    return !!ticket;
  }

  // ── بدء وإنهاء البث ────────────────────────────────────────────

  /**
   * بدء الجلسة المباشرة
   */
  async startSession(
    sessionId: string,
    dto?: StartSessionDto,
  ): Promise<LiveSession> {
    const session = await this.getSession(sessionId);

    if (session.status !== LiveSessionStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot start a session that is ${session.status.toLowerCase()}`,
      );
    }

    session.status = LiveSessionStatus.LIVE;
    session.started_at = new Date();
    if (dto?.stream_key) session.stream_key = dto.stream_key;
    if (dto?.stream_url) session.stream_url = dto.stream_url;

    const saved = await this.sessionRepo.save(session);

    // نشر حدث بدء البث
    this.eventEmitter.emit(
      'live.session.started',
      new LiveSessionStartedEvent(
        saved.id,
        saved.creator_id,
        saved.title,
        saved.started_at!,
        saved.stream_url,
      ),
    );

    return saved;
  }

  /**
   * إنهاء الجلسة المباشرة + توليد الإعادة
   */
  async endSession(
    sessionId: string,
    dto?: EndSessionDto,
  ): Promise<LiveSession> {
    const session = await this.getSession(sessionId);

    if (session.status !== LiveSessionStatus.LIVE) {
      throw new BadRequestException('Only live sessions can be ended');
    }

    const now = new Date();
    session.status = LiveSessionStatus.ENDED;
    session.ended_at = now;

    // حساب المدة الفعلية
    if (session.started_at) {
      const diffMs = now.getTime() - session.started_at.getTime();
      session.actual_duration_minutes = Math.round(diffMs / (1000 * 60));
    }

    if (dto?.actual_duration_minutes) {
      session.actual_duration_minutes = dto.actual_duration_minutes;
    }

    if (dto?.replay_url) {
      session.replay_url = dto.replay_url;
    }

    const saved = await this.sessionRepo.save(session);

    // نشر حدث انتهاء البث
    this.eventEmitter.emit(
      'live.session.ended',
      new LiveSessionEndedEvent(
        saved.id,
        saved.creator_id,
        saved.title,
        now,
        saved.actual_duration_minutes,
        saved.replay_url,
      ),
    );

    return saved;
  }

  // ── إدارة الإعادات ─────────────────────────────────────────────

  /**
   * إنشاء تسجيل إعادة
   */
  async createReplay(
    sessionId: string,
    dto: CreateReplayDto,
  ): Promise<SessionReplay> {
    const session = await this.getSession(sessionId);

    if (session.status !== LiveSessionStatus.ENDED) {
      throw new BadRequestException('Only ended sessions can have replays');
    }

    const replay = this.replayRepo.create({
      session_id: sessionId,
      replay_url: dto.replay_url,
      thumbnail_url: dto.thumbnail_url ?? null,
      duration_minutes: dto.duration_minutes,
      file_size_mb: dto.file_size_mb ?? null,
      views_count: 0,
      available_until: new Date(dto.available_until),
      is_public: dto.is_public ?? false,
      storage_key: dto.storage_key ?? null,
    });

    const saved = await this.replayRepo.save(replay);

    // تحديث رابط الإعادة في الجلسة
    session.replay_url = dto.replay_url;
    await this.sessionRepo.save(session);

    return saved;
  }

  /**
   * جلب الإعادة
   */
  async getReplay(sessionId: string): Promise<SessionReplay | null> {
    const replay = await this.replayRepo.findOne({
      where: {
        session_id: sessionId,
        available_until: MoreThan(new Date()),
      },
      relations: ['session'],
    });
    return replay;
  }

  /**
   * زيادة عداد مشاهدات الإعادة
   */
  async incrementReplayViews(replayId: string): Promise<void> {
    await this.replayRepo.increment({ id: replayId }, 'views_count', 1);
  }

  // ── استعراض الجلسات ───────────────────────────────────────────

  /**
   * جلب الجلسات القادمة
   */
  async getUpcomingSessions(dto: GetUpcomingSessionsDto): Promise<{
    items: LiveSession[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.creator', 'creator')
      .where('session.status = :status', { status: LiveSessionStatus.SCHEDULED })
      .andWhere('session.scheduled_at > :now', { now: new Date() });

    if (dto.creator_id) {
      qb.andWhere('session.creator_id = :creatorId', { creatorId: dto.creator_id });
    }

    if (dto.paid_only) {
      qb.andWhere('session.is_paid = :isPaid', { isPaid: true });
    }

    const [items, total] = await qb
      .orderBy('session.scheduled_at', 'ASC')
      .skip(((dto.page ?? 1) - 1) * (dto.limit ?? 20))
      .take(dto.limit ?? 20)
      .getManyAndCount();

    return {
      items,
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    };
  }

  /**
   * جلب جلسات صانع محتوى
   */
  async getCreatorSessions(creatorId: string): Promise<LiveSession[]> {
    return this.sessionRepo.find({
      where: { creator_id: creatorId },
      order: { scheduled_at: 'DESC' },
    });
  }

  /**
   * جلب تذاكر مستخدم
   */
  async getUserTickets(userId: string): Promise<LiveTicket[]> {
    return this.ticketRepo.find({
      where: { user_id: userId },
      relations: ['session'],
      order: { purchased_at: 'DESC' },
    });
  }

  // ── Cron: إنهاء الجلسات المتعلقة تلقائياً ─────────────────────

  /**
   * إنهاء الجلسات المباشرة التي تجاوزت مدتها المتوقعة + ساعة
   * يُستدعى من Cron Job
   */
  async autoEndStaleSessions(): Promise<number> {
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - 5); // 5 ساعات أقصى مدة

    const staleSessions = await this.sessionRepo.find({
      where: {
        status: LiveSessionStatus.LIVE,
        started_at: MoreThan(staleThreshold), // هذا خطأ منطقي - يجب LessThan
      },
    });

    // تصحيح: نحتاج QueryBuilder
    const qb = this.sessionRepo.createQueryBuilder('session')
      .where('session.status = :status', { status: LiveSessionStatus.LIVE })
      .andWhere('session.started_at < :threshold', { threshold: staleThreshold });

    const toEnd = await qb.getMany();

    let count = 0;
    for (const session of toEnd) {
      await this.endSession(session.id);
      count++;
    }

    return count;
  }
}
