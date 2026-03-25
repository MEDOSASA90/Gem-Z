import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { ChallengeController } from './challenge.controller';

const router = express.Router();

router.get('/', authenticate as any, ChallengeController.listChallenges as any);
router.post('/join', authenticate as any, ChallengeController.joinChallenge as any);
router.post('/live-squad', authenticate as any, ChallengeController.createLiveSquadChallenge as any);
router.post('/track-habit', authenticate as any, ChallengeController.trackUserHabit as any);

export default router;
