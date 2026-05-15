/**
 * GEM Z — Multi-Language Error Messages
 *
 * Centralized error message catalog supporting Arabic and English.
 * Auto-detects language from Accept-Language header with fallback to English.
 * Structured error objects with ar/en variants.
 *
 * Usage:
 *   getErrorMessage('AUTH_INVALID_TOKEN', 'ar') → 'رمز المصادقة غير صالح'
 *   getValidationErrorMessage('email', 'required', 'en') → 'Email is required'
 */

import { createLogger } from '../logging/logger';

const log = createLogger('i18n');

// ─── Supported Languages ────────────────────────────────────────

export type SupportedLanguage = 'ar' | 'en';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ar', 'en'];

// ─── Error Code Catalog ─────────────────────────────────────────

export type ErrorCode =
    // Authentication
    | 'AUTH_INVALID_TOKEN'
    | 'AUTH_EXPIRED_TOKEN'
    | 'AUTH_WRONG_PASSWORD'
    | 'AUTH_EMAIL_EXISTS'
    | 'AUTH_UNAUTHORIZED'
    | 'AUTH_FORBIDDEN'
    // Validation
    | 'VALIDATION_ERROR'
    | 'INVALID_INPUT'
    | 'MISSING_FIELD'
    // Not Found
    | 'NOT_FOUND_USER'
    | 'NOT_FOUND_WALLET'
    | 'NOT_FOUND_GYM'
    | 'NOT_FOUND_BRANCH'
    | 'NOT_FOUND_PLAN'
    | 'NOT_FOUND_TRANSACTION'
    | 'NOT_FOUND_PRODUCT'
    | 'NOT_FOUND_ORDER'
    | 'NOT_FOUND_RESOURCE'
    | 'NOT_FOUND_INVOICE'
    | 'NOT_FOUND_SUBSCRIPTION'
    // Conflict
    | 'CONFLICT_EMAIL_EXISTS'
    | 'CONFLICT_DUPLICATE_RESOURCE'
    // Wallet
    | 'WALLET_INSUFFICIENT_FUNDS'
    | 'WALLET_FROZEN'
    | 'WALLET_DAILY_LIMIT'
    | 'WALLET_INVALID_AMOUNT'
    // Rate Limit
    | 'RATE_LIMIT_EXCEEDED'
    // Server
    | 'SERVER_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'DATABASE_ERROR'
    // Invoice
    | 'INVOICE_GENERATION_FAILED'
    | 'INVOICE_EMAIL_FAILED'
    // Subscription
    | 'SUBSCRIPTION_EXPIRED'
    | 'SUBSCRIPTION_RENEWAL_FAILED'
    | 'SUBSCRIPTION_ALREADY_ACTIVE'
    | 'SUBSCRIPTION_CANCELLED'
    // Tax
    | 'TAX_CALCULATION_ERROR'
    // Currency
    | 'CURRENCY_CONVERSION_ERROR'
    | 'INVALID_CURRENCY'
    // Push
    | 'PUSH_SUBSCRIPTION_INVALID'
    | 'PUSH_DELIVERY_FAILED'
    // Generic
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'BAD_REQUEST';

// ─── Message Catalog ────────────────────────────────────────────

type MessageCatalog = Record<ErrorCode, { ar: string; en: string }>;

const errorMessages: MessageCatalog = {
    // Authentication
    AUTH_INVALID_TOKEN: {
        ar: 'رمز المصادقة غير صالح',
        en: 'Authentication token is invalid',
    },
    AUTH_EXPIRED_TOKEN: {
        ar: 'انتهت صلاحية رمز المصادقة',
        en: 'Authentication token has expired',
    },
    AUTH_WRONG_PASSWORD: {
        ar: 'كلمة المرور غير صحيحة',
        en: 'Password is incorrect',
    },
    AUTH_EMAIL_EXISTS: {
        ar: 'البريد الإلكتروني مسجل مسبقاً',
        en: 'Email address is already registered',
    },
    AUTH_UNAUTHORIZED: {
        ar: 'يرجى تسجيل الدخول للمتابعة',
        en: 'Please sign in to continue',
    },
    AUTH_FORBIDDEN: {
        ar: 'ليس لديك صلاحية الوصول',
        en: 'You do not have permission to access this resource',
    },
    // Validation
    VALIDATION_ERROR: {
        ar: 'البيانات المدخلة غير صالحة',
        en: 'Validation failed for the provided data',
    },
    INVALID_INPUT: {
        ar: 'الإدخال غير صالح',
        en: 'Invalid input provided',
    },
    MISSING_FIELD: {
        ar: 'حقل مطلوب مفقود',
        en: 'A required field is missing',
    },
    // Not Found
    NOT_FOUND_USER: {
        ar: 'المستخدم غير موجود',
        en: 'User not found',
    },
    NOT_FOUND_WALLET: {
        ar: 'المحفظة غير موجودة',
        en: 'Wallet not found',
    },
    NOT_FOUND_GYM: {
        ar: 'الصالة الرياضية غير موجودة',
        en: 'Gym not found',
    },
    NOT_FOUND_BRANCH: {
        ar: 'الفرع غير موجود',
        en: 'Branch not found',
    },
    NOT_FOUND_PLAN: {
        ar: 'الخطة غير موجودة',
        en: 'Plan not found',
    },
    NOT_FOUND_TRANSACTION: {
        ar: 'المعاملة غير موجودة',
        en: 'Transaction not found',
    },
    NOT_FOUND_PRODUCT: {
        ar: 'المنتج غير موجود',
        en: 'Product not found',
    },
    NOT_FOUND_ORDER: {
        ar: 'الطلب غير موجود',
        en: 'Order not found',
    },
    NOT_FOUND_RESOURCE: {
        ar: 'المورد غير موجود',
        en: 'Resource not found',
    },
    NOT_FOUND_INVOICE: {
        ar: 'الفاتورة غير موجودة',
        en: 'Invoice not found',
    },
    NOT_FOUND_SUBSCRIPTION: {
        ar: 'الاشتراك غير موجود',
        en: 'Subscription not found',
    },
    // Conflict
    CONFLICT_EMAIL_EXISTS: {
        ar: 'البريد الإلكتروني مستخدم بالفعل',
        en: 'Email already in use',
    },
    CONFLICT_DUPLICATE_RESOURCE: {
        ar: 'المورد موجود مسبقاً',
        en: 'Resource already exists',
    },
    // Wallet
    WALLET_INSUFFICIENT_FUNDS: {
        ar: 'رصيد غير كافٍ في المحفظة',
        en: 'Insufficient wallet balance',
    },
    WALLET_FROZEN: {
        ar: 'المحفظة مجمدة',
        en: 'Wallet is frozen',
    },
    WALLET_DAILY_LIMIT: {
        ar: 'تم تجاوز الحد اليومي للمعاملات',
        en: 'Daily transaction limit exceeded',
    },
    WALLET_INVALID_AMOUNT: {
        ar: 'المبلغ غير صالح',
        en: 'Invalid amount specified',
    },
    // Rate Limit
    RATE_LIMIT_EXCEEDED: {
        ar: 'تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً',
        en: 'Too many requests. Please try again later',
    },
    // Server
    SERVER_ERROR: {
        ar: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
        en: 'An internal server error occurred. Please try again later',
    },
    SERVICE_UNAVAILABLE: {
        ar: 'الخدمة غير متوفرة حالياً',
        en: 'Service temporarily unavailable',
    },
    DATABASE_ERROR: {
        ar: 'خطأ في قاعدة البيانات',
        en: 'Database error occurred',
    },
    // Invoice
    INVOICE_GENERATION_FAILED: {
        ar: 'فشل إنشاء الفاتورة',
        en: 'Invoice generation failed',
    },
    INVOICE_EMAIL_FAILED: {
        ar: 'فشل إرسال الفاتورة بالبريد الإلكتروني',
        en: 'Failed to email invoice',
    },
    // Subscription
    SUBSCRIPTION_EXPIRED: {
        ar: 'انتهى الاشتراك',
        en: 'Subscription has expired',
    },
    SUBSCRIPTION_RENEWAL_FAILED: {
        ar: 'فشل تجديد الاشتراك',
        en: 'Subscription renewal failed',
    },
    SUBSCRIPTION_ALREADY_ACTIVE: {
        ar: 'الاشتراك نشط بالفعل',
        en: 'Subscription is already active',
    },
    SUBSCRIPTION_CANCELLED: {
        ar: 'تم إلغاء الاشتراك',
        en: 'Subscription has been cancelled',
    },
    // Tax
    TAX_CALCULATION_ERROR: {
        ar: 'خطأ في حساب الضريبة',
        en: 'Tax calculation error',
    },
    // Currency
    CURRENCY_CONVERSION_ERROR: {
        ar: 'خطأ في تحويل العملة',
        en: 'Currency conversion error',
    },
    INVALID_CURRENCY: {
        ar: 'عملة غير صالحة',
        en: 'Invalid currency code',
    },
    // Push
    PUSH_SUBSCRIPTION_INVALID: {
        ar: 'اشتراك الإشعارات غير صالح',
        en: 'Push subscription is invalid',
    },
    PUSH_DELIVERY_FAILED: {
        ar: 'فشل إرسال الإشعار',
        en: 'Push notification delivery failed',
    },
    // Generic
    UNAUTHORIZED: {
        ar: 'غير مصرح',
        en: 'Unauthorized',
    },
    FORBIDDEN: {
        ar: 'ممنوع الوصول',
        en: 'Forbidden',
    },
    BAD_REQUEST: {
        ar: 'طلب غير صالح',
        en: 'Bad request',
    },
};

// ─── Validation Error Messages ──────────────────────────────────

export type ValidationRule =
    | 'required'
    | 'email'
    | 'minLength'
    | 'maxLength'
    | 'numeric'
    | 'positive'
    | 'uuid'
    | 'date'
    | 'enum'
    | 'pattern'
    | 'unique'
    | 'confirmPassword'
    | 'phone'
    | 'url'
    | 'fileType'
    | 'fileSize';

const validationMessages: Record<string, { ar: string; en: string }> = {
    required: {
        ar: '{field} مطلوب',
        en: '{field} is required',
    },
    email: {
        ar: '{field} يجب أن يكون بريد إلكتروني صالح',
        en: '{field} must be a valid email address',
    },
    minLength: {
        ar: '{field} يجب أن يحتوي على {min} أحرف على الأقل',
        en: '{field} must be at least {min} characters',
    },
    maxLength: {
        ar: '{field} يجب أن لا يتجاوز {max} حرف',
        en: '{field} must not exceed {max} characters',
    },
    numeric: {
        ar: '{field} يجب أن يكون رقماً',
        en: '{field} must be numeric',
    },
    positive: {
        ar: '{field} يجب أن يكون قيمة موجبة',
        en: '{field} must be a positive value',
    },
    uuid: {
        ar: '{field} يجب أن يكون معرف UUID صالح',
        en: '{field} must be a valid UUID',
    },
    date: {
        ar: '{field} يجب أن يكون تاريخاً صالحاً',
        en: '{field} must be a valid date',
    },
    enum: {
        ar: '{field} قيمة غير مسموح بها',
        en: '{field} has an invalid value',
    },
    pattern: {
        ar: '{field} format is invalid',
        en: '{field} format is invalid',
    },
    unique: {
        ar: '{field} مستخدم مسبقاً',
        en: '{field} is already taken',
    },
    confirmPassword: {
        ar: 'كلمتا المرور غير متطابقتين',
        en: 'Passwords do not match',
    },
    phone: {
        ar: '{field} يجب أن يكون رقم هاتف صالح',
        en: '{field} must be a valid phone number',
    },
    url: {
        ar: '{field} يجب أن يكون رابطاً صالحاً',
        en: '{field} must be a valid URL',
    },
    fileType: {
        ar: 'نوع الملف غير مسموح به',
        en: 'File type is not allowed',
    },
    fileSize: {
        ar: 'حجم الملف يتجاوز الحد المسموح به',
        en: 'File size exceeds the allowed limit',
    },
};

// ─── Field Name Translations ────────────────────────────────────

const fieldTranslations: Record<string, { ar: string; en: string }> = {
    email: { ar: 'البريد الإلكتروني', en: 'Email' },
    password: { ar: 'كلمة المرور', en: 'Password' },
    fullName: { ar: 'الاسم الكامل', en: 'Full name' },
    firstName: { ar: 'الاسم الأول', en: 'First name' },
    lastName: { ar: 'الاسم الأخير', en: 'Last name' },
    phone: { ar: 'رقم الهاتف', en: 'Phone number' },
    role: { ar: 'الدور', en: 'Role' },
    amount: { ar: 'المبلغ', en: 'Amount' },
    currency: { ar: 'العملة', en: 'Currency' },
    walletId: { ar: 'معرف المحفظة', en: 'Wallet ID' },
    userId: { ar: 'معرف المستخدم', en: 'User ID' },
    gymId: { ar: 'معرف الصالة', en: 'Gym ID' },
    branchId: { ar: 'معرف الفرع', en: 'Branch ID' },
    planId: { ar: 'معرف الخطة', en: 'Plan ID' },
    productId: { ar: 'معرف المنتج', en: 'Product ID' },
    orderId: { ar: 'معرف الطلب', en: 'Order ID' },
    invoiceId: { ar: 'معرف الفاتورة', en: 'Invoice ID' },
    subscriptionId: { ar: 'معرف الاشتراك', en: 'Subscription ID' },
    address: { ar: 'العنوان', en: 'Address' },
    city: { ar: 'المدينة', en: 'City' },
    country: { ar: 'الدولة', en: 'Country' },
    description: { ar: 'الوصف', en: 'Description' },
    name: { ar: 'الاسم', en: 'Name' },
    title: { ar: 'العنوان', en: 'Title' },
    price: { ar: 'السعر', en: 'Price' },
    quantity: { ar: 'الكمية', en: 'Quantity' },
    code: { ar: 'الرمز', en: 'Code' },
    otp: { ar: 'رمز التحقق', en: 'OTP code' },
    token: { ar: 'الرمز', en: 'Token' },
    startDate: { ar: 'تاريخ البدء', en: 'Start date' },
    endDate: { ar: 'تاريخ الانتهاء', en: 'End date' },
};

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get a localized error message for a given error code.
 *
 * @param code - The error code key
 * @param lang - Target language ('ar' | 'en')
 * @returns Localized error message string
 *
 * @example
 *   getErrorMessage('AUTH_INVALID_TOKEN', 'ar') // → 'رمز المصادقة غير صالح'
 *   getErrorMessage('AUTH_INVALID_TOKEN', 'en') // → 'Authentication token is invalid'
 */
export function getErrorMessage(code: ErrorCode, lang: SupportedLanguage): string {
    const entry = errorMessages[code];
    if (!entry) {
        log.warn({ code, lang }, `Missing error message for code: ${code}`);
        return lang === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred';
    }
    return entry[lang] || entry[DEFAULT_LANGUAGE];
}

/**
 * Get a localized validation error message for a field and rule.
 *
 * @param field - The field name (supports auto-translation)
 * @param rule - The validation rule that failed
 * @param lang - Target language
 * @param replacements - Optional replacement values (e.g., { min: 6, max: 50 })
 * @returns Localized validation message string
 *
 * @example
 *   getValidationErrorMessage('email', 'required', 'en')
 *   // → 'Email is required'
 *   getValidationErrorMessage('password', 'minLength', 'ar', { min: '8' })
 *   // → 'كلمة المرور يجب أن يحتوي على 8 أحرف على الأقل'
 */
export function getValidationErrorMessage(
    field: string,
    rule: ValidationRule | string,
    lang: SupportedLanguage,
    replacements?: Record<string, string>
): string {
    // Translate field name
    const fieldEntry = fieldTranslations[field];
    const translatedField = fieldEntry ? fieldEntry[lang] || fieldEntry[DEFAULT_LANGUAGE] : field;

    // Get base validation message
    const ruleEntry = validationMessages[rule];
    if (!ruleEntry) {
        const fallback = lang === 'ar'
            ? `${translatedField} غير صالح`
            : `${translatedField} is invalid`;
        return fallback;
    }

    let message = ruleEntry[lang] || ruleEntry[DEFAULT_LANGUAGE];

    // Replace {field} placeholder
    message = message.replace(/{field}/g, translatedField);

    // Apply additional replacements
    if (replacements) {
        for (const [key, value] of Object.entries(replacements)) {
            message = message.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }

    return message;
}

/**
 * Detect language from an Accept-Language header value.
 * Falls back to English if no supported language is found.
 *
 * @param acceptLanguage - Raw Accept-Language header string
 * @returns Detected supported language code
 *
 * @example
 *   detectLanguage('ar-EG,ar;q=0.9,en;q=0.8') // → 'ar'
 *   detectLanguage('en-US,en;q=0.9') // → 'en'
 *   detectLanguage('fr-FR') // → 'en' (fallback)
 */
export function detectLanguage(acceptLanguage?: string | null): SupportedLanguage {
    if (!acceptLanguage) {
        return DEFAULT_LANGUAGE;
    }

    // Parse Accept-Language header: "ar-EG,ar;q=0.9,en;q=0.8"
    const locales = acceptLanguage
        .split(',')
        .map((part) => {
            const [lang, q] = part.trim().split(';q=');
            return {
                lang: lang.trim().toLowerCase().split('-')[0], // "ar-eg" → "ar"
                q: q ? parseFloat(q) : 1.0,
            };
        })
        .sort((a, b) => b.q - a.q); // Sort by quality (highest first)

    for (const locale of locales) {
        if (SUPPORTED_LANGUAGES.includes(locale.lang as SupportedLanguage)) {
            return locale.lang as SupportedLanguage;
        }
    }

    return DEFAULT_LANGUAGE;
}

/**
 * Build a structured bilingual error object.
 * Useful for returning both languages in API error responses.
 *
 * @param code - The error code
 * @returns Object containing both Arabic and English messages
 *
 * @example
 *   buildBilingualError('AUTH_INVALID_TOKEN')
 *   // → { ar: 'رمز المصادقة غير صالح', en: 'Authentication token is invalid' }
 */
export function buildBilingualError(code: ErrorCode): { ar: string; en: string } {
    const entry = errorMessages[code];
    if (!entry) {
        return {
            ar: 'حدث خطأ غير متوقع',
            en: 'An unexpected error occurred',
        };
    }
    return { ar: entry.ar, en: entry.en };
}

/**
 * Get multiple error messages in batch.
 * Useful for validation with multiple field errors.
 *
 * @param errors - Array of { field, rule, replacements? } objects
 * @param lang - Target language
 * @returns Array of localized error strings
 */
export function getValidationErrors(
    errors: Array<{
        field: string;
        rule: ValidationRule | string;
        replacements?: Record<string, string>;
    }>,
    lang: SupportedLanguage
): string[] {
    return errors.map((e) => getValidationErrorMessage(e.field, e.rule, lang, e.replacements));
}
