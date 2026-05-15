/**
 * GEM Z — AI Workout Generator Service
 *
 * Business logic for AI-powered personalized workout plans:
 * - Generate weekly workout plans via OpenAI GPT-4o
 * - Store plans with exercises, sets, reps, rest periods
 * - Retrieve and manage workout plans
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';

const log = createLogger('workout-service');

// ─── Types ──────────────────────────────────────────────────────

export interface WorkoutExercise {
    id: string;
    planId: string;
    dayOfWeek: number;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: string;
    restSeconds: number;
    durationMinutes: number | null;
    equipment: string;
    instructions: string | null;
    orderIndex: number;
    createdAt: Date;
}

export interface WorkoutPlan {
    id: string;
    userId: string;
    goal: 'lose_weight' | 'build_muscle' | 'endurance';
    fitnessLevel: string;
    equipmentAvailable: string[];
    daysPerWeek: number;
    status: 'active' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    exercises?: WorkoutExercise[];
}

export interface WorkoutPlanInput {
    goal: 'lose_weight' | 'build_muscle' | 'endurance';
    fitnessLevel: string;
    equipmentAvailable: string[];
    daysPerWeek: number;
}

interface AIWorkoutResponse {
    exercises: {
        dayOfWeek: number;
        name: string;
        muscleGroup: string;
        sets: number;
        reps: string;
        restSeconds: number;
        durationMinutes: number | null;
        equipment: string;
        instructions: string;
        orderIndex: number;
    }[];
}

// ─── Service ────────────────────────────────────────────────────

export class WorkoutService {
    constructor(private pool: Pool) {}

    // ─── Generate Workout Plan ────────────────────────────────

    async generateWorkoutPlan(userId: string, input: WorkoutPlanInput): Promise<WorkoutPlan> {
        const { goal, fitnessLevel, equipmentAvailable, daysPerWeek } = input;

        // Validate input
        if (!goal || !['lose_weight', 'build_muscle', 'endurance'].includes(goal)) {
            throw new ValidationError('Goal must be lose_weight, build_muscle, or endurance', ErrorCode.INVALID_INPUT);
        }
        if (!fitnessLevel || !['beginner', 'intermediate', 'advanced'].includes(fitnessLevel)) {
            throw new ValidationError('Fitness level must be beginner, intermediate, or advanced', ErrorCode.INVALID_INPUT);
        }
        if (!daysPerWeek || daysPerWeek < 1 || daysPerWeek > 7) {
            throw new ValidationError('Days per week must be between 1 and 7', ErrorCode.INVALID_INPUT);
        }

        // Generate AI workout plan
        const aiResponse = await this.callOpenAIWorkoutPlanner(goal, fitnessLevel, equipmentAvailable, daysPerWeek);

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const planId = uuidv4();
            const planResult = await client.query(
                `
                INSERT INTO workout_plans (id, user_id, goal, fitness_level, equipment_available, days_per_week, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'active')
                RETURNING
                    id,
                    user_id as "userId",
                    goal,
                    fitness_level as "fitnessLevel",
                    equipment_available as "equipmentAvailable",
                    days_per_week as "daysPerWeek",
                    status,
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [planId, userId, goal, fitnessLevel, equipmentAvailable || [], daysPerWeek]
            );

            const exercises: WorkoutExercise[] = [];
            for (const ex of aiResponse.exercises) {
                const exId = uuidv4();
                await client.query(
                    `
                    INSERT INTO workout_exercises (
                        id, plan_id, day_of_week, name, muscle_group, sets, reps,
                        rest_seconds, duration_minutes, equipment, instructions, order_index
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `,
                    [
                        exId, planId, ex.dayOfWeek, ex.name, ex.muscleGroup,
                        ex.sets, ex.reps, ex.restSeconds, ex.durationMinutes,
                        ex.equipment, ex.instructions, ex.orderIndex,
                    ]
                );

                exercises.push({
                    id: exId,
                    planId,
                    dayOfWeek: ex.dayOfWeek,
                    name: ex.name,
                    muscleGroup: ex.muscleGroup,
                    sets: ex.sets,
                    reps: ex.reps,
                    restSeconds: ex.restSeconds,
                    durationMinutes: ex.durationMinutes,
                    equipment: ex.equipment,
                    instructions: ex.instructions,
                    orderIndex: ex.orderIndex,
                    createdAt: new Date(),
                });
            }

            await client.query('COMMIT');

            log.info({ planId, userId, goal, fitnessLevel, exercisesCount: exercises.length }, 'Workout plan generated');

            return {
                ...planResult.rows[0],
                exercises,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, userId }, 'Failed to generate workout plan');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to generate workout plan', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Get Workout Plan ─────────────────────────────────────

    async getWorkoutPlan(planId: string, userId: string): Promise<WorkoutPlan> {
        const planResult = await this.pool.query(
            `
            SELECT
                id, user_id as "userId", goal, fitness_level as "fitnessLevel",
                equipment_available as "equipmentAvailable", days_per_week as "daysPerWeek",
                status, created_at as "createdAt", updated_at as "updatedAt"
            FROM workout_plans
            WHERE id = $1 AND user_id = $2
            `,
            [planId, userId]
        );

        if (planResult.rows.length === 0) {
            throw new NotFoundError('Workout plan not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const exercisesResult = await this.pool.query(
            `
            SELECT
                id, plan_id as "planId", day_of_week as "dayOfWeek", name,
                muscle_group as "muscleGroup", sets, reps, rest_seconds as "restSeconds",
                duration_minutes as "durationMinutes", equipment, instructions,
                order_index as "orderIndex", created_at as "createdAt"
            FROM workout_exercises
            WHERE plan_id = $1
            ORDER BY day_of_week, order_index
            `,
            [planId]
        );

        return {
            ...planResult.rows[0],
            exercises: exercisesResult.rows,
        };
    }

    // ─── List Workout Plans ───────────────────────────────────

    async listWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
        const result = await this.pool.query(
            `
            SELECT
                id, user_id as "userId", goal, fitness_level as "fitnessLevel",
                equipment_available as "equipmentAvailable", days_per_week as "daysPerWeek",
                status, created_at as "createdAt", updated_at as "updatedAt"
            FROM workout_plans
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
            `,
            [userId]
        );

        return result.rows;
    }

    // ─── Archive Workout Plan ─────────────────────────────────

    async archiveWorkoutPlan(planId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `
            UPDATE workout_plans
            SET status = 'archived', updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id
            `,
            [planId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Workout plan not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ planId, userId }, 'Workout plan archived');
    }

    // ─── Delete Workout Plan ──────────────────────────────────

    async deleteWorkoutPlan(planId: string, userId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const planCheck = await client.query(
                'SELECT id FROM workout_plans WHERE id = $1 AND user_id = $2',
                [planId, userId]
            );
            if (planCheck.rows.length === 0) {
                throw new NotFoundError('Workout plan not found', ErrorCode.NOT_FOUND_RESOURCE);
            }

            await client.query('DELETE FROM workout_exercises WHERE plan_id = $1', [planId]);
            await client.query('DELETE FROM workout_plans WHERE id = $1', [planId]);

            await client.query('COMMIT');
            log.info({ planId, userId }, 'Workout plan deleted');
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to delete workout plan', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── OpenAI Integration ───────────────────────────────────

    private async callOpenAIWorkoutPlanner(
        goal: string,
        fitnessLevel: string,
        equipmentAvailable: string[],
        daysPerWeek: number
    ): Promise<AIWorkoutResponse> {
        const apiKey = config.openaiApiKey;
        if (!apiKey) {
            log.warn('OpenAI API key not configured, using fallback workout plan');
            return this.generateFallbackWorkoutPlan(goal, fitnessLevel, daysPerWeek);
        }

        try {
            const equipment = equipmentAvailable.length > 0 ? equipmentAvailable.join(', ') : 'none (bodyweight only)';
            const goalDescriptions: Record<string, string> = {
                lose_weight: 'focus on fat loss with high-intensity cardio and circuit training',
                build_muscle: 'focus on hypertrophy with progressive resistance training',
                endurance: 'focus on cardiovascular and muscular endurance',
            };

            const prompt = `Generate a weekly workout plan for a ${fitnessLevel} level person who wants to ${goalDescriptions[goal]}.
Equipment available: ${equipment}
Training days per week: ${daysPerWeek}

Return ONLY valid JSON with this exact structure:
{
  "exercises": [
    {
      "dayOfWeek": 0-6 (0=Sunday, only ${daysPerWeek} distinct days),
      "name": "exercise name",
      "muscleGroup": "chest|back|legs|shoulders|arms|core|cardio|full_body",
      "sets": number,
      "reps": "rep range or duration",
      "restSeconds": seconds between sets,
      "durationMinutes": number or null,
      "equipment": "equipment needed or 'none'",
      "instructions": "brief form instructions",
      "orderIndex": order in the workout
    }
  ]
}

Include 4-6 exercises per training day. Provide progressive overload appropriate for ${fitnessLevel} level.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a certified personal trainer. Generate safe, effective workout plans with proper exercise selection.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 4000,
                }),
            });

            if (!response.ok) {
                throw new AppError(`OpenAI API error: ${response.status}`, 500, ErrorCode.SERVER_ERROR);
            }

            const openAiData = await response.json();
            const content = openAiData.choices?.[0]?.message?.content || '';

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;

            const parsed: AIWorkoutResponse = JSON.parse(jsonStr);

            if (!parsed.exercises || parsed.exercises.length === 0) {
                throw new Error('Invalid workout plan response');
            }

            return parsed;
        } catch (error) {
            log.error({ error, goal, fitnessLevel }, 'OpenAI workout planning failed, using fallback');
            return this.generateFallbackWorkoutPlan(goal, fitnessLevel, daysPerWeek);
        }
    }

    // ─── Fallback Workout Generator ───────────────────────────

    private generateFallbackWorkoutPlan(
        goal: string,
        fitnessLevel: string,
        daysPerWeek: number
    ): AIWorkoutResponse {
        const exerciseLibrary: Record<string, Record<string, { name: string; muscleGroup: string; sets: number; reps: string; rest: number; equipment: string; instructions: string }[]>> = {
            lose_weight: {
                beginner: [
                    { name: 'Jumping Jacks', muscleGroup: 'cardio', sets: 3, reps: '30 seconds', rest: 30, equipment: 'none', instructions: 'Jump feet apart and together while raising arms' },
                    { name: 'Bodyweight Squats', muscleGroup: 'legs', sets: 3, reps: '12', rest: 45, equipment: 'none', instructions: 'Feet shoulder-width, lower hips back and down' },
                    { name: 'Push-ups (Incline)', muscleGroup: 'chest', sets: 3, reps: '8', rest: 45, equipment: 'none', instructions: 'Hands on elevated surface, keep body straight' },
                    { name: 'Mountain Climbers', muscleGroup: 'core', sets: 3, reps: '20', rest: 30, equipment: 'none', instructions: 'Drive knees to chest in plank position' },
                    { name: 'Walking Lunges', muscleGroup: 'legs', sets: 3, reps: '10 each', rest: 45, equipment: 'none', instructions: 'Step forward, lower back knee toward ground' },
                ],
                intermediate: [
                    { name: 'Burpees', muscleGroup: 'full_body', sets: 4, reps: '12', rest: 30, equipment: 'none', instructions: 'Squat, kick back to plank, push-up, jump up' },
                    { name: 'Jump Squats', muscleGroup: 'legs', sets: 4, reps: '15', rest: 45, equipment: 'none', instructions: 'Squat then explode upward into a jump' },
                    { name: 'Push-ups', muscleGroup: 'chest', sets: 4, reps: '15', rest: 45, equipment: 'none', instructions: 'Keep body straight, chest to floor' },
                    { name: 'High Knees', muscleGroup: 'cardio', sets: 4, reps: '30 seconds', rest: 30, equipment: 'none', instructions: 'Run in place bringing knees to chest level' },
                    { name: 'Plank to Push-up', muscleGroup: 'core', sets: 3, reps: '10', rest: 30, equipment: 'none', instructions: 'Alternate from forearm plank to high plank' },
                ],
                advanced: [
                    { name: 'Burpees with Pull-up', muscleGroup: 'full_body', sets: 5, reps: '10', rest: 30, equipment: 'pull-up bar', instructions: 'Full burpee then jump to pull-up bar' },
                    { name: 'Plyometric Jump Squats', muscleGroup: 'legs', sets: 5, reps: '20', rest: 30, equipment: 'none', instructions: 'Maximum height jumps, soft landing' },
                    { name: 'Clap Push-ups', muscleGroup: 'chest', sets: 5, reps: '12', rest: 45, equipment: 'none', instructions: 'Explosive push-up with clap at top' },
                    { name: 'Sprint Intervals', muscleGroup: 'cardio', sets: 8, reps: '30 seconds', rest: 30, equipment: 'none', instructions: 'Maximum effort sprints' },
                    { name: 'L-sit Hold', muscleGroup: 'core', sets: 4, reps: '20 seconds', rest: 30, equipment: 'none', instructions: 'Hold body off ground with legs extended' },
                ],
            },
            build_muscle: {
                beginner: [
                    { name: 'Bodyweight Squats', muscleGroup: 'legs', sets: 3, reps: '15', rest: 60, equipment: 'none', instructions: 'Full range of motion, controlled tempo' },
                    { name: 'Push-ups', muscleGroup: 'chest', sets: 3, reps: '10', rest: 60, equipment: 'none', instructions: 'Chest nearly touches floor' },
                    { name: 'Glute Bridges', muscleGroup: 'legs', sets: 3, reps: '15', rest: 45, equipment: 'none', instructions: 'Squeeze glutes at top of movement' },
                    { name: 'Inverted Rows', muscleGroup: 'back', sets: 3, reps: '10', rest: 60, equipment: 'table', instructions: 'Pull chest to edge of table' },
                    { name: 'Plank', muscleGroup: 'core', sets: 3, reps: '30 seconds', rest: 30, equipment: 'none', instructions: 'Keep body in straight line' },
                ],
                intermediate: [
                    { name: 'Bulgarian Split Squats', muscleGroup: 'legs', sets: 4, reps: '10 each', rest: 60, equipment: 'bench', instructions: 'Rear foot elevated, deep range of motion' },
                    { name: 'Diamond Push-ups', muscleGroup: 'chest', sets: 4, reps: '12', rest: 60, equipment: 'none', instructions: 'Hands close together forming diamond shape' },
                    { name: 'Pull-ups', muscleGroup: 'back', sets: 4, reps: '8', rest: 90, equipment: 'pull-up bar', instructions: 'Full dead hang to chin over bar' },
                    { name: 'Pike Push-ups', muscleGroup: 'shoulders', sets: 4, reps: '10', rest: 60, equipment: 'none', instructions: 'Hips high, lower head toward ground' },
                    { name: 'Hanging Leg Raises', muscleGroup: 'core', sets: 4, reps: '12', rest: 45, equipment: 'pull-up bar', instructions: 'Lift legs to 90 degrees, control descent' },
                ],
                advanced: [
                    { name: 'Pistol Squats', muscleGroup: 'legs', sets: 5, reps: '8 each', rest: 90, equipment: 'none', instructions: 'Single leg squat with full range of motion' },
                    { name: 'One-Arm Push-ups', muscleGroup: 'chest', sets: 5, reps: '6 each', rest: 90, equipment: 'none', instructions: 'Wide stance, one arm behind back' },
                    { name: 'Muscle-ups', muscleGroup: 'back', sets: 5, reps: '5', rest: 120, equipment: 'pull-up bar', instructions: 'Pull-up transitioning into dip at top' },
                    { name: 'Handstand Push-ups', muscleGroup: 'shoulders', sets: 5, reps: '8', rest: 90, equipment: 'wall', instructions: 'Handstand against wall, lower head to ground' },
                    { name: 'Front Lever Progressions', muscleGroup: 'core', sets: 5, reps: '10 seconds', rest: 60, equipment: 'pull-up bar', instructions: 'Hold body horizontal from bar' },
                ],
            },
            endurance: {
                beginner: [
                    { name: 'March in Place', muscleGroup: 'cardio', sets: 3, reps: '45 seconds', rest: 15, equipment: 'none', instructions: 'High knees at moderate pace' },
                    { name: 'Wall Push-ups', muscleGroup: 'chest', sets: 3, reps: '15', rest: 30, equipment: 'none', instructions: 'Push-ups against wall' },
                    { name: 'Step-ups', muscleGroup: 'legs', sets: 3, reps: '12 each', rest: 30, equipment: 'stairs', instructions: 'Step up and down on stairs' },
                    { name: 'Arm Circles', muscleGroup: 'shoulders', sets: 2, reps: '30 seconds', rest: 15, equipment: 'none', instructions: 'Small to large circles forward and back' },
                    { name: 'Calf Raises', muscleGroup: 'legs', sets: 3, reps: '20', rest: 20, equipment: 'none', instructions: 'Rise onto toes, squeeze at top' },
                ],
                intermediate: [
                    { name: 'Jump Rope', muscleGroup: 'cardio', sets: 5, reps: '60 seconds', rest: 30, equipment: 'jump rope', instructions: 'Maintain consistent rhythm' },
                    { name: 'Long-distance Lunges', muscleGroup: 'legs', sets: 4, reps: '20 each', rest: 45, equipment: 'none', instructions: 'Walking lunges across room and back' },
                    { name: 'Tempo Push-ups', muscleGroup: 'chest', sets: 4, reps: '15', rest: 30, equipment: 'none', instructions: '3 seconds down, 1 second up' },
                    { name: 'Bear Crawls', muscleGroup: 'full_body', sets: 4, reps: '30 seconds', rest: 30, equipment: 'none', instructions: 'Crawl on hands and feet, knees off ground' },
                    { name: 'Flutter Kicks', muscleGroup: 'core', sets: 4, reps: '30 seconds', rest: 20, equipment: 'none', instructions: 'Small alternating leg raises while supine' },
                ],
                advanced: [
                    { name: 'Box Jumps', muscleGroup: 'legs', sets: 5, reps: '15', rest: 30, equipment: 'bench', instructions: 'Explosive jumps onto elevated surface' },
                    { name: 'Thrusters', muscleGroup: 'full_body', sets: 5, reps: '20', rest: 45, equipment: 'dumbbells', instructions: 'Squat to overhead press in one motion' },
                    { name: 'Rowing Sprints', muscleGroup: 'cardio', sets: 8, reps: '250m', rest: 60, equipment: 'rowing machine', instructions: 'Maximum effort each interval' },
                    { name: 'Turkish Get-ups', muscleGroup: 'full_body', sets: 3, reps: '5 each', rest: 60, equipment: 'kettlebell', instructions: 'Stand from supine holding weight overhead' },
                    { name: 'Farmers Walk', muscleGroup: 'full_body', sets: 4, reps: '60 seconds', rest: 45, equipment: 'dumbbells', instructions: 'Walk holding heavy weights at sides' },
                ],
            },
        };

        const exercises = exerciseLibrary[goal]?.[fitnessLevel] || exerciseLibrary.lose_weight.beginner;
        const selectedDays = this.selectTrainingDays(daysPerWeek);

        const result: AIWorkoutResponse['exercises'] = [];
        selectedDays.forEach((day, dayIdx) => {
            exercises.forEach((ex, exIdx) => {
                result.push({
                    dayOfWeek: day,
                    name: ex.name,
                    muscleGroup: ex.muscleGroup,
                    sets: ex.sets,
                    reps: ex.reps,
                    restSeconds: ex.rest,
                    durationMinutes: ex.reps.includes('seconds') ? Math.ceil(ex.sets * (parseInt(ex.reps) + ex.rest) / 60) : null,
                    equipment: ex.equipment,
                    instructions: ex.instructions,
                    orderIndex: exIdx,
                });
            });
        });

        return { exercises: result };
    }

    private selectTrainingDays(daysPerWeek: number): number[] {
        const schedules: Record<number, number[]> = {
            1: [1],
            2: [1, 4],
            3: [1, 3, 5],
            4: [0, 2, 4, 6],
            5: [0, 1, 3, 4, 6],
            6: [0, 1, 2, 3, 4, 5],
            7: [0, 1, 2, 3, 4, 5, 6],
        };
        return schedules[daysPerWeek] || schedules[3];
    }
}
