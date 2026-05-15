/**
 * GEM Z — KYC Routes
 *
 * Routes:
 *   POST /api/v1/user/kyc              — Submit KYC
 *   GET  /api/v1/user/kyc/status       — Check KYC status
 *   POST /api/v1/user/kyc/resubmit     — Resubmit after rejection
 *   GET  /api/v1/admin/kyc             — Admin: list all submissions
 *   GET  /api/v1/admin/kyc/:id         — Admin: get details
 *   PUT  /api/v1/admin/kyc/:id/approve — Admin: approve
 *   PUT  /api/v1/admin/kyc/:id/reject  — Admin: reject with reason
 */

import express from 'express';
import { body, param } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, requiredString } from '../../core/middlewares/validation.middleware';
import { KycController } from './kyc.controller';

const router = express.Router();

// ─── User KYC Routes ────────────────────────────────────────────

router.post('/kyc', authenticate as any, validateBody([
    requiredString('fullName'),
    body('nationalId').optional().trim().isLength({ min: 14, max: 14 }).withMessage('National ID must be 14 digits'),
    body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
    body('address').optional().trim().isString(),
    body('city').optional().trim().isString(),
    body('documents').isArray({ min: 1 }).withMessage('At least one document is required'),
    body('documents.*.type').trim().notEmpty().withMessage('Document type is required')
        .isIn(['national_id_front', 'national_id_back', 'passport', 'driver_license', 'selfie', 'proof_of_address'])
        .withMessage('Invalid document type'),
    body('documents.*.url').trim().notEmpty().withMessage('Document URL is required').isURL().withMessage('Invalid document URL'),
]), KycController.submitKyc as any);

router.get('/kyc/status', authenticate as any, KycController.getKycStatus as any);

router.post('/kyc/resubmit', authenticate as any, validateBody([
    requiredString('fullName'),
    body('nationalId').optional().trim().isLength({ min: 14, max: 14 }).withMessage('National ID must be 14 digits'),
    body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
    body('address').optional().trim().isString(),
    body('city').optional().trim().isString(),
    body('documents').isArray({ min: 1 }).withMessage('At least one document is required'),
    body('documents.*.type').trim().notEmpty().withMessage('Document type is required')
        .isIn(['national_id_front', 'national_id_back', 'passport', 'driver_license', 'selfie', 'proof_of_address']),
    body('documents.*.url').trim().notEmpty().withMessage('Document URL is required').isURL(),
]), KycController.resubmitKyc as any);

// ─── Admin KYC Routes ───────────────────────────────────────────

router.get('/admin/kyc', authenticate as any, KycController.listSubmissions as any);

router.get('/admin/kyc/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Submission ID is required').isUUID().withMessage('Invalid submission ID'),
]), KycController.getSubmission as any);

router.put('/admin/kyc/:id/approve', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Submission ID is required').isUUID(),
]), KycController.approveKyc as any);

router.put('/admin/kyc/:id/reject', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Submission ID is required').isUUID(),
]), validateBody([
    requiredString('reason'),
    body('notes').optional().trim().isString(),
]), KycController.rejectKyc as any);

export default router;
