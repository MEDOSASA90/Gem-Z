/**
 * GEM Z — AR Workout Service
 *
 * 3D model data management for AR exercises.
 * Features:
 *   - AR model CRUD operations
 * *   - Model metadata (format, size, poly count)
 *   - Exercise-to-model mapping
 *   - Model caching via Redis
 *   - Supported format validation (GLB, GLTF, USDZ)
 */

import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';
import { redisClient } from '../../core/redis/client';

const log = createLogger('ar');

// ─── Types ──────────────────────────────────────────────────────

export interface ARModel {
    id: string;
    name: string;
    description: string;
    modelUrl: string;
    thumbnailUrl?: string;
    format: ARModelFormat;
    fileSizeBytes: number;
    polygonCount?: number;
    animationCount?: number;
    exerciseId?: string;
    exerciseName?: string;
    bodyPart?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    isActive: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export type ARModelFormat = 'glb' | 'gltf' | 'usdz' | 'fbx' | 'obj';

export interface CreateARModelInput {
    name: string;
    description: string;
    modelUrl: string;
    thumbnailUrl?: string;
    format: ARModelFormat;
    fileSizeBytes: number;
    polygonCount?: number;
    animationCount?: number;
    exerciseId?: string;
    bodyPart?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    metadata?: Record<string, any>;
}

export interface UpdateARModelInput {
    name?: string;
    description?: string;
    modelUrl?: string;
    thumbnailUrl?: string;
    exerciseId?: string;
    bodyPart?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    isActive?: boolean;
    metadata?: Record<string, any>;
}

export interface ARModelSearchOptions {
    bodyPart?: string;
    difficulty?: string;
    format?: ARModelFormat;
    exerciseId?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedARModels {
    models: ARModel[];
    total: number;
    page: number;
    totalPages: number;
    bodyParts: { name: string; count: number }[];
}

export interface ARExerciseData {
    model: ARModel;
    instructions: string[];
    tips: string[];
    duration: number;
    repetitions?: number;
    sets?: number;
}

export interface ARSession {
    id: string;
    userId: string;
    modelId: string;
    exerciseId?: string;
    status: 'active' | 'completed' | 'abandoned';
    startedAt: Date;
    completedAt?: Date;
    durationSeconds?: number;
    caloriesBurned?: number;
    metadata?: Record<string, any>;
}

// ─── Constants ──────────────────────────────────────────────────

const SUPPORTED_FORMATS: ARModelFormat[] = ['glb', 'gltf', 'usdz', 'fbx', 'obj'];

const BODY_PARTS = [
    'chest', 'back', 'legs', 'arms', 'shoulders',
    'abs', 'core', 'full_body', 'cardio', 'flexibility',
];

const CACHE_TTL = 3600; // 1 hour

// ─── Service ────────────────────────────────────────────────────

/**
 * Create a new AR model.
 *
 * @param input - Model creation data
 * @returns Created model
 */
export async function createARModel(input: CreateARModelInput): Promise<ARModel> {
    validateModelInput(input);

    const modelId = generateModelId();

    try {
        const result = await db.query(
            `INSERT INTO ar_models
                (id, name, description, model_url, thumbnail_url, format, file_size_bytes,
                 polygon_count, animation_count, exercise_id, body_part, difficulty, is_active, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [
                modelId,
                input.name.trim(),
                input.description?.trim() || null,
                input.modelUrl.trim(),
                input.thumbnailUrl || null,
                input.format,
                input.fileSizeBytes,
                input.polygonCount || null,
                input.animationCount || null,
                input.exerciseId || null,
                input.bodyPart || null,
                input.difficulty || 'beginner',
                true,
                input.metadata ? JSON.stringify(input.metadata) : null,
            ]
        );

        log.info({ modelId, name: input.name, format: input.format }, 'AR model created');
        return mapModelRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, name: input.name }, 'Failed to create AR model');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to create AR model', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Update an AR model.
 *
 * @param modelId - Model ID
 * @param input - Update data
 * @returns Updated model
 */
export async function updateARModel(modelId: string, input: UpdateARModelInput): Promise<ARModel> {
    const existing = await getARModelById(modelId);
    if (!existing) {
        throw new NotFoundError('AR model not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name.trim());
    }
    if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description?.trim() || null);
    }
    if (input.modelUrl !== undefined) {
        updates.push(`model_url = $${paramIndex++}`);
        values.push(input.modelUrl.trim());
    }
    if (input.thumbnailUrl !== undefined) {
        updates.push(`thumbnail_url = $${paramIndex++}`);
        values.push(input.thumbnailUrl || null);
    }
    if (input.exerciseId !== undefined) {
        updates.push(`exercise_id = $${paramIndex++}`);
        values.push(input.exerciseId || null);
    }
    if (input.bodyPart !== undefined) {
        updates.push(`body_part = $${paramIndex++}`);
        values.push(input.bodyPart || null);
    }
    if (input.difficulty !== undefined) {
        updates.push(`difficulty = $${paramIndex++}`);
        values.push(input.difficulty);
    }
    if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
    }
    if (input.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    values.push(modelId);

    try {
        const result = await db.query(
            `UPDATE ar_models SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        // Invalidate cache
        await redisClient.del(`ar:model:${modelId}`);

        log.info({ modelId, updatedFields: Object.keys(input) }, 'AR model updated');
        return mapModelRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, modelId }, 'Failed to update AR model');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to update AR model', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get an AR model by ID.
 *
 * @param modelId - Model ID
 * @returns AR model or null
 */
export async function getARModelById(modelId: string): Promise<ARModel | null> {
    // Check cache first
    const cached = await redisClient.get(`ar:model:${modelId}`);
    if (cached) {
        return JSON.parse(cached);
    }

    try {
        const result = await db.query(
            `SELECT m.*, e.name as exercise_name
             FROM ar_models m
             LEFT JOIN exercises e ON m.exercise_id = e.id
             WHERE m.id = $1 AND m.is_active = TRUE`,
            [modelId]
        );

        if (result.rowCount === 0) {
            return null;
        }

        const model = mapModelRow(result.rows[0]);

        // Cache result
        await redisClient.setex(`ar:model:${modelId}`, CACHE_TTL, JSON.stringify(model));

        return model;
    } catch (error) {
        log.error({ error: (error as Error).message, modelId }, 'Failed to get AR model');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to retrieve AR model', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Search and list AR models.
 *
 * @param options - Search options
 * @returns Paginated models
 */
export async function searchARModels(options: ARModelSearchOptions = {}): Promise<PaginatedARModels> {
    const {
        bodyPart,
        difficulty,
        format,
        exerciseId,
        page = 1,
        limit = 20,
    } = options;

    const conditions: string[] = ['is_active = TRUE'];
    const values: any[] = [];
    let paramIndex = 1;

    if (bodyPart) {
        conditions.push(`body_part = $${paramIndex++}`);
        values.push(bodyPart);
    }
    if (difficulty) {
        conditions.push(`difficulty = $${paramIndex++}`);
        values.push(difficulty);
    }
    if (format) {
        conditions.push(`format = $${paramIndex++}`);
        values.push(format);
    }
    if (exerciseId) {
        conditions.push(`exercise_id = $${paramIndex++}`);
        values.push(exerciseId);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    try {
        const [modelsResult, countResult, bodyPartsResult] = await Promise.all([
            db.query(
                `SELECT m.*, e.name as exercise_name
                 FROM ar_models m
                 LEFT JOIN exercises e ON m.exercise_id = e.id
                 WHERE ${whereClause}
                 ORDER BY m.created_at DESC
                 LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
                [...values, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) as total FROM ar_models WHERE ${whereClause}`,
                values
            ),
            db.query(
                `SELECT body_part as name, COUNT(*) as count
                 FROM ar_models
                 WHERE is_active = TRUE AND body_part IS NOT NULL
                 GROUP BY body_part
                 ORDER BY count DESC`
            ),
        ]);

        const total = Number(countResult.rows[0].total);

        return {
            models: modelsResult.rows.map(mapModelRow),
            total,
            page,
            totalPages: Math.ceil(total / limit),
            bodyParts: bodyPartsResult.rows.map((r) => ({
                name: r.name,
                count: Number(r.count),
            })),
        };
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to search AR models');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to search AR models', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get exercise data with AR model for a workout.
 *
 * @param modelId - AR model ID
 * @returns Exercise data with model
 */
export async function getExerciseData(modelId: string): Promise<ARExerciseData | null> {
    const model = await getARModelById(modelId);
    if (!model) return null;

    // Get exercise instructions if linked
    let instructions: string[] = [];
    let tips: string[] = [];
    let duration = 30;
    let repetitions: number | undefined;
    let sets: number | undefined;

    if (model.exerciseId) {
        try {
            const result = await db.query(
                `SELECT instructions, tips, duration_seconds, repetitions, sets
                 FROM exercises WHERE id = $1`,
                [model.exerciseId]
            );

            if (result.rowCount && result.rowCount > 0) {
                const row = result.rows[0];
                instructions = row.instructions || [];
                tips = row.tips || [];
                duration = row.duration_seconds || 30;
                repetitions = row.repetitions;
                sets = row.sets;
            }
        } catch {
            // Exercise table may not exist, use defaults
        }
    }

    // Default instructions based on model
    if (instructions.length === 0) {
        instructions = [
            `Position yourself in front of the camera`,
            `Align your body with the AR model`,
            `Follow the movement pattern shown`,
            `Maintain proper form throughout`,
        ];
    }

    if (tips.length === 0) {
        tips = [
            'Keep your core engaged',
            'Breathe steadily throughout',
            'Move at a controlled pace',
        ];
    }

    return {
        model,
        instructions,
        tips,
        duration,
        repetitions,
        sets,
    };
}

/**
 * Delete an AR model.
 *
 * @param modelId - Model ID
 */
export async function deleteARModel(modelId: string): Promise<void> {
    const existing = await getARModelById(modelId);
    if (!existing) {
        throw new NotFoundError('AR model not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    try {
        await db.query(`DELETE FROM ar_models WHERE id = $1`, [modelId]);
        await redisClient.del(`ar:model:${modelId}`);

        log.info({ modelId }, 'AR model deleted');
    } catch (error) {
        log.error({ error: (error as Error).message, modelId }, 'Failed to delete AR model');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to delete AR model', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Start an AR workout session.
 *
 * @param userId - User ID
 * @param modelId - Model ID
 * @returns Created session
 */
export async function startARSession(userId: string, modelId: string): Promise<ARSession> {
    const model = await getARModelById(modelId);
    if (!model) {
        throw new NotFoundError('AR model not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const sessionId = generateSessionId();

    try {
        const result = await db.query(
            `INSERT INTO ar_sessions (id, user_id, model_id, exercise_id, status, started_at)
             VALUES ($1, $2, $3, $4, 'active', NOW())
             RETURNING *`,
            [sessionId, userId, modelId, model.exerciseId || null]
        );

        log.info({ sessionId, userId, modelId }, 'AR session started');
        return mapSessionRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, userId, modelId }, 'Failed to start AR session');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to start AR session', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Complete an AR workout session.
 *
 * @param sessionId - Session ID
 * @param userId - User ID
 * @param durationSeconds - Actual duration
 * @param caloriesBurned - Estimated calories
 */
export async function completeARSession(
    sessionId: string,
    userId: string,
    durationSeconds?: number,
    caloriesBurned?: number
): Promise<ARSession> {
    try {
        const result = await db.query(
            `UPDATE ar_sessions
             SET status = 'completed',
                 completed_at = NOW(),
                 duration_seconds = $1,
                 calories_burned = $2
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [durationSeconds || null, caloriesBurned || null, sessionId, userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Session not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ sessionId, userId, durationSeconds }, 'AR session completed');
        return mapSessionRow(result.rows[0]);
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to complete AR session', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get AR session history for a user.
 */
export async function getARSessionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{ sessions: ARSession[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    try {
        const [sessionsResult, countResult] = await Promise.all([
            db.query(
                `SELECT s.*, m.name as model_name
                 FROM ar_sessions s
                 JOIN ar_models m ON s.model_id = m.id
                 WHERE s.user_id = $1
                 ORDER BY s.started_at DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) as total FROM ar_sessions WHERE user_id = $1`,
                [userId]
            ),
        ]);

        const total = Number(countResult.rows[0].total);

        return {
            sessions: sessionsResult.rows.map(mapSessionRow),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to get session history');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to get session history', ErrorCode.SERVER_ERROR);
    }
}

// ─── Helpers ────────────────────────────────────────────────────

function validateModelInput(input: CreateARModelInput): void {
    if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Model name is required', ErrorCode.INVALID_INPUT);
    }

    if (!input.modelUrl || input.modelUrl.trim().length === 0) {
        throw new ValidationError('Model URL is required', ErrorCode.INVALID_INPUT);
    }

    if (!input.format || !SUPPORTED_FORMATS.includes(input.format)) {
        throw new ValidationError(
            `Invalid format. Supported: ${SUPPORTED_FORMATS.join(', ')}`,
            ErrorCode.INVALID_INPUT
        );
    }

    if (!input.fileSizeBytes || input.fileSizeBytes <= 0) {
        throw new ValidationError('File size must be greater than 0', ErrorCode.INVALID_INPUT);
    }
}

function mapModelRow(row: any): ARModel {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        modelUrl: row.model_url,
        thumbnailUrl: row.thumbnail_url,
        format: row.format,
        fileSizeBytes: Number(row.file_size_bytes),
        polygonCount: row.polygon_count ? Number(row.polygon_count) : undefined,
        animationCount: row.animation_count ? Number(row.animation_count) : undefined,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        bodyPart: row.body_part,
        difficulty: row.difficulty,
        isActive: row.is_active,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapSessionRow(row: any): ARSession {
    return {
        id: row.id,
        userId: row.user_id,
        modelId: row.model_id,
        exerciseId: row.exercise_id,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
        caloriesBurned: row.calories_burned ? Number(row.calories_burned) : undefined,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || undefined,
    };
}

function generateModelId(): string {
    return `ar_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateSessionId(): string {
    return `ars_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Model Stats ────────────────────────────────────────────────

/**
 * Get AR system statistics.
 */
export async function getARStats(): Promise<{
    totalModels: number;
    totalSessions: number;
    totalActiveSessions: number;
    modelsByFormat: Record<string, number>;
    modelsByBodyPart: Record<string, number>;
}> {
    try {
        const [modelsResult, sessionsResult, activeResult, formatResult, bodyPartResult] = await Promise.all([
            db.query(`SELECT COUNT(*) as count FROM ar_models WHERE is_active = TRUE`),
            db.query(`SELECT COUNT(*) as count FROM ar_sessions`),
            db.query(`SELECT COUNT(*) as count FROM ar_sessions WHERE status = 'active'`),
            db.query(`SELECT format, COUNT(*) as count FROM ar_models WHERE is_active = TRUE GROUP BY format`),
            db.query(`SELECT body_part, COUNT(*) as count FROM ar_models WHERE is_active = TRUE AND body_part IS NOT NULL GROUP BY body_part`),
        ]);

        const modelsByFormat: Record<string, number> = {};
        for (const row of formatResult.rows) {
            modelsByFormat[row.format] = Number(row.count);
        }

        const modelsByBodyPart: Record<string, number> = {};
        for (const row of bodyPartResult.rows) {
            modelsByBodyPart[row.body_part] = Number(row.count);
        }

        return {
            totalModels: Number(modelsResult.rows[0].count),
            totalSessions: Number(sessionsResult.rows[0].count),
            totalActiveSessions: Number(activeResult.rows[0].count),
            modelsByFormat,
            modelsByBodyPart,
        };
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to get AR stats');
        return {
            totalModels: 0,
            totalSessions: 0,
            totalActiveSessions: 0,
            modelsByFormat: {},
            modelsByBodyPart: {},
        };
    }
}
