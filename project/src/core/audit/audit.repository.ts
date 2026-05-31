/**
 * =============================================================================
 * AuditRepository - Repository للتعامل مع Audit Logs
 * =============================================================================
 */

import { Injectable } from '@nestjs/common';
import { Repository, DataSource, Between } from 'typeorm';
import { AuditLog } from './audit.entity';
import { PaginatedResult, PaginationParams } from '../../common/interfaces/paginated-result.interface';

export interface AuditQueryFilters {
  action?: string;
  actor_id?: string;
  actor_type?: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  risk_score_min?: number;
  risk_score_max?: number;
  date_from?: string;
  date_to?: string;
  correlation_id?: string;
  module?: string;
}

@Injectable()
export class AuditRepository {
  private readonly repository: Repository<AuditLog>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(AuditLog);
  }

  /** إنشاء سجل تدقيق جديد */
  async create(logData: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.repository.create(logData);
    return this.repository.save(log);
  }

  /** البحث باستخدام الـ ID */
  async findById(id: string): Promise<AuditLog | null> {
    return this.repository.findOne({ where: { id } });
  }

  /** البحث باستخدام المرشحات مع pagination */
  async query(
    filters: AuditQueryFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<AuditLog>> {
    const queryBuilder = this.repository.createQueryBuilder('audit');

    // تطبيق المرشحات
    if (filters.action) {
      queryBuilder.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.actor_id) {
      queryBuilder.andWhere('audit.actor_id = :actor_id', { actor_id: filters.actor_id });
    }

    if (filters.actor_type) {
      queryBuilder.andWhere('audit.actor_type = :actor_type', { actor_type: filters.actor_type });
    }

    if (filters.resource_type) {
      queryBuilder.andWhere('audit.resource_type = :resource_type', { resource_type: filters.resource_type });
    }

    if (filters.resource_id) {
      queryBuilder.andWhere('audit.resource_id = :resource_id', { resource_id: filters.resource_id });
    }

    if (filters.ip_address) {
      queryBuilder.andWhere('audit.ip_address = :ip_address', { ip_address: filters.ip_address });
    }

    if (filters.risk_score_min !== undefined) {
      queryBuilder.andWhere('audit.risk_score >= :risk_min', { risk_min: filters.risk_score_min });
    }

    if (filters.risk_score_max !== undefined) {
      queryBuilder.andWhere('audit.risk_score <= :risk_max', { risk_max: filters.risk_score_max });
    }

    if (filters.date_from && filters.date_to) {
      queryBuilder.andWhere('audit.created_at BETWEEN :date_from AND :date_to', {
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
    } else if (filters.date_from) {
      queryBuilder.andWhere('audit.created_at >= :date_from', { date_from: filters.date_from });
    } else if (filters.date_to) {
      queryBuilder.andWhere('audit.created_at <= :date_to', { date_to: filters.date_to });
    }

    if (filters.correlation_id) {
      queryBuilder.andWhere('audit.correlation_id = :correlation_id', {
        correlation_id: filters.correlation_id,
      });
    }

    // Pagination
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(1000, Math.max(1, pagination.limit || 20));
    const offset = (page - 1) * limit;

    // Sorting
    const sortField = pagination.sort || 'created_at';
    const sortOrder = pagination.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryBuilder.orderBy(`audit.${sortField}`, sortOrder as 'ASC' | 'DESC');
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /** البحث حسب المورد */
  async getByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return this.repository.find({
      where: { resource_type: resourceType, resource_id: resourceId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  /** البحث حسب الفاعل */
  async getByActor(actorId: string, pagination?: PaginationParams): Promise<PaginatedResult<AuditLog>> {
    return this.query({ actor_id: actorId }, pagination || { page: 1, limit: 50 });
  }

  /** البحث حسب IP address */
  async getByIpAddress(ipAddress: string, dateRange?: { from: string; to: string }): Promise<AuditLog[]> {
    const where: Record<string, unknown> = { ip_address: ipAddress };

    if (dateRange) {
      where.created_at = Between(new Date(dateRange.from), new Date(dateRange.to));
    }

    return this.repository.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  /** الحصول على سجلات عالية الخطورة */
  async getHighRisk(minScore = 50, limit = 100): Promise<AuditLog[]> {
    return this.repository
      .createQueryBuilder('audit')
      .where('audit.risk_score >= :minScore', { minScore })
      .orderBy('audit.risk_score', 'DESC')
      .take(limit)
      .getMany();
  }

  /** إحصائيات التدقيق */
  async getStats(dateFrom: string, dateTo: string): Promise<{
    total: number;
    byAction: Array<{ action: string; count: number }>;
    byResourceType: Array<{ resource_type: string; count: number }>;
    byActorType: Array<{ actor_type: string; count: number }>;
    avgRiskScore: number;
  }> {
    const dateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };

    const [total, byAction, byResourceType, byActorType, avgRisk] = await Promise.all([
      this.repository.count({
        where: { created_at: Between(dateRange.from, dateRange.to) },
      }),
      this.repository
        .createQueryBuilder('audit')
        .select('audit.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .where('audit.created_at BETWEEN :from AND :to', dateRange)
        .groupBy('audit.action')
        .getRawMany(),
      this.repository
        .createQueryBuilder('audit')
        .select('audit.resource_type', 'resource_type')
        .addSelect('COUNT(*)', 'count')
        .where('audit.created_at BETWEEN :from AND :to', dateRange)
        .groupBy('audit.resource_type')
        .getRawMany(),
      this.repository
        .createQueryBuilder('audit')
        .select('audit.actor_type', 'actor_type')
        .addSelect('COUNT(*)', 'count')
        .where('audit.created_at BETWEEN :from AND :to', dateRange)
        .groupBy('audit.actor_type')
        .getRawMany(),
      this.repository
        .createQueryBuilder('audit')
        .select('AVG(audit.risk_score)', 'avg')
        .where('audit.created_at BETWEEN :from AND :to', dateRange)
        .getRawOne(),
    ]);

    return {
      total,
      byAction,
      byResourceType,
      byActorType,
      avgRiskScore: parseFloat(avgRisk?.avg || '0'),
    };
  }

  /** إنشاء partition جديد (شهري) */
  async createMonthlyPartition(year: number, month: number): Promise<void> {
    const partitionName = `audit_logs_y${year}m${String(month).padStart(2, '0')}`;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${partitionName} 
      PARTITION OF audit_logs
      FOR VALUES FROM ('${startDate}') TO ('${endDate}')
    `);
  }
}
