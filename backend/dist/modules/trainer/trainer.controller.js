"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignPlanToClient = exports.getTrainerStats = void 0;
const zod_1 = __importDefault(require("zod"));
const getTrainerStats = async (req, res) => {
    try {
        const trainerId = req.user?.entityId || req.user?.userId;
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
