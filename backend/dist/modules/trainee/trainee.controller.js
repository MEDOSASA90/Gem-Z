"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraineeController = void 0;
class TraineeController {
    /**
     * GET /api/v1/trainee/dashboard
     * Aggregates stats, wallet balance, active subscription, and badges for the overview.
     */
    static async getDashboardData(req, res) {
        try {
            // MOCKED RESPONSE since there is no local DB setup.
            res.status(200).json({
                success: true,
                data: {
                    profile: {
                        weight_kg: 78.5,
                        height_cm: 180,
                        body_fat_pct: 14.2,
                        fitness_goal: 'muscle_gain',
                        activity_level: 'active',
                        gems_coins: 1450
                    },
                    subscription: {
                        status: 'active',
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        plan_name: 'Ultimate Plus',
                        gym_name: 'Gold Gym Elite'
                    },
                    wallet: {
                        available_bal: 450.50,
                        currency: 'EGP'
                    },
                    badges: [
                        { name: 'Early Bird', icon_url: '🌅' },
                        { name: 'Iron Lifter', icon_url: '🏋️' },
                        { name: 'Fire Streak', icon_url: '🔥' }
                    ],
                    workoutStreak: 12,
                    dailyWater: 1.5,
                    wearables: { source: 'Apple Watch', steps: 6000, kcal: 450 }
                }
            });
        }
        catch (error) {
            console.error('[TraineeController] getDashboardData:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
        }
    }
}
exports.TraineeController = TraineeController;
