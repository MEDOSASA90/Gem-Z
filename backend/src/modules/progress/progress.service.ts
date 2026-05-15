/**
 * GEM Z — Progress Photos Service
 *
 * Business logic for progress photo tracking:
 * - Upload and manage progress photos
 * - Before/After timeline with date stamps
 * - AI body composition analysis
 * - Side-by-side comparison
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import { AppError, ValidationError, NotFoundError } from '../../core/errors';

const log = createLogger('progress-service');

// ─── Types ──────────────────────────────────────────────────────

export interface ProgressPhoto {
    id: string;
    userId: string;
    imageUrl: string;
    thumbnailUrl: string | null;
    photoType: 'front' | 'back' | 'side' | 'custom';
    angle: string | null;
    weightAtPhoto: number | null;
    bodyFatAtPhoto: number | null;
    muscleMassAtPhoto: number | null;
    notes: string | null;
    tags: string[] | null;
    aiAnalysisId: string | null;
    createdAt: string;
}

export interface AIAnalysis {
    id: string;
    photoId: string;
    userId: string;
    bodyFatEstimate: number | null;
    muscleMassEstimate: number | null;
    postureScore: number | null;
    symmetryScore: number | null;
    bodyComposition: Record<string, any> | null;
    landmarks: Record<string, any> | null;
    recommendations: string[] | null;
    confidenceScore: number | null;
    modelVersion: string;
    analyzedAt: string;
}

export interface TimelineEntry {
    photo: ProgressPhoto;
    aiAnalysis: AIAnalysis | null;
    comparisonToPrevious: {
        weightChange: number | null;
        bodyFatChange: number | null;
        daysSinceLast: number | null;
    };
}

export interface PhotoComparison {
    photoA: ProgressPhoto & { aiAnalysis?: AIAnalysis | null };
    photoB: ProgressPhoto & { aiAnalysis?: AIAnalysis | null };
    comparison: {
        weightChange: number | null;
        bodyFatChange: number | null;
        muscleMassChange: number | null;
        daysBetween: number;
        aiInsight: string | null;
    };
}

// ─── Service ────────────────────────────────────────────────────

export class ProgressService {
    constructor(private pool: Pool) {}

    /**
     * Upload a new progress photo.
     */
    async uploadPhoto(
        userId: string,
        imageUrl: string,
        photoType: 'front' | 'back' | 'side' | 'custom' = 'front',
        options?: {
            thumbnailUrl?: string;
            angle?: string;
            weightAtPhoto?: number;
            bodyFatAtPhoto?: number;
            muscleMassAtPhoto?: number;
            notes?: string;
            tags?: string[];
        }
    ): Promise<ProgressPhoto> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const photoId = uuidv4();
            const result = await client.query(
                `INSERT INTO progress_photos (id, user_id, image_url, thumbnail_url, photo_type, angle, weight_at_photo, body_fat_at_photo, muscle_mass_at_photo, notes, tags)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING id, user_id as "userId", image_url as "imageUrl", thumbnail_url as "thumbnailUrl",
                           photo_type as "photoType", angle, weight_at_photo as "weightAtPhoto",
                           body_fat_at_photo as "bodyFatAtPhoto", muscle_mass_at_photo as "muscleMassAtPhoto",
                           notes, tags, ai_analysis_id as "aiAnalysisId", created_at as "createdAt"`,
                [
                    photoId, userId, imageUrl, options?.thumbnailUrl || null, photoType,
                    options?.angle || null, options?.weightAtPhoto || null,
                    options?.bodyFatAtPhoto || null, options?.muscleMassAtPhoto || null,
                    options?.notes || null, options?.tags || null,
                ]
            );

            await client.query('COMMIT');

            log.info({ userId, photoId, photoType }, 'Progress photo uploaded');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get user's progress photo timeline.
     */
    async getTimeline(userId: string, photoType?: string): Promise<TimelineEntry[]> {
        let query = `SELECT id, user_id as "userId", image_url as "imageUrl", thumbnail_url as "thumbnailUrl",
                            photo_type as "photoType", angle, weight_at_photo as "weightAtPhoto",
                            body_fat_at_photo as "bodyFatAtPhoto", muscle_mass_at_photo as "muscleMassAtPhoto",
                            notes, tags, ai_analysis_id as "aiAnalysisId", created_at as "createdAt"
                     FROM progress_photos WHERE user_id = $1`;
        const params: any[] = [userId];

        if (photoType && photoType !== 'all') {
            query += ` AND photo_type = $2`;
            params.push(photoType);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await this.pool.query(query, params);
        const photos = result.rows;

        // Get previous photo for comparison
        const prevQuery = `SELECT id, weight_at_photo, body_fat_at_photo, created_at
                           FROM progress_photos WHERE user_id = $1 ORDER BY created_at DESC`;
        const prevResult = await this.pool.query(prevQuery, [userId]);
        const prevMap = new Map();
        for (let i = 0; i < prevResult.rows.length - 1; i++) {
            prevMap.set(prevResult.rows[i].id, prevResult.rows[i + 1]);
        }

        const entries: TimelineEntry[] = [];
        for (const photo of photos) {
            const aiAnalysis = photo.aiAnalysisId
                ? await this.getAIAnalysis(photo.aiAnalysisId)
                : null;

            const prevPhoto = prevMap.get(photo.id);
            const daysSinceLast = prevPhoto
                ? Math.round((new Date(photo.createdAt).getTime() - new Date(prevPhoto.created_at).getTime()) / (1000 * 3600 * 24))
                : null;

            entries.push({
                photo,
                aiAnalysis,
                comparisonToPrevious: {
                    weightChange: prevPhoto && photo.weightAtPhoto && prevPhoto.weight_at_photo
                        ? photo.weightAtPhoto - prevPhoto.weight_at_photo
                        : null,
                    bodyFatChange: prevPhoto && photo.bodyFatAtPhoto && prevPhoto.body_fat_at_photo
                        ? photo.bodyFatAtPhoto - prevPhoto.body_fat_at_photo
                        : null,
                    daysSinceLast,
                },
            });
        }

        return entries;
    }

    /**
     * Get a single photo.
     */
    async getPhoto(photoId: string, userId: string): Promise<ProgressPhoto> {
        const result = await this.pool.query(
            `SELECT id, user_id as "userId", image_url as "imageUrl", thumbnail_url as "thumbnailUrl",
                    photo_type as "photoType", angle, weight_at_photo as "weightAtPhoto",
                    body_fat_at_photo as "bodyFatAtPhoto", muscle_mass_at_photo as "muscleMassAtPhoto",
                    notes, tags, ai_analysis_id as "aiAnalysisId", created_at as "createdAt"
             FROM progress_photos WHERE id = $1 AND user_id = $2`,
            [photoId, userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Photo not found');
        }

        return result.rows[0];
    }

    /**
     * Delete a photo.
     */
    async deletePhoto(photoId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `DELETE FROM progress_photos WHERE id = $1 AND user_id = $2 RETURNING id`,
            [photoId, userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Photo not found');
        }

        log.info({ photoId, userId }, 'Progress photo deleted');
    }

    /**
     * Run AI analysis on a photo.
     */
    async runAIAnalysis(userId: string, photoId: string): Promise<AIAnalysis> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify photo ownership
            const photoResult = await client.query(
                `SELECT id FROM progress_photos WHERE id = $1 AND user_id = $2`,
                [photoId, userId]
            );

            if (photoResult.rowCount === 0) {
                await client.query('ROLLBACK');
                throw new NotFoundError('Photo not found');
            }

            // Check if analysis already exists
            const existingResult = await client.query(
                `SELECT id FROM progress_ai_analysis WHERE photo_id = $1`,
                [photoId]
            );

            if (existingResult.rowCount && existingResult.rowCount > 0) {
                // Delete old analysis
                await client.query(
                    `DELETE FROM progress_ai_analysis WHERE photo_id = $1`,
                    [photoId]
                );
            }

            // Run simulated AI analysis (replace with actual AI model in production)
            const analysisResult = await this.simulateAIAnalysis(client, photoId, userId);

            // Update photo with analysis ID
            await client.query(
                `UPDATE progress_photos SET ai_analysis_id = $1 WHERE id = $2`,
                [analysisResult.id, photoId]
            );

            await client.query('COMMIT');

            log.info({ userId, photoId, analysisId: analysisResult.id }, 'AI analysis completed');
            return analysisResult;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get AI analysis by ID.
     */
    async getAIAnalysis(analysisId: string): Promise<AIAnalysis | null> {
        const result = await this.pool.query(
            `SELECT id, photo_id as "photoId", user_id as "userId", body_fat_estimate as "bodyFatEstimate",
                    muscle_mass_estimate as "muscleMassEstimate", posture_score as "postureScore",
                    symmetry_score as "symmetryScore", body_composition as "bodyComposition",
                    landmarks, recommendations, confidence_score as "confidenceScore",
                    model_version as "modelVersion", analyzed_at as "analyzedAt"
             FROM progress_ai_analysis WHERE id = $1`,
            [analysisId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get AI analysis for a specific photo.
     */
    async getAIAnalysisForPhoto(photoId: string, userId: string): Promise<AIAnalysis | null> {
        const result = await this.pool.query(
            `SELECT id, photo_id as "photoId", user_id as "userId", body_fat_estimate as "bodyFatEstimate",
                    muscle_mass_estimate as "muscleMassEstimate", posture_score as "postureScore",
                    symmetry_score as "symmetryScore", body_composition as "bodyComposition",
                    landmarks, recommendations, confidence_score as "confidenceScore",
                    model_version as "modelVersion", analyzed_at as "analyzedAt"
             FROM progress_ai_analysis WHERE photo_id = $1 AND user_id = $2`,
            [photoId, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get side-by-side comparison between two photos.
     */
    async getComparison(userId: string, photoAId: string, photoBId: string): Promise<PhotoComparison> {
        const [photoA, photoB] = await Promise.all([
            this.getPhoto(photoAId, userId),
            this.getPhoto(photoBId, userId),
        ]);

        const [analysisA, analysisB] = await Promise.all([
            photoA.aiAnalysisId ? this.getAIAnalysis(photoA.aiAnalysisId) : Promise.resolve(null),
            photoB.aiAnalysisId ? this.getAIAnalysis(photoB.aiAnalysisId) : Promise.resolve(null),
        ]);

        const daysBetween = Math.abs(
            Math.round((new Date(photoA.createdAt).getTime() - new Date(photoB.createdAt).getTime()) / (1000 * 3600 * 24))
        );

        const weightChange = photoA.weightAtPhoto && photoB.weightAtPhoto
            ? photoA.weightAtPhoto - photoB.weightAtPhoto
            : null;

        const bodyFatChange = photoA.bodyFatAtPhoto && photoB.bodyFatAtPhoto
            ? photoA.bodyFatAtPhoto - photoB.bodyFatAtPhoto
            : null;

        const muscleMassChange = photoA.muscleMassAtPhoto && photoB.muscleMassAtPhoto
            ? photoA.muscleMassAtPhoto - photoB.muscleMassAtPhoto
            : null;

        // Generate AI insight
        let aiInsight: string | null = null;
        if (weightChange !== null) {
            const direction = weightChange < 0 ? 'lost' : 'gained';
            aiInsight = `You have ${direction} ${Math.abs(weightChange).toFixed(1)}kg over ${daysBetween} days.`;
            if (bodyFatChange !== null && bodyFatChange < 0) {
                aiInsight += ` Your body fat decreased by ${Math.abs(bodyFatChange).toFixed(1)}%. Great progress!`;
            }
        }

        return {
            photoA: { ...photoA, aiAnalysis: analysisA },
            photoB: { ...photoB, aiAnalysis: analysisB },
            comparison: { weightChange, bodyFatChange, muscleMassChange, daysBetween, aiInsight },
        };
    }

    // ─── Private ────────────────────────────────────────────────

    private async simulateAIAnalysis(client: Pool, photoId: string, userId: string): Promise<AIAnalysis> {
        // Simulated AI analysis — replace with actual ML model integration
        const analysisId = uuidv4();

        const bodyFatEstimate = 12 + Math.random() * 20; // 12-32%
        const muscleMassEstimate = 35 + Math.random() * 15; // 35-50%
        const postureScore = 60 + Math.random() * 35; // 60-95
        const symmetryScore = 70 + Math.random() * 25; // 70-95
        const confidenceScore = 0.75 + Math.random() * 0.2; // 0.75-0.95

        const bodyComposition = {
            leanMass: { percentage: 78 + Math.random() * 8, weight: 55 + Math.random() * 15 },
            fatMass: { percentage: 10 + Math.random() * 15, weight: 8 + Math.random() * 8 },
            waterMass: { percentage: 50 + Math.random() * 8, weight: 35 + Math.random() * 10 },
            boneMass: { percentage: 3 + Math.random() * 2, weight: 2.5 + Math.random() * 1.5 },
        };

        const recommendations = [
            'Maintain consistent resistance training 3-4x per week',
            'Ensure protein intake of 1.6-2.2g per kg bodyweight',
            bodyFatEstimate > 20 ? 'Consider adding 20 min of cardio post-workout' : 'Your body composition is in a healthy range',
            'Track waist circumference weekly for trend analysis',
            'Get 7-9 hours of sleep for optimal recovery',
        ];

        const result = await client.query(
            `INSERT INTO progress_ai_analysis (id, photo_id, user_id, body_fat_estimate, muscle_mass_estimate, posture_score, symmetry_score, body_composition, landmarks, recommendations, confidence_score, model_version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id, photo_id as "photoId", user_id as "userId", body_fat_estimate as "bodyFatEstimate",
                       muscle_mass_estimate as "muscleMassEstimate", posture_score as "postureScore",
                       symmetry_score as "symmetryScore", body_composition as "bodyComposition",
                       landmarks, recommendations, confidence_score as "confidenceScore",
                       model_version as "modelVersion", analyzed_at as "analyzedAt"`,
            [
                analysisId, photoId, userId, bodyFatEstimate, muscleMassEstimate,
                postureScore, symmetryScore, JSON.stringify(bodyComposition),
                null, JSON.stringify(recommendations), confidenceScore, 'gemz-v1.0',
            ]
        );

        return result.rows[0];
    }
}
