/**
 * GEM Z — Multi-Currency Support
 *
 * Exchange rates between EGP, USD, EUR, SAR, and AED.
 * Auto-fetches from Central Bank of Egypt API with 1-hour Redis caching.
 * Provides currency conversion, formatting, and rounding.
 *
 * Supported currencies: EGP, USD, EUR, SAR, AED
 */

import { createLogger } from '../logging/logger';
import { redisClient } from '../redis/client';
import { config } from '../../config';
import { NotFoundError, ValidationError } from '../errors';

const log = createLogger('currency');

// ─── Currency Enum ──────────────────────────────────────────────

export enum Currency {
    EGP = 'EGP',
    USD = 'USD',
    EUR = 'EUR',
    SAR = 'SAR',
    AED = 'AED',
}

export const SUPPORTED_CURRENCIES: Currency[] = [
    Currency.EGP,
    Currency.USD,
    Currency.EUR,
    Currency.SAR,
    Currency.AED,
];

// ─── Types ──────────────────────────────────────────────────────

export interface ExchangeRate {
    from: Currency;
    to: Currency;
    rate: number;
    timestamp: Date;
    source: string;
}

export interface CurrencyConversion {
    originalAmount: number;
    originalCurrency: Currency;
    convertedAmount: number;
    targetCurrency: Currency;
    exchangeRate: number;
    timestamp: Date;
}

// ─── Currency Configuration ─────────────────────────────────────

/** Number of decimal places per currency */
const CURRENCY_DECIMALS: Record<Currency, number> = {
    [Currency.EGP]: 2,
    [Currency.USD]: 2,
    [Currency.EUR]: 2,
    [Currency.SAR]: 2,
    [Currency.AED]: 2,
};

/** Currency symbols for display */
const CURRENCY_SYMBOLS: Record<Currency, string> = {
    [Currency.EGP]: 'E£',
    [Currency.USD]: '$',
    [Currency.EUR]: '€',
    [Currency.SAR]: '﷼',
    [Currency.AED]: 'د.إ',
};

/** Currency names in English and Arabic */
const CURRENCY_NAMES: Record<Currency, { en: string; ar: string }> = {
    [Currency.EGP]: { en: 'Egyptian Pound', ar: 'الجنيه المصري' },
    [Currency.USD]: { en: 'US Dollar', ar: 'الدولار الأمريكي' },
    [Currency.EUR]: { en: 'Euro', ar: 'اليورو' },
    [Currency.SAR]: { en: 'Saudi Riyal', ar: 'الريال السعودي' },
    [Currency.AED]: { en: 'UAE Dirham', ar: 'الدرهم الإماراتي' },
};

// ─── Cache Configuration ────────────────────────────────────────

const CACHE_KEY = 'gemz:exchange_rates';
const CACHE_TTL_SECONDS = 3600; // 1 hour
const CBE_API_URL = 'https://www.cbe.org.eg/ar/economicResearch/statistics/Pages/ExchangeRatesListing.aspx';
const FALLBACK_RATES: Record<Currency, number> = {
    // Rates relative to EGP (1 EGP = X of foreign currency)
    // These are reciprocal rates: how much foreign currency 1 EGP buys
    [Currency.EGP]: 1.0,
    [Currency.USD]: 0.0204, // ~49 EGP per USD
    [Currency.EUR]: 0.0189, // ~53 EGP per EUR
    [Currency.SAR]: 0.0765, // ~13.07 EGP per SAR
    [Currency.AED]: 0.0750, // ~13.33 EGP per AED
};

/** Base currency for all internal calculations */
export const BASE_CURRENCY = Currency.EGP;

// ─── Validation ─────────────────────────────────────────────────

/**
 * Validate that a currency code is supported.
 */
export function isValidCurrency(currency: string): currency is Currency {
    return SUPPORTED_CURRENCIES.includes(currency as Currency);
}

function validateCurrency(currency: string): Currency {
    if (!isValidCurrency(currency)) {
        throw new ValidationError(
            `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`,
            'INVALID_CURRENCY'
        );
    }
    return currency;
}

// ─── Exchange Rate Management ───────────────────────────────────

/**
 * Fetch latest exchange rates from Central Bank of Egypt.
 * Falls back to hardcoded rates if the API is unavailable.
 *
 * @returns Record of exchange rates relative to EGP
 */
export async function fetchRatesFromCBE(): Promise<Record<Currency, number>> {
    try {
        log.info('Fetching exchange rates from CBE');

        const response = await fetch(CBE_API_URL, {
            headers: {
                Accept: 'text/html',
                'User-Agent': 'GEM-Z-Backend/1.0',
            },
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
            throw new Error(`CBE API returned ${response.status}`);
        }

        const html = await response.text();

        // Parse the HTML table for exchange rates
        // CBE publishes rates in a table format
        const rates = parseCBERates(html);

        if (rates) {
            log.info({ rates }, 'Successfully fetched CBE exchange rates');
            return rates;
        }

        throw new Error('Failed to parse CBE rates from HTML');
    } catch (error) {
        log.warn(
            { error: (error as Error).message },
            'CBE rate fetch failed, using fallback rates'
        );
        return { ...FALLBACK_RATES };
    }
}

/**
 * Parse exchange rates from CBE HTML response.
 * This is a best-effort parser that extracts rates from the CBE webpage.
 */
function parseCBERates(html: string): Record<Currency, number> | null {
    try {
        // Extract USD rate using regex
        const usdMatch = html.match(/US\s*Dollar.*?([\d.]+)/i);
        const eurMatch = html.match(/Euro.*?([\d.]+)/i);
        const sarMatch = html.match(/Saudi\s*Riyal.*?([\d.]+)/i);

        if (!usdMatch) {
            return null;
        }

        const usdRate = parseFloat(usdMatch[1]);
        const eurRate = eurMatch ? parseFloat(eurMatch[1]) : usdRate * 0.93;
        const sarRate = sarMatch ? parseFloat(sarMatch[1]) : usdRate * 3.75;
        // AED typically tracks SAR closely (~1 AED = 1.02 SAR)
        const aedRate = sarRate * 1.02;

        return {
            [Currency.EGP]: 1.0,
            [Currency.USD]: 1 / usdRate,
            [Currency.EUR]: 1 / eurRate,
            [Currency.SAR]: 1 / sarRate,
            [Currency.AED]: 1 / aedRate,
        };
    } catch {
        return null;
    }
}

/**
 * Get all current exchange rates with caching.
 * Rates are cached in Redis for 1 hour to avoid hitting the CBE API too frequently.
 *
 * @returns Exchange rates relative to EGP
 */
export async function getExchangeRates(): Promise<Record<Currency, number>> {
    // Try cache first
    try {
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached) as {
                rates: Record<string, number>;
                timestamp: string;
            };
            log.debug('Exchange rates served from cache');

            // Convert string keys back to Currency enum
            const rates: Record<Currency, number> = { ...FALLBACK_RATES };
            for (const [key, value] of Object.entries(parsed.rates)) {
                if (isValidCurrency(key)) {
                    rates[key] = value;
                }
            }
            return rates;
        }
    } catch (error) {
        log.warn({ error: (error as Error).message }, 'Redis cache read failed for exchange rates');
    }

    // Fetch from CBE
    const rates = await fetchRatesFromCBE();

    // Cache the result
    try {
        await redisClient.setex(
            CACHE_KEY,
            CACHE_TTL_SECONDS,
            JSON.stringify({
                rates,
                timestamp: new Date().toISOString(),
                source: 'cbe',
            })
        );
        log.debug('Exchange rates cached in Redis');
    } catch (error) {
        log.warn({ error: (error as Error).message }, 'Redis cache write failed for exchange rates');
    }

    return rates;
}

/**
 * Get a single exchange rate between two currencies.
 * All rates are internally converted via EGP as the base.
 *
 * @param from - Source currency
 * @param to - Target currency
 * @returns Exchange rate (how much 1 unit of `from` buys in `to`)
 */
export async function getExchangeRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) {
        return 1.0;
    }

    const rates = await getExchangeRates();

    // Convert: from -> EGP -> to
    // rate(from, to) = rate(EGP, to) / rate(EGP, from)
    // Since our rates are stored as "how much foreign currency 1 EGP buys":
    // 1 from = (1 / rate[from of EGP]) EGP = rate[to of EGP] / rate[from of EGP] to
    const rate = rates[to] / rates[from];

    log.debug(
        { from, to, rate },
        `Exchange rate: 1 ${from} = ${rate.toFixed(6)} ${to}`
    );

    return rate;
}

// ─── Currency Conversion ────────────────────────────────────────

/**
 * Convert an amount from one currency to another.
 *
 * @param amount - Amount in source currency
 * @param from - Source currency
 * @param to - Target currency
 * @returns Converted amount in target currency
 *
 * @example
 *   await convertCurrency(1000, Currency.EGP, Currency.USD) // → ~20.41
 */
export async function convertCurrency(
    amount: number,
    from: Currency,
    to: Currency
): Promise<number> {
    // Validate inputs
    if (!Number.isFinite(amount)) {
        throw new ValidationError('Amount must be a valid number', 'INVALID_INPUT');
    }

    if (amount < 0) {
        throw new ValidationError('Amount cannot be negative', 'INVALID_INPUT');
    }

    const validFrom = validateCurrency(from);
    const validTo = validateCurrency(to);

    if (validFrom === validTo) {
        return roundCurrency(amount, validTo);
    }

    const rate = await getExchangeRate(validFrom, validTo);
    const converted = amount * rate;

    return roundCurrency(converted, validTo);
}

// ─── Formatting ─────────────────────────────────────────────────

/**
 * Round an amount according to the currency's decimal rules.
 *
 * @param amount - Raw amount
 * @param currency - Currency code
 * @returns Rounded amount
 */
export function roundCurrency(amount: number, currency: Currency): number {
    const decimals = CURRENCY_DECIMALS[currency] || 2;
    return Number(amount.toFixed(decimals));
}

/**
 * Format a currency amount for display.
 *
 * @param amount - Numeric amount
 * @param currency - Currency code
 * @returns Formatted string like "E£ 1,250.00" or "$ 25.51"
 *
 * @example
 *   formatCurrency(1250.5, Currency.EGP) // → "E£ 1,250.50"
 *   formatCurrency(25.51, Currency.USD)  // → "$ 25.51"
 */
export function formatCurrency(amount: number, currency: Currency): string {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const decimals = CURRENCY_DECIMALS[currency] || 2;
    const rounded = roundCurrency(amount, currency);

    // Use Intl.NumberFormat for proper localization
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Math.abs(rounded));

    const prefix = rounded < 0 ? '-' : '';
    return `${prefix}${symbol} ${formatted}`;
}

/**
 * Format a currency amount with full name.
 *
 * @param amount - Numeric amount
 * @param currency - Currency code
 * @param lang - Language for currency name ('ar' | 'en')
 * @returns Formatted string with full currency name
 */
export function formatCurrencyWithName(
    amount: number,
    currency: Currency,
    lang: 'ar' | 'en' = 'en'
): string {
    const formatted = formatCurrency(amount, currency);
    const name = CURRENCY_NAMES[currency]?.[lang] || currency;
    return `${formatted} ${name}`;
}

/**
 * Get currency metadata.
 *
 * @param currency - Currency code
 * @returns Currency metadata object
 */
export function getCurrencyInfo(currency: Currency) {
    return {
        code: currency,
        symbol: CURRENCY_SYMBOLS[currency],
        name: CURRENCY_NAMES[currency],
        decimals: CURRENCY_DECIMALS[currency],
    };
}

// ─── Batch Operations ───────────────────────────────────────────

/**
 * Convert multiple amounts in a single batch.
 * Fetches rates once and applies to all conversions.
 *
 * @param items - Array of { amount, from, to } objects
 * @returns Array of converted amounts in the same order
 */
export async function batchConvert(
    items: Array<{ amount: number; from: Currency; to: Currency }>
): Promise<number[]> {
    // Pre-fetch all unique rates needed
    const uniquePairs = new Set<string>();
    for (const item of items) {
        if (item.from !== item.to) {
            uniquePairs.add(`${item.from}-${item.to}`);
        }
    }

    const rateCache = new Map<string, number>();
    for (const pair of uniquePairs) {
        const [from, to] = pair.split('-') as [Currency, Currency];
        const rate = await getExchangeRate(from, to);
        rateCache.set(pair, rate);
    }

    return items.map((item) => {
        if (item.from === item.to) {
            return roundCurrency(item.amount, item.to);
        }
        const rate = rateCache.get(`${item.from}-${item.to}`) || 0;
        return roundCurrency(item.amount * rate, item.to);
    });
}

// ─── Cache Management ───────────────────────────────────────────

/**
 * Invalidate the exchange rate cache.
 * Call this when you need fresh rates immediately.
 */
export async function invalidateRateCache(): Promise<void> {
    try {
        await redisClient.del(CACHE_KEY);
        log.info('Exchange rate cache invalidated');
    } catch (error) {
        log.warn({ error: (error as Error).message }, 'Failed to invalidate rate cache');
    }
}

/**
 * Refresh exchange rates immediately.
 * Forces a new fetch from CBE and updates the cache.
 */
export async function refreshRates(): Promise<Record<Currency, number>> {
    await invalidateRateCache();
    return getExchangeRates();
}
