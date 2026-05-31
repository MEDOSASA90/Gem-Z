/**
 * RefundApprovalService - خدمة الموافقة على المبالغ المستردة
 * تدير طلبات الاسترداد مع موافقة مزدوجة للمبالغ الكبيرة
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

/** حالة طلب الاسترداد */
export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

/** طلب استرداد */
export interface RefundRequest {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  reason: string;
  requested_by: string;
  status: RefundStatus;
  approved_by?: string;
  second_approval_by?: string; // موافقة ثانية للمبالغ الكبيرة
  rejected_by?: string;
  rejection_reason?: string;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/** عتبة المبالغ الكبيرة التي تتطلب موافقة مزدوجة */
const HIGH_VALUE_THRESHOLD = 500;

@Injectable()
export class RefundApprovalService {
  private readonly logger = new Logger(RefundApprovalService.name);
  private refunds: RefundRequest[] = [];
  private nextId = 1;

  /** تقديم طلب استرداد */
  async requestRefund(
    orderId: string,
    amount: number,
    currency: string,
    reason: string,
    requestedBy: string,
  ): Promise<RefundRequest> {
    const refund: RefundRequest = {
      id: `REF-${String(this.nextId++).padStart(6, '0')}`,
      order_id: orderId,
      amount,
      currency,
      reason,
      requested_by: requestedBy,
      status: RefundStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.refunds.push(refund);
    this.logger.log(
      `Refund requested: ${refund.id} for order ${orderId}, amount: ${amount} ${currency}`,
    );

    return refund;
  }

  /** الموافقة على استرداد */
  async approve(refundId: string, approvedBy: string): Promise<RefundRequest> {
    const refund = this.refunds.find((r) => r.id === refundId);
    if (!refund) throw new NotFoundException('Refund request not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new ForbiddenException('Refund is not in pending status');
    }

    // التحقق من الحاجة لموافقة مزدوجة
    if (refund.amount > HIGH_VALUE_THRESHOLD) {
      if (!refund.approved_by) {
        // أول موافقة
        refund.approved_by = approvedBy;
        refund.updated_at = new Date();
        this.logger.log(
          `Refund ${refundId} received first approval from ${approvedBy}. Second approval required for high-value refund ($${refund.amount}).`,
        );
        return refund;
      }

      if (refund.approved_by === approvedBy) {
        throw new ForbiddenException('Cannot approve the same refund twice');
      }

      // موافقة ثانية - استكمال
      refund.second_approval_by = approvedBy;
    }

    refund.status = RefundStatus.APPROVED;
    refund.approved_by = refund.approved_by || approvedBy;
    refund.updated_at = new Date();

    // TODO: معالجة الاسترداد فعلياً (إعادة المبلغ للمحفظة)
    this.logger.log(`Refund ${refundId} approved by ${approvedBy}`);

    return refund;
  }

  /** رفض استرداد */
  async reject(
    refundId: string,
    reason: string,
    rejectedBy: string,
  ): Promise<RefundRequest> {
    const refund = this.refunds.find((r) => r.id === refundId);
    if (!refund) throw new NotFoundException('Refund request not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new ForbiddenException('Only pending refunds can be rejected');
    }

    refund.status = RefundStatus.REJECTED;
    refund.rejected_by = rejectedBy;
    refund.rejection_reason = reason;
    refund.updated_at = new Date();

    this.logger.log(`Refund ${refundId} rejected by ${rejectedBy}: ${reason}`);
    return refund;
  }

  /** جلب الاستردادات المعلقة */
  async getPending(): Promise<RefundRequest[]> {
    return this.refunds
      .filter((r) => r.status === RefundStatus.PENDING)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /** جلب كل الاستردادات */
  async getAll(
    status?: RefundStatus,
    page = 1,
    limit = 20,
  ): Promise<{ items: RefundRequest[]; total: number; page: number; limit: number }> {
    let items = [...this.refunds];
    if (status) {
      items = items.filter((r) => r.status === status);
    }
    items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return { items: paginated, total, page, limit };
  }

  /** جلب تفاصيل استرداد */
  async getById(refundId: string): Promise<RefundRequest | null> {
    return this.refunds.find((r) => r.id === refundId) || null;
  }
}
