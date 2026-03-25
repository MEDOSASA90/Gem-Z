import { Request, Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { AIService } from '../../services/ai.service';
import { db } from '../../core/database/db';

export const generatePlan = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId as string; // Usually the trainer's ID
        const { traineeName, age, weight, height, goal, fitnessLevel, allergies, limitations } = req.body;

        if (!traineeName || !age || !weight || !goal) {
            return res.status(400).json({ success: false, message: 'Missing required trainee stats.' });
        }

        const profile = { traineeName, age, weight, height, goal, fitnessLevel, allergies, limitations };
        const result = await AIService.generateComprehensivePlan(profile, userId);

        return res.status(200).json({ success: true, planData: result.plan, planId: result.planId });
    } catch (error: any) {
        console.error('[AIController generatePlan]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error generating AI plan.' });
    }
};

export const getSavedPlans = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId as string;
        const { rows } = await db.query(`SELECT * FROM ai_generated_plans WHERE trainer_id = $1 ORDER BY created_at DESC`, [userId]);
        return res.status(200).json({ success: true, count: rows.length, plans: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch saved AI plans.' });
    }
};

export const analyzeForm = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { imageUrl, exerciseName } = req.body;
        if (!imageUrl || !exerciseName) {
            return res.status(400).json({ success: false, message: 'Missing imageUrl or exerciseName.' });
        }
        const result = await AIService.analyzeForm(imageUrl, exerciseName);
        return res.status(200).json({ success: true, analysis: result });
    } catch (error: any) {
        console.error('[AIController analyzeForm]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error analyzing form.' });
    }
};

export const scanFood = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Missing imageUrl.' });
        }
        const result = await AIService.scanFood(imageUrl);
        return res.status(200).json({ success: true, nutrition: result });
    } catch (error: any) {
        console.error('[AIController scanFood]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error scanning food.' });
    }
};

export const adjustPlanDynamically = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { planId, feedback } = req.body;
        if (!planId || !feedback) {
            return res.status(400).json({ success: false, message: 'Missing planId or feedback.' });
        }
        const result = await AIService.adjustPlanDynamically(planId, feedback);
        return res.status(200).json({ success: true, adjustedPlan: result });
    } catch (error: any) {
        console.error('[AIController adjustPlanDynamically]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error adjusting plan.' });
    }
};

export const chatWithAI = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId as string;
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Missing message.' });
        }
        const result = await AIService.chatWithAI(userId, message);
        return res.status(200).json({ success: true, reply: result });
    } catch (error: any) {
        console.error('[AIController chatWithAI]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error chatting with AI.' });
    }
};

export const logVoiceWorkout = async (req: AuthRequest, res: Response): Promise<any> => {
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
    } catch (error: any) {
        console.error('[AIController logVoiceWorkout]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error processing voice.' });
    }
};

export const renderCinematicWorkout = async (req: AuthRequest, res: Response): Promise<any> => {
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
    } catch (error: any) {
        console.error('[AIController renderCinematicWorkout]', error);
        return res.status(500).json({ success: false, message: error.message || 'Error processing cinematic video.' });
    }
};
