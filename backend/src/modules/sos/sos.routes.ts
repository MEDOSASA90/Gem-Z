/**
 * GEM Z — Emergency SOS Routes
 *
 * Routes:
 *   POST   /api/v1/sos/alert          — Send SOS alert
 *   GET    /api/v1/sos/contacts       — List emergency contacts
 *   POST   /api/v1/sos/contacts       — Add emergency contact
 *   PUT    /api/v1/sos/contacts/:id   — Update emergency contact
 *   DELETE /api/v1/sos/contacts/:id   — Delete emergency contact
 *   POST   /api/v1/sos/resolve        — Resolve active alert
 *   GET    /api/v1/sos/active         — Get active alert
 *   GET    /api/v1/sos/history        — Alert history
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { SOSController } from './sos.controller';

const router = express.Router();

const VALID_RELATIONSHIPS = [
    'family', 'friend', 'partner', 'trainer', 'doctor',
    'colleague', 'other',
];

// ─── SOS Alert ──────────────────────────────────────────────────

router.post('/alert', authenticate as any, validateBody([
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
    body('accuracyMeters').optional().isFloat({ min: 0 }),
    body('message').optional().trim().isLength({ max: 500 }),
    body('gymId').optional().trim().isUUID(),
]), SOSController.sendAlert as any);

router.post('/resolve', authenticate as any, validateBody([
    body('alertId').trim().notEmpty().isUUID().withMessage('Valid alertId is required'),
    body('notes').optional().trim().isLength({ max: 1000 }),
]), SOSController.resolveAlert as any);

router.get('/active', authenticate as any, SOSController.getActiveAlert as any);
router.get('/history', authenticate as any, validateQuery([
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), SOSController.getAlertHistory as any);

// ─── Emergency Contacts ─────────────────────────────────────────

router.get('/contacts', authenticate as any, SOSController.listContacts as any);

router.post('/contacts', authenticate as any, validateBody([
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('name is required, max 100 chars'),
    body('phone').trim().notEmpty().withMessage('phone is required'),
    body('email').optional().trim().isEmail(),
    body('relationship').optional().trim().isIn(VALID_RELATIONSHIPS),
    body('priority').optional().isInt({ min: 1, max: 5 }).toInt(),
    body('notifyViaSms').optional().isBoolean(),
    body('notifyViaPush').optional().isBoolean(),
    body('notifyViaEmail').optional().isBoolean(),
]), SOSController.addContact as any);

router.put('/contacts/:id', authenticate as any, validateBody([
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('phone').trim().notEmpty(),
    body('email').optional().trim().isEmail(),
    body('relationship').optional().trim().isIn(VALID_RELATIONSHIPS),
    body('priority').optional().isInt({ min: 1, max: 5 }).toInt(),
    body('notifyViaSms').optional().isBoolean(),
    body('notifyViaPush').optional().isBoolean(),
    body('notifyViaEmail').optional().isBoolean(),
]), SOSController.updateContact as any);

router.delete('/contacts/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().isUUID().withMessage('Valid contact ID is required'),
]), SOSController.deleteContact as any);

export default router;
