import { Response } from 'express';
import { Pool } from 'pg';
import z from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const db = new Pool(); // Represents the connected PostgreSQL instance

export const getGymStats = async (req: AuthRequest, res: Response) => {
    try {
        const gymId = req.user?.entityId || req.user?.userId; // Extracted via JWT Middleware
        if (!gymId) return res.status(401).json({ error: 'Unauthorized Gym Access' });

        // Using exact schema tables (ledger_wallets, subscriptions)
        const statsQuery = `
      SELECT 
        w.available_bal,
        w.pending_bal,
        (SELECT COUNT(*) FROM subscriptions s WHERE s.gym_id = $1 AND s.status = 'ACTIVE') as total_members
      FROM ledger_wallets w
      WHERE w.entity_id = $1 AND w.entity_type = 'GYM';
    `;

        const { rows } = await db.query(statsQuery, [gymId]);

        if (!rows.length) return res.status(404).json({ error: 'Gym wallet not found' });

        res.status(200).json({
            success: true,
            data: {
                availableBal: parseFloat(rows[0].available_bal),
                pendingBal: parseFloat(rows[0].pending_bal),
                totalMembers: parseInt(rows[0].total_members, 10)
            }
        });

    } catch (error) {
        console.error('[GymController] getGymStats Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

        const updateQuery = `
      INSERT INTO gym_pricing_rules (gym_id, is_off_peak_active, off_peak_discount, updated_at)
      VALUES ($1, $2, COALESCE($3, 20.00), NOW())
      ON CONFLICT (gym_id) 
      DO UPDATE SET 
        is_off_peak_active = EXCLUDED.is_off_peak_active,
        off_peak_discount = COALESCE(EXCLUDED.off_peak_discount, gym_pricing_rules.off_peak_discount),
        updated_at = NOW()
      RETURNING *;
    `;

        const { rows } = await db.query(updateQuery, [gymId, isActive, discountPercentage]);

        res.status(200).json({
            success: true,
            data: rows[0],
            message: `Off-Peak pricing ${isActive ? 'activated' : 'deactivated'}`
        });

    } catch (error) {
        console.error('[GymController] setOffPeakPricing Error:', error);
        res.status(400).json({ error: 'Invalid payload or server error' });
    }
};
