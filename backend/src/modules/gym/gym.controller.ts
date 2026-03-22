import { Response } from 'express';
import z from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export const getGymStats = async (req: AuthRequest, res: Response) => {
    try {
        const gymId = req.user?.entityId || req.user?.userId;
        if (!gymId) return res.status(401).json({ error: 'Unauthorized Gym Access' });

        res.status(200).json({
            success: true,
            data: {
                availableBal: 250000.00,
                pendingBal: 12000.50,
                totalMembers: 405
            }
        });

    } catch (error) {
        console.error('[GymController] getGymStats Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const setOffPeakPricing = async (req: AuthRequest, res: Response) => {
    try {
        const gymId = req.user?.entityId || req.user?.userId;

        const schema = z.object({
            isActive: z.boolean(),
            discountPercentage: z.number().min(0).max(100).optional()
        });

        const { isActive, discountPercentage } = schema.parse(req.body);

        res.status(200).json({
            success: true,
            data: { gym_id: gymId, is_off_peak_active: isActive, off_peak_discount: discountPercentage || 20.00 },
            message: `Off-Peak pricing ${isActive ? 'activated' : 'deactivated'} (Mock)`
        });

    } catch (error) {
        console.error('[GymController] setOffPeakPricing Error:', error);
        res.status(400).json({ error: 'Invalid payload or server error' });
    }
};
