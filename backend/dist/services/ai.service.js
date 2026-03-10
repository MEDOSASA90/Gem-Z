"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const pg_1 = require("pg");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const db = new pg_1.Pool();
class AIService {
    /**
     * Constructs strict prompt to generate JSON diet plan based on OCR Medical Report JSONB.
     */
    static async generateDietPlan(medicalReportJson, profile) {
        try {
            const prompt = `
        You are an expert sports nutritionist AI for the "GEM Z" fitness platform.
        Generate a strictly structured 7-day diet plan based on the following context.
        
        USER PROFILE:
        Age: ${profile.age}, Goal: ${profile.weightGoal}, Activity: ${profile.activityLevel}
        
        OCR MEDICAL DATA (JSON):
        ${JSON.stringify(medicalReportJson)}
        
        REQUIREMENTS:
        - Output MUST be valid JSON matching our database schema expectations.
        - Calculate precise macros (Protein, Carbs, Fats) per meal.
        - Handle any allergies or medical flags found in the OCR data.
        
        EXPECTED JSON FORMAT:
        {
          "plan_title": "String",
          "total_daily_calories": Number,
          "macros": { "protein": Number, "carbs": Number, "fats": Number },
          "days": [
            {
              "day": 1,
              "meals": [
                { "type": "Breakfast", "food": "String", "calories": Number }
              ]
            }
          ],
          "medical_warnings": ["String"]
        }
      `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.2, // Strict generation
            });
            const responseContent = completion.choices[0].message.content;
            if (!responseContent)
                throw new Error('OpenAI returned empty response.');
            const parsedPlan = JSON.parse(responseContent);
            // Save to ai_diet_plans schema
            const insertQuery = `
        INSERT INTO ai_diet_plans (user_id, plan_data, metadata, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id;
      `;
            const { rows } = await db.query(insertQuery, [
                profile.userId,
                parsedPlan,
                { generated_by: 'gpt-4o', source: 'ocr_report' }
            ]);
            return {
                success: true,
                planId: rows[0].id,
                plan: parsedPlan
            };
        }
        catch (error) {
            console.error('[AIService] generateDietPlan Error:', error);
            throw new Error('Failed to generate AI Diet Plan');
        }
    }
}
exports.AIService = AIService;
