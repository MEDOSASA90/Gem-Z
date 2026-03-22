"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiddingController = void 0;
const uuid_1 = require("uuid");
class BiddingController {
    static async createRequest(req, res) {
        const userId = req.user?.userId;
        const { title, description, budget, durationWeeks } = req.body;
        try {
            const mockRequest = {
                id: (0, uuid_1.v4)(),
                traineeId: userId,
                title,
                description,
                budget,
                durationWeeks,
                status: 'open',
                createdAt: new Date().toISOString()
            };
            return res.status(201).json({
                success: true,
                message: 'Custom request published to trainers',
                data: mockRequest
            });
        }
        catch (error) {
            console.error('[Bidding] Create Request Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    static async getOpenRequests(req, res) {
        try {
            const mockFeed = [
                {
                    id: 'req_101',
                    traineeName: 'Ahmed Mahmoud',
                    title: 'Need Post-Surgery Shoulder Rehab',
                    description: 'Looking for a certified trainer to help me regain shoulder mobility after rotator cuff surgery. Need 3 days/week.',
                    budget: '2000 - 3000 EGP',
                    durationWeeks: 8,
                    bidsCount: 3,
                    postedAt: '2 hours ago'
                },
                {
                    id: 'req_102',
                    traineeName: 'Sara K.',
                    title: 'Wedding Prep - 12 Weeks to shred',
                    description: 'Need an aggressive diet and HIIT plan to lose 8kg before my wedding in 3 months.',
                    budget: '1500 - 2500 EGP',
                    durationWeeks: 12,
                    bidsCount: 5,
                    postedAt: '5 hours ago'
                }
            ];
            return res.status(200).json({ success: true, data: mockFeed });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error fetching requests' });
        }
    }
    static async submitBid(req, res) {
        const trainerId = req.user?.userId;
        const { id } = req.params;
        const { proposedPrice, message } = req.body;
        try {
            return res.status(201).json({
                success: true,
                message: 'Bid submitted successfully',
                data: {
                    requestId: id,
                    trainerId,
                    proposedPrice,
                    message,
                    status: 'pending'
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to submit bid' });
        }
    }
}
exports.BiddingController = BiddingController;
