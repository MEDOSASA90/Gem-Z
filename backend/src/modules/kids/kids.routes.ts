/**
 * GEM Z — Kid Fitness Routes
 *
 * Routes:
 *   GET  /api/v1/kids/workouts             — Age-appropriate workouts
 *   GET  /api/v1/kids/workouts/:id         — Single workout
 *   POST /api/v1/kids/workouts/:id/complete — Complete workout
 *   GET  /api/v1/kids/challenges           — Kid-friendly challenges
 *   POST /api/v1/kids/challenges/:id/join  — Join challenge
 *   GET  /api/v1/kids/stats                — Kid stats
 *   GET  /api/v1/kids/parent-dashboard     — Parent dashboard
 */

import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { KidsController } from './kids.controller';

const router = express.Router();
const auth = authenticate as any;

router.get('/workouts', auth, KidsController.getWorkouts);
router.get('/workouts/:id', auth, KidsController.getWorkout);
router.post('/workouts/:id/complete', auth, KidsController.completeWorkout);
router.get('/challenges', auth, KidsController.getChallenges);
router.post('/challenges/:id/join', auth, KidsController.joinChallenge);
router.get('/stats', auth, KidsController.getStats);
router.get('/parent-dashboard', auth, KidsController.getParentDashboard);

export default router;
