/**
 * GEM Z — Invoice API Controller
 *
 * REST endpoints for invoice management:
 *   GET  /api/v1/invoices              — List user invoices
 *   GET  /api/v1/invoices/:id          — Get invoice (JSON metadata)
 *   GET  /api/v1/invoices/:id/download — Download PDF
 *   POST /api/v1/invoices/:id/email    — Email invoice
 *   GET  /api/v1/invoices/admin/all   — Admin: all invoices
 */

import { Request, Response } from 'express';
import { createLogger } from '../../core/logging/logger';
import { success, apiError, paginated } from '../../core/utils/api-response';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import {
    getInvoice,
    getInvoiceByNumber,
    getInvoiceHistory,
    getAllInvoices,
    getInvoicePdf,
    emailInvoice,
    cancelInvoice,
    InvoiceFilters,
} from './invoice.service';

const log = createLogger('invoice-controller');

// ─── List User Invoices ─────────────────────────────────────────

/**
 * GET /api/v1/invoices
 * List invoices for the authenticated user.
 */
async function listInvoices(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit, status, startDate, endDate } = req.query;

    const pagination = {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        orderBy: 'created_at',
        order: 'desc' as 'asc' | 'desc',
    };

    const filters: InvoiceFilters = { userId };
    if (status) filters.status = String(status);
    if (startDate) filters.startDate = new Date(String(startDate));
    if (endDate) filters.endDate = new Date(String(endDate));

    try {
        const result = await getInvoiceHistory(userId, pagination);
        res.json(paginated(result.data, result.pagination, 'Invoices retrieved'));
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to list invoices');
        res.status(500).json(apiError('Failed to retrieve invoices', 'SERVER_ERROR', 500));
    }
}

// ─── Get Invoice ────────────────────────────────────────────────

/**
 * GET /api/v1/invoices/:id
 * Get a single invoice by ID or invoice number (JSON metadata).
 */
async function getInvoiceById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const format = req.query.format as string | undefined;

    try {
        // Try to find by ID first, then by invoice number
        let invoice = await getInvoice(id);
        if (!invoice) {
            invoice = await getInvoiceByNumber(id);
        }

        if (!invoice) {
            res.status(404).json(apiError('Invoice not found', 'NOT_FOUND_INVOICE', 404));
            return;
        }

        // Check ownership (admins can view any invoice)
        const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'gym_admin';
        if (invoice.userId !== userId && !isAdmin) {
            res.status(403).json(apiError('You do not have permission to view this invoice', 'FORBIDDEN_RESOURCE_ACCESS', 403));
            return;
        }

        // If format=pdf, return PDF
        if (format === 'pdf') {
            const pdfBuffer = await getInvoicePdf(invoice.id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
            res.send(pdfBuffer);
            return;
        }

        // Return JSON metadata
        res.json(success(invoice));
    } catch (error) {
        log.error({ error: (error as Error).message, id }, 'Failed to get invoice');
        res.status(500).json(apiError('Failed to retrieve invoice', 'SERVER_ERROR', 500));
    }
}

// ─── Download PDF ───────────────────────────────────────────────

/**
 * GET /api/v1/invoices/:id/download
 * Download the invoice PDF.
 */
async function downloadPdf(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
        let invoice = await getInvoice(id);
        if (!invoice) {
            invoice = await getInvoiceByNumber(id);
        }

        if (!invoice) {
            res.status(404).json(apiError('Invoice not found', 'NOT_FOUND_INVOICE', 404));
            return;
        }

        // Check ownership
        const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'gym_admin';
        if (invoice.userId !== userId && !isAdmin) {
            res.status(403).json(apiError('Access denied', 'FORBIDDEN_RESOURCE_ACCESS', 403));
            return;
        }

        const pdfBuffer = await getInvoicePdf(invoice.id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="GEMZ-${invoice.invoiceNumber}.pdf"`
        );
        res.send(pdfBuffer);
    } catch (error) {
        log.error({ error: (error as Error).message, id }, 'Failed to download invoice PDF');
        res.status(500).json(apiError('Failed to download invoice PDF', 'SERVER_ERROR', 500));
    }
}

// ─── Email Invoice ──────────────────────────────────────────────

/**
 * POST /api/v1/invoices/:id/email
 * Email an invoice to a specified address.
 */
async function sendInvoiceByEmail(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { email } = req.body;

    try {
        let invoice = await getInvoice(id);
        if (!invoice) {
            invoice = await getInvoiceByNumber(id);
        }

        if (!invoice) {
            res.status(404).json(apiError('Invoice not found', 'NOT_FOUND_INVOICE', 404));
            return;
        }

        // Check ownership
        const isAdmin = req.user!.role === 'super_admin';
        if (invoice.userId !== userId && !isAdmin) {
            res.status(403).json(apiError('Access denied', 'FORBIDDEN_RESOURCE_ACCESS', 403));
            return;
        }

        await emailInvoice(invoice.id, email);

        log.info(
            { invoiceId: invoice.id, email: email || invoice.userId, requestedBy: userId },
            'Invoice emailed'
        );

        res.json(success(null, 'Invoice emailed successfully'));
    } catch (error) {
        log.error({ error: (error as Error).message, id }, 'Failed to email invoice');
        const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
        res.status(statusCode).json(
            apiError('Failed to email invoice', 'INVOICE_EMAIL_FAILED', statusCode)
        );
    }
}

// ─── Admin: All Invoices ────────────────────────────────────────

/**
 * GET /api/v1/invoices/admin/all
 * Admin endpoint to view all invoices with filtering.
 */
async function listAllInvoices(req: AuthRequest, res: Response): Promise<void> {
    const { page, limit, status, referenceType, userId, startDate, endDate, orderBy, order } = req.query;

    const filters: InvoiceFilters = {};
    if (status) filters.status = String(status);
    if (referenceType) filters.referenceType = String(referenceType);
    if (userId) filters.userId = String(userId);
    if (startDate) filters.startDate = new Date(String(startDate));
    if (endDate) filters.endDate = new Date(String(endDate));

    const pagination = {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        orderBy: orderBy ? String(orderBy) : 'created_at',
        order: order === 'asc' ? 'asc' as const : 'desc' as const,
    };

    try {
        const result = await getAllInvoices(filters, pagination);
        res.json(paginated(result.data, result.pagination, 'All invoices retrieved'));
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to list all invoices');
        res.status(500).json(apiError('Failed to retrieve invoices', 'SERVER_ERROR', 500));
    }
}

// ─── Admin: Cancel Invoice ──────────────────────────────────────

/**
 * PUT /api/v1/invoices/:id/cancel
 * Admin: Cancel an invoice.
 */
async function adminCancelInvoice(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
        await cancelInvoice(id);
        res.json(success(null, 'Invoice cancelled'));
    } catch (error) {
        const message = (error as Error).message;
        if (message.includes('not found')) {
            res.status(404).json(apiError('Invoice not found', 'NOT_FOUND_INVOICE', 404));
            return;
        }
        res.status(500).json(apiError('Failed to cancel invoice', 'SERVER_ERROR', 500));
    }
}

// ─── Controller Export ──────────────────────────────────────────

export const InvoiceController = {
    listInvoices,
    getInvoiceById,
    downloadPdf,
    sendInvoiceByEmail,
    listAllInvoices,
    adminCancelInvoice,
};
