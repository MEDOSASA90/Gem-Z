/**
 * GEM Z — Invoice Routes
 *
 * Routes for invoice management with authentication and role guards.
 *
 * Base: /api/v1/invoices
 *
 * User Endpoints:
 *   GET  /                    — List user's invoices
 *   GET  /:id                 — Get invoice (JSON or PDF via ?format=pdf)
 *   GET  /:id/download        — Download PDF
 *   POST /:id/email           — Email invoice
 *
 * Admin Endpoints:
 *   GET  /admin/all           — List all invoices (with filters)
 *   PUT  /admin/:id/cancel    — Cancel an invoice
 */

import express from 'express';
import { InvoiceController } from './invoice.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { requireRole } from '../../core/middlewares/role.middleware';
import { walletReadLimiter } from '../../core/middlewares/rate-limit.middleware';

const router = express.Router();

// Alias for Express middleware compatibility
const auth = authenticate as any;
const requireAdmin = requireRole(['super_admin']) as any;
const requireAdminOrGym = requireRole(['super_admin', 'gym_admin']) as any;

// ═══════════════════════════════════════════════════════════
// USER INVOICE ENDPOINTS
// ═══════════════════════════════════════════════════════════

// List user's invoices
router.get(
    '/',
    auth,
    walletReadLimiter,
    InvoiceController.listInvoices as any
);

// Get invoice by ID (JSON metadata or PDF via ?format=pdf)
router.get(
    '/:id',
    auth,
    walletReadLimiter,
    InvoiceController.getInvoiceById as any
);

// Download invoice PDF
router.get(
    '/:id/download',
    auth,
    walletReadLimiter,
    InvoiceController.downloadPdf as any
);

// Email invoice
router.post(
    '/:id/email',
    auth,
    walletReadLimiter,
    InvoiceController.sendInvoiceByEmail as any
);

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════

// List all invoices (admin view with filters)
router.get(
    '/admin/all',
    auth,
    requireAdmin,
    walletReadLimiter,
    InvoiceController.listAllInvoices as any
);

// Cancel an invoice
router.put(
    '/admin/:id/cancel',
    auth,
    requireAdmin,
    walletReadLimiter,
    InvoiceController.adminCancelInvoice as any
);

export default router;
