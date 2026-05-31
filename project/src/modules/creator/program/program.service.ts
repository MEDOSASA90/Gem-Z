/**
 * =============================================================================
 * Program Service - خدمة البرامج
 * =============================================================================
 * تدير عمليات إنشاء البرامج، التسجيل، تحديث التقدم، والإكمال
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatorProgram, ProgramType } from './creator-program.entity';
import {
  ProgramEnrollment,
  EnrollmentStatus,
} from './program-enrollment.entity';
import {
  CreateProgramDto,
  UpdateProgramDto,
  EnrollProgramDto,
  UpdateProgressDto,
  SearchProgramsDto,
  ProgramLessonDto,
} from './program.dto';

// ── الأحداث ─────────────────────────────────────────────────────

/** حدث شراء برنامج */
export class ProgramPurchasedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly programId: string,
    public readonly creatorId: string,
    public readonly price: number,
    public readonly currency: string,
  ) {}
}

/** حدث إكمال برنامج */
export class ProgramCompletedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly programId: string,
    public readonly creatorId: string,
    public readonly completedAt: Date,
  ) {}
}

/** حدث تحديث تقدم في برنامج */
export class ProgramProgressUpdatedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly programId: string,
    public readonly lessonId: string,
    public readonly progressPercent: number,
  ) {}
}

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(CreatorProgram)
    private readonly programRepo: Repository<CreatorProgram>,
    @InjectRepository(ProgramEnrollment)
    private readonly enrollmentRepo: Repository<ProgramEnrollment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── إدارة البرامج ──────────────────────────────────────────────

  /**
   * إنشاء برنامج جديد
   */
  async createProgram(
    creatorId: string,
    dto: CreateProgramDto,
  ): Promise<CreatorProgram> {
    // حساب عدد الدروس
    const lessonsCount = dto.lessons?.length ?? 0;

    // فرز الدروس حسب الترتيب
    const sortedLessons = [...(dto.lessons ?? [])].sort(
      (a, b) => a.order - b.order,
    );

    const program = this.programRepo.create({
      ...dto,
      creator_id: creatorId,
      lessons_count: lessonsCount,
      lessons: sortedLessons as unknown as CreatorProgram['lessons'],
      requirements: dto.requirements ?? [],
      outcomes: dto.outcomes ?? [],
      currency: dto.currency ?? 'USD',
      is_published: dto.is_published ?? false,
    });

    return this.programRepo.save(program);
  }

  /**
   * تحديث برنامج
   */
  async updateProgram(
    programId: string,
    dto: UpdateProgramDto,
  ): Promise<CreatorProgram> {
    const program = await this.getProgram(programId);

    // تحديث الحقول
    if (dto.title !== undefined) program.title = dto.title;
    if (dto.description !== undefined) program.description = dto.description ?? null;
    if (dto.type !== undefined) program.type = dto.type;
    if (dto.cover_image !== undefined) program.cover_image = dto.cover_image ?? null;
    if (dto.price !== undefined) program.price = dto.price;
    if (dto.currency !== undefined) program.currency = dto.currency;
    if (dto.duration_weeks !== undefined) program.duration_weeks = dto.duration_weeks;
    if (dto.difficulty !== undefined) program.difficulty = dto.difficulty;
    if (dto.requirements !== undefined) program.requirements = dto.requirements;
    if (dto.outcomes !== undefined) program.outcomes = dto.outcomes;
    if (dto.is_published !== undefined) program.is_published = dto.is_published;

    // تحديث الدروس إذا وُفرت
    if (dto.lessons !== undefined) {
      program.lessons = [...dto.lessons].sort(
        (a, b) => a.order - b.order,
      ) as unknown as CreatorProgram['lessons'];
      program.lessons_count = dto.lessons.length;
    }

    return this.programRepo.save(program);
  }

  /**
   * جلب برنامج بواسطة المعرف
   */
  async getProgram(programId: string): Promise<CreatorProgram> {
    const program = await this.programRepo.findOne({
      where: { id: programId },
      relations: ['creator', 'enrollments'],
    });
    if (!program) {
      throw new NotFoundException(`Program with id ${programId} not found`);
    }
    return program;
  }

  /**
   * البحث في البرامج
   */
  async searchPrograms(dto: SearchProgramsDto): Promise<{
    items: CreatorProgram[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.programRepo.createQueryBuilder('program')
      .leftJoinAndSelect('program.creator', 'creator')
      .where('program.is_published = :published', { published: true });

    if (dto.q) {
      qb.andWhere(
        '(program.title ILIKE :q OR program.description ILIKE :q)',
        { q: `%${dto.q}%` },
      );
    }

    if (dto.type) {
      qb.andWhere('program.type = :type', { type: dto.type });
    }

    if (dto.difficulty) {
      qb.andWhere('program.difficulty = :difficulty', { difficulty: dto.difficulty });
    }

    if (dto.creator_id) {
      qb.andWhere('program.creator_id = :creatorId', { creatorId: dto.creator_id });
    }

    if (dto.min_price !== undefined) {
      qb.andWhere('program.price >= :minPrice', { minPrice: dto.min_price });
    }

    if (dto.max_price !== undefined) {
      qb.andWhere('program.price <= :maxPrice', { maxPrice: dto.max_price });
    }

    const [items, total] = await qb
      .orderBy('program.rating', 'DESC')
      .addOrderBy('program.enrollment_count', 'DESC')
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
   * جلب برامج صانع محتوى
   */
  async getCreatorPrograms(creatorId: string): Promise<CreatorProgram[]> {
    return this.programRepo.find({
      where: { creator_id: creatorId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * حذف برنامج (ناعم)
   */
  async softDeleteProgram(programId: string): Promise<void> {
    await this.programRepo.softDelete(programId);
  }

  // ── التسجيل والتقدم ────────────────────────────────────────────

  /**
   * التسجيل في برنامج (الشراء والتسجيل)
   */
  async enroll(
    userId: string,
    programId: string,
    dto?: EnrollProgramDto,
  ): Promise<ProgramEnrollment> {
    const program = await this.getProgram(programId);

    // التحقق من أن البرنامج منشور
    if (!program.is_published) {
      throw new BadRequestException('This program is not available for enrollment');
    }

    // التحقق من عدم التسجيل مسبقاً
    const existing = await this.enrollmentRepo.findOne({
      where: { user_id: userId, program_id: programId },
    });
    if (existing && existing.status !== EnrollmentStatus.DROPPED) {
      throw new ConflictException('Already enrolled in this program');
    }

    // إذا كان مسجلاً لكن منسحب، نعيد التفعيل
    if (existing?.status === EnrollmentStatus.DROPPED) {
      existing.status = EnrollmentStatus.ENROLLED;
      existing.is_refunded = false;
      existing.purchase_price = Number(program.price);
      existing.payment_transaction_id = dto?.payment_transaction_id ?? null;
      const saved = await this.enrollmentRepo.save(existing);

      // تحديث عداد المسجلين
      program.enrollment_count += 1;
      await this.programRepo.save(program);

      return saved;
    }

    // إنشاء تسجيل جديد
    const enrollment = this.enrollmentRepo.create({
      program_id: programId,
      user_id: userId,
      status: EnrollmentStatus.ENROLLED,
      progress_percent: 0,
      completed_lessons: [],
      purchase_price: Number(program.price),
      currency: program.currency,
      payment_transaction_id: dto?.payment_transaction_id ?? null,
    });

    const saved = await this.enrollmentRepo.save(enrollment);

    // تحديث عداد المسجلين
    program.enrollment_count += 1;
    await this.programRepo.save(program);

    // نشر حدث الشراء
    this.eventEmitter.emit(
      'program.purchased',
      new ProgramPurchasedEvent(
        saved.id,
        saved.user_id,
        programId,
        program.creator_id,
        Number(program.price),
        program.currency,
      ),
    );

    return saved;
  }

  /**
   * تحديث تقدم المستخدم في البرنامج
   */
  async updateProgress(
    userId: string,
    enrollmentId: string,
    dto: UpdateProgressDto,
  ): Promise<ProgramEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, user_id: userId },
      relations: ['program'],
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    if (enrollment.status === EnrollmentStatus.DROPPED) {
      throw new BadRequestException('Cannot update progress for dropped enrollment');
    }

    const program = enrollment.program;
    const lessonId = dto.lesson_id;

    // التحقق من أن الدرس موجود في البرنامج
    const lessonExists = program.lessons.some((l: unknown) => {
      const lesson = l as { id: string };
      return lesson.id === lessonId;
    });
    if (!lessonExists) {
      throw new BadRequestException('Lesson not found in this program');
    }

    // إضافة الدرس للدروس المكتملة إذا لم يكن موجوداً
    if (!enrollment.completed_lessons.includes(lessonId)) {
      enrollment.completed_lessons = [...enrollment.completed_lessons, lessonId];
    }

    // حساب نسبة الإنجاز
    const completedCount = enrollment.completed_lessons.length;
    const totalLessons = program.lessons_count || program.lessons.length || 1;
    const progressPercent = Math.min(100, Math.round((completedCount / totalLessons) * 100));
    enrollment.progress_percent = progressPercent;

    // تحديث الدرس الحالي
    enrollment.current_lesson_id = lessonId;

    // أول درس يُعلّم البدء
    if (!enrollment.started_at) {
      enrollment.started_at = new Date();
      enrollment.status = EnrollmentStatus.IN_PROGRESS;
    }

    // التحقق من الإكمال
    if (progressPercent >= 100 && enrollment.status !== EnrollmentStatus.COMPLETED) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completed_at = new Date();

      // تحديث عداد المكملين في البرنامج
      program.completion_count += 1;
      await this.programRepo.save(program);

      // نشر حدث الإكمال
      this.eventEmitter.emit(
        'program.completed',
        new ProgramCompletedEvent(
          enrollment.id,
          userId,
          program.id,
          program.creator_id,
          enrollment.completed_at,
        ),
      );
    }

    const saved = await this.enrollmentRepo.save(enrollment);

    // نشر حدث تحديث التقدم
    this.eventEmitter.emit(
      'program.progress.updated',
      new ProgramProgressUpdatedEvent(
        saved.id,
        userId,
        program.id,
        lessonId,
        progressPercent,
      ),
    );

    return saved;
  }

  /**
   * الانسحاب من برنامج
   */
  async dropEnrollment(
    userId: string,
    enrollmentId: string,
  ): Promise<ProgramEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, user_id: userId },
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    enrollment.status = EnrollmentStatus.DROPPED;
    return this.enrollmentRepo.save(enrollment);
  }

  /**
   * جلب البرامج المسجل فيها المستخدم
   */
  async getEnrolledPrograms(
    userId: string,
    status?: EnrollmentStatus,
  ): Promise<ProgramEnrollment[]> {
    const where: Record<string, unknown> = { user_id: userId };
    if (status) {
      where.status = status;
    }

    return this.enrollmentRepo.find({
      where,
      relations: ['program'],
      order: { updated_at: 'DESC' },
    });
  }

  /**
   * جلب تفاصيل تسجيل
   */
  async getEnrollment(enrollmentId: string): Promise<ProgramEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
      relations: ['program'],
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }
    return enrollment;
  }

  /**
   * تقييم برنامج
   */
  async rateProgram(
    programId: string,
    rating: number,
  ): Promise<CreatorProgram> {
    const program = await this.getProgram(programId);

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // حساب التقييم الجديد (متوسط متحرك)
    const currentRating = Number(program.rating);
    const currentCount = program.rating_count;
    const newCount = currentCount + 1;
    const newRating = ((currentRating * currentCount) + rating) / newCount;

    program.rating = Math.round(newRating * 100) / 100; // تقريب لمنزلتين
    program.rating_count = newCount;

    return this.programRepo.save(program);
  }
}
