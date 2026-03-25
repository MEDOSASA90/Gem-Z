"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinsController = void 0;
const db_1 = require("../../core/database/db");
class CoinsController {
    static async earnCoins(req, res) {
        const { amount, reason } = req.body;
        const userId = req.user?.userId;
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        try {
            const result = await db_1.db.query(`UPDATE trainee_profiles 
                 SET total_points = total_points + $1, updated_at = NOW()
                 WHERE user_id = $2 
                 RETURNING total_points`, [Number(amount), userId]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Trainee profile not found' });
            }
            return res.status(200).json({
                success: true,
                newBalance: result.rows[0].total_points,
                message: `Successfully earned ${amount} points for ${reason}`
            });
        }
        catch (error) {
            console.error('[CoinsController] earnCoins:', error);
            return res.status(500).json({ success: false, message: 'Failed to award coins' });
        }
    }
    static async redeemReward(req, res) {
        const { rewardId } = req.body;
        const userId = req.user?.userId;
        // In a real scenario, fetch reward cost from DB.
        // For now, mock the cost: 500 points per reward.
        const cost = 500;
        try {
            // Check balance first
            const balRes = await db_1.db.query(`SELECT total_points FROM trainee_profiles WHERE user_id = $1`, [userId]);
            if (balRes.rowCount === 0)
                return res.status(404).json({ success: false, message: 'Profile not found' });
            if (balRes.rows[0].total_points < cost) {
                return res.status(400).json({ success: false, message: 'Insufficient points' });
            }
            const result = await db_1.db.query(`UPDATE trainee_profiles 
                 SET total_points = total_points - $1, updated_at = NOW()
                 WHERE user_id = $2 
                 RETURNING total_points`, [cost, userId]);
            return res.status(200).json({
                success: true,
                message: 'Reward redeemed successfully',
                newBalance: result.rows[0].total_points
            });
        }
        catch (error) {
            console.error('[CoinsController] redeemReward:', error);
            return res.status(500).json({ success: false, message: 'Server error during redemption' });
        }
    }
    static async stakeCoinsForGoal(req, res) {
        try {
            const userId = req.user?.userId;
            const { amount, goalId } = req.body;
            if (!amount || !goalId)
                return res.status(400).json({ success: false, message: 'Missing amount or goalId' });
            const cost = Number(amount);
            const balRes = await db_1.db.query(`SELECT total_points FROM trainee_profiles WHERE user_id = $1`, [userId]);
            if (balRes.rowCount === 0 || balRes.rows[0].total_points < cost) {
                return res.status(400).json({ success: false, message: 'Insufficient points to stake' });
            }
            await db_1.db.query(`UPDATE trainee_profiles SET total_points = total_points - $1 WHERE user_id = $2`, [cost, userId]);
            return res.status(200).json({ success: true, message: `Staked ${cost} coins successfully on goal ${goalId}. Stay committed!` });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Server error during staking' });
        }
    }
}
exports.CoinsController = CoinsController;
