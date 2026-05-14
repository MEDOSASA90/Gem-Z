import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * GEM Z — Role-Based Access Control (RBAC) Middleware
 * 
 * Usage:
 *   router.get('/admin/stats', authenticate, requireRole(['super_admin']), handler);
 *   router.get('/trainer/clients', authenticate, requireRole(['trainer']), handler);
 * 
 * Must be placed AFTER verifyToken middleware.
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles`
            });
        }

        next();
    };
};
