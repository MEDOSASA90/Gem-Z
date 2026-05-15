/**
 * GEM Z — Emergency SOS Controller
 *
 * Handles HTTP requests for emergency SOS functionality:
 *   - POST /api/v1/sos/alert       — Send SOS with GPS location
 *   - GET  /api/v1/sos/contacts    — List emergency contacts
 *   - POST /api/v1/sos/contacts    — Add/update emergency contact
 *   - PUT  /api/v1/sos/contacts/:id — Update emergency contact
 *   - DELETE /api/v1/sos/contacts/:id — Delete emergency contact
 *   - POST /api/v1/sos/resolve     — Resolve active alert
 *   - GET  /api/v1/sos/active      — Get active alert
 *   - GET  /api/v1/sos/history     — Alert history
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/i18n/errors';
import * as SOSService from './sos.service';

const log = createLogger('sos-controller');

export class SOSController {
    /**
     * POST /api/v1/sos/alert
     * Send SOS alert with GPS location to emergency contacts and nearby gyms.
     */
    static async sendAlert(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { latitude, longitude, accuracyMeters, message, gymId } = req.body;

            if (latitude === undefined || longitude === undefined) {
                throw new ValidationError('latitude and longitude are required', ErrorCode.MISSING_FIELD);
            }

            const alert = await SOSService.sendSOSAlert(
                userId,
                {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    accuracyMeters: accuracyMeters ? parseFloat(accuracyMeters) : undefined,
                    message,
                    gymId,
                },
                req.ip
            );

            res.status(201).json({
                success: true,
                message: 'SOS alert sent to emergency contacts and nearby gyms',
                alert: {
                    id: alert.id,
                    status: alert.status,
                    latitude: alert.latitude,
                    longitude: alert.longitude,
                    accuracyMeters: alert.accuracyMeters,
                    contactsNotified: alert.contactsNotified,
                    gymsNotified: alert.gymsNotified,
                    triggeredAt: alert.triggeredAt,
                    alertMessage: alert.alertMessage,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sos/contacts
     * List emergency contacts for the authenticated user.
     */
    static async listContacts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const contacts = await SOSService.listContacts(userId);

            res.status(200).json({
                success: true,
                data: contacts,
                count: contacts.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/sos/contacts
     * Add a new emergency contact.
     */
    static async addContact(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { name, phone, email, relationship, priority, notifyViaSms, notifyViaPush, notifyViaEmail } = req.body;

            if (!name) {
                throw new ValidationError('name is required', ErrorCode.MISSING_FIELD);
            }
            if (!phone) {
                throw new ValidationError('phone is required', ErrorCode.MISSING_FIELD);
            }

            const contact = await SOSService.saveContact(userId, {
                name,
                phone,
                email,
                relationship,
                priority,
                notifyViaSms,
                notifyViaPush,
                notifyViaEmail,
            });

            res.status(201).json({
                success: true,
                message: 'Emergency contact added',
                contact,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/sos/contacts/:id
     * Update an emergency contact.
     */
    static async updateContact(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const { name, phone, email, relationship, priority, notifyViaSms, notifyViaPush, notifyViaEmail } = req.body;

            const contact = await SOSService.saveContact(
                userId,
                { name, phone, email, relationship, priority, notifyViaSms, notifyViaPush, notifyViaEmail },
                id
            );

            res.status(200).json({
                success: true,
                message: 'Emergency contact updated',
                contact,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/sos/contacts/:id
     * Deactivate an emergency contact.
     */
    static async deleteContact(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;

            await SOSService.deleteContact(id, userId);

            res.status(200).json({
                success: true,
                message: 'Emergency contact removed',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/sos/resolve
     * Resolve the active SOS alert.
     */
    static async resolveAlert(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { alertId, notes } = req.body;

            if (!alertId) {
                throw new ValidationError('alertId is required', ErrorCode.MISSING_FIELD);
            }

            const alert = await SOSService.resolveAlert(alertId, userId, notes);

            res.status(200).json({
                success: true,
                message: 'SOS alert resolved',
                alert: {
                    id: alert.id,
                    status: alert.status,
                    resolvedAt: alert.resolvedAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sos/active
     * Get the active SOS alert for the authenticated user.
     */
    static async getActiveAlert(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const alert = await SOSService.getActiveAlert(userId);

            res.status(200).json({
                success: true,
                data: alert,
                hasActiveAlert: !!alert,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sos/history
     * Get SOS alert history for the authenticated user.
     */
    static async getAlertHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { alerts, total } = await SOSService.getAlertHistory(userId, limit, offset);

            res.status(200).json({
                success: true,
                data: alerts,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }
}
