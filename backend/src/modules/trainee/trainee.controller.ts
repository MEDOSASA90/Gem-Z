import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const pool = new Pool();

export class TraineeController {

    /**
     * GET /api/v1/trainee/dashboard
     * Aggregates stats, wallet balance, active subscription, and badges for the overview.
     */
    static async getDashboardData(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const client = await pool.connect();

            try {
                // 1. Profile & Stats
                const profileRes = await client.query(`
                    SELECT weight_kg, height_cm, body_fat_pct, fitness_goal, activity_level, gems_coins
                    FROM trainee_profiles WHERE user_id = $1
                `, [userId]);

                // 2. Active Subscription
                const subRes = await client.query(`
                    SELECT s.status, s.expires_at, p.name as plan_name, g.name as gym_name
                    FROM gym_subscriptions s
                    JOIN gym_subscription_plans p ON s.plan_id = p.id
                    JOIN gyms g ON p.gym_id = g.id
                    WHERE s.trainee_id = $1 AND s.status = 'active'
                `, [userId]);

                // 3. Wallet Balance
                const walletRes = await client.query(`
                    SELECT available_bal, currency 
                    FROM wallets WHERE owner_type = 'user' AND owner_id = $1
                `, [userId]);

                // 4. Badges (Level)
                const badgesRes = await client.query(`
                    SELECT b.name, b.icon_url 
                    FROM user_badges ub
                    JOIN badges b ON ub.badge_id = b.id
                    WHERE ub.user_id = $1
                `, [userId]);

                res.status(200).json({
                    success: true,
                    data: {
                        profile: profileRes.rows[0] || null,
                        subscription: subRes.rows[0] || null,
                        wallet: walletRes.rows[0] || null,
                        badges: badgesRes.rows,
                        workoutStreak: 12, // Mocked external calculation
                        dailyWater: 1.5,
                        wearables: { source: 'Apple Watch', steps: 6000, kcal: 450 }
                    }
                });

            } finally {
                client.release();
            }

        } catch (error) {
            console.error('[TraineeController] getDashboardData:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
        }
    }
}
