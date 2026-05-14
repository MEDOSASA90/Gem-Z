"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChurnPrediction = exports.assignPlanToClient = exports.getTrainerClients = exports.getTrainerRevenue = exports.getTrainerStats = void 0;
const zod_1 = __importDefault(require("zod"));
const db_1 = require("../../core/database/db");
const getTrainerStats = async (req, res) => {
    try {
        const trainerId = req.user?.userId;
        if (!trainerId)
            return res.status(401).json({ error: 'Unauthorized Trainer Access' });
        // MOCKED RESPONSE
        res.status(200).json({
            success: true,
            data: {
                earnings: 12500.50,
                clients: 14
            }
        });
    }
    catch (error) {
        console.error('[TrainerController] getStats Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getTrainerStats = getTrainerStats;
const getTrainerRevenue = async (req, res) => {
    try {
        const trainerId = req.user?.userId;
        if (!trainerId)
            return res.status(401).json({ error: 'Unauthorized Trainer Access' });
        const statsResult = await db_1.db.query(`
            SELECT
                COALESCE(SUM(net_amount) FILTER (WHERE status = 'COMPLETED'), 0) as total_revenue,
                COALESCE(SUM(net_amount) FILTER (
                    WHERE status = 'COMPLETED'
                      AND created_at >= date_trunc('month', NOW())
                ), 0) as this_month,
                COUNT(DISTINCT buyer_id) FILTER (WHERE status = 'COMPLETED') as client_count
            FROM financial_transactions
            WHERE user_id = $1
        `, [trainerId]);
        const transactionsResult = await db_1.db.query(`
            SELECT ft.id,
                   COALESCE(u.full_name, 'Unknown Client') as client,
                   LOWER(ft.type) as type,
                   ft.net_amount as amount,
                   ft.created_at as date,
                   LOWER(ft.status) as status
            FROM financial_transactions ft
            LEFT JOIN users u ON u.id = ft.buyer_id
            WHERE ft.user_id = $1
            ORDER BY ft.created_at DESC
            LIMIT 50
        `, [trainerId]);
        const statsRow = statsResult.rows[0];
        const totalRevenue = Number(statsRow.total_revenue);
        const clientCount = Number(statsRow.client_count);
        return res.status(200).json({
            success: true,
            stats: {
                totalRevenue,
                thisMonth: Number(statsRow.this_month),
                avgPerClient: clientCount > 0 ? Number((totalRevenue / clientCount).toFixed(2)) : 0
            },
            transactions: transactionsResult.rows.map(tx => ({
                ...tx,
                amount: Number(tx.amount),
                date: tx.date?.toISOString?.().slice(0, 10) || tx.date
            }))
        });
    }
    catch (error) {
        console.error('[TrainerController] getRevenue Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load trainer revenue' });
    }
};
exports.getTrainerRevenue = getTrainerRevenue;
const getTrainerClients = async (req, res) => {
    try {
        const trainerId = req.user?.userId;
        if (!trainerId)
            return res.status(401).json({ error: 'Unauthorized Trainer Access' });
        const result = await db_1.db.query(`
            SELECT DISTINCT
                u.id,
                u.full_name as name,
                u.email,
                u.phone,
                COALESCE(wp.name, ts.status::text, 'Assigned Client') as plan,
                ts.status::text as status,
                ts.created_at as joined,
                0 as sessions,
                0 as progress
            FROM trainer_subscriptions ts
            JOIN users u ON u.id = ts.trainee_id
            LEFT JOIN trainer_subscription_plans wp ON wp.id = ts.plan_id
            WHERE ts.trainer_id = $1
            ORDER BY ts.created_at DESC
            LIMIT 100
        `, [trainerId]);
        return res.status(200).json({
            success: true,
            clients: result.rows.map(row => ({
                ...row,
                joined: row.joined?.toISOString?.().slice(0, 10) || row.joined,
                sessions: Number(row.sessions),
                progress: Number(row.progress)
            }))
        });
    }
    catch (error) {
        console.error('[TrainerController] getClients Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load trainer clients' });
    }
};
exports.getTrainerClients = getTrainerClients;
const assignPlanToClient = async (req, res) => {
    try {
        const schema = zod_1.default.object({
            traineeId: zod_1.default.string().uuid(),
            planId: zod_1.default.string().uuid(),
            planType: zod_1.default.enum(['WORKOUT', 'DIET'])
        });
        const { traineeId, planId, planType } = schema.parse(req.body);
        // MOCKED SUCCESSFUL ASSIGNMENT
        res.status(200).json({
            success: true,
            message: `Plan assigned successfully to client`,
            assignmentId: 'mock-assignment-uuid-1234'
        });
    }
    catch (error) {
        console.error('[TrainerController] assignPlan Error:', error);
        res.status(400).json({ error: 'Invalid payload or server error' });
    }
};
exports.assignPlanToClient = assignPlanToClient;
const getChurnPrediction = async (req, res) => {
    try {
        const trainerId = req.user?.userId;
        // Mock churn prediction identifying at-risk users
        const atRiskClients = [
            { traineeId: 'u_111', name: 'Ali M.', riskLevel: 'High', lastActiveDays: 8, aiSuggestion: 'Send a motivating message regarding their skipped leg day.' },
            { traineeId: 'u_222', name: 'Mona Z.', riskLevel: 'Medium', lastActiveDays: 4, aiSuggestion: 'Offer a minor diet adjustment to break plateau.' }
        ];
        return res.status(200).json({ success: true, atRiskClients });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error calculating churn' });
    }
};
exports.getChurnPrediction = getChurnPrediction;
