import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AccessTokenPayload } from '../../services/token.service';

/**
 * GEM Z — Authentication Middleware
 * 
 * Verifies the Bearer access token from the Authorization header.
 * Attaches decoded user payload to req.user for downstream handlers.
 */

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: No token provided'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: Invalid or expired token'
        });
    }
};
