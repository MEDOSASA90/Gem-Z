"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const db_1 = require("../core/database/db");
let openai;
try {
    openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY || 'fake-key-to-skip-crash-on-startup' });
}
catch (e) { }
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
            const { rows } = await db_1.db.query(insertQuery, [
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
    /**
     * Extracts National ID, Full Name, and Date of Birth from ID card images using GPT-4o.
     */
    static async extractIdData(idFrontBase64, idBackBase64) {
        try {
            const prompt = `
            You are an expert AI system for the "GEM Z" fitness platform.
            Extract the following information from the provided ID card images (front and back).
            
            REQUIREMENTS:
            - Output MUST be valid JSON.
            - Extract 'national_id', 'full_name', and 'date_of_birth' (YYYY-MM-DD format).
            
            EXPECTED JSON FORMAT:
            {
              "national_id": "String",
              "full_name": "String",
              "date_of_birth": "YYYY-MM-DD"
            }
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Here is the front of the ID.' },
                            { type: 'image_url', image_url: { url: idFrontBase64 } },
                            { type: 'text', text: 'Here is the back of the ID.' },
                            { type: 'image_url', image_url: { url: idBackBase64 } }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });
            const responseContent = completion.choices[0].message.content;
            if (!responseContent)
                throw new Error('OpenAI returned empty response.');
            return JSON.parse(responseContent);
        }
        catch (error) {
            console.error('[AIService] extractIdData Error:', error);
            return null; // Return null to not block registration if AI fails
        }
    }
    /**
     * Generates a comprehensive diet and workout plan for a specific trainee based on provided stats.
     */
    static async generateComprehensivePlan(profile, trainerId) {
        try {
            const prompt = `
            You are an elite sports nutritionist and personal trainer AI for "GEM Z".
            Create a highly optimal, structured 7-day Diet & Workout Plan based on the trainee's profile.
            
            TRAINEE PROFILE:
            Name: ${profile.traineeName}
            Age: ${profile.age}, Weight: ${profile.weight}kg, Height: ${profile.height || 'N/A'}cm
            Goal: ${profile.goal}
            Fitness Level: ${profile.fitnessLevel || 'Beginner'}
            Allergies/Dietary: ${profile.allergies || 'None'}
            Physical Limitations: ${profile.limitations || 'None'}
            
            REQUIREMENTS:
            - Output MUST be valid JSON.
            - Include both 'diet_plan' and 'workout_plan'.
            - Create a structured 7-day routine. Calculate strict macros.
            
            EXPECTED JSON FORMAT:
            {
              "diet_plan": {
                  "daily_calories": Number,
                  "macros": {"protein": Number, "carbs": Number, "fats": Number},
                  "days": [
                      { "day": 1, "meals": [{"type": "String", "food": "String", "calories": Number}] }
                  ]
              },
              "workout_plan": {
                  "goal": "String",
                  "days": [
                      { "day": 1, "focus": "String", "exercises": [{"name": "String", "sets": Number, "reps": "String"}] }
                  ]
              },
              "warnings": ["String"]
            }
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.3,
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('OpenAI empty response');
            const parsedPlan = JSON.parse(content);
            const insertQuery = `
                INSERT INTO ai_generated_plans (trainer_id, trainee_name, plan_type, plan_data, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING id;
            `;
            const { rows } = await db_1.db.query(insertQuery, [
                trainerId,
                profile.traineeName,
                'FULL_PLAN',
                parsedPlan
            ]);
            return { planId: rows[0].id, plan: parsedPlan };
        }
        catch (error) {
            console.error('[AIService] Comprehensive Plan Error:', error);
            throw new Error('Failed to generate full AI Plan');
        }
    }
    /**
     * AI Form Analysis using Vision API
     */
    static async analyzeForm(imageUrl, exerciseName) {
        try {
            const prompt = `
            You are an expert AI personal trainer specializing in biomechanics and exercise form.
            Analyze the provided image of a user performing the exercise: ${exerciseName}.
            Identify any form errors, suggest corrections, and rate the form out of 10.
            
            EXPECTED JSON FORMAT:
            {
              "rating": Number,
              "errors_detected": ["String"],
              "corrections": ["String"],
              "is_safe": Boolean
            }
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this exercise form.' },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('OpenAI empty response');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('[AIService] analyzeForm Error:', error);
            throw new Error('Failed to analyze form');
        }
    }
    /**
     * AI Food Scanner using Vision API
     */
    static async scanFood(imageUrl) {
        try {
            const prompt = `
            You are an expert AI nutritionist.
            Analyze the provided image of food and estimate its macronutrients and calories.
            
            EXPECTED JSON FORMAT:
            {
              "food_identified": "String",
              "estimated_calories": Number,
              "macros": { "protein": Number, "carbs": Number, "fats": Number },
              "confidence_score": Number
            }
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this food.' },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2,
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('OpenAI empty response');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('[AIService] scanFood Error:', error);
            throw new Error('Failed to scan food');
        }
    }
    /**
     * Dynamic Plan Adjuster
     */
    static async adjustPlanDynamically(planId, feedback) {
        try {
            const prompt = `
            You are an expert AI personal trainer.
            Adjust the workout plan dynamically based on user feedback (fatigue, sleep, muscle soreness).
            
            USER FEEDBACK:
            ${JSON.stringify(feedback)}
            
            EXPECTED JSON FORMAT:
            {
              "adjusted_plan_summary": "String",
              "intensity_modifier": "String",
              "recommended_rest_days_added": Number,
              "modified_exercises": ["String"]
            }
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.3,
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('OpenAI empty response');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('[AIService] adjustPlanDynamically Error:', error);
            throw new Error('Failed to adjust plan');
        }
    }
    /**
     * Fitness Chatbot
     */
    static async chatWithAI(userId, message) {
        try {
            const prompt = `
            You are the "GEM Z" AI Fitness Coach. 
            Answer the user's fitness, diet, or health-related question accurately, enthusiastically, and concisely.
            If the question is unrelated to fitness, health, or the app, politely steer them back.
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('OpenAI empty response');
            return content;
        }
        catch (error) {
            console.error('[AIService] chatWithAI Error:', error);
            throw new Error('Failed to chat with AI');
        }
    }
}
exports.AIService = AIService;
