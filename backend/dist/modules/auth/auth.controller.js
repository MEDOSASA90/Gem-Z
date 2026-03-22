"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev_refresh_gem_z_super_secure';
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: zod_1.z.string().min(2),
    role: zod_1.z.enum(['trainee', 'trainer', 'gym_admin', 'store_admin']).default('trainee'),
    phone: zod_1.z.string().optional()
});
class AuthController {
    static async register(req, res) {
        try {
            const validatedData = registerSchema.parse(req.body);
            const { email, password, fullName, role, phone } = validatedData;
            // MOCK RESPONSE
            const newUser = { id: 'mock-uuid-register', email, role, full_name: fullName };
            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: newUser
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ success: false, errors: error.errors });
            }
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            // MOCK USER
            const user = { id: 'mock-user-1234', role: 'trainee', email };
            const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            return res.status(200).json({
                success: true,
                accessToken,
                user: { id: user.id, role: user.role }
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
exports.AuthController = AuthController;
