"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const token_service_1 = require("../../services/token.service");
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: No token provided'
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, token_service_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: Invalid or expired token'
        });
    }
};
exports.verifyToken = verifyToken;
