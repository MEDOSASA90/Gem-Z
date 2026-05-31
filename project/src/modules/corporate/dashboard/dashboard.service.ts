/**
 * =============================================================================
 * DashboardService - خدمة لوحة تحكم الشركات B2B
 * =============================================================================
 * - تجمع إحصائيات صحة ومشاركة شبكة موظفي الشركات لمديري الموارد البشرية (HR Admins).
 * - تستعلم من ClickHouse لتجميع مؤشرات المشاركة وإتمام التحديات للخطوات الحية.
 * - تتراجع لقاعدة بيانات PostgreSQL لحساب المتوسطات محلياً في حال تعطل ClickHouse.
 * - ترجع بنية بيانات فارغة نظيفة (Empty State) في حال عدم وجود أي سجلات لمنع تعطل الواجهات.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClickHouseClient } from '../../../config/clickhouse.config';

import { CorporateClient } from '../company/corporate-client.entity';
import { EmployeeWellness } from '../wellness/employee-wellness.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(CorporateClient)
    private readonly clientRepo: Repository<CorporateClient>,
    @InjectRepository(EmployeeWellness)
    private readonly wellnessRepo: Repository<EmployeeWellness>,
  ) {}

  /**
   * تجميع تحليلات صحة ومشاركة الموظفين لمدير الموارد البشرية B2B
   */
  async getHRAnalytics(hrAdminUserId: string): Promise<any> {
    this.logger.log(`Compiling company-wide B2B telemetry for HR Admin: ${hrAdminUserId}`);

    // 1. جلب حساب عميل الشركات المرتبط بمدير الموارد البشرية الحالي
    const client = await this.clientRepo.findOne({
      where: { hr_admin_id: hrAdminUserId },
    });

    if (!client) {
      throw new HttpException(
        'Corporate client account not found for this HR Admin credentials.',
        HttpStatus.FORBIDDEN,
      );
    }

    const tenantId = client.tenant_id;
    let analyticsData = {
      activeParticipationRate: 0,
      challengeCompletionRatio: 0,
      corporateWellnessKpi: 0,
      totalEmployees: 0,
      trends: [] as any[],
      source: 'empty_state',
    };

    let hasClickhouseData = false;

    // 2. محاولة جلب الإشارات والبيانات الحية المجهلة من ClickHouse
    try {
      const chClient = createClickHouseClient();
      const resultSet = await chClient.query({
        query: `
          SELECT 
            avg(participation_rate) as avg_participation,
            avg(completion_rate) as avg_completion,
            avg(wellness_kpi) as avg_kpi,
            count(distinct user_id) as total_users
          FROM gemz_analytics.corporate_wellness_logs
          WHERE tenant_id = '${tenantId}'
        `,
        format: 'JSONEachRow',
      });

      const rows = await resultSet.json() as any[];

      if (rows && rows.length > 0 && rows[0].total_users > 0) {
        analyticsData.activeParticipationRate = parseFloat(parseFloat(rows[0].avg_participation || '0').toFixed(2));
        analyticsData.challengeCompletionRatio = parseFloat(parseFloat(rows[0].avg_completion || '0').toFixed(2));
        analyticsData.corporateWellnessKpi = parseFloat(parseFloat(rows[0].avg_kpi || '0').toFixed(2));
        analyticsData.totalEmployees = parseInt(rows[0].total_users || '0', 10);
        analyticsData.source = 'clickhouse';
        
        // جلب مسار تقدم تفاعل الموظفين النشط
        const trendsResultSet = await chClient.query({
          query: `
            SELECT 
              toStartOfWeek(timestamp) as week,
              avg(wellness_kpi) as kpi_val,
              count(distinct user_id) as active_count
            FROM gemz_analytics.corporate_wellness_logs
            WHERE tenant_id = '${tenantId}'
            GROUP BY week
            ORDER BY week DESC
            LIMIT 8
          `,
          format: 'JSONEachRow',
        });
        const trendsRows = await trendsResultSet.json() as any[];
        analyticsData.trends = trendsRows.map(r => ({
          label: r.week,
          wellnessKpi: parseFloat(parseFloat(r.kpi_val || '0').toFixed(2)),
          activeEmployeesCount: parseInt(r.active_count || '0', 10),
        }));

        hasClickhouseData = true;
        this.logger.log(`Successfully compiled B2B HR analytics from ClickHouse for tenant ${tenantId}`);
      }
    } catch (err: any) {
      this.logger.warn(`ClickHouse query failed or timed out: ${err.message}. Engaging local PostgreSQL B2B fallback calculation.`);
    }

    // 3. استراتيجية التراجع المحلية لقاعدة بيانات PostgreSQL
    if (!hasClickhouseData) {
      // جلب جميع الموظفين التابعين لهذه الشركة من PostgreSQL
      const employeeRecords = await this.wellnessRepo.find({
        where: { corporate_client_id: client.id },
      });

      if (employeeRecords && employeeRecords.length > 0) {
        let totalParticipation = 0;
        let totalCompletion = 0;

        for (const record of employeeRecords) {
          totalParticipation += Number(record.participation_rate || 0);
          totalCompletion += Number(record.challenge_completion_ratio || 0);
        }

        const count = employeeRecords.length;
        const avgParticipation = totalParticipation / count;
        const avgCompletion = totalCompletion / count;
        
        // حساب KPI بيومتري مدمج محلياً
        const avgKpi = (avgParticipation * 0.70) + (avgCompletion * 0.30);

        analyticsData.activeParticipationRate = parseFloat(avgParticipation.toFixed(2));
        analyticsData.challengeCompletionRatio = parseFloat(avgCompletion.toFixed(2));
        analyticsData.corporateWellnessKpi = parseFloat(avgKpi.toFixed(2));
        analyticsData.totalEmployees = count;
        analyticsData.source = 'postgresql_fallback';
        analyticsData.trends = [
          {
            label: new Date().toISOString().split('T')[0],
            wellnessKpi: parseFloat(avgKpi.toFixed(2)),
            activeEmployeesCount: count,
          }
        ];
        this.logger.log(`Compiled fallback B2B HR analytics from PostgreSQL local records for client ${client.id}`);
      } else {
        // العودة للـ Empty State النظيفة لمنع تعطل الواجهات
        this.logger.log(`No wellness tracking records found for B2B client ${client.id}. Delivering empty state metadata.`);
      }
    }

    return analyticsData;
  }
}
