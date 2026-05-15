/**
 * GEM Z — AR Workout Routes
 *
 * Routes for AR exercise 3D model data:
 *   - Model CRUD
 *   - Exercise data retrieval
 *   - AR session management
 */

import express from 'express';
import { ARController } from './ar.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';

const router = express.Router();

// ─── Model CRUD ─────────────────────────────────────────────────

router.post(
    '/models',
    authenticate as any,
    validateBody(ARController.validations.createModel) as any,
    ARController.createModel as any
);

router.put(
    '/models/:modelId',
    authenticate as any,
    validateBody(ARController.validations.updateModel) as any,
    ARController.updateModel as any
);

router.get(
    '/models',
    validateQuery(ARController.validations.search) as any,
    ARController.searchModels as any
);

router.get(
    '/models/:modelId',
    ARController.getModel as any
);

router.get(
    '/models/:modelId/exercise',
    ARController.getExerciseData as any
);

router.delete(
    '/models/:modelId',
    authenticate as any,
    ARController.deleteModel as any
);

// ─── AR Sessions ────────────────────────────────────────────────

router.post(
    '/sessions',
    authenticate as any,
    validateBody(ARController.validations.startSession) as any,
    ARController.startSession as any
);

router.post(
    '/sessions/:sessionId/complete',
    authenticate as any,
    validateBody(ARController.validations.completeSession) as any,
    ARController.completeSession as any
);

router.get(
    '/sessions',
    authenticate as any,
    ARController.getSessionHistory as any
);

// ─── Stats ──────────────────────────────────────────────────────

router.get(
    '/stats',
    ARController.getStats as any
);

export default router;
