"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentWebhookController = void 0;
const crypto_1 = __importDefault(require("crypto"));
class PaymentWebhookController {
    static async fawryWebhook(req, res) {
        const { referenceNumber, amount, status, signature } = req.body;
        console.log(`[Webhook:Fawry] Received payment update for Ref: ${referenceNumber}, Status: ${status}`);
        const secret = process.env.FAWRY_SECURE_KEY || 'simulated_secret';
        const expectedSig = crypto_1.default.createHmac('sha256', secret).update(`${referenceNumber}${amount}${status}`).digest('hex');
        if (status !== 'PAID') {
            return res.status(200).json({ received: true, ignored: true });
        }
        try {
            console.log(`[Webhook:Fawry] Successfully applied EGP ${amount} to wallet (Mock)`);
            return res.status(200).json({ received: true, success: true });
        }
        catch (error) {
            console.error('[PaymentWebhook] Fawry Error:', error);
            res.status(500).send('Internal Server Error');
        }
    }
    static async paymobWebhook(req, res) {
        const { obj } = req.body;
        console.log(`[Webhook:Paymob] Received push callback for Order: ${obj?.order?.id}`);
        return res.status(200).send('Webhook Processed (Mock)');
    }
}
exports.PaymentWebhookController = PaymentWebhookController;
