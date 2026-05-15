/**
 * GEM Z — PDF Invoice Generation Service
 *
 * Professional PDF invoices with Gem Z branding:
 *   - Invoice number, date, billing details
 *   - Itemized list with subtotal, tax, total
 *   - QR code for verification
 *   - Save to local storage (S3-ready)
 *   - Email invoice to customer
 *   - Subscription, store order, and trainer session invoices
 *
 * Uses PDFKit for server-side PDF generation.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger } from '../../core/logging/logger';
import { config } from '../../config';
import {
    NotFoundError,
    ValidationError,
    ServerError,
} from '../../core/errors';
import { calculateTax, TaxCategory } from '../wallet/tax.service';
import { formatCurrency, Currency } from '../../core/utils/currency';
import { sendInvoiceEmail } from '../../services/email.service';

const log = createLogger('invoice');

// ─── Types ──────────────────────────────────────────────────────

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxCategory: TaxCategory;
}

export interface InvoiceData {
    invoiceNumber: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    billingAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
    currency: Currency;
    issueDate: Date;
    dueDate: Date;
    notes?: string;
    qrCodeData?: string;
    referenceId?: string; // subscription_id, order_id, or session_id
    referenceType: 'subscription' | 'store_order' | 'trainer_session' | 'other';
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    userId: string;
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
    currency: string;
    status: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled';
    issueDate: Date;
    dueDate: Date;
    referenceId?: string;
    referenceType: string;
    pdfPath?: string;
    emailedAt?: Date | null;
    createdAt: Date;
}

export interface InvoiceFilters {
    userId?: string;
    status?: string;
    referenceType?: string;
    startDate?: Date;
    endDate?: Date;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// ─── Configuration ──────────────────────────────────────────────

const INVOICE_STORAGE_PATH = config.upload.path + '/invoices';
const INVOICE_CACHE_PREFIX = 'gemz:invoice:';

/** Gem Z brand colors */
const BRAND_COLORS = {
    primary: '#ff7b00',
    primaryDark: '#ff4500',
    background: '#0a0a0a',
    surface: '#111111',
    text: '#ffffff',
    textMuted: '#aaaaaa',
    border: '#222222',
    success: '#22c55e',
};

// ─── Invoice Number Generator ───────────────────────────────────

/**
 * Generate a unique invoice number.
 * Format: INV-YYYYMMDD-XXXX (e.g., INV-20260115-0042)
 */
export async function generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    // Use Redis counter for the sequential part
    const key = `gemz:invoice_counter:${dateStr}`;
    const count = await redisClient.incr(key);

    // Set expiry on the counter (auto-cleanup after 2 days)
    await redisClient.expire(key, 172800);

    const sequential = String(count).padStart(4, '0');
    return `INV-${dateStr}-${sequential}`;
}

// ─── Core PDF Generation ────────────────────────────────────────

/**
 * Generate a professional PDF invoice.
 *
 * @param data - Invoice data
 * @returns PDF as Buffer
 */
export async function generateInvoice(data: InvoiceData): Promise<Buffer> {
    validateInvoiceData(data);

    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // ─── Header ───────────────────────────────────────────
            await renderHeader(doc, data);

            // ─── Billing Info ─────────────────────────────────────
            renderBillingInfo(doc, data);

            // ─── Items Table ──────────────────────────────────────
            renderItemsTable(doc, data);

            // ─── Totals ───────────────────────────────────────────
            renderTotals(doc, data);

            // ─── QR Code ──────────────────────────────────────────
            await renderQRCode(doc, data);

            // ─── Footer ───────────────────────────────────────────
            renderFooter(doc, data);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// ─── PDF Rendering Helpers ──────────────────────────────────────

async function renderHeader(doc: PDFKit.PDFDocument, data: InvoiceData): Promise<void> {
    // Gem Z logo area (text-based since we don't have image assets)
    doc.fontSize(24)
        .fillColor(BRAND_COLORS.primary)
        .font('Helvetica-Bold')
        .text('GEM Z', 50, 50);

    doc.fontSize(10)
        .fillColor(BRAND_COLORS.textMuted)
        .font('Helvetica')
        .text('KINETIC REVOLUTION', 50, 75);

    // Invoice title
    doc.fontSize(20)
        .fillColor(BRAND_COLORS.text)
        .font('Helvetica-Bold')
        .text('INVOICE', 400, 50, { align: 'right' });

    // Invoice number and dates
    doc.fontSize(10)
        .fillColor(BRAND_COLORS.textMuted)
        .font('Helvetica')
        .text(`Invoice #: ${data.invoiceNumber}`, 400, 75, { align: 'right' })
        .text(`Issue Date: ${formatDate(data.issueDate)}`, 400, 90, { align: 'right' })
        .text(`Due Date: ${formatDate(data.dueDate)}`, 400, 105, { align: 'right' });

    // Divider line
    doc.strokeColor(BRAND_COLORS.primary)
        .lineWidth(2)
        .moveTo(50, 130)
        .lineTo(545, 130)
        .stroke();

    doc.y = 145;
}

function renderBillingInfo(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    doc.fontSize(11)
        .fillColor(BRAND_COLORS.text)
        .font('Helvetica-Bold')
        .text('BILL TO:', 50, doc.y);

    doc.fontSize(10)
        .fillColor(BRAND_COLORS.text)
        .font('Helvetica')
        .text(data.userName, 50, doc.y + 5)
        .text(data.userEmail, 50, doc.y + 5);

    if (data.userPhone) {
        doc.text(data.userPhone, 50, doc.y + 5);
    }
    if (data.billingAddress) {
        doc.text(data.billingAddress, 50, doc.y + 5);
    }

    doc.moveDown(2);
}

function renderItemsTable(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const tableTop = doc.y;
    const colWidths = { item: 220, qty: 60, price: 100, total: 100 };
    const rowHeight = 25;

    // Table header
    doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(10);

    doc.rect(50, tableTop, 495, rowHeight)
        .fill(BRAND_COLORS.primary);

    doc.fillColor('#ffffff')
        .text('Item', 60, tableTop + 8)
        .text('Qty', 60 + colWidths.item, tableTop + 8, { width: colWidths.qty, align: 'center' })
        .text('Unit Price', 60 + colWidths.item + colWidths.qty, tableTop + 8, { width: colWidths.price, align: 'right' })
        .text('Total', 60 + colWidths.item + colWidths.qty + colWidths.price, tableTop + 8, { width: colWidths.total, align: 'right' });

    // Table rows
    let rowY = tableTop + rowHeight;
    let isEven = false;

    for (const item of data.items) {
        const bgColor = isEven ? BRAND_COLORS.surface : BRAND_COLORS.background;

        doc.rect(50, rowY, 495, rowHeight)
            .fill(bgColor);

        doc.fillColor(BRAND_COLORS.text)
            .font('Helvetica')
            .fontSize(9)
            .text(item.description, 60, rowY + 8, { width: colWidths.item - 10 })
            .text(String(item.quantity), 60 + colWidths.item, rowY + 8, { width: colWidths.qty, align: 'center' })
            .text(formatEGP(item.unitPrice), 60 + colWidths.item + colWidths.qty, rowY + 8, { width: colWidths.price, align: 'right' })
            .text(formatEGP(item.totalPrice), 60 + colWidths.item + colWidths.qty + colWidths.price, rowY + 8, { width: colWidths.total, align: 'right' });

        rowY += rowHeight;
        isEven = !isEven;
    }

    // Table border
    doc.strokeColor(BRAND_COLORS.border)
        .lineWidth(0.5)
        .rect(50, tableTop, 495, rowY - tableTop)
        .stroke();

    doc.y = rowY + 10;
}

function renderTotals(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const totalsX = 350;
    const labelWidth = 100;
    const valueWidth = 100;
    let currentY = doc.y;

    doc.fontSize(10)
        .fillColor(BRAND_COLORS.textMuted)
        .font('Helvetica');

    // Subtotal
    doc.text('Subtotal:', totalsX, currentY, { width: labelWidth, align: 'right' })
        .fillColor(BRAND_COLORS.text)
        .text(formatEGP(data.subtotal), totalsX + labelWidth, currentY, { width: valueWidth, align: 'right' });

    // Tax
    currentY += 20;
    doc.fillColor(BRAND_COLORS.textMuted)
        .text('Tax (14% VAT):', totalsX, currentY, { width: labelWidth, align: 'right' })
        .fillColor(BRAND_COLORS.text)
        .text(formatEGP(data.taxAmount), totalsX + labelWidth, currentY, { width: valueWidth, align: 'right' });

    // Divider
    currentY += 25;
    doc.strokeColor(BRAND_COLORS.border)
        .lineWidth(0.5)
        .moveTo(totalsX, currentY)
        .lineTo(totalsX + labelWidth + valueWidth, currentY)
        .stroke();

    // Total
    currentY += 10;
    doc.fontSize(14)
        .fillColor(BRAND_COLORS.primary)
        .font('Helvetica-Bold')
        .text('TOTAL:', totalsX, currentY, { width: labelWidth, align: 'right' })
        .text(formatEGP(data.total), totalsX + labelWidth, currentY, { width: valueWidth, align: 'right' });

    doc.y = currentY + 40;
}

async function renderQRCode(doc: PDFKit.PDFDocument, data: InvoiceData): Promise<void> {
    try {
        const qrData = data.qrCodeData || JSON.stringify({
            invoice: data.invoiceNumber,
            total: data.total,
            date: data.issueDate.toISOString(),
        });

        const qrBuffer = await QRCode.toBuffer(qrData, {
            width: 100,
            margin: 1,
            color: {
                dark: '#ff7b00',
                light: '#0a0a0a',
            },
        });

        doc.image(qrBuffer, 50, doc.y, { width: 80, height: 80 });

        doc.fontSize(8)
            .fillColor(BRAND_COLORS.textMuted)
            .font('Helvetica')
            .text('Scan to verify invoice', 50, doc.y + 85);

        doc.moveDown(3);
    } catch (error) {
        log.warn({ error: (error as Error).message }, 'QR code generation failed');
        // QR code is optional, continue without it
    }
}

function renderFooter(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const footerY = 720;

    doc.strokeColor(BRAND_COLORS.border)
        .lineWidth(0.5)
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .stroke();

    doc.fontSize(8)
        .fillColor(BRAND_COLORS.textMuted)
        .font('Helvetica');

    doc.text('Gem Z Fitness Ecosystem', 50, footerY + 10)
        .text(config.apiUrl, 50, footerY + 22);

    if (data.notes) {
        doc.fillColor(BRAND_COLORS.textMuted)
            .text(`Notes: ${data.notes}`, 50, footerY + 40, { width: 495 });
    }

    // Page number
    doc.fillColor(BRAND_COLORS.textMuted)
        .text(
            `Page 1 of 1`,
            450,
            footerY + 10,
            { align: 'right' }
        );
}

// ─── Specialized Invoice Generators ─────────────────────────────

/**
 * Generate an invoice for a subscription renewal/payment.
 *
 * @param subscription - Subscription data from the database
 * @returns Path to the saved PDF invoice
 */
export async function generateSubscriptionInvoice(subscription: {
    id: string;
    userId: string;
    planName: string;
    price: number;
    periodDays: number;
    startDate: Date;
    endDate: Date;
    userName: string;
    userEmail: string;
}): Promise<string> {
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate tax
    const taxResult = calculateTax(subscription.price, TaxCategory.STANDARD);

    const invoiceData: InvoiceData = {
        invoiceNumber,
        userId: subscription.userId,
        userName: subscription.userName,
        userEmail: subscription.userEmail,
        items: [{
            id: subscription.id,
            description: `Subscription: ${subscription.planName} (${subscription.periodDays} days)`,
            quantity: 1,
            unitPrice: subscription.price,
            totalPrice: subscription.price,
            taxCategory: TaxCategory.STANDARD,
        }],
        subtotal: taxResult.baseAmount,
        taxAmount: taxResult.taxAmount,
        total: taxResult.totalAmount,
        currency: Currency.EGP,
        issueDate: new Date(),
        dueDate: subscription.endDate,
        referenceId: subscription.id,
        referenceType: 'subscription',
        notes: `Subscription period: ${formatDate(subscription.startDate)} - ${formatDate(subscription.endDate)}`,
    };

    const pdfBuffer = await generateInvoice(invoiceData);
    return await saveInvoice(invoiceData, pdfBuffer);
}

/**
 * Generate an invoice for a store order.
 *
 * @param order - Order data from the database
 * @returns Path to the saved PDF invoice
 */
export async function generateStoreInvoice(order: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    items: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
    subtotal: number;
    orderDate: Date;
}): Promise<string> {
    const invoiceNumber = await generateInvoiceNumber();

    const taxResult = calculateTax(order.subtotal, TaxCategory.STANDARD);

    const invoiceData: InvoiceData = {
        invoiceNumber,
        userId: order.userId,
        userName: order.userName,
        userEmail: order.userEmail,
        items: order.items.map((item, i) => ({
            id: `${order.id}-${i}`,
            description: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            taxCategory: TaxCategory.STANDARD,
        })),
        subtotal: taxResult.baseAmount,
        taxAmount: taxResult.taxAmount,
        total: taxResult.totalAmount,
        currency: Currency.EGP,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        referenceId: order.id,
        referenceType: 'store_order',
    };

    const pdfBuffer = await generateInvoice(invoiceData);
    return await saveInvoice(invoiceData, pdfBuffer);
}

/**
 * Generate an invoice for a trainer session.
 *
 * @param session - Session data from the database
 * @returns Path to the saved PDF invoice
 */
export async function generateTrainerInvoice(session: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    trainerName: string;
    sessionType: string;
    sessionDate: Date;
    amount: number;
    durationMinutes: number;
}): Promise<string> {
    const invoiceNumber = await generateInvoiceNumber();

    const taxResult = calculateTax(session.amount, TaxCategory.STANDARD);

    const invoiceData: InvoiceData = {
        invoiceNumber,
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        items: [{
            id: session.id,
            description: `Training Session: ${session.sessionType} with ${session.trainerName} (${session.durationMinutes} min)`,
            quantity: 1,
            unitPrice: session.amount,
            totalPrice: session.amount,
            taxCategory: TaxCategory.STANDARD,
        }],
        subtotal: taxResult.baseAmount,
        taxAmount: taxResult.taxAmount,
        total: taxResult.totalAmount,
        currency: Currency.EGP,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        referenceId: session.id,
        referenceType: 'trainer_session',
        notes: `Session date: ${formatDateTime(session.sessionDate)}`,
    };

    const pdfBuffer = await generateInvoice(invoiceData);
    return await saveInvoice(invoiceData, pdfBuffer);
}

// ─── Persistence ────────────────────────────────────────────────

/**
 * Save an invoice to the database and local storage.
 *
 * @param data - Invoice data
 * @param pdfBuffer - Generated PDF buffer
 * @returns Path to the saved PDF file
 */
async function saveInvoice(data: InvoiceData, pdfBuffer: Buffer): Promise<string> {
    // Ensure storage directory exists
    try {
        await fs.mkdir(INVOICE_STORAGE_PATH, { recursive: true });
    } catch {
        // Directory already exists
    }

    // Save PDF to disk
    const filename = `${data.invoiceNumber}.pdf`;
    const filePath = path.join(INVOICE_STORAGE_PATH, filename);
    await fs.writeFile(filePath, pdfBuffer);

    // Save to database
    await db.query(
        `
        INSERT INTO invoices (
            invoice_number, user_id, items_json, subtotal, tax_amount, total,
            currency, status, issue_date, due_date, reference_id, reference_type,
            pdf_path, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (invoice_number) DO UPDATE SET
            items_json = $3,
            subtotal = $4,
            tax_amount = $5,
            total = $6,
            updated_at = NOW()
        `,
        [
            data.invoiceNumber,
            data.userId,
            JSON.stringify(data.items),
            data.subtotal,
            data.taxAmount,
            data.total,
            data.currency,
            'issued',
            data.issueDate.toISOString(),
            data.dueDate.toISOString(),
            data.referenceId || null,
            data.referenceType,
            filePath,
        ]
    );

    log.info(
        { invoiceNumber: data.invoiceNumber, userId: data.userId, path: filePath },
        'Invoice saved successfully'
    );

    return filePath;
}

/**
 * Get an invoice by ID.
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
    // Try cache first
    try {
        const cached = await redisClient.get(`${INVOICE_CACHE_PREFIX}${invoiceId}`);
        if (cached) {
            return JSON.parse(cached) as Invoice;
        }
    } catch {
        // Cache miss, fetch from DB
    }

    const result = await db.query(
        `
        SELECT
            id, invoice_number as "invoiceNumber", user_id as "userId",
            items_json as "items", subtotal, tax_amount as "taxAmount",
            total, currency, status, issue_date as "issueDate",
            due_date as "dueDate", reference_id as "referenceId",
            reference_type as "referenceType", pdf_path as "pdfPath",
            emailed_at as "emailedAt", created_at as "createdAt"
        FROM invoices
        WHERE id = $1
        `,
        [invoiceId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    const invoice: Invoice = {
        id: String(row.id),
        invoiceNumber: row.invoiceNumber,
        userId: String(row.userId),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [],
        subtotal: parseFloat(row.subtotal) || 0,
        taxAmount: parseFloat(row.taxAmount) || 0,
        total: parseFloat(row.total) || 0,
        currency: row.currency || 'EGP',
        status: row.status || 'draft',
        issueDate: new Date(row.issueDate),
        dueDate: new Date(row.dueDate),
        referenceId: row.referenceId || undefined,
        referenceType: row.referenceType || 'other',
        pdfPath: row.pdfPath || undefined,
        emailedAt: row.emailedAt ? new Date(row.emailedAt) : null,
        createdAt: new Date(row.createdAt),
    };

    // Cache for 5 minutes
    try {
        await redisClient.setex(`${INVOICE_CACHE_PREFIX}${invoiceId}`, 300, JSON.stringify(invoice));
    } catch {
        // Cache failure is non-fatal
    }

    return invoice;
}

/**
 * Get an invoice by invoice number.
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    const result = await db.query(
        `
        SELECT
            id, invoice_number as "invoiceNumber", user_id as "userId",
            items_json as "items", subtotal, tax_amount as "taxAmount",
            total, currency, status, issue_date as "issueDate",
            due_date as "dueDate", reference_id as "referenceId",
            reference_type as "referenceType", pdf_path as "pdfPath",
            emailed_at as "emailedAt", created_at as "createdAt"
        FROM invoices
        WHERE invoice_number = $1
        `,
        [invoiceNumber]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: String(row.id),
        invoiceNumber: row.invoiceNumber,
        userId: String(row.userId),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [],
        subtotal: parseFloat(row.subtotal) || 0,
        taxAmount: parseFloat(row.taxAmount) || 0,
        total: parseFloat(row.total) || 0,
        currency: row.currency || 'EGP',
        status: row.status || 'draft',
        issueDate: new Date(row.issueDate),
        dueDate: new Date(row.dueDate),
        referenceId: row.referenceId || undefined,
        referenceType: row.referenceType || 'other',
        pdfPath: row.pdfPath || undefined,
        emailedAt: row.emailedAt ? new Date(row.emailedAt) : null,
        createdAt: new Date(row.createdAt),
    };
}

// ─── Invoice History ────────────────────────────────────────────

/**
 * Get invoice history for a user with pagination.
 *
 * @param userId - User ID
 * @param pagination - Pagination options
 * @returns Paginated list of invoices
 */
export async function getInvoiceHistory(
    userId: string,
    pagination: PaginationOptions = {}
): Promise<PaginatedResult<Invoice>> {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
    const offset = (page - 1) * limit;
    const orderBy = /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(pagination.orderBy || '')
        ? pagination.orderBy
        : 'created_at';
    const order = pagination.order === 'asc' ? 'ASC' : 'DESC';

    const [countResult, rowsResult] = await Promise.all([
        db.query('SELECT COUNT(*) FROM invoices WHERE user_id = $1', [userId]),
        db.query(
            `
            SELECT
                id, invoice_number as "invoiceNumber", user_id as "userId",
                items_json as "items", subtotal, tax_amount as "taxAmount",
                total, currency, status, issue_date as "issueDate",
                due_date as "dueDate", reference_id as "referenceId",
                reference_type as "referenceType", pdf_path as "pdfPath",
                emailed_at as "emailedAt", created_at as "createdAt"
            FROM invoices
            WHERE user_id = $1
            ORDER BY ${orderBy} ${order}
            LIMIT $2 OFFSET $3
            `,
            [userId, limit, offset]
        ),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    const invoices: Invoice[] = rowsResult.rows.map((row) => ({
        id: String(row.id),
        invoiceNumber: row.invoiceNumber,
        userId: String(row.userId),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [],
        subtotal: parseFloat(row.subtotal) || 0,
        taxAmount: parseFloat(row.taxAmount) || 0,
        total: parseFloat(row.total) || 0,
        currency: row.currency || 'EGP',
        status: row.status || 'draft',
        issueDate: new Date(row.issueDate),
        dueDate: new Date(row.dueDate),
        referenceId: row.referenceId || undefined,
        referenceType: row.referenceType || 'other',
        pdfPath: row.pdfPath || undefined,
        emailedAt: row.emailedAt ? new Date(row.emailedAt) : null,
        createdAt: new Date(row.createdAt),
    }));

    return {
        data: invoices,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
}

/**
 * Get all invoices (admin view) with optional filters and pagination.
 */
export async function getAllInvoices(
    filters: InvoiceFilters = {},
    pagination: PaginationOptions = {}
): Promise<PaginatedResult<Invoice>> {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
    const offset = (page - 1) * limit;
    const orderBy = /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(pagination.orderBy || '')
        ? pagination.orderBy
        : 'created_at';
    const order = pagination.order === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | Date)[] = [];
    let paramIdx = 1;

    if (filters.userId) {
        conditions.push(`user_id = $${paramIdx++}`);
        params.push(filters.userId);
    }
    if (filters.status) {
        conditions.push(`status = $${paramIdx++}`);
        params.push(filters.status);
    }
    if (filters.referenceType) {
        conditions.push(`reference_type = $${paramIdx++}`);
        params.push(filters.referenceType);
    }
    if (filters.startDate) {
        conditions.push(`issue_date >= $${paramIdx++}`);
        params.push(filters.startDate.toISOString());
    }
    if (filters.endDate) {
        conditions.push(`issue_date <= $${paramIdx++}`);
        params.push(filters.endDate.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, rowsResult] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM invoices ${whereClause}`, params),
        db.query(
            `
            SELECT
                id, invoice_number as "invoiceNumber", user_id as "userId",
                items_json as "items", subtotal, tax_amount as "taxAmount",
                total, currency, status, issue_date as "issueDate",
                due_date as "dueDate", reference_id as "referenceId",
                reference_type as "referenceType", pdf_path as "pdfPath",
                emailed_at as "emailedAt", created_at as "createdAt"
            FROM invoices
            ${whereClause}
            ORDER BY ${orderBy} ${order}
            LIMIT $${paramIdx++} OFFSET $${paramIdx++}
            `,
            [...params, limit, offset]
        ),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    const invoices: Invoice[] = rowsResult.rows.map((row) => ({
        id: String(row.id),
        invoiceNumber: row.invoiceNumber,
        userId: String(row.userId),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [],
        subtotal: parseFloat(row.subtotal) || 0,
        taxAmount: parseFloat(row.taxAmount) || 0,
        total: parseFloat(row.total) || 0,
        currency: row.currency || 'EGP',
        status: row.status || 'draft',
        issueDate: new Date(row.issueDate),
        dueDate: new Date(row.dueDate),
        referenceId: row.referenceId || undefined,
        referenceType: row.referenceType || 'other',
        pdfPath: row.pdfPath || undefined,
        emailedAt: row.emailedAt ? new Date(row.emailedAt) : null,
        createdAt: new Date(row.createdAt),
    }));

    return {
        data: invoices,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
}

// ─── Email Invoice ──────────────────────────────────────────────

/**
 * Email an invoice PDF to the customer.
 *
 * @param invoiceId - Invoice ID
 * @param email - Target email address (optional, defaults to user's email)
 */
export async function emailInvoice(invoiceId: string, email?: string): Promise<void> {
    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
        throw new NotFoundError('Invoice not found');
    }

    const targetEmail = email || await getUserEmail(invoice.userId);
    if (!targetEmail) {
        throw new ValidationError('No email address found for invoice recipient');
    }

    const pdfPath = invoice.pdfPath;
    if (!pdfPath) {
        throw new ServerError('Invoice PDF not found');
    }

    try {
        const pdfBuffer = await fs.readFile(pdfPath);

        await sendInvoiceEmail({
            to: targetEmail,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            currency: invoice.currency,
            issueDate: invoice.issueDate,
            pdfBuffer,
        });

        // Update emailed_at timestamp
        await db.query(
            'UPDATE invoices SET emailed_at = NOW(), status = $2 WHERE id = $1',
            [invoiceId, 'sent']
        );

        // Invalidate cache
        try {
            await redisClient.del(`${INVOICE_CACHE_PREFIX}${invoiceId}`);
        } catch {
            // Non-fatal
        }

        log.info(
            { invoiceId, email: targetEmail, invoiceNumber: invoice.invoiceNumber },
            'Invoice emailed successfully'
        );
    } catch (error) {
        log.error(
            { error: (error as Error).message, invoiceId },
            'Failed to email invoice'
        );
        throw new ServerError('Failed to email invoice', 'INVOICE_EMAIL_FAILED');
    }
}

/**
 * Get a user's email from the database.
 */
async function getUserEmail(userId: string): Promise<string | null> {
    const result = await db.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0]?.email || null;
}

// ─── Utility Functions ──────────────────────────────────────────

function validateInvoiceData(data: InvoiceData): void {
    if (!data.invoiceNumber) {
        throw new ValidationError('Invoice number is required');
    }
    if (!data.userId) {
        throw new ValidationError('User ID is required');
    }
    if (!data.items || data.items.length === 0) {
        throw new ValidationError('Invoice must contain at least one item');
    }
    if (data.subtotal < 0 || data.taxAmount < 0 || data.total < 0) {
        throw new ValidationError('Amounts cannot be negative');
    }
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatEGP(amount: number): string {
    return `E£ ${amount.toFixed(2)}`;
}

/**
 * Get the invoice PDF buffer by ID.
 */
export async function getInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
        throw new NotFoundError('Invoice not found');
    }

    if (!invoice.pdfPath) {
        throw new ServerError('Invoice PDF not generated');
    }

    try {
        return await fs.readFile(invoice.pdfPath);
    } catch (error) {
        log.error({ error: (error as Error).message, invoiceId }, 'Failed to read invoice PDF');
        throw new ServerError('Invoice PDF not found on disk');
    }
}

/**
 * Delete an invoice (soft delete — marks as cancelled).
 */
export async function cancelInvoice(invoiceId: string): Promise<void> {
    const result = await db.query(
        "UPDATE invoices SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id",
        [invoiceId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Invoice not found');
    }

    // Invalidate cache
    try {
        await redisClient.del(`${INVOICE_CACHE_PREFIX}${invoiceId}`);
    } catch {
        // Non-fatal
    }

    log.info({ invoiceId }, 'Invoice cancelled');
}
