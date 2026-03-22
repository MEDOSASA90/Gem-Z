import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export const getGlobalMetrics = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Access Denied: Super Admin Clearance Required' });
        }

        res.status(200).json({
            success: true,
            data: {
                totalActiveUsers: 1450,
                globalRevenue: 50400.25
            }
        });

    } catch (error) {
        console.error('[AdminController] getGlobalMetrics Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const resolveTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Access Denied' });
        }

        const { ticketId, resolutionNotes } = req.body;

        if (!ticketId) {
            return res.status(400).json({ error: 'Ticket ID is required' });
        }

        res.status(200).json({
            success: true,
            message: `Ticket ${ticketId} resolved successfully.`,
            data: { id: ticketId, status: 'RESOLVED' }
        });

    } catch (error) {
        console.error('[AdminController] resolveTicket Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
