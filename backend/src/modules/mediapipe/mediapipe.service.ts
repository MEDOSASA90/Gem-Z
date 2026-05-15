/**
 * GEM Z — MediaPipe Pose Analysis Service
 *
 * Analyzes exercise form using MediaPipe Pose landmarks.
 * Calculates joint angles, detects form deviations, and returns
 * a comprehensive form score with corrective feedback.
 *
 * Features:
 *   - Joint angle calculation from pose landmarks
 *   - Exercise-specific form validation (squat, deadlift, bench, overhead press)
 *   - Form scoring algorithm (0-100)
 *   - Personalized correction tips
 *   - Analysis persistence for progress tracking
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import { config } from '../../config';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('mediapipe');

// ─── Types ──────────────────────────────────────────────────────

export type ExerciseType = 'squat' | 'deadlift' | 'bench_press' | 'overhead_press' | 'pull_up' | 'push_up' | 'lunge' | 'plank';

export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
}

export interface PoseFrame {
    timestamp: number;
    landmarks: PoseLandmark[];
}

export interface JointAngle {
    joint: string;
    angle: number;
    targetMin: number;
    targetMax: number;
    deviation: number;
    status: 'good' | 'warning' | 'poor';
}

export interface FormIssue {
    type: 'depth' | 'alignment' | 'balance' | 'tempo' | 'range_of_motion';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
}

export interface FormAnalysisResult {
    id: string;
    userId: string;
    exerciseType: ExerciseType;
    overallScore: number;
    repCount: number;
    jointAngles: JointAngle[];
    issues: FormIssue[];
    strengths: string[];
    videoUrl: string | null;
    processingTimeMs: number;
    createdAt: Date;
}

export interface AnalysisInput {
    exerciseType: ExerciseType;
    poseFrames: PoseFrame[];
    videoUrl?: string;
    userWeight?: number;
    userHeight?: number;
}

export interface AnalysisFilters {
    userId?: string;
    exerciseType?: ExerciseType;
    limit?: number;
    offset?: number;
    dateFrom?: Date;
    dateTo?: Date;
}

// ─── Exercise Configuration ─────────────────────────────────────

interface ExerciseConfig {
    targetJoints: string[];
    angleTargets: Record<string, { min: number; max: number; ideal: number }>;
    criticalLandmarks: number[];
    formChecks: string[];
}

const EXERCISE_CONFIGS: Record<ExerciseType, ExerciseConfig> = {
    squat: {
        targetJoints: ['hip', 'knee', 'ankle'],
        angleTargets: {
            hip: { min: 70, max: 110, ideal: 90 },
            knee: { min: 80, max: 110, ideal: 95 },
            ankle: { min: 70, max: 100, ideal: 85 },
        },
        criticalLandmarks: [11, 12, 23, 24, 25, 26, 27, 28],
        formChecks: ['depth', 'knee_valgus', 'back_alignment', 'hip_mobility'],
    },
    deadlift: {
        targetJoints: ['hip', 'knee', 'shoulder'],
        angleTargets: {
            hip: { min: 45, max: 90, ideal: 70 },
            knee: { min: 100, max: 140, ideal: 120 },
            shoulder: { min: 80, max: 110, ideal: 95 },
        },
        criticalLandmarks: [11, 12, 23, 24, 25, 26, 27, 28],
        formChecks: ['back_flatness', 'hip_hinge', 'bar_path', 'shoulder_position'],
    },
    bench_press: {
        targetJoints: ['elbow', 'shoulder', 'wrist'],
        angleTargets: {
            elbow: { min: 75, max: 105, ideal: 90 },
            shoulder: { min: 45, max: 75, ideal: 60 },
            wrist: { min: 160, max: 180, ideal: 170 },
        },
        criticalLandmarks: [11, 12, 13, 14, 15, 16],
        formChecks: ['elbow_tuck', 'bar_path', 'wrist_alignment', 'scapular_retraction'],
    },
    overhead_press: {
        targetJoints: ['elbow', 'shoulder', 'hip'],
        angleTargets: {
            elbow: { min: 160, max: 180, ideal: 175 },
            shoulder: { min: 160, max: 180, ideal: 175 },
            hip: { min: 160, max: 180, ideal: 175 },
        },
        criticalLandmarks: [11, 12, 13, 14, 15, 16, 23, 24],
        formChecks: ['core_bracing', 'bar_path', 'head_position', 'hip_movement'],
    },
    pull_up: {
        targetJoints: ['elbow', 'shoulder'],
        angleTargets: {
            elbow: { min: 30, max: 90, ideal: 60 },
            shoulder: { min: 80, max: 120, ideal: 100 },
        },
        criticalLandmarks: [11, 12, 13, 14, 15, 16],
        formChecks: ['full_range', 'body_swing', 'chin_position', 'grip_width'],
    },
    push_up: {
        targetJoints: ['elbow', 'shoulder', 'hip'],
        angleTargets: {
            elbow: { min: 70, max: 100, ideal: 85 },
            shoulder: { min: 50, max: 80, ideal: 65 },
            hip: { min: 160, max: 180, ideal: 175 },
        },
        criticalLandmarks: [11, 12, 13, 14, 15, 16, 23, 24],
        formChecks: ['body_alignment', 'depth', 'elbow_position', 'core_stability'],
    },
    lunge: {
        targetJoints: ['hip', 'knee', 'ankle'],
        angleTargets: {
            hip: { min: 80, max: 110, ideal: 95 },
            knee_front: { min: 80, max: 110, ideal: 95 },
            knee_back: { min: 85, max: 100, ideal: 90 },
        },
        criticalLandmarks: [23, 24, 25, 26, 27, 28],
        formChecks: ['knee_alignment', 'torso_upright', 'depth', 'stride_length'],
    },
    plank: {
        targetJoints: ['hip', 'shoulder'],
        angleTargets: {
            hip: { min: 170, max: 180, ideal: 180 },
            shoulder: { min: 80, max: 100, ideal: 90 },
        },
        criticalLandmarks: [11, 12, 23, 24, 25, 26, 27, 28],
        formChecks: ['body_linearity', 'hip_height', 'shoulder_alignment', 'hold_time'],
    },
};

// ─── Angle Calculation ──────────────────────────────────────────

/**
 * Calculate the angle at joint B formed by points A-B-C.
 */
function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };

    const dotProduct = ba.x * bc.x + ba.y * bc.y;
    const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

    if (magBA === 0 || magBC === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magBA * magBC)));
    const angleRad = Math.acos(cosAngle);
    return (angleRad * 180) / Math.PI;
}

/**
 * Map exercise type to landmark indices for joint angle calculation.
 */
function getJointLandmarks(exerciseType: ExerciseType): Record<string, [number, number, number]> {
    const configs: Record<string, Record<string, [number, number, number]>> = {
        squat: {
            hip: [11, 23, 25],
            knee: [23, 25, 27],
            ankle: [25, 27, 31],
        },
        deadlift: {
            hip: [11, 23, 25],
            knee: [23, 25, 27],
            shoulder: [23, 11, 13],
        },
        bench_press: {
            elbow: [11, 13, 15],
            shoulder: [13, 11, 23],
            wrist: [13, 15, 17],
        },
        overhead_press: {
            elbow: [11, 13, 15],
            shoulder: [13, 11, 23],
            hip: [11, 23, 25],
        },
        pull_up: {
            elbow: [11, 13, 15],
            shoulder: [13, 11, 23],
        },
        push_up: {
            elbow: [11, 13, 15],
            shoulder: [13, 11, 23],
            hip: [11, 23, 25],
        },
        lunge: {
            hip: [11, 23, 25],
            knee_front: [23, 25, 27],
            knee_back: [23, 24, 26],
        },
        plank: {
            hip: [11, 23, 25],
            shoulder: [13, 11, 23],
        },
    };
    return configs[exerciseType] || {};
}

// ─── Form Analysis Core ─────────────────────────────────────────

/**
 * Analyze a sequence of pose frames and produce a form analysis result.
 */
function analyzePoseFrames(input: AnalysisInput): Omit<FormAnalysisResult, 'id' | 'userId' | 'createdAt'> {
    const startTime = Date.now();
    const config = EXERCISE_CONFIGS[input.exerciseType];

    if (!config) {
        throw new ValidationError(`Unsupported exercise type: ${input.exerciseType}`, ErrorCode.INVALID_INPUT);
    }

    const jointLandmarks = getJointLandmarks(input.exerciseType);
    const jointAngles: JointAngle[] = [];
    const issues: FormIssue[] = [];
    const strengths: string[] = [];

    // Calculate joint angles across all frames, average them
    const angleSums: Record<string, number> = {};
    const angleCounts: Record<string, number> = {};

    for (const frame of input.poseFrames) {
        for (const [jointName, indices] of Object.entries(jointLandmarks)) {
            const [aIdx, bIdx, cIdx] = indices;
            if (
                aIdx < frame.landmarks.length &&
                bIdx < frame.landmarks.length &&
                cIdx < frame.landmarks.length &&
                frame.landmarks[aIdx].visibility > 0.5 &&
                frame.landmarks[bIdx].visibility > 0.5 &&
                frame.landmarks[cIdx].visibility > 0.5
            ) {
                const angle = calculateAngle(
                    frame.landmarks[aIdx],
                    frame.landmarks[bIdx],
                    frame.landmarks[cIdx]
                );
                angleSums[jointName] = (angleSums[jointName] || 0) + angle;
                angleCounts[jointName] = (angleCounts[jointName] || 0) + 1;
            }
        }
    }

    // Compute average angles and compare to targets
    let totalScore = 0;
    let scoredJoints = 0;

    for (const [jointName, target] of Object.entries(config.angleTargets)) {
        const avgAngle = angleCounts[jointName] ? angleSums[jointName] / angleCounts[jointName] : 0;
        const deviation = Math.abs(avgAngle - target.ideal);
        const range = target.max - target.min;

        let status: 'good' | 'warning' | 'poor';
        if (deviation <= range * 0.15) {
            status = 'good';
            totalScore += 95;
        } else if (deviation <= range * 0.3) {
            status = 'warning';
            totalScore += 75;
        } else {
            status = 'poor';
            totalScore += Math.max(30, 100 - (deviation / range) * 100);
        }
        scoredJoints++;

        jointAngles.push({
            joint: jointName,
            angle: Math.round(avgAngle * 10) / 10,
            targetMin: target.min,
            targetMax: target.max,
            deviation: Math.round(deviation * 10) / 10,
            status,
        });
    }

    const overallScore = scoredJoints > 0 ? Math.round(totalScore / scoredJoints) : 50;

    // Detect form issues based on angle deviations
    for (const angle of jointAngles) {
        if (angle.status === 'poor') {
            issues.push({
                type: angle.deviation > 20 ? 'alignment' : 'range_of_motion',
                severity: angle.deviation > 30 ? 'high' : angle.deviation > 15 ? 'medium' : 'low',
                description: `${angle.joint} angle is ${angle.angle}deg (target: ${angle.targetMin}-${angle.targetMax}deg)`,
                suggestion: getCorrectionTip(input.exerciseType, angle.joint),
            });
        }
    }

    // Add strengths
    const goodJoints = jointAngles.filter((ja) => ja.status === 'good');
    if (goodJoints.length > 0) {
        strengths.push(`Excellent ${goodJoints.map((j) => j.joint).join(', ')} positioning`);
    }
    if (overallScore >= 85) {
        strengths.push('Overall form is near-professional level');
    } else if (overallScore >= 70) {
        strengths.push('Solid foundation with good movement patterns');
    }

    // Estimate rep count from frame count (approx 30fps, ~2s per rep)
    const repCount = Math.max(1, Math.round(input.poseFrames.length / 60));

    const processingTimeMs = Date.now() - startTime;

    return {
        userId: '',
        exerciseType: input.exerciseType,
        overallScore,
        repCount,
        jointAngles,
        issues,
        strengths,
        videoUrl: input.videoUrl || null,
        processingTimeMs,
    };
}

/**
 * Get exercise-specific correction tips.
 */
function getCorrectionTip(exerciseType: ExerciseType, joint: string): string {
    const tips: Record<string, Record<string, string>> = {
        squat: {
            hip: 'Focus on sitting back as if onto a chair. Push hips back before bending knees.',
            knee: 'Keep knees tracking over toes. Avoid knee valgus (inward collapse).',
            ankle: 'Work on ankle mobility with wall ankle rocks or elevate heels slightly.',
        },
        deadlift: {
            hip: 'Lower hips more to engage the posterior chain. Think "hinge" not "squat".',
            knee: 'Maintain a slight knee bend throughout. Do not fully lock or hyperextend.',
            shoulder: 'Keep shoulders slightly in front of the bar at setup. Retract shoulder blades.',
        },
        bench_press: {
            elbow: 'Tuck elbows at ~75deg from torso. Avoid excessive flaring.',
            shoulder: 'Retract scapulae and maintain a slight arch. Keep shoulders pinned.',
            wrist: 'Keep wrists straight and stacked over elbows. Use wrist wraps if needed.',
        },
        overhead_press: {
            elbow: 'Lock out elbows fully at the top. Drive the bar in a straight line.',
            shoulder: 'Shrug shoulders at the top for full range of motion.',
            hip: 'Squeeze glutes and brace core to prevent excessive arching.',
        },
        pull_up: {
            elbow: 'Pull elbows down and back. Focus on driving from the lats.',
            shoulder: 'Depress shoulders before initiating the pull. Avoid shrugging.',
        },
        push_up: {
            elbow: 'Keep elbows at ~45deg from torso. Do not flare them wide.',
            shoulder: 'Maintain protracted scapulae at the top for serratus engagement.',
            hip: 'Keep hips in line with shoulders. Do not sag or pike.',
        },
        lunge: {
            hip: 'Drop the back knee straight down. Keep torso upright.',
            knee_front: 'Ensure front knee tracks over the ankle, not past the toes excessively.',
            knee_back: 'Gently touch the back knee to the ground. Control the descent.',
        },
        plank: {
            hip: 'Keep hips level with shoulders. Squeeze glutes to prevent sagging.',
            shoulder: 'Stack shoulders directly over elbows. Push the floor away.',
        },
    };

    return tips[exerciseType]?.[joint] || `Focus on maintaining proper ${joint} positioning throughout the movement.`;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Analyze exercise form from pose landmarks and persist the result.
 */
export async function analyzeForm(
    userId: string,
    input: AnalysisInput
): Promise<FormAnalysisResult> {
    if (!input.poseFrames || input.poseFrames.length === 0) {
        throw new ValidationError('At least one pose frame is required', ErrorCode.MISSING_FIELD);
    }

    if (!input.exerciseType || !EXERCISE_CONFIGS[input.exerciseType]) {
        throw new ValidationError(
            `Valid exercise type is required. Supported: ${Object.keys(EXERCISE_CONFIGS).join(', ')}`,
            ErrorCode.INVALID_INPUT
        );
    }

    log.info({ userId, exerciseType: input.exerciseType, frames: input.poseFrames.length }, 'Starting pose analysis');

    const analysis = analyzePoseFrames(input);

    // Persist to database
    const { rows } = await db.query(
        `
        INSERT INTO mediapipe_analyses (
            user_id, exercise_type, overall_score, rep_count,
            joint_angles, issues, strengths, video_url, processing_time_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at as "createdAt"
        `,
        [
            userId,
            analysis.exerciseType,
            analysis.overallScore,
            analysis.repCount,
            JSON.stringify(analysis.jointAngles),
            JSON.stringify(analysis.issues),
            JSON.stringify(analysis.strengths),
            analysis.videoUrl,
            analysis.processingTimeMs,
        ]
    );

    const result: FormAnalysisResult = {
        id: String(rows[0].id),
        userId,
        ...analysis,
        createdAt: new Date(rows[0].createdAt),
    };

    log.info({ analysisId: result.id, score: result.overallScore, exerciseType: input.exerciseType }, 'Pose analysis complete');
    logAudit('mediapipe_analysis', { userId, resource: result.id, result: 'success', score: result.overallScore });

    // Cache recent analysis for quick retrieval
    await redisClient.setEx(
        `mediapipe:latest:${userId}`,
        300,
        JSON.stringify({ id: result.id, score: result.overallScore, exerciseType: result.exerciseType })
    );

    return result;
}

/**
 * Get a single analysis by ID.
 */
export async function getAnalysisById(analysisId: string): Promise<FormAnalysisResult> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", exercise_type as "exerciseType",
               overall_score as "overallScore", rep_count as "repCount",
               joint_angles as "jointAngles", issues, strengths,
               video_url as "videoUrl", processing_time_ms as "processingTimeMs",
               created_at as "createdAt"
        FROM mediapipe_analyses
        WHERE id = $1
        `,
        [analysisId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Analysis not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = rows[0];
    return {
        id: String(row.id),
        userId: String(row.userId),
        exerciseType: row.exerciseType,
        overallScore: row.overallScore,
        repCount: row.repCount,
        jointAngles: row.jointAngles,
        issues: row.issues,
        strengths: row.strengths,
        videoUrl: row.videoUrl,
        processingTimeMs: row.processingTimeMs,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * List analyses with optional filters.
 */
export async function listAnalyses(filters: AnalysisFilters): Promise<{ analyses: FormAnalysisResult[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
    }
    if (filters.exerciseType) {
        conditions.push(`exercise_type = $${paramIndex++}`);
        params.push(filters.exerciseType);
    }
    if (filters.dateFrom) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countRes = await db.query(
        `SELECT COUNT(*) as total FROM mediapipe_analyses ${whereClause}`,
        params
    );
    const total = parseInt(countRes.rows[0].total) || 0;

    // Fetch
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", exercise_type as "exerciseType",
               overall_score as "overallScore", rep_count as "repCount",
               joint_angles as "jointAngles", issues, strengths,
               video_url as "videoUrl", processing_time_ms as "processingTimeMs",
               created_at as "createdAt"
        FROM mediapipe_analyses
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        [...params, limit, offset]
    );

    const analyses: FormAnalysisResult[] = rows.map((row) => ({
        id: String(row.id),
        userId: String(row.userId),
        exerciseType: row.exerciseType,
        overallScore: row.overallScore,
        repCount: row.repCount,
        jointAngles: row.jointAngles,
        issues: row.issues,
        strengths: row.strengths,
        videoUrl: row.videoUrl,
        processingTimeMs: row.processingTimeMs,
        createdAt: new Date(row.createdAt),
    }));

    return { analyses, total };
}

/**
 * Get progress analytics for a user.
 */
export async function getProgressAnalytics(userId: string): Promise<{
    totalAnalyses: number;
    averageScore: number;
    bestScore: number;
    exerciseBreakdown: Record<ExerciseType, { count: number; avgScore: number }>;
    recentTrend: { date: string; avgScore: number }[];
}> {
    const { rows: summaryRows } = await db.query(
        `
        SELECT
            COUNT(*) as total,
            COALESCE(AVG(overall_score), 0) as avg_score,
            COALESCE(MAX(overall_score), 0) as best_score
        FROM mediapipe_analyses
        WHERE user_id = $1
        `,
        [userId]
    );

    const { rows: breakdownRows } = await db.query(
        `
        SELECT exercise_type, COUNT(*) as count, COALESCE(AVG(overall_score), 0) as avg_score
        FROM mediapipe_analyses
        WHERE user_id = $1
        GROUP BY exercise_type
        `,
        [userId]
    );

    const { rows: trendRows } = await db.query(
        `
        SELECT DATE(created_at) as date, COALESCE(AVG(overall_score), 0) as avg_score
        FROM mediapipe_analyses
        WHERE user_id = $1
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
        `,
        [userId]
    );

    const exerciseBreakdown: Record<string, { count: number; avgScore: number }> = {};
    for (const row of breakdownRows) {
        exerciseBreakdown[row.exercise_type] = {
            count: parseInt(row.count),
            avgScore: Math.round(parseFloat(row.avg_score)),
        };
    }

    return {
        totalAnalyses: parseInt(summaryRows[0].total),
        averageScore: Math.round(parseFloat(summaryRows[0].avg_score)),
        bestScore: parseInt(summaryRows[0].best_score),
        exerciseBreakdown: exerciseBreakdown as any,
        recentTrend: trendRows.map((r) => ({
            date: r.date,
            avgScore: Math.round(parseFloat(r.avg_score)),
        })).reverse(),
    };
}
