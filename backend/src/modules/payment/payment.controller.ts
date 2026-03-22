import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import crypto from 'crypto';

export class PaymentWebhookController {
    static async fawryWebhook(req: AuthRequest, res: Response) {
        const { referenceNumber, amount, status, signature } = req.body;

        console.log(`[Webhook:Fawry] Received payment update for Ref: ${referenceNumber}, Status: ${status}`);

        const secret = process.env.FAWRY_SECURE_KEY || 'simulated_secret';
        const expectedSig = crypto.createHmac('sha256', secret).update(`${referenceNumber}${amount}${status}`).digest('hex');

        if (status !== 'PAID') {
            return res.status(200).json({ received: true, ignored: true });
        }

        try {
            console.log(`[Webhook:Fawry] Successfully applied EGP ${amount} to wallet (Mock)`);
            return res.status(200).json({ received: true, success: true });
        } catch (error) {
            console.error('[PaymentWebhook] Fawry Error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async paymobWebhook(req: AuthRequest, res: Response) {
        const { obj } = req.body;

        console.log(`[Webhook:Paymob] Received push callback for Order: ${obj?.order?.id}`);
        return res.status(200).send('Webhook Processed (Mock)');
    }
}
