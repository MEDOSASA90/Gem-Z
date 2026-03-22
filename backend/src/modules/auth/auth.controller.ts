import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../core/database/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev_refresh_gem_z_super_secure';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: z.string().min(2),
    role: z.enum(['trainee', 'trainer', 'gym_admin', 'store_admin']).default('trainee'),
    phone: z.string().optional(),
    countryCode: z.string().optional(),
    gender: z.string().optional(),
    dob: z.string().optional(),
    referralCode: z.string().optional(),
    fitnessLevel: z.string().optional(),
    idFrontBase64: z.string().optional(),
    idBackBase64: z.string().optional(),
    gymData: z.object({
        name: z.string().optional(),
        locationUrl: z.string().optional(),
        femaleHours: z.string().optional(),
        amenities: z.array(z.string()).optional()
    }).optional()
});

export class AuthController {
    static async register(req: Request, res: Response) {
        let client;
        try {
            const validatedData = registerSchema.parse(req.body);
            const { email, password, fullName, role, phone, countryCode, gender, dob, referralCode, fitnessLevel, idFrontBase64, idBackBase64, gymData } = validatedData;

            client = await db.connect();

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
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            await client.query('BEGIN');

            // 1. Insert User
            const userRes = await client.query(
                `INSERT INTO users (email, password_hash, full_name, role, phone, country_code, gender, date_of_birth, referred_by_user_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role, full_name, referral_code`,
                [email, password_hash, fullName, role, phone || null, countryCode || '+20', gender || null, dob ? new Date(dob) : null, referredByUserId]
            );
            const user = userRes.rows[0];

            // 2. Insert specific profile based on role
            if (role === 'trainee') {
                await client.query(
                    `INSERT INTO trainee_profiles (user_id, fitness_level, id_front_url, id_back_url) 
                     VALUES ($1, $2, $3, $4)`, 
                     [user.id, fitnessLevel || null, idFrontBase64 || null, idBackBase64 || null]
                );
            } else if (role === 'trainer') {
                await client.query('INSERT INTO trainer_profiles (user_id) VALUES ($1)', [user.id]);
            } else if (role === 'gym_admin' && gymData) {
                const gymRes = await client.query(
                    `INSERT INTO gyms (owner_user_id, name, location_url, female_hours, amenities) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [user.id, gymData.name || 'Unnamed Gym', gymData.locationUrl || null, gymData.femaleHours || null, gymData.amenities || []]
                );
                
                // Construct a default branch so check-ins have a target
                await client.query(
                    `INSERT INTO gym_branches (gym_id, name, address) VALUES ($1, 'Main Branch', 'HQ')`,
                    [gymRes.rows[0].id]
                );
            }

            // 3. Create a financial wallet
            await client.query(
                `INSERT INTO wallets (owner_type, owner_id, currency) VALUES ($1, $2, 'EGP')`,
                ['user', user.id]
            );

            await client.query('COMMIT');
            client.release();

            // Generate Login Tokens immediately upon registration
            const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

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

        } catch (error) {
            if (client) {
                await client.query('ROLLBACK');
                client.release();
            }
            if (error instanceof z.ZodError) {
                return res.status(400).json({ success: false, errors: error.errors });
            }
            console.error('Registration Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            const result = await db.query('SELECT id, email, password_hash, role, full_name, referral_code FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            const user = result.rows[0];

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

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

        } catch (error) {
            console.error('Login Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    static async refresh(req: Request, res: Response) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ success: false, message: 'No refresh token provided' });
            }

            try {
                // Verify Refresh Token
                const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
                
                // Get User 
                const result = await db.query('SELECT id, role, email, full_name FROM users WHERE id = $1', [decoded.userId]);
                if (result.rows.length === 0) {
                    return res.status(401).json({ success: false, message: 'User not found' });
                }
                const user = result.rows[0];

                // Generate new access token
                const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });

                return res.status(200).json({
                    success: true,
                    accessToken,
                    user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name }
                });
            } catch (err) {
                return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
            }

        } catch (error) {
            console.error('Refresh Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
