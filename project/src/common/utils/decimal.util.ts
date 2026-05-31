/**
 * =============================================================================
 * DecimalUtil - أدوات العمليات الحسابية العشرية
 * =============================================================================
 * تتجنب مشاكل الـ floating point باستخدام الضرب/القسمة على 100
 */

/** تحويل إلى سنتات (integer) */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** تحويل من سنتات */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** جمع مبلغين بدقة */
export function add(a: number, b: number): number {
  return (a * 100 + b * 100) / 100;
}

/** طرح مبلغ من آخر */
export function subtract(a: number, b: number): number {
  return (a * 100 - b * 100) / 100;
}

/** ضرب مبلغ بعدد */
export function multiply(amount: number, factor: number): number {
  return Math.round(amount * 100 * factor) / 100;
}

/** قسمة مبلغ على عدد */
export function divide(amount: number, divisor: number): number {
  if (divisor === 0) throw new Error('Division by zero');
  return Math.round((amount / divisor) * 100) / 100;
}

/** تقريب لعدد المنازل العشرية المحدد */
export function round(amount: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/** تنسيق مبلغ كعملة */
export function formatCurrency(amount: number, currency = 'EGP', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/** هل المبلغ صالح (غير سالب وغير NaN) */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}

/** المبلغ الأكبر من صفر */
export function isPositive(amount: number): boolean {
  return amount > 0;
}

/** مقارنة مبلغين */
export function compare(a: number, b: number): number {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

/** هل المبلغ أقل من أو يساوي صفر */
export function isZeroOrNegative(amount: number): boolean {
  return amount <= 0;
}

/** نسبة مئوية */
export function percentage(amount: number, percent: number): number {
  return multiply(amount, percent / 100);
}
