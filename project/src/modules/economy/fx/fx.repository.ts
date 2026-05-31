import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { FXRate } from './fx-rate.entity';
import { Currency } from '../../../common/enums';

/**
 * مستودع أسعار الصرف
 * FX Rate Repository
 */
@Injectable()
export class FXRateRepository extends Repository<FXRate> {
  constructor(private dataSource: DataSource) {
    super(FXRate, dataSource.createEntityManager());
  }

  /**
   * إيجاد أحدث سعر صرف بين عملتين
   */
  async findLatestRate(
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<FXRate | null> {
    return this.findOne({
      where: {
        from_currency: fromCurrency,
        to_currency: toCurrency,
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * إيجاد جميع أسعار عملة معينة
   */
  async findRatesForCurrency(fromCurrency: Currency): Promise<FXRate[]> {
    return this.find({
      where: { from_currency: fromCurrency },
      order: { created_at: 'DESC' },
      take: 10,
    });
  }

  /**
   * حفظ سعر صرف جديد
   */
  async saveRate(data: Partial<FXRate>): Promise<FXRate> {
    const rate = this.create(data);
    return this.save(rate);
  }

  /**
   * حذف الأسعار المنتهية الصلاحية
   */
  async deleteExpired(): Promise<number> {
    const result = await this.createQueryBuilder()
      .delete()
      .where('expires_at < NOW()')
      .execute();
    return result.affected ?? 0;
  }

  /**
   * إيجاد جميع الأسعار النشطة
   */
  async findAllActive(): Promise<FXRate[]> {
    return this.createQueryBuilder('fx')
      .where('fx.expires_at > NOW()')
      .orderBy('fx.from_currency', 'ASC')
      .addOrderBy('fx.to_currency', 'ASC')
      .addOrderBy('fx.created_at', 'DESC')
      .getMany();
  }
}
