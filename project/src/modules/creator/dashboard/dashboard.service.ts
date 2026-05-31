/**
 * =============================================================================
 * Dashboard Service - خدمة لوحة التحكم و التحليلات
 * =============================================================================
 * توفر تحليلات شاملة لصناع المحتوى: الإيرادات، المشتركين، التفاعل، النمو
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreatorAnalytics } from './creator-analytics.entity';
import { CreatorSubscription, SubscriptionStatus } from '../subscription/creator-subscription.entity';
import { RevenueSplit } from '../payout/revenue-split.entity';
import { ProfileService } from '../profile/profile.service';

/** نوع الفترة الزمنية للتحليلات */
export enum AnalyticsPeriod {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  ALL_TIME = 'ALL_TIME',
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(CreatorAnalytics)
    private readonly analyticsRepo: Repository<CreatorAnalytics>,
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepo: Repository<CreatorSubscription>,
    @InjectRepository(RevenueSplit)
    private readonly revenueRepo: Repository<RevenueSplit>,
    private readonly profileService: ProfileService,
  ) {}

  // ── تحليلات الإيرادات ──────────────────────────────────────────

  /**
   * جلب تحليلات الإيرادات لفترة معينة
   */
  async getRevenueAnalytics(
    creatorId: string,
    period: AnalyticsPeriod,
  ): Promise<{
    total: number;
    subscriptions: number;
    programs: number;
    live: number;
    currency: string;
    daily_breakdown: { date: string; total: number; subscriptions: number; programs: number; live: number }[];
    period: AnalyticsPeriod;
  }> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const analytics = await this.analyticsRepo.find({
      where: {
        creator_id: creatorId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    let total = 0;
    let subs = 0;
    let progs = 0;
    let live = 0;
    const dailyBreakdown: { date: string; total: number; subscriptions: number; programs: number; live: number }[] = [];

    for (const a of analytics) {
      total += Number(a.revenue_total);
      subs += Number(a.revenue_subscriptions);
      progs += Number(a.revenue_programs);
      live += Number(a.revenue_live);

      dailyBreakdown.push({
        date: a.date,
        total: Number(a.revenue_total),
        subscriptions: Number(a.revenue_subscriptions),
        programs: Number(a.revenue_programs),
        live: Number(a.revenue_live),
      });
    }

    return {
      total: Math.round(total * 100) / 100,
      subscriptions: Math.round(subs * 100) / 100,
      programs: Math.round(progs * 100) / 100,
      live: Math.round(live * 100) / 100,
      currency: 'USD',
      daily_breakdown: dailyBreakdown,
      period,
    };
  }

  // ── تحليلات المشتركين ──────────────────────────────────────────

  /**
   * جلب تحليلات المشتركين لفترة معينة
   */
  async getSubscriberAnalytics(
    creatorId: string,
    period: AnalyticsPeriod,
  ): Promise<{
    current_total: number;
    new_subscribers: number;
    lost_subscribers: number;
    net_growth: number;
    growth_rate_percent: number;
    daily_breakdown: { date: string; new: number; lost: number; total: number }[];
    period: AnalyticsPeriod;
  }> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const analytics = await this.analyticsRepo.find({
      where: {
        creator_id: creatorId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    let newSubs = 0;
    let lostSubs = 0;
    const dailyBreakdown: { date: string; new: number; lost: number; total: number }[] = [];

    for (const a of analytics) {
      newSubs += a.new_subscribers;
      lostSubs += a.lost_subscribers;
      dailyBreakdown.push({
        date: a.date,
        new: a.new_subscribers,
        lost: a.lost_subscribers,
        total: a.total_subscribers,
      });
    }

    // إجمالي المشتركين الحالي
    const currentTotal = await this.subscriptionRepo.count({
      where: {
        creator_id: creatorId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const netGrowth = newSubs - lostSubs;
    const startingTotal = currentTotal - netGrowth;
    const growthRate = startingTotal > 0 ? (netGrowth / startingTotal) * 100 : 0;

    return {
      current_total: currentTotal,
      new_subscribers: newSubs,
      lost_subscribers: lostSubs,
      net_growth: netGrowth,
      growth_rate_percent: Math.round(growthRate * 100) / 100,
      daily_breakdown: dailyBreakdown,
      period,
    };
  }

  // ── تحليلات التفاعل ────────────────────────────────────────────

  /**
   * جلب تحليلات التفاعل لفترة معينة
   */
  async getEngagementAnalytics(
    creatorId: string,
    period: AnalyticsPeriod,
  ): Promise<{
    avg_engagement_rate: number;
    total_views: number;
    total_profile_visits: number;
    total_comments: number;
    total_likes: number;
    daily_breakdown: { date: string; engagement_rate: number; views: number; profile_visits: number; comments: number; likes: number }[];
    period: AnalyticsPeriod;
  }> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const analytics = await this.analyticsRepo.find({
      where: {
        creator_id: creatorId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    let totalEngagement = 0;
    let totalViews = 0;
    let totalVisits = 0;
    let totalComments = 0;
    let totalLikes = 0;
    const dailyBreakdown: { date: string; engagement_rate: number; views: number; profile_visits: number; comments: number; likes: number }[] = [];

    for (const a of analytics) {
      totalEngagement += Number(a.engagement_rate);
      totalViews += a.views_count;
      totalVisits += a.profile_visits;
      totalComments += a.new_comments;
      totalLikes += a.new_likes;

      dailyBreakdown.push({
        date: a.date,
        engagement_rate: Number(a.engagement_rate),
        views: a.views_count,
        profile_visits: a.profile_visits,
        comments: a.new_comments,
        likes: a.new_likes,
      });
    }

    const avgEngagement = analytics.length > 0 ? totalEngagement / analytics.length : 0;

    return {
      avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
      total_views: totalViews,
      total_profile_visits: totalVisits,
      total_comments: totalComments,
      total_likes: totalLikes,
      daily_breakdown: dailyBreakdown,
      period,
    };
  }

  // ── تحليلات النمو ──────────────────────────────────────────────

  /**
   * جلب تحليلات النمو لفترة معينة
   */
  async getGrowthAnalytics(
    creatorId: string,
    period: AnalyticsPeriod,
  ): Promise<{
    revenue_growth: number;
    subscriber_growth: number;
    engagement_growth: number;
    program_enrollments: number;
    program_completions: number;
    live_tickets_sold: number;
    live_attendees: number;
    period: AnalyticsPeriod;
  }> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const analytics = await this.analyticsRepo.find({
      where: {
        creator_id: creatorId,
        date: Between(startDate, endDate),
      },
    });

    let revGrowth = 0;
    let subGrowth = 0;
    let totalEngagement = 0;
    let enrollments = 0;
    let completions = 0;
    let ticketsSold = 0;
    let attendees = 0;

    for (const a of analytics) {
      revGrowth += Number(a.revenue_total);
      subGrowth += a.new_subscribers - a.lost_subscribers;
      totalEngagement += Number(a.engagement_rate);
      enrollments += a.program_enrollments;
      completions += a.program_completions;
      ticketsSold += a.live_tickets_sold;
      attendees += a.live_attendees;
    }

    return {
      revenue_growth: Math.round(revGrowth * 100) / 100,
      subscriber_growth: subGrowth,
      engagement_growth: Math.round(totalEngagement * 100) / 100,
      program_enrollments: enrollments,
      program_completions: completions,
      live_tickets_sold: ticketsSold,
      live_attendees: attendees,
      period,
    };
  }

  // ── لوحة تحكم شاملة ───────────────────────────────────────────

  /**
   * جلب ملخص لوحة التحكم
   */
  async getDashboardSummary(creatorId: string): Promise<{
    revenue: {
      today: number;
      this_month: number;
      total_unpaid: number;
    };
    subscribers: {
      total: number;
      new_this_month: number;
      churn_rate: number;
    };
    engagement: {
      today_views: number;
      today_visits: number;
      avg_rate: number;
    };
    programs: {
      total: number;
      total_enrollments: number;
      completion_rate: number;
    };
    live: {
      upcoming_sessions: number;
      tickets_sold_this_month: number;
    };
  }> {
    const today = this.formatDate(new Date());
    const todayAnalytics = await this.analyticsRepo.findOne({
      where: { creator_id: creatorId, date: today },
    });

    const monthStart = this.getMonthStart(new Date());
    const monthAnalytics = await this.analyticsRepo.find({
      where: {
        creator_id: creatorId,
        date: Between(monthStart, today),
      },
    });

    // إجمالي الإيرادات هذا الشهر
    const thisMonthRevenue = monthAnalytics.reduce(
      (sum, a) => sum + Number(a.revenue_total),
      0,
    );

    // المشتركين الجدد هذا الشهر
    const newThisMonth = monthAnalytics.reduce(
      (sum, a) => sum + a.new_subscribers,
      0,
    );

    // المفقودين هذا الشهر
    const lostThisMonth = monthAnalytics.reduce(
      (sum, a) => sum + a.lost_subscribers,
      0,
    );

    // إجمالي المشتركين
    const totalSubscribers = await this.subscriptionRepo.count({
      where: { creator_id: creatorId, status: SubscriptionStatus.ACTIVE },
    });

    // الإيرادات غير المسحوبة
    const unpaidRevenue = await this.revenueRepo
      .createQueryBuilder('rev')
      .select('SUM(rev.creator_amount)', 'total')
      .where('rev.creator_id = :creatorId', { creatorId })
      .andWhere('rev.is_paid_out = :paidOut', { paidOut: false })
      .getRawOne();

    return {
      revenue: {
        today: Number(todayAnalytics?.revenue_total ?? 0),
        this_month: Math.round(thisMonthRevenue * 100) / 100,
        total_unpaid: Math.round(Number(unpaidRevenue?.total ?? 0) * 100) / 100,
      },
      subscribers: {
        total: totalSubscribers,
        new_this_month: newThisMonth,
        churn_rate: totalSubscribers > 0
          ? Math.round((lostThisMonth / totalSubscribers) * 10000) / 100
          : 0,
      },
      engagement: {
        today_views: todayAnalytics?.views_count ?? 0,
        today_visits: todayAnalytics?.profile_visits ?? 0,
        avg_rate: Number(todayAnalytics?.engagement_rate ?? 0),
      },
      programs: {
        total: 0, // يُجلب من ProgramService
        total_enrollments: monthAnalytics.reduce((s, a) => s + a.program_enrollments, 0),
        completion_rate: 0, // يحسب من البرامج
      },
      live: {
        upcoming_sessions: 0, // يُجلب من LiveService
        tickets_sold_this_month: monthAnalytics.reduce((s, a) => s + a.live_tickets_sold, 0),
      },
    };
  }

  // ── تحديث الإحصائيات اليومية (Cron Job) ────────────────────────

  /**
   * تحديث/إنشاء سجل تحليلات يومي
   * يُستدعى من Cron Job يومياً
   */
  async updateDailyAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    const today = this.formatDate(new Date());

    // البحث عن سجل اليوم
    let analytics = await this.analyticsRepo.findOne({
      where: { creator_id: creatorId, date: today },
    });

    if (!analytics) {
      // إنشاء سجل جديد
      analytics = this.analyticsRepo.create({
        creator_id: creatorId,
        date: today,
      });
    }

    // تحديث إجمالي المشتركين
    const totalSubs = await this.subscriptionRepo.count({
      where: {
        creator_id: creatorId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    analytics.total_subscribers = totalSubs;

    return this.analyticsRepo.save(analytics);
  }

  /**
   * تجميع الإحصائيات لكل صناع المحتوى
   * يُستدعى من Cron Job
   */
  async aggregateDailyStats(): Promise<number> {
    const today = new Date();
    const dateStr = this.formatDate(today);

    // نحتاج للوصول لكل الصناع - نستخدم QueryBuilder
    const creators = await this.analyticsRepo
      .createQueryBuilder('a')
      .select('DISTINCT a.creator_id', 'creator_id')
      .getRawMany<{ creator_id: string }>();

    // إضافة صناع محتوى بدون إحصائيات سابقة
    // (في الإنتاج نستخدم قائمة كل الصناع من جدول creator_profiles)

    let count = 0;
    const processedCreators = new Set<string>();

    for (const row of creators) {
      const creatorId = row.creator_id;
      if (processedCreators.has(creatorId)) continue;
      processedCreators.add(creatorId);

      await this.updateDailyAnalytics(creatorId);
      count++;
    }

    return count;
  }

  // ── مساعدات ────────────────────────────────────────────────────

  /**
   * تحويل التاريخ إلى صيغة YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * الحصول على بداية الشهر
   */
  private getMonthStart(date: Date): string {
    const d = new Date(date);
    d.setDate(1);
    return this.formatDate(d);
  }

  /**
   * حساب تواريخ الفترة
   */
  private getPeriodDates(period: AnalyticsPeriod): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = this.formatDate(now);
    let startDate: string;

    switch (period) {
      case AnalyticsPeriod.TODAY:
        startDate = endDate;
        break;
      case AnalyticsPeriod.YESTERDAY: {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = this.formatDate(yesterday);
        break;
      }
      case AnalyticsPeriod.LAST_7_DAYS: {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        startDate = this.formatDate(d);
        break;
      }
      case AnalyticsPeriod.LAST_30_DAYS: {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = this.formatDate(d);
        break;
      }
      case AnalyticsPeriod.THIS_MONTH:
        startDate = this.getMonthStart(now);
        break;
      case AnalyticsPeriod.LAST_MONTH: {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        d.setDate(1);
        startDate = this.formatDate(d);
        break;
      }
      case AnalyticsPeriod.THIS_YEAR: {
        const d = new Date(now);
        d.setMonth(0);
        d.setDate(1);
        startDate = this.formatDate(d);
        break;
      }
      case AnalyticsPeriod.ALL_TIME:
        startDate = '2020-01-01';
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  }
}
