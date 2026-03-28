"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCinematicWorkout = exports.logVoiceWorkout = exports.chatWithAI = exports.adjustPlanDynamically = exports.scanFood = exports.analyzeForm = exports.getSavedPlans = exports.generatePlan = void 0;
const ai_service_1 = require("../../services/ai.service");
const db_1 = require("../../core/database/db");
const generatePlan = async (req, res) => {
    try {
        const userId = req.user?.userId; // Usually the trainer's ID
        const { traineeName, age, weight, height, goal, fitnessLevel, allergies, limitations } = req.body;
        if (!traineeName || !age || !weight || !goal) {
            return res.status(400).json({ success: false, message: 'Missing required trainee stats.' });
        }
        const profile = { traineeName, age, weight, height, goal, fitnessLevel, allergies, limitations };
        const result = await ai_service_1.AIService.generateComprehensivePlan(profile, userId);
        return res.status(200).json({ success: true, planData: result.plan, planId: result.planId });
    }
    catch (error) {
        console.error('[AIController generatePlan]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error generating AI plan.' });
    }
};
exports.generatePlan = generatePlan;
const getSavedPlans = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { rows } = await db_1.db.query(`SELECT * FROM ai_generated_plans WHERE trainer_id = $1 ORDER BY created_at DESC`, [userId]);
        return res.status(200).json({ success: true, count: rows.length, plans: rows });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch saved AI plans.' });
    }
};
exports.getSavedPlans = getSavedPlans;
const analyzeForm = async (req, res) => {
    try {
        const { imageUrl, exerciseName } = req.body;
        if (!imageUrl || !exerciseName) {
            return res.status(400).json({ success: false, message: 'Missing imageUrl or exerciseName.' });
        }
        const result = await ai_service_1.AIService.analyzeForm(imageUrl, exerciseName);
        return res.status(200).json({ success: true, analysis: result });
    }
    catch (error) {
        console.error('[AIController analyzeForm]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error analyzing form.' });
    }
};
exports.analyzeForm = analyzeForm;
const scanFood = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Missing imageUrl.' });
        }
        const result = await ai_service_1.AIService.scanFood(imageUrl);
        return res.status(200).json({ success: true, nutrition: result });
    }
    catch (error) {
        console.error('[AIController scanFood]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error scanning food.' });
    }
};
exports.scanFood = scanFood;
const adjustPlanDynamically = async (req, res) => {
    try {
        const { planId, feedback } = req.body;
        if (!planId || !feedback) {
            return res.status(400).json({ success: false, message: 'Missing planId or feedback.' });
        }
        const result = await ai_service_1.AIService.adjustPlanDynamically(planId, feedback);
        return res.status(200).json({ success: true, adjustedPlan: result });
    }
    catch (error) {
        console.error('[AIController adjustPlanDynamically]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error adjusting plan.' });
    }
};
exports.adjustPlanDynamically = adjustPlanDynamically;
const chatWithAI = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Missing message.' });
        }
        const result = await ai_service_1.AIService.chatWithAI(userId, message);
        return res.status(200).json({ success: true, reply: result });
    }
    catch (error) {
        console.error('[AIController chatWithAI]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error chatting with AI.' });
    }
};
exports.chatWithAI = chatWithAI;
const logVoiceWorkout = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { audioTranscription } = req.body;
        if (!audioTranscription) {
            return res.status(400).json({ success: false, message: 'Missing audio transcription.' });
        }
        // Mock AI parsing
        const parsedLogs = [
            { exercise: 'Bench Press', weight: 80, reps: 10, sets: 3 }
        ];
        return res.status(200).json({ success: true, message: 'Voice workout logged correctly', parsedLogs });
    }
    catch (error) {
        console.error('[AIController logVoiceWorkout]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error processing voice.' });
    }
};
exports.logVoiceWorkout = logVoiceWorkout;
const renderCinematicWorkout = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { videoUrl, exercise } = req.body;
        if (!videoUrl || !exercise) {
            return res.status(400).json({ success: false, message: 'Missing videoUrl or exercise type.' });
        }
        // Mocking an intense AI pipeline (OpenCV / MediaPipe logic)
        // that traces the barbell path, stabilizing the video, and applying neon overlays.
        const cinematicResult = {
            originalVideo: videoUrl,
            processedVideoUrl: 'https://gemz.app/cinematics/rendered_' + Date.now() + '.mp4',
            effectsApplied: ['Barbell Path Trace (Neon Green)', 'Rep Counter Overlay', 'Background Blur'],
            repCountVerified: 8,
            status: 'Processing Complete'
        };
        return res.status(200).json({ success: true, cinematicRender: cinematicResult });
    }
    catch (error) {
        console.error('[AIController renderCinematicWorkout]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error processing cinematic video.' });
    }
};
exports.renderCinematicWorkout = renderCinematicWorkout;
