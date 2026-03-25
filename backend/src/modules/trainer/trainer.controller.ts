import { Response } from 'express';
import z from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export const getTrainerStats = async (req: AuthRequest, res: Response) => {
    try {
        const trainerId = req.user?.entityId || req.user?.userId;
        if (!trainerId) return res.status(401).json({ error: 'Unauthorized Trainer Access' });

        // MOCKED RESPONSE
        res.status(200).json({
            success: true,
            data: {
                earnings: 12500.50,
                clients: 14
            }
        });

    } catch (error) {
        console.error('[TrainerController] getStats Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const assignPlanToClient = async (req: AuthRequest, res: Response) => {
    try {
        const schema = z.object({
            traineeId: z.string().uuid(),
            planId: z.string().uuid(),
            planType: z.enum(['WORKOUT', 'DIET'])
        });

        const { traineeId, planId, planType } = schema.parse(req.body);

        // MOCKED SUCCESSFUL ASSIGNMENT
        res.status(200).json({
            success: true,
            message: `Plan assigned successfully to client`,
            assignmentId: 'mock-assignment-uuid-1234'
        });

    } catch (error) {
        console.error('[TrainerController] assignPlan Error:', error);
        res.status(400).json({ error: 'Invalid payload or server error' });
    }
};

export const getChurnPrediction = async (req: AuthRequest, res: Response) => {
    try {
        const trainerId = req.user?.entityId || req.user?.userId;
        // Mock churn prediction identifying at-risk users
        const atRiskClients = [
            { traineeId: 'u_111', name: 'Ali M.', riskLevel: 'High', lastActiveDays: 8, aiSuggestion: 'Send a motivating message regarding their skipped leg day.' },
            { traineeId: 'u_222', name: 'Mona Z.', riskLevel: 'Medium', lastActiveDays: 4, aiSuggestion: 'Offer a minor diet adjustment to break plateau.' }
        ];
        return res.status(200).json({ success: true, atRiskClients });
    } catch (error) {
        return res.status(500).json({ error: 'Server error calculating churn' });
    }
};
