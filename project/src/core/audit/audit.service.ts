/**
 * =============================================================================
 * AuditService - خدمة التدقيق
 * =============================================================================
 * تسجل كل الإجراءات في النظام مع دعم البحث والتحليل
 */

import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository, AuditQueryFilters } from './audit.repository';
import { AuditLog } from './audit.entity';
import { PaginationParams } from '../../common/interfaces/paginated-result.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface AuditLogEntry {
  action: string;
  actor: {
    id: string;
    type: string;
  };
  resource: {
    type: string;
    id: string;
  };
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    diff?: Array<{ field: string; old: unknown; new: unknown }>;
  };
  ip_address?: string;
  user_agent?: string;
  risk_score?: number;
  correlation_id?: string;
  metadata?: {
    endpoint?: string;
    method?: string;
    module?: string;
    description?: string;
    tags?: string[];
  };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  /**
   * تسجيل إجراء جديد
   * @param entry - بيانات الإجراء المراد تسجيله
   */
  async log(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const auditLog = await this.auditRepository.create({
        action: entry.action,
        actor_id: entry.actor.id,
        actor_type: entry.actor.type,
        resource_type: entry.resource.type,
        resource_id: entry.resource.id,
        changes: entry.changes || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        risk_score: entry.risk_score || 0,
        correlation_id: entry.correlation_id || null,
        metadata: entry.metadata || null,
      });

      this.logger.debug(
        'Audit log created: [%s] actor=%s resource=%s:%s',
        entry.action,
        entry.actor.id,
        entry.resource.type,
        entry.resource.id,
      );

      return auditLog;
    } catch (error) {
      // لا نرمي خطأ - التدقيق يجب ألا يعطل العمليات الرئيسية
      this.logger.error(
        'Failed to create audit log: %s',
        (error as Error).message,
      );
      // Return a mock object so callers don't crash
      return {
        id: 'error',
        action: entry.action,
        actor_id: entry.actor.id,
        actor_type: entry.actor.type,
        resource_type: entry.resource.type,
        resource_id: entry.resource.id,
        changes: null,
        ip_address: null,
        user_agent: null,
        risk_score: 0,
        correlation_id: null,
        metadata: null,
        created_at: new Date(),
      } as AuditLog;
    }
  }

  /**
   * تسجيل سريع - بدون changes
   */
  async logSimple(
    action: string,
    actorId: string,
    resourceType: string,
    resourceId: string,
    actorType = 'USER',
  ): Promise<AuditLog> {
    return this.log({
      action,
      actor: { id: actorId, type: actorType },
      resource: { type: resourceType, id: resourceId },
    });
  }

  /**
   * البحث باستخدام المرشحات
   */
  async query(
    filters: AuditQueryFilters,
    pagination: PaginationParams = { page: 1, limit: 20 },
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditRepository.query(filters, pagination);
  }

  /**
   * البحث حسب المورد
   */
  async getByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return this.auditRepository.getByResource(resourceType, resourceId);
  }

  /**
   * البحث حسب الفاعل
   */
  async getByActor(actorId: string, pagination?: PaginationParams): Promise<PaginatedResult<AuditLog>> {
    return this.auditRepository.getByActor(actorId, pagination);
  }

  /**
   * الحصول على سجلات عالية الخطورة
   */
  async getHighRiskLogs(minScore = 50, limit = 100): Promise<AuditLog[]> {
    return this.auditRepository.getHighRisk(minScore, limit);
  }

  /**
   * إحصائيات التدقيق
   */
  async getStats(dateFrom: string, dateTo: string): Promise<{
    total: number;
    byAction: Array<{ action: string; count: number }>;
    byResourceType: Array<{ resource_type: string; count: number }>;
    avgRiskScore: number;
  }> {
    const stats = await this.auditRepository.getStats(dateFrom, dateTo);
    return {
      total: stats.total,
      byAction: stats.byAction,
      byResourceType: stats.byResourceType,
      avgRiskScore: stats.avgRiskScore,
    };
  }

  /**
   * إنشاء diff بين قيمتين
   */
  static createDiff(before: Record<string, unknown>, after: Record<string, unknown>): Array<{
    field: string;
    old: unknown;
    new: unknown;
  }> {
    const diff: Array<{ field: string; old: unknown; new: unknown }> = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const oldVal = before[key];
      const newVal = after[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff.push({ field: key, old: oldVal, new: newVal });
      }
    }

    return diff;
  }
}
