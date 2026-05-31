import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Escrow } from './escrow.entity';
import { EscrowStatus } from '../../../common/enums';

/**
 * مستودع الضمان - Escrow Repository
 */
@Injectable()
export class EscrowRepository extends Repository<Escrow> {
  constructor(private dataSource: DataSource) {
    super(Escrow, dataSource.createEntityManager());
  }

  /**
   * إيجاد ضمان بالمعرف
   */
  async findById(id: string): Promise<Escrow | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * إيجاد ضمانات محفظة
   */
  async findByWalletId(walletId: string): Promise<Escrow[]> {
    return this.find({
      where: { wallet_id: walletId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * إيجاد ضمان بطلب
   */
  async findByOrderId(orderId: string): Promise<Escrow | null> {
    return this.findOne({ where: { order_id: orderId } });
  }

  /**
   * إيجاد ضمانات بائع
   */
  async findBySellerId(
    sellerId: string,
    status?: EscrowStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<[Escrow[], number]> {
    const qb = this.createQueryBuilder('e')
      .where('e.seller_id = :sellerId', { sellerId })
      .orderBy('e.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('e.status = :status', { status });
    }

    return qb.getManyAndCount();
  }

  /**
   * إنشاء ضمان جديد
   */
  async createEscrow(data: Partial<Escrow>): Promise<Escrow> {
    const escrow = this.create(data);
    return this.save(escrow);
  }

  /**
   * تحديث حالة الضمان
   */
  async updateStatus(
    id: string,
    status: EscrowStatus,
    releasedAt?: Date,
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (releasedAt) {
      update.released_at = releasedAt;
    }
    await this.update(id, update);
  }

  /**
   * إيجاد الضمانات المنتهية الصلاحية والمحجوزة
   */
  async findExpiredHeld(): Promise<Escrow[]> {
    return this.createQueryBuilder('e')
      .where('e.status = :status', { status: EscrowStatus.HELD })
      .andWhere('e.expires_at < NOW()')
      .getMany();
  }

  /**
   * إيجاد جميع الضمانات النشطة
   */
  async findActive(): Promise<Escrow[]> {
    return this.find({
      where: { status: EscrowStatus.HELD },
      order: { created_at: 'DESC' },
    });
  }
}
