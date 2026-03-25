import { Request, Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

export class BiddingController {
    static async createRequest(req: AuthRequest, res: Response) {
        const userId = req.user?.userId;
        const { title, description, budget, durationWeeks } = req.body;

        try {
            const mockRequest = {
                id: uuidv4(),
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

        } catch (error) {
            console.error('[Bidding] Create Request Error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    static async getOpenRequests(req: AuthRequest, res: Response) {
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
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error fetching requests' });
        }
    }

    static async submitBid(req: AuthRequest, res: Response) {
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
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to submit bid' });
        }
    }

    static async acceptBid(req: AuthRequest, res: Response) {
        try {
            const traineeId = req.user?.userId;
            const { bidId } = req.params;
            // Logic to accept the bid, deduct coins/money, create active contract
            return res.status(200).json({
                success: true,
                message: 'Bid accepted successfully. Contract started!',
                data: { bidId, traineeId, status: 'accepted' }
            });
        } catch (error) {
            console.error('[Bidding] acceptBid:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
}
