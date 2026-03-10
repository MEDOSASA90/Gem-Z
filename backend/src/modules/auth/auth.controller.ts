import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';

const pool = new Pool(); // Usually exported from a db.ts file
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev_refresh_gem_z_super_secure';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: z.string().min(2),
    role: z.enum(['trainee', 'trainer', 'gym_admin', 'store_admin']).default('trainee'),
    phone: z.string().optional()
});

export class AuthController {

    /**
     * Register a new user + Setup Profile + Init Wallet explicitly via DB Transaction
     */
    static async register(req: Request, res: Response) {
        try {
            // 1. Zod Validation
            const validatedData = registerSchema.parse(req.body);
            const { email, password, fullName, role, phone } = validatedData;

            // 2. Hash Password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const client = await pool.connect();
            try {
                await client.query('BEGIN'); // Start Transaction

                // Check if email exists
                const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                if (emailCheck.rows.length > 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ success: false, message: 'Email already in use' });
                }

                // 3. Create User
                const userRes = await client.query(`
          INSERT INTO users (email, phone, password_hash, role, full_name, status)
          VALUES ($1, $2, $3, $4, $5, 'active')
          RETURNING id, email, role, full_name
        `, [email, phone || null, passwordHash, role, fullName]);

                const newUser = userRes.rows[0];

                // 4. Create Role-Specific Profile
                if (role === 'trainee') {
                    await client.query('INSERT INTO trainee_profiles (user_id) VALUES ($1)', [newUser.id]);
                } else if (role === 'trainer') {
                    await client.query('INSERT INTO trainer_profiles (user_id) VALUES ($1)', [newUser.id]);
                }

                // 5. Initialize Empty Personal Wallet
                // Even admins get a personal wallet (for payroll or paying for their own stuff)
                await client.query(`
          INSERT INTO wallets (owner_type, owner_id, currency, available_bal, pending_bal)
          VALUES ('user', $1, 'EGP', 0, 0)
        `, [newUser.id]);

                await client.query('COMMIT'); // Commit Transaction

                return res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    user: newUser
                });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ success: false, errors: error.errors });
            }
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }

    /**
     * Login + Issue JWT Access Token & HttpOnly Refresh Cookie
     */
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            const userRes = await pool.query('SELECT id, password_hash, role, status FROM users WHERE email = $1', [email]);
            const user = userRes.rows[0];

            if (!user || user.status === 'banned') {
                return res.status(401).json({ success: false, message: 'Invalid credentials or banned account' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Generate Tokens
            const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

            // In production: store the hashed refreshToken in the DB for token revocation strategies

            // Set Strict HttpOnly Refresh Cookie
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

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
