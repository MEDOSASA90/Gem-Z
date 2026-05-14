"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTicket = exports.getGlobalMetrics = void 0;
const getGlobalMetrics = async (req, res) => {
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
    }
    catch (error) {
        console.error('[AdminController] getGlobalMetrics Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getGlobalMetrics = getGlobalMetrics;
const resolveTicket = async (req, res) => {
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
    }
    catch (error) {
        console.error('[AdminController] resolveTicket Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.resolveTicket = resolveTicket;
