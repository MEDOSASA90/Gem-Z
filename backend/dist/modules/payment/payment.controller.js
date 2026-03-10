"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentWebhookController = void 0;
const pg_1 = require("pg");
const crypto_1 = __importDefault(require("crypto"));
const pool = new pg_1.Pool();
class PaymentWebhookController {
    /**
     * POST /api/v1/payment/webhook/fawry
     * Simulated Webhook from Fawry API for Wallet Top-Up
     * Expects: { referenceNumber, amount, status, signature }
     */
    static async fawryWebhook(req, res) {
        const { referenceNumber, amount, status, signature } = req.body;
        console.log(`[Webhook:Fawry] Received payment update for Ref: ${referenceNumber}, Status: ${status}`);
        // 1. Verify Signature (Simulated HMAC validation)
        const secret = process.env.FAWRY_SECURE_KEY || 'simulated_secret';
        const expectedSig = crypto_1.default.createHmac('sha256', secret).update(`${referenceNumber}${amount}${status}`).digest('hex');
        // In real life: if (signature !== expectedSig) return res.status(403).send('Invalid Signature');
        if (status !== 'PAID') {
            return res.status(200).json({ received: true, ignored: true });
        }
        try {
            // Find user pending deposit transaction by referenceNumber
            // We assume referenceNumber = internal transaction_id tracking the topup
            const txnRes = await pool.query("SELECT * FROM transactions WHERE id = $1 AND status = 'pending'", [referenceNumber]);
            if (txnRes.rows.length === 0) {
                return res.status(200).json({ received: true, ignored: true, message: 'Txn not found or already verified' });
            }
            const txn = txnRes.rows[0];
            // In our simple Financial Engine, topups happen directly via deposit command:
            // But if it was pending, we update wallet balance now and txn status.
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                // Set txn to verified
                await client.query("UPDATE transactions SET status = 'verified', external_reference = $1 WHERE id = $2", [referenceNumber, txn.id]);
                // Add to wallet available balance (since it was a top-up)
                await client.query(`
                    UPDATE wallets 
                    SET available_bal = available_bal + $1, pending_bal = pending_bal - $1
                    WHERE id = $2
                `, [txn.amount, txn.wallet_id]);
                await client.query('COMMIT');
                console.log(`[Webhook:Fawry] Successfully applied EGP ${amount} to wallet ${txn.wallet_id}`);
                return res.status(200).json({ received: true, success: true });
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('[PaymentWebhook] Fawry Error:', error);
            res.status(500).send('Internal Server Error');
        }
    }
    /**
     * POST /api/v1/payment/webhook/paymob
     * Simulated Webhook from Paymob API
     */
    static async paymobWebhook(req, res) {
        const { obj } = req.body;
        console.log(`[Webhook:Paymob] Received push callback for Order: ${obj?.order?.id}`);
        // Similar architecture to Fawry webhook logic...
        return res.status(200).send('Webhook Processed');
    }
}
exports.PaymentWebhookController = PaymentWebhookController;
