/**
 * =============================================================================
 * HashingUtil - أدوات Hashing باستخدام bcrypt
 * =============================================================================
 */

import { compare, hash, genSalt } from 'bcrypt';

/** عدد salt rounds (كلما زاد، أبطأ وأكثر أماناً) */
const SALT_ROUNDS = 12;

/**
 * إنشاء hash من كلمة المرور
 * @param password - كلمة المرور النصية
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(SALT_ROUNDS);
  return hash(password, salt);
}

/**
 * مقارنة كلمة مرور مع hash
 * @param password - كلمة المرور النصية
 * @param hashedPassword - الـ hash المخزن
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

/**
 * إنشاء hash من نص عشوائي (token/secret)
 * @param text - النص المراد hashing
 * @param rounds - عدد salt rounds
 */
export async function hashText(text: string, rounds = SALT_ROUNDS): Promise<string> {
  const salt = await genSalt(rounds);
  return hash(text, salt);
}

/**
 * التحقق بسرعة من hash (للبيانات غير الحرجة)
 * @param text - النص
 * @param hashed - الـ hash
 */
export async function verifyHash(text: string, hashed: string): Promise<boolean> {
  return compare(text, hashed);
}
