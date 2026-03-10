"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
const zod_1 = require("zod");
const pg_1 = require("pg");
const financial_service_1 = require("../../services/financial.service");
// Initialize instances (In a real app, use dependency injection)
const pool = new pg_1.Pool();
const financialEngine = new financial_service_1.FinancialEngine(pool);
const subscriptionSchema = zod_1.z.object({
    gymId: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid().optional(),
    planId: zod_1.z.string().uuid(),
});
class FinancialController {
    /**
     * GET /api/v1/finance/wallet/balance
     * Fetches the current user's wallet balances
     */
    static async getWalletBalance(req, res) {
        try {
            const userId = req.user.userId;
            const balanceRes = await pool.query(`
        SELECT available_bal, pending_bal, currency, lifetime_earned 
        FROM wallets 
        WHERE owner_type = 'user' AND owner_id = $1
      `, [userId]);
            if (balanceRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Wallet not found' });
            }
            return res.status(200).json({
                success: true,
                wallet: balanceRes.rows[0]
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
    /**
     * POST /api/v1/finance/transactions/subscription
     * Executes a Gym Subscription Purchase using the Double-Entry Financial Engine
     */
    static async purchaseGymSubscription(req, res) {
        try {
            const traineeId = req.user.userId;
            // 1. Validate Input
            const validData = subscriptionSchema.parse(req.body);
            const { gymId, branchId, planId } = validData;
            const client = await pool.connect();
            try {
                // We do not start a transaction here; the FinancialEngine handles the strict BEGIN/COMMIT.
                // But we DO need to fetch the plan details first.
                // 2. Fetch Plan & Gym Details (pricing, platform fee)
                const planQuery = `
          SELECT p.base_price_egp, p.name as plan_name, g.platform_fee_pct 
          FROM gym_subscription_plans p
          JOIN gyms g ON p.gym_id = g.id
          WHERE p.id = $1 AND p.gym_id = $2 AND p.is_active = TRUE
        `;
                const planRes = await client.query(planQuery, [planId, gymId]);
                if (planRes.rows.length === 0) {
                    client.release();
                    return res.status(404).json({ success: false, message: 'Active Gym Plan not found' });
                }
                const plan = planRes.rows[0];
                let finalPrice = Number(plan.base_price_egp);
                // 3. Dynamic Pricing check (Are we in an off-peak flash sale?)
                if (branchId) {
                    // A real implementation would parse the current timestamp and check active rules.
                    // e.g: SELECT discount_pct FROM gym_pricing_rules WHERE branch_id = $1 AND now()::time BETWEEN start_time AND end_time AND extract(dow from now()) = ANY(valid_days)
                    const discountQuery = `
             SELECT discount_pct FROM gym_pricing_rules 
             WHERE branch_id = $1 AND is_active = TRUE 
             LIMIT 1
          `;
                    const discountRes = await client.query(discountQuery, [branchId]);
                    if (discountRes.rows.length > 0) {
                        const discountPct = Number(discountRes.rows[0].discount_pct);
                        finalPrice = finalPrice - ((finalPrice * discountPct) / 100);
                    }
                }
                client.release(); // Release client back so FinancialEngine can grab its own pooled transaction client
                // 4. Execute Strict Ledger Transaction
                const txnDescription = `Subscription to ${plan.plan_name} at Gym ${gymId}`;
                const transactionId = await financialEngine.processSubscriptionPayment(traineeId, gymId, finalPrice, Number(plan.platform_fee_pct), txnDescription);
                // 5. Create Subscription Access Record
                // (Typically handled inside an event bus listener for decoupled architecture, but done synchronously here for simplicity)
                await pool.query(`
          INSERT INTO gym_subscriptions (trainee_id, plan_id, branch_id, transaction_id, status, amount_paid, starts_at, expires_at)
          VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW() + INTERVAL '30 days')
        `, [traineeId, planId, branchId || null, transactionId, finalPrice]);
                return res.status(200).json({
                    success: true,
                    message: 'Subscription purchased successfully.',
                    transactionId,
                    totalPaid: finalPrice
                });
            }
            catch (error) {
                if (client)
                    client.release(); // Fallback release
                if (error.message.includes('Insufficient funds') || error.message.includes('Wallet not found')) {
                    return res.status(400).json({ success: false, message: error.message });
                }
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
