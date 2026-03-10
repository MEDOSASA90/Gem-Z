import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const db = new Pool();

export const getGlobalMetrics = async (req: AuthRequest, res: Response) => {
    try {
        // Enforce Super Admin Role (assuming this is handled globally by route middleware, double-checking here)
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Access Denied: Super Admin Clearance Required' });
        }

        // Aggregate total users across all roles
        const usersQuery = `SELECT COUNT(*) as total_users FROM users WHERE is_active = true;`;

        // Aggregate platform revenue from the PLATFORM wallet
        const revenueQuery = `
            SELECT available_bal 
            FROM ledger_wallets 
            WHERE entity_type = 'PLATFORM' 
            LIMIT 1;
        `;

        const [usersResult, revenueResult] = await Promise.all([
            db.query(usersQuery),
            db.query(revenueQuery)
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalActiveUsers: parseInt(usersResult.rows[0].total_users, 10),
                globalRevenue: parseFloat(revenueResult.rows[0]?.available_bal || '0')
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

        // Dummy update for resolving a ticket
        const resolveQuery = `
            UPDATE support_tickets 
            SET status = 'RESOLVED', resolution_notes = $1, resolved_at = NOW(), resolved_by = $2
            WHERE id = $3
            RETURNING id, status;
        `;

        const { rows } = await db.query(resolveQuery, [resolutionNotes, req.user.userId, ticketId]);

        if (!rows.length) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.status(200).json({
            success: true,
            message: `Ticket ${ticketId} resolved successfully.`,
            data: rows[0]
        });

    } catch (error) {
        console.error('[AdminController] resolveTicket Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
