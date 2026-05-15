/**
 * GEM Z — Gym Routes
 *
 * Routes:
 *   GET  /api/v1/gym/stats              — Gym stats
 *   POST /api/v1/gym/passes/buy         — Buy daily pass
 *   POST /api/v1/gym/passes/scan        — Scan daily pass
 *   POST /api/v1/gym/scan               — Scan gym barcode
 *   POST /api/v1/gym/off-peak           — Set off-peak pricing
 *   POST /api/v1/gym/lockers/unlock     — Unlock smart locker
 *   GET  /api/v1/gym/crowd              — Live crowd tracker
 *   GET  /api/v1/gym/equipment/:qrCode  — Equipment tutorial
 *   GET  /api/v1/gym/branches           — List branches
 *   POST /api/v1/gym/branches           — Add branch
 *   PUT  /api/v1/gym/branches/:id       — Update branch
 *   DELETE /api/v1/gym/branches/:id     — Delete branch
 *   GET  /api/v1/gym/plans              — List subscription plans
 *   POST /api/v1/gym/plans              — Create plan
 *   PUT  /api/v1/gym/plans/:id          — Update plan
 */

import express from 'express';
import { body, param } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, positiveDecimal, positiveInt, requiredString } from '../../core/middlewares/validation.middleware';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import { createLogger } from '../../core/logging/logger';
import * as GymService from './gym.service';

const log = createLogger('gym-routes');
const router = express.Router();

// ─── Gym Stats ──────────────────────────────────────────────────

router.get('/stats', authenticate as any, async (req: any, res: any, next: any) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new ValidationError('User ID required', ErrorCode.AUTH_UNAUTHORIZED);

        const stats = await GymService.getGymStatsByOwner(userId);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
});

// ─── Daily Passes ───────────────────────────────────────────────

router.post('/passes/buy', authenticate as any, validateBody([
    body('gymId').trim().notEmpty().withMessage('gymId is required').isUUID().withMessage('Invalid gym ID'),
    positiveDecimal('price'),
]), async (req: any, res: any, next: any) => {
    try {
        const traineeId = req.user?.userId;
        const { gymId, price } = req.body;
        if (!traineeId) throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);

        const pass = await GymService.buyDailyPass(traineeId, gymId, price);
        res.status(201).json({ success: true, pass, message: 'Pass purchased successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/passes/scan', authenticate as any, validateBody([
    requiredString('qrCode'),
]), async (req: any, res: any, next: any) => {
    try {
        const scannerUserId = req.user?.userId;
        const { qrCode } = req.body;
        if (!scannerUserId) throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);

        const result = await GymService.scanDailyPass(scannerUserId, qrCode);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// ─── Gym Barcode Scan ───────────────────────────────────────────

router.post('/scan', authenticate as any, validateBody([
    requiredString('barcode'),
]), async (req: any, res: any, next: any) => {
    try {
        const scannerUserId = req.user?.userId;
        const { barcode } = req.body;
        if (!scannerUserId) throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);

        const result = await GymService.scanDailyPass(scannerUserId, barcode);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// ─── Off-Peak Pricing ───────────────────────────────────────────

router.post('/off-peak', authenticate as any, validateBody([
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be 0-100'),
]), async (req: any, res: any, next: any) => {
    try {
        const userId = req.user?.userId;
        const { isActive, discountPercentage } = req.body;
        if (!userId) throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);

        const result = await GymService.setOffPeakPricing(userId, isActive, discountPercentage);
        res.status(200).json({ success: true, message: 'Off-peak pricing updated', data: result });
    } catch (error) {
        next(error);
    }
});

// ─── Smart Lockers ──────────────────────────────────────────────

router.post('/lockers/unlock', authenticate as any, validateBody([
    requiredString('lockerId'),
    body('gymId').trim().notEmpty().withMessage('gymId is required').isUUID().withMessage('Invalid gym ID'),
]), async (req: any, res: any, next: any) => {
    try {
        const userId = req.user?.userId;
        const { lockerId, gymId } = req.body;
        if (!userId) throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);

        const result = await GymService.unlockSmartLocker(userId, lockerId, gymId);
        res.status(200).json({ success: true, ...result, message: `Locker ${lockerId} unlocked successfully` });
    } catch (error) {
        next(error);
    }
});

// ─── Live Crowd Tracker ─────────────────────────────────────────

router.get('/crowd', authenticate as any, async (req: any, res: any, next: any) => {
    try {
        const branchId = req.query.branchId as string;
        if (!branchId) throw new ValidationError('branchId query parameter is required', ErrorCode.MISSING_FIELD);

        const data = await GymService.getLiveCrowd(branchId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// ─── Equipment Tutorial ─────────────────────────────────────────

router.get('/equipment/:qrCode', authenticate as any, async (req: any, res: any, next: any) => {
    try {
        const { qrCode } = req.params;
        const tutorial = await GymService.getEquipmentTutorial(qrCode);
        res.status(200).json({ success: true, tutorial });
    } catch (error) {
        next(error);
    }
});

// ─── Branches CRUD ──────────────────────────────────────────────

router.get('/branches', authenticate as any, async (req: any, res: any, next: any) => {
    try {
        const gymId = req.query.gymId as string | undefined;
        const branches = await GymService.listBranches(gymId);
        res.status(200).json({ success: true, branches });
    } catch (error) {
        next(error);
    }
});

router.post('/branches', authenticate as any, validateBody([
    body('gymId').trim().notEmpty().withMessage('gymId is required').isUUID().withMessage('Invalid gym ID'),
    requiredString('name'),
    requiredString('address'),
    body('city').optional().trim().isString(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('phone').optional().trim().isString(),
    body('capacity').optional().isInt({ min: 1 }),
    body('opensAt').optional().trim().isString(),
    body('closesAt').optional().trim().isString(),
    body('amenities').optional().isArray(),
]), async (req: any, res: any, next: any) => {
    try {
        const branch = await GymService.addBranch(req.body);
        res.status(201).json({ success: true, branch });
    } catch (error) {
        next(error);
    }
});

router.put('/branches/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Branch ID is required').isUUID().withMessage('Invalid branch ID'),
]), validateBody([
    body('name').optional().trim().notEmpty().isString(),
    body('address').optional().trim().notEmpty().isString(),
    body('city').optional().trim().isString(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('phone').optional().trim().isString(),
    body('capacity').optional().isInt({ min: 1 }),
    body('opensAt').optional().trim().isString(),
    body('closesAt').optional().trim().isString(),
    body('amenities').optional().isArray(),
    body('isActive').optional().isBoolean(),
]), async (req: any, res: any, next: any) => {
    try {
        const branch = await GymService.updateBranch(req.params.id, req.body);
        res.status(200).json({ success: true, branch });
    } catch (error) {
        next(error);
    }
});

router.delete('/branches/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Branch ID is required').isUUID().withMessage('Invalid branch ID'),
]), async (req: any, res: any, next: any) => {
    try {
        await GymService.deleteBranch(req.params.id);
        res.status(200).json({ success: true, message: 'Branch deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// ─── Subscription Plans ─────────────────────────────────────────

router.get('/plans', authenticate as any, async (req: any, res: any, next: any) => {
    try {
        const gymId = req.query.gymId as string | undefined;
        const plans = await GymService.listPlans(gymId);
        res.status(200).json({ success: true, plans });
    } catch (error) {
        next(error);
    }
});

router.post('/plans', authenticate as any, validateBody([
    body('gymId').trim().notEmpty().withMessage('gymId is required').isUUID().withMessage('Invalid gym ID'),
    body('branchId').optional().isUUID().withMessage('Invalid branch ID'),
    requiredString('name'),
    positiveInt('durationDays'),
    positiveDecimal('basePriceEgp'),
    body('features').optional().isArray(),
    body('maxFreezes').optional().isInt({ min: 0 }),
]), async (req: any, res: any, next: any) => {
    try {
        const plan = await GymService.createPlan(req.body);
        res.status(201).json({ success: true, plan });
    } catch (error) {
        next(error);
    }
});

router.put('/plans/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Plan ID is required').isUUID().withMessage('Invalid plan ID'),
]), validateBody([
    body('name').optional().trim().notEmpty().isString(),
    body('durationDays').optional().isInt({ min: 1 }),
    body('basePriceEgp').optional().isFloat({ min: 0 }),
    body('features').optional().isArray(),
    body('maxFreezes').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
]), async (req: any, res: any, next: any) => {
    try {
        const plan = await GymService.updatePlan(req.params.id, req.body);
        res.status(200).json({ success: true, plan });
    } catch (error) {
        next(error);
    }
});

export default router;
