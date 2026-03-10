"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignPlanToClient = exports.getTrainerStats = void 0;
const pg_1 = require("pg");
const zod_1 = __importDefault(require("zod"));
const db = new pg_1.Pool();
const getTrainerStats = async (req, res) => {
    try {
        const trainerId = req.user?.entityId || req.user?.userId;
        if (!trainerId)
            return res.status(401).json({ error: 'Unauthorized Trainer Access' });
        // Fetch wallet balance and active client count (from subscriptions)
        const query = `
            SELECT 
                w.available_bal,
                (SELECT COUNT(DISTINCT trainee_id) 
                 FROM subscriptions 
                 WHERE trainer_id = $1 AND status = 'ACTIVE') as total_clients
            FROM ledger_wallets w
            WHERE w.entity_id = $1 AND w.entity_type = 'TRAINER';
        `;
        const { rows } = await db.query(query, [trainerId]);
        if (!rows.length)
            return res.status(404).json({ error: 'Wallet not found' });
        res.status(200).json({
            success: true,
            data: {
                earnings: parseFloat(rows[0].available_bal),
                clients: parseInt(rows[0].total_clients, 10)
            }
        });
    }
    catch (error) {
        console.error('[TrainerController] getStats Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getTrainerStats = getTrainerStats;
const assignPlanToClient = async (req, res) => {
    try {
        const trainerId = req.user?.entityId || req.user?.userId;
        const schema = zod_1.default.object({
            traineeId: zod_1.default.string().uuid(),
            planId: zod_1.default.string().uuid(),
            planType: zod_1.default.enum(['WORKOUT', 'DIET'])
        });
        const { traineeId, planId, planType } = schema.parse(req.body);
        // Ensure relation exists (Trainer has an active sub for this Trainee)
        const checkRelationQuery = `
            SELECT id FROM subscriptions 
            WHERE trainer_id = $1 AND trainee_id = $2 AND status = 'ACTIVE' LIMIT 1;
        `;
        const relation = await db.query(checkRelationQuery, [trainerId, traineeId]);
        if (!relation.rows.length) {
            return res.status(403).json({ error: 'Trainee is not actively subscribed to this trainer.' });
        }
        // Dummy table structure assumed for `assigned_plans` mapping
        const assignQuery = `
            INSERT INTO assigned_plans (trainee_id, plan_id, plan_type, assigned_by_trainer, status, created_at)
            VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
            RETURNING id;
        `;
        const { rows } = await db.query(assignQuery, [traineeId, planId, planType, trainerId]);
        res.status(200).json({
            success: true,
            message: `Plan assigned successfully to client`,
            assignmentId: rows[0].id
        });
    }
    catch (error) {
        console.error('[TrainerController] assignPlan Error:', error);
        res.status(400).json({ error: 'Invalid payload or server error' });
    }
};
exports.assignPlanToClient = assignPlanToClient;
