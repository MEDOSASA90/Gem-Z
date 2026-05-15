/**
 * GEM Z — Egyptian Tax Calculation Service
 *
 * Implements Egyptian tax rules:
 *   - Standard VAT: 14% (applied to most goods and services)
 *   - Tax-exempt items: Basic gym subscriptions
 *   - Taxable items: Premium services, store products
 *   - Withholding tax for trainers: 5%
 *   - Tax report generation for date ranges
 *
 * All calculations use EGP as the base currency.
 */

import { createLogger } from '../../core/logging/logger';
import { db } from '../../core/database/db';
import { ValidationError, ServerError } from '../../core/errors';

const log = createLogger('tax');

// ─── Tax Configuration ──────────────────────────────────────────

/** Egyptian VAT rate */
export const VAT_RATE = 0.14; // 14%

/** Withholding tax rate for trainer payments */
export const WITHHOLDING_TAX_RATE = 0.05; // 5%

/** Tax registration number (from env) */
const TAX_REGISTRATION_NUMBER = process.env.TAX_REGISTRATION_NUMBER || '';

// ─── Tax Categories ─────────────────────────────────────────────

export enum TaxCategory {
    /** Tax-exempt: basic gym subscriptions, essential services */
    EXEMPT = 0,
    /** Standard VAT: premium services, most products */
    STANDARD = 0.14,
    /** Premium VAT: luxury items, high-end services */
    PREMIUM = 0.14,
}

/** Human-readable labels for tax categories */
export const TAX_CATEGORY_LABELS: Record<TaxCategory, { en: string; ar: string }> = {
    [TaxCategory.EXEMPT]: { en: 'Tax Exempt', ar: 'معفى من الضريبة' },
    [TaxCategory.STANDARD]: { en: 'Standard VAT (14%)', ar: 'ضريبة القيمة المضافة (14%)' },
    [TaxCategory.PREMIUM]: { en: 'Premium VAT (14%)', ar: 'ضريبة قيمة مضافة مميزة (14%)' },
};

/** Product/service types mapped to tax categories */
export const TAX_CATEGORY_MAP: Record<string, TaxCategory> = {
    // Exempt
    'basic_gym_subscription': TaxCategory.EXEMPT,
    'student_subscription': TaxCategory.EXEMPT,
    'essential_service': TaxCategory.EXEMPT,
    // Standard
    'premium_subscription': TaxCategory.STANDARD,
    'personal_training': TaxCategory.STANDARD,
    'group_class': TaxCategory.STANDARD,
    'store_product': TaxCategory.STANDARD,
    'supplement': TaxCategory.STANDARD,
    'apparel': TaxCategory.STANDARD,
    'equipment': TaxCategory.STANDARD,
    // Premium
    'luxury_membership': TaxCategory.PREMIUM,
    'vip_package': TaxCategory.PREMIUM,
    'premium_equipment': TaxCategory.PREMIUM,
};

// ─── Types ──────────────────────────────────────────────────────

export interface TaxResult {
    /** Original amount before tax */
    baseAmount: number;
    /** Tax amount */
    taxAmount: number;
    /** Total amount including tax */
    totalAmount: number;
    /** Tax rate applied */
    rate: number;
    /** Tax category */
    category: TaxCategory;
    /** Human-readable category label */
    categoryLabel: string;
    /** Whether the item is exempt */
    isExempt: boolean;
    /** Tax registration number */
    taxRegistrationNumber?: string;
}

export interface TaxBreakdown {
    /** Sum of all exempt amounts */
    exemptTotal: number;
    /** Sum of all standard-taxable amounts */
    standardTaxableTotal: number;
    /** Sum of all premium-taxable amounts */
    premiumTaxableTotal: number;
    /** Total VAT collected */
    totalVat: number;
    /** Total withholding tax */
    totalWithholding: number;
    /** Grand total of all transactions */
    grandTotal: number;
    /** Total number of transactions */
    transactionCount: number;
}

export interface TaxLineItem {
    id: string;
    description: string;
    category: TaxCategory;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
    rate: number;
    createdAt: Date;
}

export interface TaxReport {
    /** Report period */
    period: {
        startDate: Date;
        endDate: Date;
    };
    /** Summary totals */
    summary: TaxBreakdown;
    /** Line items in the period */
    lineItems: TaxLineItem[];
    /** Generated timestamp */
    generatedAt: Date;
    /** Tax registration number */
    taxRegistrationNumber: string;
    /** Currency */
    currency: string;
}

export interface WithholdingTaxResult {
    /** Gross payment amount */
    grossAmount: number;
    /** Withholding tax amount (5%) */
    withholdingTax: number;
    /** Net amount after withholding */
    netAmount: number;
    /** Withholding tax rate */
    rate: number;
}

// ─── Core Tax Calculation ───────────────────────────────────────

/**
 * Calculate tax for a given amount and category.
 *
 * @param amount - Base amount (before tax)
 * @param category - Tax category
 * @returns Tax calculation result
 *
 * @example
 *   calculateTax(1000, TaxCategory.STANDARD)
 *   // → { baseAmount: 1000, taxAmount: 140, totalAmount: 1140, rate: 0.14, ... }
 *   calculateTax(1000, TaxCategory.EXEMPT)
 *   // → { baseAmount: 1000, taxAmount: 0, totalAmount: 1000, rate: 0, isExempt: true }
 */
export function calculateTax(amount: number, category: TaxCategory = TaxCategory.STANDARD): TaxResult {
    // Validate input
    if (!Number.isFinite(amount) || amount < 0) {
        throw new ValidationError('Amount must be a non-negative number', 'INVALID_INPUT');
    }

    const rate = category as unknown as number;
    const taxAmount = roundTax(amount * rate);
    const totalAmount = roundTax(amount + taxAmount);
    const isExempt = rate === 0;

    const result: TaxResult = {
        baseAmount: roundTax(amount),
        taxAmount,
        totalAmount,
        rate,
        category,
        categoryLabel: TAX_CATEGORY_LABELS[category]?.en || 'Unknown',
        isExempt,
        taxRegistrationNumber: TAX_REGISTRATION_NUMBER || undefined,
    };

    log.debug(
        { amount, category, rate, taxAmount, totalAmount },
        `Tax calculated: ${amount} EGP → tax=${taxAmount} EGP (rate=${rate})`
    );

    return result;
}

/**
 * Calculate tax from a product/service type string.
 * Automatically determines the correct tax category.
 *
 * @param amount - Base amount
 * @param productType - Product type key
 * @returns Tax calculation result
 */
export function calculateTaxByType(amount: number, productType: string): TaxResult {
    const category = TAX_CATEGORY_MAP[productType] || TaxCategory.STANDARD;
    return calculateTax(amount, category);
}

/**
 * Add tax to an amount (gross-up).
 * Calculates what the total should be including tax.
 *
 * @param baseAmount - Amount before tax
 * @param category - Tax category
 * @returns Object with original, tax, and total
 */
export function addTax(baseAmount: number, category: TaxCategory = TaxCategory.STANDARD): TaxResult {
    return calculateTax(baseAmount, category);
}

/**
 * Extract tax from a total amount (reverse calculation).
 * Given a total that includes tax, extract the base amount and tax.
 *
 * @param totalAmount - Total amount including tax
 * @param category - Tax category
 * @returns Object with base amount, tax amount, and total
 */
export function extractTax(totalAmount: number, category: TaxCategory = TaxCategory.STANDARD): TaxResult {
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
        throw new ValidationError('Total amount must be a non-negative number', 'INVALID_INPUT');
    }

    const rate = category as unknown as number;
    if (rate === 0 || category === TaxCategory.EXEMPT) {
        return {
            baseAmount: roundTax(totalAmount),
            taxAmount: 0,
            totalAmount: roundTax(totalAmount),
            rate: 0,
            category: TaxCategory.EXEMPT,
            categoryLabel: TAX_CATEGORY_LABELS[TaxCategory.EXEMPT].en,
            isExempt: true,
        };
    }

    // Reverse: total = base * (1 + rate) → base = total / (1 + rate)
    const baseAmount = roundTax(totalAmount / (1 + rate));
    const taxAmount = roundTax(totalAmount - baseAmount);

    return {
        baseAmount,
        taxAmount,
        totalAmount: roundTax(totalAmount),
        rate,
        category,
        categoryLabel: TAX_CATEGORY_LABELS[category]?.en || 'Unknown',
        isExempt: false,
        taxRegistrationNumber: TAX_REGISTRATION_NUMBER || undefined,
    };
}

// ─── Withholding Tax ────────────────────────────────────────────

/**
 * Calculate withholding tax for trainer payments.
 * Egyptian law requires 5% withholding on freelance/service payments.
 *
 * @param amount - Gross payment amount
 * @returns Withholding tax breakdown
 *
 * @example
 *   calculateWithholdingTax(5000)
 *   // → { grossAmount: 5000, withholdingTax: 250, netAmount: 4750, rate: 0.05 }
 */
export function calculateWithholdingTax(amount: number): WithholdingTaxResult {
    if (!Number.isFinite(amount) || amount < 0) {
        throw new ValidationError('Amount must be a non-negative number', 'INVALID_INPUT');
    }

    const withholdingTax = roundTax(amount * WITHHOLDING_TAX_RATE);
    const netAmount = roundTax(amount - withholdingTax);

    log.debug(
        { amount, withholdingTax, netAmount, rate: WITHHOLDING_TAX_RATE },
        `Withholding tax: ${amount} EGP → withheld=${withholdingTax} EGP, net=${netAmount} EGP`
    );

    return {
        grossAmount: roundTax(amount),
        withholdingTax,
        netAmount,
        rate: WITHHOLDING_TAX_RATE,
    };
}

/**
 * Calculate the gross amount needed to pay a trainer a specific net amount.
 * Reverse of withholding tax calculation.
 *
 * @param desiredNet - Desired net payment after withholding
 * @returns Gross amount to pay
 */
export function calculateGrossForNet(desiredNet: number): number {
    if (!Number.isFinite(desiredNet) || desiredNet < 0) {
        throw new ValidationError('Net amount must be a non-negative number', 'INVALID_INPUT');
    }
    // net = gross * (1 - rate) → gross = net / (1 - rate)
    return roundTax(desiredNet / (1 - WITHHOLDING_TAX_RATE));
}

// ─── Batch Tax Calculations ─────────────────────────────────────

/**
 * Calculate tax for multiple line items.
 *
 * @param items - Array of { amount, category } objects
 * @returns Array of TaxResult objects
 */
export function calculateBatchTax(
    items: Array<{ amount: number; category: TaxCategory; description?: string }>
): TaxResult[] {
    return items.map((item) => calculateTax(item.amount, item.category));
}

/**
 * Build a complete tax breakdown from a list of line items.
 *
 * @param items - Array of { amount, category } objects
 * @returns Aggregated tax breakdown
 */
export function buildTaxBreakdown(
    items: Array<{ amount: number; category: TaxCategory }>
): TaxBreakdown {
    let exemptTotal = 0;
    let standardTaxableTotal = 0;
    let premiumTaxableTotal = 0;
    let totalVat = 0;

    for (const item of items) {
        const result = calculateTax(item.amount, item.category);
        if (item.category === TaxCategory.EXEMPT) {
            exemptTotal += result.baseAmount;
        } else if (item.category === TaxCategory.STANDARD) {
            standardTaxableTotal += result.baseAmount;
            totalVat += result.taxAmount;
        } else if (item.category === TaxCategory.PREMIUM) {
            premiumTaxableTotal += result.baseAmount;
            totalVat += result.taxAmount;
        }
    }

    const grandTotal = exemptTotal + standardTaxableTotal + premiumTaxableTotal + totalVat;

    return {
        exemptTotal: roundTax(exemptTotal),
        standardTaxableTotal: roundTax(standardTaxableTotal),
        premiumTaxableTotal: roundTax(premiumTaxableTotal),
        totalVat: roundTax(totalVat),
        totalWithholding: 0, // Filled separately if needed
        grandTotal: roundTax(grandTotal),
        transactionCount: items.length,
    };
}

// ─── Tax Report Generation ──────────────────────────────────────

/**
 * Generate a comprehensive tax report for a date range.
 * Queries the database for transactions within the period and
 * produces a breakdown by tax category.
 *
 * @param startDate - Report period start
 * @param endDate - Report period end
 * @returns Tax report with line items and summary
 */
export async function generateTaxReport(startDate: Date, endDate: Date): Promise<TaxReport> {
    // Validate dates
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid start date', 'INVALID_INPUT');
    }
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid end date', 'INVALID_INPUT');
    }
    if (startDate > endDate) {
        throw new ValidationError('Start date must be before end date', 'INVALID_INPUT');
    }

    log.info({ startDate, endDate }, 'Generating tax report');

    try {
        // Query transactions within the date range
        const result = await db.query(
            `
            SELECT
                t.id,
                t.description,
                t.amount as base_amount,
                t.tax_amount,
                t.total_amount,
                t.tax_category,
                t.created_at
            FROM transactions t
            WHERE t.created_at >= $1
              AND t.created_at <= $2
              AND t.status = 'completed'
            ORDER BY t.created_at ASC
            `,
            [startDate.toISOString(), endDate.toISOString()]
        );

        const lineItems: TaxLineItem[] = result.rows.map((row) => {
            const category = (row.tax_category as TaxCategory) || TaxCategory.STANDARD;
            return {
                id: String(row.id),
                description: row.description || 'Transaction',
                category,
                baseAmount: parseFloat(row.base_amount) || 0,
                taxAmount: parseFloat(row.tax_amount) || 0,
                totalAmount: parseFloat(row.total_amount) || 0,
                rate: category as unknown as number,
                createdAt: new Date(row.created_at),
            };
        });

        // Calculate summary
        let exemptTotal = 0;
        let standardTaxableTotal = 0;
        let premiumTaxableTotal = 0;
        let totalVat = 0;

        for (const item of lineItems) {
            if (item.category === TaxCategory.EXEMPT) {
                exemptTotal += item.baseAmount;
            } else if (item.category === TaxCategory.STANDARD) {
                standardTaxableTotal += item.baseAmount;
                totalVat += item.taxAmount;
            } else if (item.category === TaxCategory.PREMIUM) {
                premiumTaxableTotal += item.baseAmount;
                totalVat += item.taxAmount;
            }
        }

        const grandTotal = exemptTotal + standardTaxableTotal + premiumTaxableTotal + totalVat;

        const report: TaxReport = {
            period: { startDate, endDate },
            summary: {
                exemptTotal: roundTax(exemptTotal),
                standardTaxableTotal: roundTax(standardTaxableTotal),
                premiumTaxableTotal: roundTax(premiumTaxableTotal),
                totalVat: roundTax(totalVat),
                totalWithholding: 0,
                grandTotal: roundTax(grandTotal),
                transactionCount: lineItems.length,
            },
            lineItems,
            generatedAt: new Date(),
            taxRegistrationNumber: TAX_REGISTRATION_NUMBER,
            currency: 'EGP',
        };

        log.info(
            {
                transactionCount: lineItems.length,
                totalVat: report.summary.totalVat,
                grandTotal: report.summary.grandTotal,
            },
            'Tax report generated successfully'
        );

        return report;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        log.error({ error: (error as Error).message }, 'Tax report generation failed');
        throw new ServerError('Failed to generate tax report', 'TAX_CALCULATION_ERROR');
    }
}

// ─── Utility Functions ──────────────────────────────────────────

/**
 * Round a tax amount to 2 decimal places (EGP standard).
 */
function roundTax(amount: number): number {
    return Number(amount.toFixed(2));
}

/**
 * Get the tax category for a product type.
 *
 * @param productType - Product type string
 * @returns TaxCategory
 */
export function getTaxCategory(productType: string): TaxCategory {
    return TAX_CATEGORY_MAP[productType] || TaxCategory.STANDARD;
}

/**
 * Register a custom tax category mapping.
 *
 * @param productType - Product type key
 * @param category - Tax category to assign
 */
export function registerTaxCategory(productType: string, category: TaxCategory): void {
    TAX_CATEGORY_MAP[productType] = category;
    log.info({ productType, category }, 'Registered custom tax category mapping');
}

/**
 * Check if a product type is tax-exempt.
 *
 * @param productType - Product type string
 * @returns true if exempt
 */
export function isTaxExempt(productType: string): boolean {
    return getTaxCategory(productType) === TaxCategory.EXEMPT;
}

/**
 * Get a summary of all tax category mappings.
 */
export function getTaxCategoryMappings(): Record<string, { category: TaxCategory; label: string }> {
    const result: Record<string, { category: TaxCategory; label: string }> = {};
    for (const [type, category] of Object.entries(TAX_CATEGORY_MAP)) {
        result[type] = {
            category,
            label: TAX_CATEGORY_LABELS[category]?.en || 'Unknown',
        };
    }
    return result;
}
