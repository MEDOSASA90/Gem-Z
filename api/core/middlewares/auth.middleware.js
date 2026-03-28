"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';
/**
 * Middleware: Verify incoming JWT Access Token
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user payload to request
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Access denied: Invalid or expired token' });
    }
};
exports.verifyToken = verifyToken;
/**
 * Middleware Factory: Role-Based Access Control
 * e.g. router.get('/trainer/stats', verifyToken, requireRole(['trainer', 'super_admin']), ... )
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
