import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const pool = new Pool();

export class ChallengeController {

    /**
     * GET /api/v1/challenges
     * List all active and upcoming challenges.
     */
    static async listChallenges(req: AuthRequest, res: Response) {
        try {
            const challenges = await pool.query(`
                SELECT c.*, 
                       (SELECT COUNT(*) FROM challenge_participants p WHERE p.challenge_id = c.id) as current_participants 
                FROM challenges c
                WHERE c.status IN ('active', 'upcoming')
                ORDER BY c.starts_at ASC
            `);

            return res.status(200).json({ success: true, challenges: challenges.rows });
        } catch (error) {
            console.error('[ChallengeController] listChallenges:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    /**
     * POST /api/v1/challenges/:id/join
     */
    static async joinChallenge(req: AuthRequest, res: Response) {
        const challengeId = req.params.id;
        const userId = req.user!.userId;
        const { gymId } = req.body; // Needed if it's a gym_vs_gym challenge

        try {
            await pool.query(`
                INSERT INTO challenge_participants (challenge_id, user_id, gym_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (challenge_id, user_id) DO NOTHING
            `, [challengeId, userId, gymId || null]);

            return res.status(200).json({ success: true, message: 'Joined challenge successfully' });
        } catch (error) {
            console.error('[ChallengeController] joinChallenge:', error);
            res.status(500).json({ success: false, message: 'Failed to join challenge' });
        }
    }
}
