/**
 * =============================================================================
 * ContentLockGuard - حارس حماية المحتوى والمجتمعات المدفوعة
 * =============================================================================
 * يمنع الوصول للمحتوى الممتاز (Premium Reels، برامج التدريب المدفوعة، الاستشارات المباشرة)
 * إلا إذا كان المتدرب يمتلك اشتراكاً نشطاً أو فترة تجريبية سارية لدى صانع المحتوى.
 * يرجع استثناء HTTP 402 Payment Required في حال كان المحتوى مغلقاً.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, DataSource } from 'typeorm';
import { CreatorSubscription, SubscriptionStatus } from './creator-subscription.entity';
import { CreatorProgram } from '../program/creator-program.entity';
import { Reel } from '../../social/reels/reel.entity';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ContentLockGuard implements CanActivate {
  private readonly logger = new Logger(ContentLockGuard.name);

  constructor(
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepo: Repository<CreatorSubscription>,
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // ─── 1. استخراج معرف المستخدم الحالي (المتدرب) ───
    const userId = request.user?.id || request.headers['x-user-id'];
    if (!userId) {
      this.logger.warn('ContentLockGuard: Attempt to access premium content without user authentication');
      throw new HttpException('Unauthorized access.', HttpStatus.UNAUTHORIZED);
    }

    // ─── 2. استخراج معرف صانع المحتوى أو مرجع الأصل المستهدف ───
    let creatorId = request.params.creatorId || request.query.creatorId || request.body.creatorId;

    // استخراج البرنامج التدريبي إن وجد لمعرفة الصانع المرتبط به
    const programId = request.params.programId || request.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!creatorId && programId && uuidRegex.test(programId)) {
      try {
        const programRepo = this.dataSource.getRepository(CreatorProgram);
        const program = await programRepo.findOne({ where: { id: programId } });
        if (program) {
          creatorId = program.creator_id;
        }
      } catch (err: any) {
        this.logger.debug(`Could not lookup program creator for id ${programId}: ${err.message}`);
      }
    }

    // استخراج الريل إن وجد لمعرفة الصانع المرتبط به
    const reelId = request.params.reelId || request.params.id;
    if (!creatorId && reelId && uuidRegex.test(reelId)) {
      try {
        const reelRepo = this.dataSource.getRepository(Reel);
        const reel = await reelRepo.findOne({ where: { id: reelId } });
        if (reel) {
          creatorId = reel.user_id; // صاحب الريل هو صانع المحتوى
        }
      } catch (err: any) {
        this.logger.debug(`Could not lookup reel creator for id ${reelId}: ${err.message}`);
      }
    }

    // إذا لم يتوفر أي صانع محتوى في معطيات الطلب، نمرر الطلب بأمان
    if (!creatorId) {
      return true;
    }

    // صناع المحتوى يمكنهم تصفح وقراءة محتواهم الخاص بدون اشتراك!
    if (userId === creatorId) {
      return true;
    }

    // ─── 3. التحقق الفعلي من حالة الاشتراك الفعال في قاعدة البيانات ───
    const now = new Date();
    const activeSub = await this.subscriptionRepo.findOne({
      where: [
        {
          subscriber_id: userId,
          creator_id: creatorId,
          status: SubscriptionStatus.ACTIVE,
          end_date: MoreThan(now),
        },
        {
          subscriber_id: userId,
          creator_id: creatorId,
          status: SubscriptionStatus.TRIAL,
          end_date: MoreThan(now),
        },
        {
          subscriber_id: userId,
          creator_id: creatorId,
          status: SubscriptionStatus.CANCELLED,
          end_date: MoreThan(now),
        },
      ],
    });

    if (!activeSub) {
      this.logger.log(`Access blocked for user ${userId} to premium content of creator ${creatorId} (402 Payment Required)`);
      throw new HttpException(
        'Premium Content Locked. Subscription required.',
        HttpStatus.PAYMENT_REQUIRED, // 402
      );
    }

    this.logger.debug(`Access granted for user ${userId} to premium content of creator ${creatorId}`);
    return true;
  }
}
