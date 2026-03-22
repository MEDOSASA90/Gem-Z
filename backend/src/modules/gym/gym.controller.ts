import { Response } from 'express';
import z from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export const getGymStats = async (req: AuthRequest, res: Response) => {
    try {
        const gymId = req.user?.entityId || req.user?.userId;
        if (!gymId) return res.status(401).json({ error: 'Unauthorized Gym Access' });

        // Get Wallet Balances for this gym
        const walletQuery = await db.query(
            `SELECT available_bal, pending_bal FROM wallets WHERE owner_id = $1 AND owner_type = 'gym'`,
            [gymId]
        );
        const availableBal = walletQuery.rowCount && walletQuery.rowCount > 0 ? parseFloat(walletQuery.rows[0].available_bal) : 0;
        const pendingBal = walletQuery.rowCount && walletQuery.rowCount > 0 ? parseFloat(walletQuery.rows[0].pending_bal) : 0;

        // Count Members 
        const membersQuery = await db.query(
            `SELECT COUNT(DISTINCT trainee_id) as total FROM gym_subscriptions WHERE branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1) AND status = 'active'`,
            [gymId]
        );
        const totalMembers = membersQuery.rowCount && membersQuery.rowCount > 0 ? parseInt(membersQuery.rows[0].total) : 0;

        return res.status(200).json({
            success: true,
            data: {
                availableBal,
                pendingBal,
                totalMembers
            }
        });

    } catch (error) {
        console.error('[GymController] getGymStats Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const setOffPeakPricing = async (req: AuthRequest, res: Response) => {
    try {
        const gymId = req.user?.entityId || req.user?.userId;

        const schema = z.object({
            isActive: z.boolean(),
            discountPercentage: z.number().min(0).max(100).optional()
        });

        const { isActive, discountPercentage } = schema.parse(req.body);

        res.status(200).json({
            success: true,
            data: { gym_id: gymId, is_off_peak_active: isActive, off_peak_discount: discountPercentage || 20.00 },
            message: `Off-Peak pricing ${isActive ? 'activated' : 'deactivated'} (Mock)`
        });

    } catch (error) {
        console.error('[GymController] setOffPeakPricing Error:', error);
        res.status(400).json({ error: 'Invalid payload or server error' });
    }
};
