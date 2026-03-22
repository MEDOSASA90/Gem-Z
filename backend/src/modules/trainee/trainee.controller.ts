import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export class TraineeController {

    /**
     * GET /api/v1/trainee/dashboard
     * Aggregates stats, wallet balance, active subscription, and badges for the overview.
     */
    static async getDashboardData(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            
            // 1. Fetch Trainee Profile
            const profileRes = await db.query(
                `SELECT height_cm, weight_kg, body_fat_pct, fitness_goal, activity_level, total_points as gems_coins 
                 FROM trainee_profiles WHERE user_id = $1`, [userId]
            );
            
            // 2. Fetch Wallet
            const walletRes = await db.query(
                `SELECT available_bal, currency FROM wallets WHERE owner_type = 'user' AND owner_id = $1`, [userId]
            );

            // 3. Optional: Subscriptions (null for now if not subscribed)
            const subRes = await db.query(
                `SELECT s.status, s.expires_at, p.name as plan_name, g.name as gym_name 
                 FROM gym_subscriptions s
                 JOIN gym_subscription_plans p ON s.plan_id = p.id
                 JOIN gyms g ON p.gym_id = g.id
                 WHERE s.trainee_id = $1 AND s.status = 'active' ORDER BY s.expires_at DESC LIMIT 1`, [userId]
            );

            return res.status(200).json({
                success: true,
                data: {
                    profile: profileRes.rows[0] || {},
                    wallet: walletRes.rows[0] || { available_bal: 0, currency: 'EGP' },
                    subscription: subRes.rows[0] || null,
                    badges: [], // TODO: fetch from user_badges
                    workoutStreak: 0, // TODO: derived from attendance or trainee_profiles
                    dailyWater: 0,
                    wearables: null
                }
            });
        } catch (error) {
            console.error('[TraineeController] getDashboardData:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
        }
    }
}
