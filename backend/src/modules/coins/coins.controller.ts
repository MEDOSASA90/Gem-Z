import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

/**
 * GEM Z — Coins Controller
 * 
 * FIXED: All coin mutations now use FOR UPDATE locks inside transactions
 * to prevent TOCTOU race conditions and double-spending.
 */
export class CoinsController {
    static async earnCoins(req: AuthRequest, res: Response) {
        const { amount, reason } = req.body;
        const userId = req.user?.userId;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount. Must be a positive number.' });
        }

        try {
            // Single atomic UPDATE — no race condition since it doesn't read-then-write
            const result = await db.query(
                `UPDATE trainee_profiles 
                 SET total_points = total_points + $1, updated_at = NOW()
                 WHERE user_id = $2 
                 RETURNING total_points`,
                [Number(amount), userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Trainee profile not found' });
            }

            return res.status(200).json({ 
                success: true, 
                newBalance: result.rows[0].total_points, 
                message: `Successfully earned ${amount} points for ${reason}` 
            });
        } catch (error) {
            console.error('[CoinsController] earnCoins:', error);
            return res.status(500).json({ success: false, message: 'Failed to award coins' });
        }
    }

    static async redeemReward(req: AuthRequest, res: Response) {
        const { rewardId } = req.body;
        const userId = req.user?.userId;
        const client = await db.connect();

        // In a real scenario, fetch reward cost from DB.
        const cost = 500;

        try {
            await client.query('BEGIN');

            // Lock the row to prevent concurrent redemptions
            const balRes = await client.query(
                `SELECT total_points FROM trainee_profiles WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            if (balRes.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Profile not found' });
            }
            
            if (balRes.rows[0].total_points < cost) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Insufficient points' });
            }

            const result = await client.query(
                `UPDATE trainee_profiles 
                 SET total_points = total_points - $1, updated_at = NOW()
                 WHERE user_id = $2 
                 RETURNING total_points`,
                [cost, userId]
            );

            await client.query('COMMIT');

            return res.status(200).json({ 
                success: true, 
                message: 'Reward redeemed successfully', 
                newBalance: result.rows[0].total_points 
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[CoinsController] redeemReward:', error);
            return res.status(500).json({ success: false, message: 'Server error during redemption' });
        } finally {
            client.release();
        }
    }

    static async stakeCoinsForGoal(req: AuthRequest, res: Response) {
        const client = await db.connect();

        try {
            const userId = req.user?.userId;
            const { amount, goalId } = req.body;
            if (!amount || !goalId) return res.status(400).json({ success: false, message: 'Missing amount or goalId' });
            
            const cost = Number(amount);
            if (isNaN(cost) || cost <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid stake amount.' });
            }

            await client.query('BEGIN');

            // Lock the row to prevent concurrent staking
            const balRes = await client.query(
                `SELECT total_points FROM trainee_profiles WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            if (balRes.rowCount === 0 || balRes.rows[0].total_points < cost) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Insufficient points to stake' });
            }

            await client.query(
                `UPDATE trainee_profiles SET total_points = total_points - $1, updated_at = NOW() WHERE user_id = $2`,
                [cost, userId]
            );

            await client.query('COMMIT');
            
            return res.status(200).json({ success: true, message: `Staked ${cost} coins successfully on goal ${goalId}. Stay committed!` });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[CoinsController] stakeCoinsForGoal:', error);
            return res.status(500).json({ success: false, message: 'Server error during staking' });
        } finally {
            client.release();
        }
    }
}
