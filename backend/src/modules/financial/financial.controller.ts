import { Request, Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export class FinancialController {
    
    /**
     * GET /api/v1/finance/wallet
     * Calculates the total earned, pending payouts, and available balance.
     * Also returns the latest transactions.
     */
    static async getWalletBalance(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            // 1. Get total lifetime earnings from completed transactions
            const { rows: earnRows } = await db.query(`
                SELECT COALESCE(SUM(net_amount), 0) as total_earned
                FROM financial_transactions 
                WHERE user_id = $1 AND status = 'COMPLETED'
            `, [userId]);

            // 2. Get total requested payouts (Pending + Completed)
            const { rows: payoutRows } = await db.query(`
                SELECT COALESCE(SUM(amount), 0) as total_payouts
                FROM financial_payouts 
                WHERE user_id = $1 AND status IN ('PENDING', 'PROCESSING', 'COMPLETED')
            `, [userId]);

            const lifetimeEarned = Number(earnRows[0].total_earned);
            const totalPayouts = Number(payoutRows[0].total_payouts);
            const availableBal = lifetimeEarned - totalPayouts;

            // 3. Get recent transactions
            const { rows: txns } = await db.query(`
                SELECT id, amount, platform_fee, net_amount, type, status, created_at
                FROM financial_transactions
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 20
            `, [userId]);

            return res.status(200).json({
                success: true,
                wallet: { 
                    available_bal: availableBal, 
                    lifetime_earned: lifetimeEarned,
                    total_payouts: totalPayouts,
                    currency: 'EGP' 
                },
                transactions: txns
            });

        } catch (error) {
            console.error('[FinancialController] getWalletBalance:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }

    /**
     * POST /api/v1/finance/payout
     * Request a payout from available balance.
     */
    static async requestPayout(req: AuthRequest, res: Response) {
        const client = await db.connect();
        try {
            const userId = req.user?.userId;
            const { amount, bankDetails } = req.body;

            if (!amount || amount < 100) {
                return res.status(400).json({ success: false, message: 'Minimum payout is 100 EGP' });
            }

            await client.query('BEGIN');

            const { rows: earnRows } = await client.query(`SELECT COALESCE(SUM(net_amount), 0) as total_earned FROM financial_transactions WHERE user_id = $1 AND status = 'COMPLETED'`, [userId]);
            const { rows: payoutRows } = await client.query(`SELECT COALESCE(SUM(amount), 0) as total_payouts FROM financial_payouts WHERE user_id = $1 AND status IN ('PENDING', 'PROCESSING', 'COMPLETED')`, [userId]);
            
            const availableBal = Number(earnRows[0].total_earned) - Number(payoutRows[0].total_payouts);

            if (amount > availableBal) {
                throw new Error('Requested amount exceeds available balance');
            }

            const { rows } = await client.query(`
                INSERT INTO financial_payouts (user_id, amount, bank_details)
                VALUES ($1, $2, $3)
                RETURNING *;
            `, [userId, amount, bankDetails]);

            await client.query('COMMIT');
            return res.status(201).json({ success: true, message: 'Payout requested successfully', payout: rows[0] });

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('[FinancialController] requestPayout:', error);
            return res.status(500).json({ success: false, message: error.message || 'Server Configuration Error' });
        } finally {
            client.release();
        }
    }
}
