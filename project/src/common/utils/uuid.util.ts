/**
 * =============================================================================
 * UuidUtil - أدوات UUID
 * =============================================================================
 */

import { v4 as uuidv4, validate, version } from 'uuid';

/** إنشاء UUID v4 جديد */
export function generateUuid(): string {
  return uuidv4();
}

/** التحقق من صحة UUID */
export function isValidUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  return validate(uuid);
}

/** التحقق من نوع UUID (يجب أن يكون 4) */
export function getUuidVersion(uuid: string): number | null {
  if (!isValidUuid(uuid)) return null;
  try {
    return version(uuid);
  } catch {
    return null;
  }
}

/** إنشاء UUID مخصص ببادئة */
export function generatePrefixedUuid(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

/** إنشاء UUID قصير (8 أحرف) - للاستخدامات غير الحرجة */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** تحويل UUID إلى نمط مُنسّق (مع شرطات) */
export function formatUuid(value: string): string {
  const clean = value.replace(/[^0-9a-f]/gi, '');
  if (clean.length !== 32) return value;
  return `${clean.substring(0, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}-${clean.substring(16, 20)}-${clean.substring(20, 32)}`;
}
