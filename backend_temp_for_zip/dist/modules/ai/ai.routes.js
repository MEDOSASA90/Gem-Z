"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const ai_controller_1 = require("./ai.controller");
const router = express_1.default.Router();
router.post('/generate', auth_middleware_1.verifyToken, ai_controller_1.generatePlan);
router.get('/plans', auth_middleware_1.verifyToken, ai_controller_1.getSavedPlans);
router.post('/form-analysis', auth_middleware_1.verifyToken, ai_controller_1.analyzeForm);
router.post('/food-scanner', auth_middleware_1.verifyToken, ai_controller_1.scanFood);
router.post('/dynamic-plan', auth_middleware_1.verifyToken, ai_controller_1.adjustPlanDynamically);
router.post('/chat', auth_middleware_1.verifyToken, ai_controller_1.chatWithAI);
router.post('/voice-logger', auth_middleware_1.verifyToken, ai_controller_1.logVoiceWorkout);
router.post('/cinematics/render', auth_middleware_1.verifyToken, ai_controller_1.renderCinematicWorkout);
exports.default = router;
