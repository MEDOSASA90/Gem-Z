import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';
import { hashPassword, sanitizeUser, verifyPassword } from '../../services/auth.service';

const updateProfileSchema = z.object({
    full_name: z.string().trim().min(2).max(255),
    phone: z.string().trim().max(20).optional().nullable(),
    bio: z.string().trim().max(200).optional().nullable()
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
});

const kycSchema = z.object({
    doc_type: z.enum(['national_id', 'passport', 'drivers_license']),
    doc_urls: z.array(z.string().min(1)).min(1).max(2),
    full_name: z.string().trim().min(2).max(255),
    dob: z.string().min(1),
    id_number: z.string().trim().min(3).max(100)
});

export class UserController {
    static async updateProfile(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const data = updateProfileSchema.parse(req.body);
            const result = await db.query(
                `UPDATE users
                 SET full_name = $1,
                     phone = NULLIF($2, ''),
                     updated_at = NOW()
                 WHERE id = $3
                 RETURNING id, email, phone, role, status, full_name, referral_code, avatar_url, email_verified_at`,
                [data.full_name, data.phone || null, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: { user: sanitizeUser(result.rows[0]) }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }

            if ((error as any)?.code === '23505') {
                return res.status(409).json({ success: false, message: 'Phone number is already in use' });
            }

            console.error('[UserController] updateProfile:', error);
            return res.status(500).json({ success: false, message: 'Failed to update profile' });
        }
    }

    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
            const userResult = await db.query(
                `SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1`,
                [userId]
            );

            if (userResult.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const isValid = await verifyPassword(currentPassword, userResult.rows[0].password_hash);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }

            const newHash = await hashPassword(newPassword);
            await db.query(
                `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
                [newHash, userId]
            );

            return res.status(200).json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }

            console.error('[UserController] changePassword:', error);
            return res.status(500).json({ success: false, message: 'Failed to change password' });
        }
    }

    static async submitKyc(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const data = kycSchema.parse(req.body);
            const result = await db.query(`
                INSERT INTO kyc_submissions
                    (user_id, doc_type, doc_urls, full_name, date_of_birth, id_number, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING id, status, created_at
            `, [
                userId,
                data.doc_type,
                data.doc_urls,
                data.full_name,
                data.dob,
                data.id_number
            ]);

            return res.status(201).json({
                success: true,
                message: 'KYC submission received',
                data: result.rows[0]
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }

            console.error('[UserController] submitKyc:', error);
            return res.status(500).json({ success: false, message: 'Failed to submit KYC' });
        }
    }
}
