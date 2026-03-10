import { Request, Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const pool = new Pool();

export class TurnstileController {
    /**
     * POST /api/v1/gym/turnstile/verify
     * Called by the physical IoT gate scanner when a user scans their QR code.
     * Payload: { qrToken: string, gateId: string }
     */
    static async verifyAccess(req: Request, res: Response) {
        const { qrToken, gateId } = req.body;

        if (!qrToken || !gateId) {
            return res.status(400).json({ success: false, message: 'Missing token or gateId' });
        }

        try {
            // 1. In a real app, the QR token is a short-lived JWT that embeds the userId.
            // For simulation, we assume qrToken structure is valid JWT or simple base64 "userId:timestamp"
            // Let's mock the decryption. Assume it's a raw userId for testing:
            const userId = qrToken.replace('gemz_session_', '');

            // 2. Verify active subscription to the gym that owns this gate
            const client = await pool.connect();
            try {
                // Find gym ID from gate ID (Mocking gym 'gym_123' for gate 'gate_1')
                const gymId = gateId.includes('gate_1') ? 'gym_123' : 'unknown';

                const subRes = await client.query(`
                    SELECT * FROM subscriptions 
                    WHERE trainee_id = $1 AND gym_id = $2 AND status = 'active'
                      AND end_date > NOW()
                `, [userId, gymId]);

                if (subRes.rows.length === 0) {
                    return res.status(403).json({ success: false, message: 'Access Denied: No active subscription' });
                }

                // 3. Log access in 'attendance' or 'gate_logs' table
                await client.query(`
                    INSERT INTO transactions (id, reference_no, txn_type, status, total_amount, currency, description, initiator_user_id)
                    VALUES (gen_random_uuid(), 'GATE-' || extract(epoch from now()), 'gym_access', 'completed', 0, 'EGP', 'Accessed gate ' || $1, $2)
                `, [gateId, userId]);

                return res.status(200).json({ success: true, message: 'Access Granted. Welcome to GEM Z Gym!' });

            } finally {
                client.release();
            }

        } catch (error) {
            console.error('[Turnstile] Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
