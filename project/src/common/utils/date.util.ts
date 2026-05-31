/**
 * =============================================================================
 * DateUtil - أدوات معالجة التواريخ
 * =============================================================================
 */

/** تنسيق التاريخ إلى ISO */
export function now(): string {
  return new Date().toISOString();
}

/** التاريخ الحالي */
export function currentDate(): Date {
  return new Date();
}

/** إضافة أيام لتاريخ */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** إضافة ساعات لتاريخ */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/** إضافة دقائق لتاريخ */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/** إضافة أشهر لتاريخ */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** بداية اليوم */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** نهاية اليوم */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/** بداية الشهر */
export function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** نهاية الشهر */
export function endOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/** الفرق بين تاريخين بالأيام */
export function diffInDays(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / msPerDay);
}

/** الفرق بين تاريخين بالدقائق */
export function diffInMinutes(date1: Date, date2: Date): number {
  const msPerMinute = 1000 * 60;
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / msPerMinute);
}

/** هل التاريخ منتهي الصلاحية؟ */
export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

/** هل التاريخ في المستقبل؟ */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/** تنسيق التاريخ */
export function formatDate(date: Date, format: string): string {
  const map: Record<string, string> = {
    'YYYY': date.getFullYear().toString(),
    'MM': String(date.getMonth() + 1).padStart(2, '0'),
    'DD': String(date.getDate()).padStart(2, '0'),
    'HH': String(date.getHours()).padStart(2, '0'),
    'mm': String(date.getMinutes()).padStart(2, '0'),
    'ss': String(date.getSeconds()).padStart(2, '0'),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => map[match] || match);
}

/** توليد نطاق تواريخ */
export function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
