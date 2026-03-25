import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { generatePlan, getSavedPlans, analyzeForm, scanFood, adjustPlanDynamically, chatWithAI, logVoiceWorkout, renderCinematicWorkout } from './ai.controller';

const router = express.Router();

router.post('/generate', authenticate as any, generatePlan as any);
router.get('/plans', authenticate as any, getSavedPlans as any);
router.post('/form-analysis', authenticate as any, analyzeForm as any);
router.post('/food-scanner', authenticate as any, scanFood as any);
router.post('/dynamic-plan', authenticate as any, adjustPlanDynamically as any);
router.post('/chat', authenticate as any, chatWithAI as any);
router.post('/voice-logger', authenticate as any, logVoiceWorkout as any);
router.post('/cinematics/render', authenticate as any, renderCinematicWorkout as any);

export default router;
