import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export class CoinsController {
    static async earnCoins(req: AuthRequest, res: Response) {
        const { amount, reason } = req.body;

        try {
            return res.status(200).json({ success: true, newBalance: Number(amount) + 1450, message: 'Mocked successful earn' });
        } catch (error) {
            console.error('[CoinsController] earnCoins:', error);
            res.status(500).json({ success: false, message: 'Failed to award coins' });
        }
    }

    static async redeemReward(req: AuthRequest, res: Response) {
        try {
            return res.status(200).json({ success: true, message: 'Reward redeemed successfully (Mock)', newBalance: 1200 });
        } catch (error) {
            console.error('[CoinsController] redeemReward:', error);
            res.status(500).json({ success: false, message: 'Server error during redemption' });
        }
    }
}
