import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        entityId?: string;
    };
}

/**
 * Middleware: Verify incoming JWT Access Token
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; entityId?: string };
        req.user = decoded; // Attach user payload to request
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Access denied: Invalid or expired token' });
    }
};

/**
 * Middleware Factory: Role-Based Access Control
 * e.g. router.get('/trainer/stats', verifyToken, requireRole(['trainer', 'super_admin']), ... )
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
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
