/**
 * GEM Z — Internationalization (i18n) Module
 *
 * Centralized i18n setup with language detection, message catalogs,
 * and Express middleware for automatic language selection.
 *
 * Features:
 *   - Auto-detect language from Accept-Language header
 *   - Fallback to English for unsupported languages
 *   - Express middleware to attach i18n to requests
 *   - Currency and date formatting per locale
 *
 * Usage:
 *   // In Express app setup:
 *   app.use(i18nMiddleware);
 *
 *   // In route handlers:
 *   const lang = req.i18n?.lang || 'en';
 *   res.json({ message: getErrorMessage('AUTH_UNAUTHORIZED', lang) });
 */

import { Request, Response, NextFunction } from 'express';
import {
    SupportedLanguage,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    detectLanguage,
    getErrorMessage,
    getValidationErrorMessage,
    buildBilingualError,
    ErrorCode,
    ValidationRule,
} from './errors';
import { createLogger } from '../logging/logger';

const log = createLogger('i18n');

// ─── Express Augmentation ───────────────────────────────────────

declare global {
    namespace Express {
        interface Request {
            i18n?: {
                /** Detected language for this request */
                lang: SupportedLanguage;
                /** Raw Accept-Language header */
                acceptLanguage: string | undefined;
                /** Shorthand to get an error message */
                t: (code: ErrorCode) => string;
                /** Shorthand to get a validation message */
                tv: (field: string, rule: ValidationRule | string, replacements?: Record<string, string>) => string;
            };
        }
    }
}

// ─── i18n Middleware ────────────────────────────────────────────

/**
 * Express middleware that detects the user's preferred language
 * from the Accept-Language header and attaches i18n helpers to req.
 *
 * Place this EARLY in your middleware stack (before route handlers).
 *
 * @example
 *   app.use(i18nMiddleware);
 *   // Later in routes:
 *   router.get('/user', (req, res) => {
 *       const lang = req.i18n!.lang;
 *       res.json({ message: req.i18n!.t('NOT_FOUND_USER') });
 *   });
 */
export function i18nMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const acceptLanguage = req.headers['accept-language'];
    const lang = detectLanguage(acceptLanguage);

    req.i18n = {
        lang,
        acceptLanguage,
        t: (code: ErrorCode) => getErrorMessage(code, lang),
        tv: (field: string, rule: ValidationRule | string, replacements?: Record<string, string>) =>
            getValidationErrorMessage(field, rule, lang, replacements),
    };

    log.debug(
        { lang, originalHeader: acceptLanguage, path: req.path },
        `i18n language set to: ${lang}`
    );

    next();
}

// ─── Locale Formatting ──────────────────────────────────────────

/**
 * Format a number as currency according to the locale.
 *
 * @param amount - The numeric amount
 * @param currency - Currency code (EGP, USD, EUR, SAR, AED)
 * @param lang - Target language for formatting
 * @returns Formatted currency string
 */
export function formatCurrency(
    amount: number,
    currency: string,
    lang: SupportedLanguage
): string {
    const localeMap: Record<SupportedLanguage, string> = {
        ar: 'ar-EG',
        en: 'en-US',
    };

    try {
        return new Intl.NumberFormat(localeMap[lang], {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        // Fallback for unsupported currency codes
        return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
}

/**
 * Format a date according to the locale.
 *
 * @param date - Date object or ISO string
 * @param lang - Target language
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
    date: Date | string,
    lang: SupportedLanguage,
    options?: Intl.DateTimeFormatOptions
): string {
    const localeMap: Record<SupportedLanguage, string> = {
        ar: 'ar-EG',
        en: 'en-US',
    };

    const d = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
    };

    try {
        return new Intl.DateTimeFormat(localeMap[lang], defaultOptions).format(d);
    } catch {
        return d.toISOString().split('T')[0];
    }
}

/**
 * Format a date-time according to the locale.
 *
 * @param date - Date object or ISO string
 * @param lang - Target language
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date | string, lang: SupportedLanguage): string {
    return formatDate(date, lang, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format a relative time (e.g., "2 days ago", "قبل يومين").
 *
 * @param date - Date to compare against now
 * @param lang - Target language
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string, lang: SupportedLanguage): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === 'ar') {
        if (diffSeconds < 60) return 'منذ لحظات';
        if (diffMinutes < 60) return `منذ ${diffMinutes} ${diffMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
        if (diffHours < 24) return `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
        if (diffDays < 7) return `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
        return formatDate(d, 'ar');
    }

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(d, 'en');
}

// ─── Number Formatting ──────────────────────────────────────────

/**
 * Format a number with locale-aware separators.
 *
 * @param num - Number to format
 * @param lang - Target language
 * @param decimals - Decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(num: number, lang: SupportedLanguage, decimals = 0): string {
    const localeMap: Record<SupportedLanguage, string> = {
        ar: 'ar-EG',
        en: 'en-US',
    };

    return new Intl.NumberFormat(localeMap[lang], {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
}

// ─── Success Message Catalog ────────────────────────────────────

interface SuccessMessageEntry {
    ar: string;
    en: string;
}

const successMessages: Record<string, SuccessMessageEntry> = {
    LOGIN_SUCCESS: {
        ar: 'تم تسجيل الدخول بنجاح',
        en: 'Login successful',
    },
    REGISTER_SUCCESS: {
        ar: 'تم إنشاء الحساب بنجاح',
        en: 'Registration successful',
    },
    LOGOUT_SUCCESS: {
        ar: 'تم تسجيل الخروج بنجاح',
        en: 'Logout successful',
    },
    PASSWORD_RESET_SENT: {
        ar: 'تم إرسال رابط إعادة تعيين كلمة المرور',
        en: 'Password reset link sent',
    },
    PASSWORD_CHANGED: {
        ar: 'تم تغيير كلمة المرور بنجاح',
        en: 'Password changed successfully',
    },
    PROFILE_UPDATED: {
        ar: 'تم تحديث الملف الشخصي بنجاح',
        en: 'Profile updated successfully',
    },
    WALLET_TOPUP_SUCCESS: {
        ar: 'تم شحن المحفظة بنجاح',
        en: 'Wallet topped up successfully',
    },
    PAYMENT_SUCCESS: {
        ar: 'تمت عملية الدفع بنجاح',
        en: 'Payment successful',
    },
    SUBSCRIPTION_CREATED: {
        ar: 'تم إنشاء الاشتراك بنجاح',
        en: 'Subscription created successfully',
    },
    SUBSCRIPTION_RENEWED: {
        ar: 'تم تجديد الاشتراك بنجاح',
        en: 'Subscription renewed successfully',
    },
    SUBSCRIPTION_CANCELLED: {
        ar: 'تم إلغاء الاشتراك بنجاح',
        en: 'Subscription cancelled successfully',
    },
    INVOICE_GENERATED: {
        ar: 'تم إنشاء الفاتورة بنجاح',
        en: 'Invoice generated successfully',
    },
    INVOICE_EMAILED: {
        ar: 'تم إرسال الفاتورة بالبريد الإلكتروني',
        en: 'Invoice emailed successfully',
    },
    ORDER_PLACED: {
        ar: 'تم تقديم الطلب بنجاح',
        en: 'Order placed successfully',
    },
    PLAN_ASSIGNED: {
        ar: 'تم تعيين الخطة بنجاح',
        en: 'Plan assigned successfully',
    },
    SETTINGS_UPDATED: {
        ar: 'تم تحديث الإعدادات بنجاح',
        en: 'Settings updated successfully',
    },
    PUSH_SUBSCRIBED: {
        ar: 'تم تفعيل الإشعارات بنجاح',
        en: 'Push notifications enabled',
    },
    PUSH_UNSUBSCRIBED: {
        ar: 'تم إيقاف الإشعارات بنجاح',
        en: 'Push notifications disabled',
    },
    CREATED: {
        ar: 'تم الإنشاء بنجاح',
        en: 'Created successfully',
    },
    UPDATED: {
        ar: 'تم التحديث بنجاح',
        en: 'Updated successfully',
    },
    DELETED: {
        ar: 'تم الحذف بنجاح',
        en: 'Deleted successfully',
    },
};

/**
 * Get a localized success message.
 *
 * @param key - Success message key
 * @param lang - Target language
 * @returns Localized success message
 */
export function getSuccessMessage(key: string, lang: SupportedLanguage): string {
    const entry = successMessages[key];
    if (!entry) {
        return lang === 'ar' ? 'تمت العملية بنجاح' : 'Operation successful';
    }
    return entry[lang] || entry[DEFAULT_LANGUAGE];
}

// ─── Re-exports ─────────────────────────────────────────────────

export {
    SupportedLanguage,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    detectLanguage,
    getErrorMessage,
    getValidationErrorMessage,
    buildBilingualError,
    ErrorCode,
    ValidationRule,
};
