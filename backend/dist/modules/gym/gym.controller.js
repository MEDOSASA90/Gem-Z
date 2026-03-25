"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEquipmentTutorial = exports.getLiveCrowdTracker = exports.unlockSmartLocker = exports.getTraineePasses = exports.scanDailyPass = exports.buyDailyPass = exports.getGymStats = void 0;
const db_1 = require("../../core/database/db");
const getGymStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized Gym Access' });
        // Resolve Gym ID from User ID (Owner)
        const gymDbRes = await db_1.db.query('SELECT id FROM gyms WHERE owner_user_id = $1', [userId]);
        if (gymDbRes.rowCount === 0)
            return res.status(404).json({ error: 'Gym profile not found' });
        const gymId = gymDbRes.rows[0].id;
        // Get Wallet Balances for this gym
        const walletQuery = await db_1.db.query(`SELECT available_bal, pending_bal FROM wallets WHERE owner_id = $1 AND owner_type = 'gym'`, [gymId]);
        const availableBal = walletQuery.rowCount && walletQuery.rowCount > 0 ? parseFloat(walletQuery.rows[0].available_bal) : 0;
        const pendingBal = walletQuery.rowCount && walletQuery.rowCount > 0 ? parseFloat(walletQuery.rows[0].pending_bal) : 0;
        // Fetch Active Subscribers
        const subscribersQuery = await db_1.db.query(`
            SELECT gs.id, gs.starts_at as start_date, gs.expires_at as end_date, u.full_name as trainee_name
            FROM gym_subscriptions gs
            JOIN users u ON gs.trainee_id = u.id
            WHERE gs.branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1)
            AND gs.status = 'active'
        `, [gymId]);
        const subscribers = subscribersQuery.rows;
        const totalMembers = subscribers.length;
        // Fetch Live Visits (Check-Ins / Check-Outs for today)
        const visitsQuery = await db_1.db.query(`
            SELECT gv.id, gv.checked_in_at as check_in_time, gv.checked_out_at as check_out_time, u.full_name as trainee_name
            FROM attendance_logs gv
            JOIN users u ON gv.trainee_id = u.id
            WHERE gv.branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1)
            ORDER BY gv.checked_in_at DESC
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
    }
    catch (error) {
        console.error('[GymController] getGymStats Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getGymStats = getGymStats;
const buyDailyPass = async (req, res) => {
    const client = await db_1.db.connect();
    try {
        const traineeId = req.user?.userId;
        const { gymId, price } = req.body;
        if (!gymId || !price)
            return res.status(400).json({ success: false, message: 'Missing gym ID or price' });
        await client.query('BEGIN');
        // Generate unique QR
        const qrCode = `PASS_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
        // Expiry = 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        const { rows } = await client.query(`
            INSERT INTO gym_daily_passes (gym_id, trainee_id, price_paid, qr_code, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `, [gymId, traineeId, price, qrCode, expiresAt]);
        // Create financial transaction for the Gym (20% platform fee)
        const platformFee = Number(price) * 0.20;
        const netAmount = Number(price) - platformFee;
        await client.query(`
            INSERT INTO financial_transactions (user_id, buyer_id, amount, platform_fee, net_amount, type)
            VALUES ($1, $2, $3, $4, $5, 'GYM_PASS')
        `, [gymId, traineeId, price, platformFee, netAmount]);
        await client.query('COMMIT');
        return res.status(201).json({ success: true, pass: rows[0], message: 'Pass purchased successfully' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('[GymController] buyDailyPass:', error);
        return res.status(500).json({ success: false, message: 'Failed to buy daily pass' });
    }
    finally {
        client.release();
    }
};
exports.buyDailyPass = buyDailyPass;
const scanDailyPass = async (req, res) => {
    try {
        const scannerUserId = req.user?.userId; // This is the Gym Owner's ID
        const { qrCode } = req.body;
        if (!qrCode)
            return res.status(400).json({ success: false, message: 'Missing QR Code' });
        // Resolve Gym ID from scanner user ID
        const gymRes = await db_1.db.query('SELECT user_id FROM gyms WHERE user_id = $1', [scannerUserId]);
        const gymId = gymRes.rowCount && gymRes.rowCount > 0 ? gymRes.rows[0].user_id : scannerUserId;
        // Verify Pass
        const passRes = await db_1.db.query(`
            SELECT * FROM gym_daily_passes
            WHERE qr_code = $1 AND gym_id = $2
        `, [qrCode, gymId]);
        if (passRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Invalid Pass for this Gym' });
        }
        const pass = passRes.rows[0];
        if (pass.is_used) {
            return res.status(400).json({ success: false, message: 'Pass has already been used' });
        }
        if (new Date() > new Date(pass.expires_at)) {
            return res.status(400).json({ success: false, message: 'Pass has expired' });
        }
        // Mark as used
        await db_1.db.query(`
            UPDATE gym_daily_passes
            SET is_used = TRUE, scanned_at = NOW()
            WHERE id = $1
        `, [pass.id]);
        return res.status(200).json({ success: true, message: 'Access Granted! Pass consumed.' });
    }
    catch (error) {
        console.error('[GymController] scanDailyPass:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.scanDailyPass = scanDailyPass;
const getTraineePasses = async (req, res) => {
    try {
        const traineeId = req.user?.userId;
        const { rows } = await db_1.db.query(`
            SELECT p.*, g.gym_name 
            FROM gym_daily_passes p
            JOIN gyms g ON p.gym_id = g.user_id
            WHERE p.trainee_id = $1
            ORDER BY p.created_at DESC
        `, [traineeId]);
        return res.status(200).json({ success: true, passes: rows });
    }
    catch (error) {
        console.error('[GymController] getTraineePasses:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getTraineePasses = getTraineePasses;
const unlockSmartLocker = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { lockerId, gymId } = req.body;
        if (!lockerId || !gymId)
            return res.status(400).json({ success: false, message: 'Missing locker ID or gym ID' });
        // Mock unlock logic
        return res.status(200).json({ success: true, message: `Locker ${lockerId} unlocked successfully for user ${userId}.` });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error unlocking locker' });
    }
};
exports.unlockSmartLocker = unlockSmartLocker;
const getLiveCrowdTracker = async (req, res) => {
    try {
        const { gymId } = req.query;
        if (!gymId)
            return res.status(400).json({ success: false, message: 'Missing gym ID' });
        // Mock crowd data
        return res.status(200).json({ success: true, occupancy: 75, status: 'Moderately Crowded', estimatedPeakTime: '18:00' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error tracking crowd' });
    }
};
exports.getLiveCrowdTracker = getLiveCrowdTracker;
const getEquipmentTutorial = async (req, res) => {
    try {
        const { qrCode } = req.params;
        // Mock DB fetch for equipment tutorial
        if (!qrCode)
            return res.status(400).json({ success: false, message: 'Missing QR Code' });
        const mockTutorial = {
            id: 'eq_001',
            name: 'Pec Deck Machine',
            qrCode,
            videoUrl: 'https://gemz.app/tutorials/pec-deck.mp4',
            instructions: ['Adjust seat height', 'Keep back straight', 'Squeeze chest at the center'],
            targetedMuscles: ['Chest', 'Front Delts']
        };
        return res.status(200).json({ success: true, tutorial: mockTutorial });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error fetching tutorial' });
    }
};
exports.getEquipmentTutorial = getEquipmentTutorial;
