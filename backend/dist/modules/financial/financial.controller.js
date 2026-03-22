"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
const zod_1 = require("zod");
const subscriptionSchema = zod_1.z.object({
    gymId: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid().optional(),
    planId: zod_1.z.string().uuid(),
});
class FinancialController {
    static async getWalletBalance(req, res) {
        try {
            const userId = req.user.userId;
            return res.status(200).json({
                success: true,
                wallet: { available_bal: 12000, pending_bal: 0, currency: 'EGP', lifetime_earned: 45000 }
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    static async purchaseGymSubscription(req, res) {
        try {
            const traineeId = req.user.userId;
            const validData = subscriptionSchema.parse(req.body);
            const { gymId, branchId, planId } = validData;
            try {
                return res.status(200).json({
                    success: true,
                    message: 'Subscription purchased successfully. (Mock)',
                    transactionId: 'mock-financial-txn-sub',
                    totalPaid: 1500
                });
            }
            catch (error) {
                console.error('LEDGER ENGINE ERROR:', error);
                return res.status(500).json({ success: false, message: 'Financial Engine Execution Failed.' });
            }
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ success: false, errors: error.errors });
            }
            return res.status(500).json({ success: false, message: 'Server Configuration Error' });
        }
    }
}
exports.FinancialController = FinancialController;
