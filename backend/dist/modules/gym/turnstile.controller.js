"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnstileController = void 0;
class TurnstileController {
    /**
     * POST /api/v1/gym/turnstile/verify
     * Called by the physical IoT gate scanner when a user scans their QR code.
     * Payload: { qrToken: string, gateId: string }
     */
    static async verifyAccess(req, res) {
        const { qrToken, gateId } = req.body;
        if (!qrToken || !gateId) {
            return res.status(400).json({ success: false, message: 'Missing token or gateId' });
        }
        try {
            // MOCK RESPONSE
            return res.status(200).json({ success: true, message: 'Access Granted. Welcome to GEM Z Gym!' });
        }
        catch (error) {
            console.error('[Turnstile] Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
exports.TurnstileController = TurnstileController;
