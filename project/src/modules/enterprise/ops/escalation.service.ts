/**
 * EscalationService - خدمة التصعيد الإداري
 * تدير تصعيد القضايا الحرجة لفرق العمل
 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';

/** مستويات التصعيد */
export enum EscalationLevel {
  L1 = 1, // فريق أول
  L2 = 2, // مدير الفريق
  L3 = 3, // مدير القسم
  L4 = 4, // الإدارة العليا
  L5 = 5, // C-suite
}

/** حالة التصعيد */
export enum EscalationStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/** تصعيد */
export interface Escalation {
  id: string;
  issue_id: string;
  level: EscalationLevel;
  reason: string;
  status: EscalationStatus;
  assignee_id?: string;
  created_by: string;
  resolution?: string;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
}

/** فلاتر التصعيد */
export interface EscalationFilter {
  level?: EscalationLevel;
  status?: EscalationStatus;
  assignee_id?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);
  private escalations: Escalation[] = [];
  private nextId = 1;

  /** إنشاء تصعيد جديد */
  async escalate(
    issueId: string,
    level: EscalationLevel,
    reason: string,
    createdBy: string,
  ): Promise<Escalation> {
    const escalation: Escalation = {
      id: `ESC-${String(this.nextId++).padStart(6, '0')}`,
      issue_id: issueId,
      level,
      reason,
      status: EscalationStatus.OPEN,
      assignee_id: undefined,
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.escalations.push(escalation);
    this.logger.warn(
      `Escalation created: ${escalation.id} for issue ${issueId} at level ${level}`,
    );

    return escalation;
  }

  /** جلب التصعيدات مع فلترة */
  async getEscalations(filters: EscalationFilter = {}): Promise<{
    items: Escalation[];
    total: number;
    page: number;
    limit: number;
  }> {
    let items = [...this.escalations];

    if (filters.level) {
      items = items.filter((e) => e.level === filters.level);
    }
    if (filters.status) {
      items = items.filter((e) => e.status === filters.status);
    }
    if (filters.assignee_id) {
      items = items.filter((e) => e.assignee_id === filters.assignee_id);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const total = items.length;

    items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    const paginated = items.slice((page - 1) * limit, page * limit);

    return { items: paginated, total, page, limit };
  }

  /** تعيين تصعيد لموظف */
  async assign(escalationId: string, assigneeId: string): Promise<Escalation> {
    const esc = this.escalations.find((e) => e.id === escalationId);
    if (!esc) throw new NotFoundException('Escalation not found');

    esc.assignee_id = assigneeId;
    esc.status = EscalationStatus.ASSIGNED;
    esc.updated_at = new Date();

    this.logger.log(`Escalation ${escalationId} assigned to ${assigneeId}`);
    return esc;
  }

  /** حل تصعيد */
  async resolve(
    escalationId: string,
    resolution: string,
  ): Promise<Escalation> {
    const esc = this.escalations.find((e) => e.id === escalationId);
    if (!esc) throw new NotFoundException('Escalation not found');

    if (esc.status === EscalationStatus.RESOLVED || esc.status === EscalationStatus.CLOSED) {
      throw new Error('Escalation already resolved');
    }

    esc.status = EscalationStatus.RESOLVED;
    esc.resolution = resolution;
    esc.resolved_at = new Date();
    esc.updated_at = new Date();

    this.logger.log(`Escalation ${escalationId} resolved: ${resolution}`);
    return esc;
  }
}
