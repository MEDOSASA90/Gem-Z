/**
 * GEM Z — Progress Photos Routes
 *
 * Routes:
 *   POST /api/v1/progress/upload          — Upload progress photo
 *   GET  /api/v1/progress/timeline        — Get photo timeline
 *   GET  /api/v1/progress/photos/:id      — Get single photo
 *   DELETE /api/v1/progress/photos/:id    — Delete photo
 *   POST /api/v1/progress/photos/:id/analyze — Run AI analysis
 *   GET  /api/v1/progress/photos/:id/ai-analysis — Get AI analysis
 *   GET  /api/v1/progress/compare         — Compare two photos
 */

import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { ProgressController } from './progress.controller';

const router = express.Router();
const auth = authenticate as any;

router.post('/upload', auth, ProgressController.uploadPhoto);
router.get('/timeline', auth, ProgressController.getTimeline);
router.get('/photos/:id', auth, ProgressController.getPhoto);
router.delete('/photos/:id', auth, ProgressController.deletePhoto);
router.post('/photos/:id/analyze', auth, ProgressController.runAIAnalysis);
router.get('/photos/:id/ai-analysis', auth, ProgressController.getAIAnalysis);
router.get('/compare', auth, ProgressController.comparePhotos);

export default router;
