import { Response } from 'express';
import z from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export const getGymStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized Gym Access' });

        // Resolve Gym ID from User ID (Owner)
        const gymDbRes = await db.query('SELECT id FROM gyms WHERE owner_user_id = $1', [userId]);
        if (gymDbRes.rowCount === 0) return res.status(404).json({ error: 'Gym profile not found' });
        const gymId = gymDbRes.rows[0].id;

        // Get Wallet Balances for this gym
        const walletQuery = await db.query(
            `SELECT available_bal, pending_bal FROM wallets WHERE owner_id = $1 AND owner_type = 'gym'`,
            [gymId]
        );
        const availableBal = walletQuery.rowCount && walletQuery.rowCount > 0 ? parseFloat(walletQuery.rows[0].available_bal) : 0;
        const pendingBal = walletQuery.rowCount && walletQuery.rowCount > 0 ? parseFloat(walletQuery.rows[0].pending_bal) : 0;

        // Fetch Active Subscribers
        const subscribersQuery = await db.query(`
            SELECT gs.id, gs.start_date, gs.end_date, u.full_name as trainee_name
            FROM gym_subscriptions gs
            JOIN users u ON gs.trainee_id = u.id
            WHERE gs.branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1)
            AND gs.status = 'active'
        `, [gymId]);
        
        const subscribers = subscribersQuery.rows;
        const totalMembers = subscribers.length;

        // Fetch Live Visits (Check-Ins / Check-Outs for today)
        const visitsQuery = await db.query(`
            SELECT gv.id, gv.check_in_time, gv.check_out_time, u.full_name as trainee_name
            FROM gym_visits gv
            JOIN users u ON gv.user_id = u.id
            WHERE gv.gym_id = $1
            ORDER BY gv.check_in_time DESC
            LIMIT 50
        `, [gymId]);
        const visits = visitsQuery.rows;

        return res.status(200).json({
            success: true,
            data: {
                availableBal,
                pendingBal,
                totalMembers,
                subscribers,
                visits
            }
        });

    } catch (error) {
        console.error('[GymController] getGymStats Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const scanBarcode = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { barcode } = req.body;
        
        if (!userId || !barcode) return res.status(400).json({ error: 'Invalid Request' });

        // Resolve Gym ID
        const gymDbRes = await db.query('SELECT id FROM gyms WHERE owner_user_id = $1', [userId]);
        if (gymDbRes.rowCount === 0) return res.status(404).json({ error: 'Gym profile not found' });
        const gymId = gymDbRes.rows[0].id;

        // Resolve Trainee User ID from Barcode (assuming barcode is user.id or referral_code for now)
        const traineeRes = await db.query('SELECT id FROM users WHERE id::text = $1 OR referral_code = $1', [barcode]);
        if (traineeRes.rowCount === 0) return res.status(404).json({ error: 'Trainee not found' });
        const traineeId = traineeRes.rows[0].id;

        // Check for an active OPEN visit
        const openVisitRes = await db.query(`
            SELECT id, check_in_time FROM gym_visits 
            WHERE user_id = $1 AND gym_id = $2 AND check_out_time IS NULL
        `, [traineeId, gymId]);

        if (openVisitRes.rowCount && openVisitRes.rowCount > 0) {
            // Check OUT
            const visitId = openVisitRes.rows[0].id;
            const checkInTime = new Date(openVisitRes.rows[0].check_in_time);
            const checkOutTime = new Date();
            const durationMins = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

            await db.query(`
                UPDATE gym_visits 
                SET check_out_time = CURRENT_TIMESTAMP, duration_minutes = $1
                WHERE id = $2
            `, [durationMins, visitId]);

            return res.status(200).json({ success: true, message: 'Checked OUT successfully', action: 'checkout' });
        } else {
            // Check IN
            await db.query(`
                INSERT INTO gym_visits (user_id, gym_id) VALUES ($1, $2)
            `, [traineeId, gymId]);
            return res.status(200).json({ success: true, message: 'Checked IN successfully', action: 'checkin' });
        }

    } catch(err) {
        console.error('[GymController] scanBarcode Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

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
