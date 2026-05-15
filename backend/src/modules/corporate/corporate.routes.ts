/**
 * GEM Z — Corporate Wellness Routes
 *
 * Routes:
 *   POST /api/v1/corporate/register       — Register company
 *   GET  /api/v1/corporate/companies      — List user companies
 *   GET  /api/v1/corporate/dashboard      — HR dashboard
 *   GET  /api/v1/corporate/employees      — List employees
 *   POST /api/v1/corporate/employees      — Add employee
 *   POST /api/v1/corporate/assign-plan    — Assign wellness plan
 *   DELETE /api/v1/corporate/employees/:id — Remove employee
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { CorporateController } from './corporate.controller';
import { ValidationError, ErrorCode } from '../../core/errors';

const router = express.Router();
const auth = authenticate as any;

// ─── Validation Helper ──────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            const fields: Record<string, string> = {};
            errors.array().forEach((err: any) => {
                fields[err.path || err.param] = err.msg;
            });
            return next(new ValidationError('Validation failed', ErrorCode.VALIDATION_ERROR, fields));
        }
        next();
    };
};

// ─── Routes ─────────────────────────────────────────────────────

router.post(
    '/register',
    auth,
    validate([
        body('name').trim().notEmpty().withMessage('Company name is required').isLength({ max: 200 }),
        body('industry').optional().trim().isLength({ max: 100 }),
        body('size').isInt({ min: 1, max: 100000 }).withMessage('Company size must be 1-100000'),
        body('contact_email').isEmail().withMessage('Valid contact email is required'),
        body('contact_phone').optional().trim(),
        body('subscription_plan').optional().isIn(['basic', 'standard', 'premium']),
    ]),
    CorporateController.registerCompany
);

router.get('/companies', auth, CorporateController.getCompanies);

router.get(
    '/dashboard',
    auth,
    CorporateController.getDashboard
);

router.get(
    '/employees',
    auth,
    CorporateController.listEmployees
);

router.post(
    '/employees',
    auth,
    validate([
        body('company_id').isUUID().withMessage('Valid company ID is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('full_name').trim().notEmpty().withMessage('Full name is required'),
        body('department').optional().trim(),
        body('job_title').optional().trim(),
    ]),
    CorporateController.addEmployee
);

router.post(
    '/assign-plan',
    auth,
    validate([
        body('company_id').isUUID().withMessage('Valid company ID is required'),
        body('employee_id').isUUID().withMessage('Valid employee ID is required'),
        body('plan_id').isUUID().withMessage('Valid plan ID is required'),
    ]),
    CorporateController.assignPlan
);

router.delete(
    '/employees/:id',
    auth,
    validate([param('id').isUUID().withMessage('Invalid employee ID')]),
    CorporateController.removeEmployee
);

export default router;
