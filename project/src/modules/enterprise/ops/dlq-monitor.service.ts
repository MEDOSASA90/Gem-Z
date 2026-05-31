/**
 * DLQMonitorService - خدمة مراقبة Dead Letter Queue
 * تتبع الأحداث الفاشلة في ClickHouse وتعيد تشغيلها
 */
import { Injectable, Logger } from '@nestjs/common';

/** حدث فاشل في DLQ */
export interface FailedEvent {
  event_id: string;
  event_type: string;
  source_module: string;
  error_message: string;
  stack_trace?: string;
  retry_count: number;
  created_at: Date;
  last_retry_at?: Date;
  status: 'FAILED' | 'REPLAYING' | 'RESOLVED' | 'DISCARDED';
  payload: Record<string, unknown>;
}

/** فلاتر استعلام DLQ */
export interface DLQFilter {
  event_type?: string;
  source_module?: string;
  status?: string;
  start_date?: Date;
  end_date?: Date;
  page?: number;
  limit?: number;
}

/** تحليلات DLQ */
export interface DLQAnalytics {
  total_failed: number;
  total_resolved: number;
  total_discarded: number;
  by_module: Record<string, number>;
  by_event_type: Record<string, number>;
  avg_retries: number;
}

@Injectable()
export class DLQMonitorService {
  private readonly logger = new Logger(DLQMonitorService.name);

  /** تخزين مؤقت - في الإنتاج: ClickHouse */
  private failedEvents: FailedEvent[] = [];

  /** جلب الأحداث الفاشلة */
  async getFailedEvents(filters: DLQFilter = {}): Promise<{
    items: FailedEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    let items = [...this.failedEvents];

    if (filters.event_type) {
      items = items.filter((e) => e.event_type === filters.event_type);
    }
    if (filters.source_module) {
      items = items.filter((e) => e.source_module === filters.source_module);
    }
    if (filters.status) {
      items = items.filter((e) => e.status === filters.status);
    }
    if (filters.start_date) {
      items = items.filter((e) => e.created_at >= filters.start_date!);
    }
    if (filters.end_date) {
      items = items.filter((e) => e.created_at <= filters.end_date!);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return { items: paginated, total, page, limit };
  }

  /** إعادة تشغيل حدث فاشل */
  async replay(eventId: string): Promise<{ success: boolean; message: string }> {
    const event = this.failedEvents.find((e) => e.event_id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found in DLQ' };
    }

    if (event.status === 'RESOLVED') {
      return { success: false, message: 'Event already resolved' };
    }

    event.status = 'REPLAYING';
    event.retry_count += 1;
    event.last_retry_at = new Date();

    try {
      // TODO: إعادة نشر الحدث عبر EventBus
      this.logger.log(`Replaying event ${eventId} (type: ${event.event_type})`);

      // محاكاة النجاح
      event.status = 'RESOLVED';
      return { success: true, message: 'Event replayed successfully' };
    } catch (err) {
      event.status = 'FAILED';
      const errorMsg = err instanceof Error ? err.message : 'Replay failed';
      this.logger.error(`Replay failed for event ${eventId}: ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
  }

  /** تحليلات DLQ */
  async getAnalytics(): Promise<DLQAnalytics> {
    const by_module: Record<string, number> = {};
    const by_event_type: Record<string, number> = {};
    let totalRetries = 0;

    for (const event of this.failedEvents) {
      by_module[event.source_module] = (by_module[event.source_module] || 0) + 1;
      by_event_type[event.event_type] = (by_event_type[event.event_type] || 0) + 1;
      totalRetries += event.retry_count;
    }

    return {
      total_failed: this.failedEvents.filter((e) => e.status === 'FAILED').length,
      total_resolved: this.failedEvents.filter((e) => e.status === 'RESOLVED').length,
      total_discarded: this.failedEvents.filter((e) => e.status === 'DISCARDED').length,
      by_module,
      by_event_type,
      avg_retries: this.failedEvents.length > 0
        ? Math.round((totalRetries / this.failedEvents.length) * 100) / 100
        : 0,
    };
  }

  /** إرسال تنبيه للعمليات */
  async alertOperations(event: FailedEvent): Promise<void> {
    this.logger.error(
      `[CRITICAL] Failed event requires attention: ${event.event_id} (${event.event_type}) - ${event.error_message}`,
    );
    // TODO: إرسال إشعار عبر Slack/PagerDuty/Email
  }

  /** إضافة حدث فاشل (للاختبار) */
  addFailedEvent(event: FailedEvent): void {
    this.failedEvents.push(event);
  }
}
