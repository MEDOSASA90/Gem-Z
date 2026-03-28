"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../../core/database/db");
const ai_service_1 = require("../../services/ai.service");
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev_refresh_gem_z_super_secure';
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: zod_1.z.string().min(2),
    role: zod_1.z.enum(['trainee', 'trainer', 'gym_admin', 'store_admin']).default('trainee'),
    phone: zod_1.z.string().optional(),
    countryCode: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    dob: zod_1.z.string().optional(),
    referralCode: zod_1.z.string().optional(),
    fitnessLevel: zod_1.z.string().optional(),
    idFrontBase64: zod_1.z.string().optional(),
    idBackBase64: zod_1.z.string().optional(),
    avatarBase64: zod_1.z.string().optional(),
    logoBase64: zod_1.z.string().optional(),
    gymData: zod_1.z.object({
        name: zod_1.z.string().optional(),
        locationUrl: zod_1.z.string().optional(),
        femaleHours: zod_1.z.string().optional(),
        amenities: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    storeData: zod_1.z.object({
        name: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        website: zod_1.z.string().optional()
    }).optional(),
    trainerData: zod_1.z.object({
        specialization: zod_1.z.string().optional(),
        experience: zod_1.z.coerce.number().optional(),
        certs: zod_1.z.array(zod_1.z.string()).optional(),
        bio: zod_1.z.string().optional(),
        social: zod_1.z.string().optional(),
        rate: zod_1.z.coerce.number().optional()
    }).optional()
});
class AuthController {
    static async register(req, res) {
        let client;
        try {
            const validatedData = registerSchema.parse(req.body);
            const { email, password, fullName, role, phone, countryCode, gender, dob, referralCode, fitnessLevel, idFrontBase64, idBackBase64, avatarBase64, logoBase64, gymData, storeData, trainerData } = validatedData;
            client = await db_1.db.connect();
            // Check if user already exists
            const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            if (checkRes.rows.length > 0) {
                client.release();
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
            // Resolve Referral Code to referring user's ID
            let referredByUserId = null;
            if (referralCode) {
                const refRes = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
                if (refRes.rows.length > 0) {
                    referredByUserId = refRes.rows[0].id;
                }
            }
            // Hash password
            const salt = await bcrypt_1.default.genSalt(10);
            const password_hash = await bcrypt_1.default.hash(password, salt);
            await client.query('BEGIN');
            // 0. Extract ID data if images are provided
            let idParsedData = null;
            if (idFrontBase64 && idBackBase64) {
                idParsedData = await ai_service_1.AIService.extractIdData(idFrontBase64, idBackBase64);
            }
            // 1. Insert User
            const userRes = await client.query(`INSERT INTO users (email, password_hash, full_name, role, phone, country_code, gender, date_of_birth, referred_by_user_id, id_parsed_data, avatar_url) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, email, role, full_name, referral_code`, [email, password_hash, fullName, role, phone || null, countryCode || '+20', gender || null, dob ? new Date(dob) : null, referredByUserId, idParsedData, avatarBase64 || null]);
            const user = userRes.rows[0];
            // 2. Insert specific profile based on role
            if (role === 'trainee') {
                await client.query(`INSERT INTO trainee_profiles (user_id, fitness_level, id_front_url, id_back_url) 
                     VALUES ($1, $2, $3, $4)`, [user.id, fitnessLevel || null, idFrontBase64 || null, idBackBase64 || null]);
            }
            else if (role === 'trainer') {
                await client.query(`INSERT INTO trainer_profiles (user_id, bio, specializations, certifications, years_experience, hourly_rate_egp) 
                     VALUES ($1, $2, $3, $4, $5, $6)`, [user.id, trainerData?.bio || null, trainerData?.specialization ? [trainerData.specialization] : [], trainerData?.certs || [], trainerData?.experience || 0, trainerData?.rate || null]);
            }
            else if (role === 'gym_admin' && gymData) {
                const gymRes = await client.query(`INSERT INTO gyms (owner_user_id, name, location_url, female_hours, amenities, logo_url) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [user.id, gymData.name || 'Unnamed Gym', gymData.locationUrl || null, gymData.femaleHours || null, gymData.amenities || [], logoBase64 || null]);
                // Construct a default branch so check-ins have a target
                await client.query(`INSERT INTO gym_branches (gym_id, name, address) VALUES ($1, 'Main Branch', 'HQ')`, [gymRes.rows[0].id]);
            }
            else if (role === 'store_admin' && storeData) {
                await client.query(`INSERT INTO stores (owner_user_id, name, description, logo_url) 
                     VALUES ($1, $2, $3, $4)`, [user.id, storeData.name || 'Unnamed Store', storeData.category || null, logoBase64 || null]);
            }
            // 3. Create a financial wallet
            await client.query(`INSERT INTO wallets (owner_type, owner_id, currency) VALUES ($1, $2, 'EGP')`, ['user', user.id]);
            await client.query('COMMIT');
            client.release();
            // Generate Login Tokens immediately upon registration
            const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                accessToken,
                user
            });
        }
        catch (error) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
            }
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ success: false, errors: error.errors });
            }
            console.error('Registration Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await db_1.db.query('SELECT id, email, password_hash, role, full_name, referral_code FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
            const user = result.rows[0];
            const isValid = await bcrypt_1.default.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
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
                user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name, referral_code: user.referral_code }
            });
        }
        catch (error) {
            console.error('Login Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    static async refresh(req, res) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ success: false, message: 'No refresh token provided' });
            }
            try {
                // Verify Refresh Token
                const decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_SECRET);
                // Get User 
                const result = await db_1.db.query('SELECT id, role, email, full_name FROM users WHERE id = $1', [decoded.userId]);
                if (result.rows.length === 0) {
                    return res.status(401).json({ success: false, message: 'User not found' });
                }
                const user = result.rows[0];
                // Generate new access token
                const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
                return res.status(200).json({
                    success: true,
                    accessToken,
                    user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name }
                });
            }
            catch (err) {
                return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
            }
        }
        catch (error) {
            console.error('Refresh Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
exports.AuthController = AuthController;
