import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FXRateRepository } from './fx.repository';
import { Currency } from '../../../common/enums';
export const SUPPORTED_CURRENCIES = [Currency.USD, Currency.EGP, Currency.SAR, Currency.EUR];

/** نسبة الرسوم الافتراضية للتحويل (0.5%) */
const DEFAULT_CONVERSION_FEE_PCT = 0.005;
/** أقصى رسوم تحويل */
const MAX_CONVERSION_FEE = 100;
/** أدنى رسوم تحويل */
const MIN_CONVERSION_FEE = 0.5;
/** مدة صلاحية السعر بالدقائق */
const RATE_TTL_MINUTES = 30;

/**
 * خدمة صرف العملات - FX Engine
 * 
 * توفر:
 * - جلب أسعار الصرف الحالية
 * - حساب أسعار العبور (cross-rate) لأزواج غير مباشرة
 * - تحويل المبالغ مع رسوم
 * - تحديث الأسعار من المزود
 */
@Injectable()
export class FXService {
  private readonly logger = new Logger(FXService.name);

  constructor(private readonly fxRepo: FXRateRepository) {}

  /**
   * الحصول على سعر الصرف بين عملتين
   * إذا لم يوجد سعر مباشر، يحسب عبر USD (cross-rate)
   */
  async getRate(from: Currency, to: Currency): Promise<{
    rate: number;
    effective_rate: number;
    spread: number;
    source: string;
    expires_at: Date;
  }> {
    if (from === to) {
      return {
        rate: 1,
        effective_rate: 1,
        spread: 0,
        source: 'identity',
        expires_at: new Date(Date.now() + RATE_TTL_MINUTES * 60000),
      };
    }

    // البحث عن سعر مباشر
    const directRate = await this.fxRepo.findLatestRate(from, to);
    if (directRate && directRate.expires_at > new Date()) {
      return {
        rate: directRate.rate,
        effective_rate: directRate.effective_rate,
        spread: directRate.spread,
        source: directRate.source ?? 'cached',
        expires_at: directRate.expires_at,
      };
    }

    // حساب cross-rate عبر USD
    const crossRate = await this.calculateCrossRate(from, to);
    if (crossRate) return crossRate;

    // إنشاء سعر من الأسعار الافتراضية (mock)
    return this.getMockRate(from, to);
  }

  /**
   * تحويل مبلغ من عملة لأخرى
   */
  async convert(
    amount: number,
    from: Currency,
    to: Currency,
  ): Promise<{
    original_amount: number;
    converted_amount: number;
    rate: number;
    effective_rate: number;
    fee: number;
    total_deducted: number;
    from_currency: Currency;
    to_currency: Currency;
  }> {
    if (amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
    }

    const { effective_rate } = await this.getRate(from, to);
    const fee = this.getConversionFee(amount, from, to);
    const convertedAmount = (amount - fee) * effective_rate;

    this.logger.log(
      `Convert: ${amount} ${from} -> ${convertedAmount.toFixed(4)} ${to} ` +
      `(rate=${effective_rate}, fee=${fee})`,
    );

    return {
      original_amount: amount,
      converted_amount: parseFloat(convertedAmount.toFixed(4)),
      rate: effective_rate,
      effective_rate,
      fee,
      total_deducted: amount,
      from_currency: from,
      to_currency: to,
    };
  }

  /**
   * حساب رسوم التحويل
   */
  getConversionFee(amount: number, _from: Currency, _to: Currency): number {
    const fee = amount * DEFAULT_CONVERSION_FEE_PCT;
    return Math.max(MIN_CONVERSION_FEE, Math.min(fee, MAX_CONVERSION_FEE));
  }

  /**
   * تحديث الأسعار من المزود (mock)
   */
  async updateRates(source: string = 'mock'): Promise<number> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RATE_TTL_MINUTES * 60000);
    let count = 0;

    // الأسعار الافتراضية (محاكاة)
    const mockRates: Array<{ from: Currency; to: Currency; rate: number; spread: number }> = [
      { from: Currency.USD, to: Currency.EGP, rate: 49.25, spread: 0.15 },
      { from: Currency.USD, to: Currency.SAR, rate: 3.75, spread: 0.01 },
      { from: Currency.USD, to: Currency.EUR, rate: 0.92, spread: 0.005 },
      { from: Currency.EUR, to: Currency.USD, rate: 1.087, spread: 0.005 },
      { from: Currency.EUR, to: Currency.EGP, rate: 53.52, spread: 0.18 },
      { from: Currency.EUR, to: Currency.SAR, rate: 4.08, spread: 0.015 },
      { from: Currency.SAR, to: Currency.USD, rate: 0.2667, spread: 0.001 },
      { from: Currency.SAR, to: Currency.EGP, rate: 13.13, spread: 0.05 },
      { from: Currency.SAR, to: Currency.EUR, rate: 0.245, spread: 0.002 },
      { from: Currency.EGP, to: Currency.USD, rate: 0.0203, spread: 0.0001 },
      { from: Currency.EGP, to: Currency.SAR, rate: 0.0762, spread: 0.0003 },
      { from: Currency.EGP, to: Currency.EUR, rate: 0.0187, spread: 0.0001 },
    ];

    for (const { from, to, rate, spread } of mockRates) {
      await this.fxRepo.saveRate({
        from_currency: from,
        to_currency: to,
        rate,
        spread,
        effective_rate: rate + spread,
        source,
        expires_at: expiresAt,
      });
      count++;
    }

    // حذف الأسعار المنتهية
    const deleted = await this.fxRepo.deleteExpired();

    this.logger.log(`FX rates updated: ${count} pairs, ${deleted} expired removed`);
    return count;
  }

  /**
   * قائمة العملات المدعومة
   */
  getSupportedCurrencies(): Currency[] {
    return [...SUPPORTED_CURRENCIES];
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * حساب cross-rate عبر USD
   * مثال: EGP->SAR = (EGP->USD) * (USD->SAR)
   */
  private async calculateCrossRate(
    from: Currency,
    to: Currency,
  ): Promise<{
    rate: number;
    effective_rate: number;
    spread: number;
    source: string;
    expires_at: Date;
  } | null> {
    // عبر USD
    const [fromToUSD, usdToTo] = await Promise.all([
      this.fxRepo.findLatestRate(from, Currency.USD),
      this.fxRepo.findLatestRate(Currency.USD, to),
    ]);

    if (fromToUSD && usdToTo && fromToUSD.expires_at > new Date() && usdToTo.expires_at > new Date()) {
      const crossRate = fromToUSD.effective_rate * usdToTo.effective_rate;
      const totalSpread = fromToUSD.spread * usdToTo.effective_rate + usdToTo.spread;

      return {
        rate: crossRate,
        effective_rate: crossRate + totalSpread,
        spread: totalSpread,
        source: `cross:${fromToUSD.source ?? 'unknown'}`,
        expires_at: new Date(Math.min(fromToUSD.expires_at.getTime(), usdToTo.expires_at.getTime())),
      };
    }

    return null;
  }

  /**
   * الحصول على سعر mock افتراضي
   */
  private getMockRate(
    from: Currency,
    to: Currency,
  ): {
    rate: number;
    effective_rate: number;
    spread: number;
    source: string;
    expires_at: Date;
  } {
    // جدول أسعار افتراضي بسيط
    const mockPairs: Record<string, number> = {
      [`${Currency.USD}_${Currency.EGP}`]: 49.25,
      [`${Currency.USD}_${Currency.SAR}`]: 3.75,
      [`${Currency.USD}_${Currency.EUR}`]: 0.92,
      [`${Currency.EUR}_${Currency.USD}`]: 1.087,
      [`${Currency.EUR}_${Currency.EGP}`]: 53.52,
      [`${Currency.EUR}_${Currency.SAR}`]: 4.08,
      [`${Currency.SAR}_${Currency.USD}`]: 0.2667,
      [`${Currency.SAR}_${Currency.EGP}`]: 13.13,
      [`${Currency.SAR}_${Currency.EUR}`]: 0.245,
      [`${Currency.EGP}_${Currency.USD}`]: 0.0203,
      [`${Currency.EGP}_${Currency.SAR}`]: 0.0762,
      [`${Currency.EGP}_${Currency.EUR}`]: 0.0187,
    };

    const rate = mockPairs[`${from}_${to}`] ?? 1;
    const spread = rate * DEFAULT_CONVERSION_FEE_PCT;

    return {
      rate,
      effective_rate: rate + spread,
      spread,
      source: 'mock_fallback',
      expires_at: new Date(Date.now() + 5 * 60000), // 5 دقائق فقط للـ fallback
    };
  }
}
