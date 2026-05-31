/**
 * =============================================================================
 * EncryptionUtil - أدوات التشفير باستخدام AES-256-GCM
 * =============================================================================
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/** استخراج مفتاح التشفير من كلمة المرور */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * تشفير نص
 * @param text - النص المراد تشفيره
 * @param secret - كلمة السر
 */
export function encrypt(text: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(secret, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf-8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

/**
 * فك تشفير نص
 * @param encryptedData - البيانات المشفرة
 * @param secret - كلمة السر
 */
export function decrypt(encryptedData: string, secret: string): string {
  const data = Buffer.from(encryptedData, 'base64');

  // استخراج salt, iv, tag, encrypted
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(secret, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}

/**
 * تشفير كائن JSON
 * @param obj - الكائن المراد تشفيره
 * @param secret - كلمة السر
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encryptJson(obj: any, secret: string): string {
  return encrypt(JSON.stringify(obj), secret);
}

/**
 * فك تشفير كائن JSON
 * @param encryptedData - البيانات المشفرة
 * @param secret - كلمة السر
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decryptJson<T = any>(encryptedData: string, secret: string): T {
  const decrypted = decrypt(encryptedData, secret);
  return JSON.parse(decrypted) as T;
}

/**
 * إنشاء مفتاح تشفير عشوائي
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
