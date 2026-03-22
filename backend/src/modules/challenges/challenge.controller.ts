import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export class ChallengeController {
    static async listChallenges(req: AuthRequest, res: Response) {
        try {
            res.status(200).json({ success: true, challenges: [] });
        } catch (error) {
            console.error('[ChallengeController] listChallenges:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    static async joinChallenge(req: AuthRequest, res: Response) {
        try {
            res.status(200).json({ success: true, message: 'Joined challenge successfully' });
        } catch (error) {
            console.error('[ChallengeController] joinChallenge:', error);
            res.status(500).json({ success: false, message: 'Failed to join challenge' });
        }
    }
}
