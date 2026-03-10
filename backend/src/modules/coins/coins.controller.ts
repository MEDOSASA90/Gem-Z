import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { FinancialEngine } from '../../services/financial.service';

const pool = new Pool();
const financialEngine = new FinancialEngine(pool);

export class CoinsController {

    /**
     * POST /api/v1/coins/earn
     * Award coins to a user for an activity (workout complete, meal logged)
     */
    static async earnCoins(req: AuthRequest, res: Response) {
        const { amount, reason } = req.body;
        const userId = req.user!.userId;

        try {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Fetch current coins
                const userRes = await client.query('SELECT gems_coins FROM trainee_profiles WHERE user_id = $1 FOR UPDATE', [userId]);
                if (userRes.rows.length === 0) throw new Error('Profile not found');

                const currentCoins = userRes.rows[0].gems_coins;
                const newCoins = currentCoins + Number(amount);

                // Insert ledger entry
                await client.query(`
                    INSERT INTO gem_z_coins_ledger (user_id, amount, reason, balance_after)
                    VALUES ($1, $2, $3, $4)
                `, [userId, amount, reason, newCoins]);

                // Update profile
                await client.query('UPDATE trainee_profiles SET gems_coins = $1 WHERE user_id = $2', [newCoins, userId]);

                await client.query('COMMIT');
                return res.status(200).json({ success: true, newBalance: newCoins });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('[CoinsController] earnCoins:', error);
            res.status(500).json({ success: false, message: 'Failed to award coins' });
        }
    }

    /**
     * POST /api/v1/coins/redeem
     * Spends coins to redeem a reward (e.g., wallet credit)
     */
    static async redeemReward(req: AuthRequest, res: Response) {
        const { rewardId } = req.body;
        const userId = req.user!.userId;

        try {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Fetch Reward
                const rw = await client.query('SELECT coins_cost, reward_type, reward_value FROM coins_rewards WHERE id = $1 AND is_active = TRUE FOR UPDATE', [rewardId]);
                if (rw.rows.length === 0) throw new Error('Reward unavailable');
                const reward = rw.rows[0];

                // 2. Fetch User Coins
                const userRes = await client.query('SELECT gems_coins FROM trainee_profiles WHERE user_id = $1 FOR UPDATE', [userId]);
                const currentCoins = userRes.rows[0].gems_coins;

                if (currentCoins < reward.coins_cost) {
                    throw new Error('Insufficient coins');
                }

                const newCoins = currentCoins - reward.coins_cost;

                // 3. Deduct Coins
                await client.query(`
                    INSERT INTO gem_z_coins_ledger (user_id, amount, reason, balance_after)
                    VALUES ($1, $2, $3, $4)
                `, [userId, -reward.coins_cost, 'redemption', newCoins]);

                await client.query('UPDATE trainee_profiles SET gems_coins = $1 WHERE user_id = $2', [newCoins, userId]);

                // 4. Fulfillment logic (e.g., inject wallet credit)
                if (reward.reward_type === 'wallet_credit') {
                    // Credit user's wallet using financial Engine
                    await financialEngine.depositPlatformCredit(userId, Number(reward.reward_value), 'Coins Redemption Reward');
                }

                // 5. Log Redemption
                await client.query(`
                    INSERT INTO coins_redemptions (user_id, reward_id, coins_spent, status)
                    VALUES ($1, $2, $3, 'fulfilled')
                `, [userId, rewardId, reward.coins_cost]);

                await client.query('COMMIT');
                return res.status(200).json({ success: true, message: 'Reward redeemed successfully', newBalance: newCoins });

            } catch (err: any) {
                await client.query('ROLLBACK');
                res.status(400).json({ success: false, message: err.message });
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('[CoinsController] redeemReward:', error);
            res.status(500).json({ success: false, message: 'Server error during redemption' });
        }
    }
}
