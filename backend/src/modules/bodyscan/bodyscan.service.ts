/**
 * GEM Z — Body Scan 3D Service
 *
 * Analyzes body photos (front/side/back) using OpenAI Vision API to estimate
 * body composition and measurements. Tracks progress over time with
 * detailed measurement history.
 *
 * Features:
 *   - OpenAI GPT-4o Vision API body composition analysis
 *   - Multi-angle photo processing (front/side/back)
 *   - Body measurements: chest, waist, hips, arms, thighs
 *   - Body fat and muscle mass estimation
 *   - 3D visualization data generation
 *   - Progress tracking over time
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import { config } from '../../config';
import {
    AppError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ErrorCode,
} from '../../core/i18n/errors';

const log = createLogger('bodyscan');

// ─── Types ──────────────────────────────────────────────────────

export interface BodyPhotoSet {
    frontPhotoUrl: string;
    sidePhotoUrl?: string;
    backPhotoUrl?: string;
}

export interface BodyComposition {
    bodyFatPercent: number;
    muscleMassKg: number;
    boneMassKg: number;
    waterPercent: number;
    bmi: number;
}

export interface BodyMeasurements {
    chestCm: number;
    waistCm: number;
    hipsCm: number;
    leftArmCm: number;
    rightArmCm: number;
    leftThighCm: number;
    rightThighCm: number;
    leftCalfCm: number;
    rightCalfCm: number;
    shouldersCm: number;
    neckCm: number;
}

export interface BodyScan {
    id: string;
    userId: string;
    frontPhotoUrl: string;
    sidePhotoUrl?: string;
    backPhotoUrl?: string;
    scanStatus: 'pending' | 'processing' | 'completed' | 'failed';
    composition?: BodyComposition;
    measurements?: BodyMeasurements;
    aiAnalysisJson?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface ScanProgress {
    scan: BodyScan;
    measurements: BodyMeasurements;
}

export interface MeasurementTrend {
    date: string;
    chestCm: number;
    waistCm: number;
    hipsCm: number;
    leftArmCm: number;
    rightArmCm: number;
    leftThighCm: number;
    rightThighCm: number;
    bodyFatPercent?: number;
}

// ─── Rate Limiting ──────────────────────────────────────────────

const RATE_LIMIT_SCANS = 5; // per day
const RATE_LIMIT_WINDOW = 86400;

async function checkRateLimit(userId: string): Promise<void> {
    const key = `bodyscan:ratelimit:${userId}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
        await redisClient.expire(key, RATE_LIMIT_WINDOW);
    }
    if (count > RATE_LIMIT_SCANS) {
        throw new RateLimitError(
            `Body scan rate limit: ${RATE_LIMIT_SCANS} scans per day. Please try again tomorrow.`,
            ErrorCode.RATE_LIMIT_EXCEEDED
        );
    }
}

// ─── OpenAI Vision Analysis ─────────────────────────────────────

const BODY_SCAN_SYSTEM_PROMPT = `You are a professional body composition analyst and anthropometric expert.
Analyze the provided body photos and estimate detailed measurements and composition.

Rules:
- All measurements in centimeters, rounded to 1 decimal place
- Body fat percentage should be realistic (athletes 6-13%, fit 14-17%, average 18-24%, above average 25%+)
- BMI calculated from estimated height/weight ratios visible in photos
- Account for camera angle, lighting, and pose when estimating
- Provide symmetrical measurements (left/right may differ slightly)

Respond ONLY in JSON format with the following structure:
{
  "measurements": {
    "chestCm": number,
    "waistCm": number,
    "hipsCm": number,
    "leftArmCm": number,
    "rightArmCm": number,
    "leftThighCm": number,
    "rightThighCm": number,
    "leftCalfCm": number,
    "rightCalfCm": number,
    "shouldersCm": number,
    "neckCm": number
  },
  "composition": {
    "bodyFatPercent": number,
    "muscleMassKg": number,
    "boneMassKg": number,
    "waterPercent": number,
    "bmi": number
  },
  "analysis": {
    "bodyType": string,
    "postureNotes": string,
    "recommendations": string[],
    "confidence": number
  }
}`;

async function analyzeBodyPhotos(photos: BodyPhotoSet): Promise<{
    measurements: BodyMeasurements;
    composition: BodyComposition;
    analysis: any;
}> {
    if (!config.openaiApiKey) {
        log.warn('OpenAI API key not configured');
        throw new AppError('Body scan analysis service is not configured', 503, ErrorCode.SERVICE_UNAVAILABLE);
    }

    const imageContents: any[] = [
        { type: 'text', text: 'Analyze these body photos and provide detailed measurements and body composition analysis. If multiple photos provided, use all angles for better accuracy.' },
    ];

    // Add front photo
    imageContents.push({
        type: 'image_url',
        image_url: { url: photos.frontPhotoUrl, detail: 'high' },
    });

    // Add side photo
    if (photos.sidePhotoUrl) {
        imageContents.push({
            type: 'image_url',
            image_url: { url: photos.sidePhotoUrl, detail: 'high' },
        });
    }

    // Add back photo
    if (photos.backPhotoUrl) {
        imageContents.push({
            type: 'image_url',
            image_url: { url: photos.backPhotoUrl, detail: 'high' },
        });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: BODY_SCAN_SYSTEM_PROMPT },
                { role: 'user', content: imageContents },
            ],
            max_tokens: 2000,
            temperature: 0.3,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        log.error({ status: response.status, error: errorData }, 'OpenAI body scan API error');
        throw new AppError('Failed to analyze body photos', 503, ErrorCode.SERVICE_UNAVAILABLE);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new AppError('Empty response from body analysis API', 500, ErrorCode.SERVER_ERROR);
    }

    try {
        const parsed = JSON.parse(content);
        return validateAndNormalizeAnalysis(parsed);
    } catch (parseError) {
        log.error({ error: (parseError as Error).message, content: content.slice(0, 500) }, 'Failed to parse body scan response');
        throw new AppError('Failed to parse body analysis', 500, ErrorCode.SERVER_ERROR);
    }
}

function validateAndNormalizeAnalysis(data: any): {
    measurements: BodyMeasurements;
    composition: BodyComposition;
    analysis: any;
} {
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val || 0));

    const measurements: BodyMeasurements = {
        chestCm: clamp(parseFloat(data.measurements?.chestCm || data.measurements?.chest || 0), 30, 200),
        waistCm: clamp(parseFloat(data.measurements?.waistCm || data.measurements?.waist || 0), 20, 200),
        hipsCm: clamp(parseFloat(data.measurements?.hipsCm || data.measurements?.hips || 0), 30, 200),
        leftArmCm: clamp(parseFloat(data.measurements?.leftArmCm || data.measurements?.leftArm || 0), 10, 80),
        rightArmCm: clamp(parseFloat(data.measurements?.rightArmCm || data.measurements?.rightArm || 0), 10, 80),
        leftThighCm: clamp(parseFloat(data.measurements?.leftThighCm || data.measurements?.leftThigh || 0), 15, 100),
        rightThighCm: clamp(parseFloat(data.measurements?.rightThighCm || data.measurements?.rightThigh || 0), 15, 100),
        leftCalfCm: clamp(parseFloat(data.measurements?.leftCalfCm || data.measurements?.leftCalf || 0), 10, 60),
        rightCalfCm: clamp(parseFloat(data.measurements?.rightCalfCm || data.measurements?.rightCalf || 0), 10, 60),
        shouldersCm: clamp(parseFloat(data.measurements?.shouldersCm || data.measurements?.shoulders || 0), 20, 80),
        neckCm: clamp(parseFloat(data.measurements?.neckCm || data.measurements?.neck || 0), 10, 60),
    };

    const composition: BodyComposition = {
        bodyFatPercent: clamp(parseFloat(data.composition?.bodyFatPercent || data.composition?.bodyFat || 15), 3, 60),
        muscleMassKg: clamp(parseFloat(data.composition?.muscleMassKg || data.composition?.muscleMass || 30), 10, 150),
        boneMassKg: clamp(parseFloat(data.composition?.boneMassKg || data.composition?.boneMass || 3), 1, 10),
        waterPercent: clamp(parseFloat(data.composition?.waterPercent || data.composition?.water || 55), 30, 75),
        bmi: clamp(parseFloat(data.composition?.bmi || 22), 10, 60),
    };

    return {
        measurements,
        composition,
        analysis: {
            bodyType: String(data.analysis?.bodyType || 'Average'),
            postureNotes: String(data.analysis?.postureNotes || ''),
            recommendations: (data.analysis?.recommendations || []).slice(0, 5).map(String),
            confidence: clamp(parseFloat(data.analysis?.confidence || 0.7), 0, 1),
        },
    };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Upload body photos and start analysis.
 */
export async function uploadAndAnalyze(
    userId: string,
    photos: BodyPhotoSet
): Promise<BodyScan> {
    await checkRateLimit(userId);

    if (!photos.frontPhotoUrl) {
        throw new ValidationError('frontPhotoUrl is required', ErrorCode.MISSING_FIELD);
    }

    log.info({ userId }, 'Starting body scan analysis');

    // Create scan record
    const { rows: scanRows } = await db.query(
        `
        INSERT INTO body_scans (
            user_id, front_photo_url, side_photo_url, back_photo_url,
            scan_status
        )
        VALUES ($1, $2, $3, $4, 'processing')
        RETURNING id, created_at as "createdAt", updated_at as "updatedAt"
        `,
        [userId, photos.frontPhotoUrl, photos.sidePhotoUrl || null, photos.backPhotoUrl || null]
    );

    const scanId = scanRows[0].id;

    try {
        // Perform AI analysis
        const startTime = Date.now();
        const result = await analyzeBodyPhotos(photos);
        const processingTimeMs = Date.now() - startTime;

        // Update scan with composition
        await db.query(
            `
            UPDATE body_scans
            SET scan_status = 'completed',
                body_fat_percent = $1,
                muscle_mass_kg = $2,
                bone_mass_kg = $3,
                water_percent = $4,
                bmi = $5,
                ai_analysis_json = $6,
                updated_at = NOW()
            WHERE id = $7
            `,
            [
                result.composition.bodyFatPercent,
                result.composition.muscleMassKg,
                result.composition.boneMassKg,
                result.composition.waterPercent,
                result.composition.bmi,
                JSON.stringify(result.analysis),
                scanId,
            ]
        );

        // Insert measurements
        await db.query(
            `
            INSERT INTO body_measurements (
                scan_id, user_id, chest_cm, waist_cm, hips_cm,
                left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm,
                left_calf_cm, right_calf_cm, shoulders_cm, neck_cm
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `,
            [
                scanId, userId,
                result.measurements.chestCm,
                result.measurements.waistCm,
                result.measurements.hipsCm,
                result.measurements.leftArmCm,
                result.measurements.rightArmCm,
                result.measurements.leftThighCm,
                result.measurements.rightThighCm,
                result.measurements.leftCalfCm,
                result.measurements.rightCalfCm,
                result.measurements.shouldersCm,
                result.measurements.neckCm,
            ]
        );

        const scan: BodyScan = {
            id: scanId,
            userId,
            frontPhotoUrl: photos.frontPhotoUrl,
            sidePhotoUrl: photos.sidePhotoUrl,
            backPhotoUrl: photos.backPhotoUrl,
            scanStatus: 'completed',
            composition: result.composition,
            measurements: result.measurements,
            aiAnalysisJson: result.analysis,
            createdAt: new Date(scanRows[0].createdAt),
            updatedAt: new Date(),
        };

        log.info({ scanId, userId, processingTimeMs }, 'Body scan analysis complete');
        logAudit('bodyscan_complete', { userId, resource: scanId, result: 'success' });

        // Cache latest scan
        await redisClient.setEx(
            `bodyscan:latest:${userId}`,
            3600,
            JSON.stringify({ id: scan.id, measurements: result.measurements })
        );

        return scan;
    } catch (error) {
        // Mark scan as failed
        await db.query(
            `UPDATE body_scans SET scan_status = 'failed', updated_at = NOW() WHERE id = $1`,
            [scanId]
        );
        throw error;
    }
}

/**
 * Get user's scan history with measurements.
 */
export async function listScans(
    userId: string,
    limit: number = 20,
    offset: number = 0
): Promise<{ scans: BodyScan[]; total: number }> {
    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM body_scans WHERE user_id = $1`,
        [userId]
    );

    const { rows } = await db.query(
        `
        SELECT 
            bs.id, bs.user_id as "userId", bs.front_photo_url as "frontPhotoUrl",
            bs.side_photo_url as "sidePhotoUrl", bs.back_photo_url as "backPhotoUrl",
            bs.scan_status as "scanStatus",
            bs.body_fat_percent as "bodyFatPercent", bs.muscle_mass_kg as "muscleMassKg",
            bs.bone_mass_kg as "boneMassKg", bs.water_percent as "waterPercent", bs.bmi,
            bs.ai_analysis_json as "aiAnalysisJson",
            bs.created_at as "createdAt", bs.updated_at as "updatedAt",
            bm.chest_cm as "chestCm", bm.waist_cm as "waistCm", bm.hips_cm as "hipsCm",
            bm.left_arm_cm as "leftArmCm", bm.right_arm_cm as "rightArmCm",
            bm.left_thigh_cm as "leftThighCm", bm.right_thigh_cm as "rightThighCm",
            bm.left_calf_cm as "leftCalfCm", bm.right_calf_cm as "rightCalfCm",
            bm.shoulders_cm as "shouldersCm", bm.neck_cm as "neckCm"
        FROM body_scans bs
        LEFT JOIN body_measurements bm ON bm.scan_id = bs.id
        WHERE bs.user_id = $1
        ORDER BY bs.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [userId, limit, offset]
    );

    return {
        scans: rows.map(mapScanRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * Get progress comparison over time.
 */
export async function getProgress(userId: string): Promise<{
    trends: MeasurementTrend[];
    latestScan: BodyScan | null;
    firstScan: BodyScan | null;
    changes: Record<string, number>;
}> {
    const { rows } = await db.query(
        `
        SELECT 
            bs.id, bs.user_id as "userId", bs.front_photo_url as "frontPhotoUrl",
            bs.side_photo_url as "sidePhotoUrl", bs.back_photo_url as "backPhotoUrl",
            bs.scan_status as "scanStatus",
            bs.body_fat_percent as "bodyFatPercent", bs.muscle_mass_kg as "muscleMassKg",
            bs.bone_mass_kg as "boneMassKg", bs.water_percent as "waterPercent", bs.bmi,
            bs.ai_analysis_json as "aiAnalysisJson",
            bs.created_at as "createdAt", bs.updated_at as "updatedAt",
            bm.chest_cm as "chestCm", bm.waist_cm as "waistCm", bm.hips_cm as "hipsCm",
            bm.left_arm_cm as "leftArmCm", bm.right_arm_cm as "rightArmCm",
            bm.left_thigh_cm as "leftThighCm", bm.right_thigh_cm as "rightThighCm",
            bm.left_calf_cm as "leftCalfCm", bm.right_calf_cm as "rightCalfCm",
            bm.shoulders_cm as "shouldersCm", bm.neck_cm as "neckCm"
        FROM body_scans bs
        LEFT JOIN body_measurements bm ON bm.scan_id = bs.id
        WHERE bs.user_id = $1 AND bs.scan_status = 'completed'
        ORDER BY bs.created_at DESC
        LIMIT 50
        `,
        [userId]
    );

    const scans = rows.map(mapScanRow);
    const trends: MeasurementTrend[] = scans.map((s) => ({
        date: s.createdAt.toISOString().split('T')[0],
        chestCm: s.measurements?.chestCm || 0,
        waistCm: s.measurements?.waistCm || 0,
        hipsCm: s.measurements?.hipsCm || 0,
        leftArmCm: s.measurements?.leftArmCm || 0,
        rightArmCm: s.measurements?.rightArmCm || 0,
        leftThighCm: s.measurements?.leftThighCm || 0,
        rightThighCm: s.measurements?.rightThighCm || 0,
        bodyFatPercent: s.composition?.bodyFatPercent,
    }));

    const latestScan = scans[0] || null;
    const firstScan = scans[scans.length - 1] || null;

    // Calculate changes
    const changes: Record<string, number> = {};
    if (latestScan?.measurements && firstScan?.measurements) {
        const m = (key: keyof BodyMeasurements) => {
            const latest = latestScan.measurements?.[key] || 0;
            const first = firstScan.measurements?.[key] || 0;
            return latest - first;
        };
        changes.chestCm = m('chestCm');
        changes.waistCm = m('waistCm');
        changes.hipsCm = m('hipsCm');
        changes.leftArmCm = m('leftArmCm');
        changes.rightArmCm = m('rightArmCm');
        changes.leftThighCm = m('leftThighCm');
        changes.rightThighCm = m('rightThighCm');
        if (latestScan.composition && firstScan.composition) {
            changes.bodyFatPercent = latestScan.composition.bodyFatPercent - firstScan.composition.bodyFatPercent;
        }
    }

    return { trends, latestScan, firstScan, changes };
}

/**
 * Get a single scan by ID.
 */
export async function getScanById(scanId: string): Promise<BodyScan> {
    const { rows } = await db.query(
        `
        SELECT 
            bs.id, bs.user_id as "userId", bs.front_photo_url as "frontPhotoUrl",
            bs.side_photo_url as "sidePhotoUrl", bs.back_photo_url as "backPhotoUrl",
            bs.scan_status as "scanStatus",
            bs.body_fat_percent as "bodyFatPercent", bs.muscle_mass_kg as "muscleMassKg",
            bs.bone_mass_kg as "boneMassKg", bs.water_percent as "waterPercent", bs.bmi,
            bs.ai_analysis_json as "aiAnalysisJson",
            bs.created_at as "createdAt", bs.updated_at as "updatedAt",
            bm.chest_cm as "chestCm", bm.waist_cm as "waistCm", bm.hips_cm as "hipsCm",
            bm.left_arm_cm as "leftArmCm", bm.right_arm_cm as "rightArmCm",
            bm.left_thigh_cm as "leftThighCm", bm.right_thigh_cm as "rightThighCm",
            bm.left_calf_cm as "leftCalfCm", bm.right_calf_cm as "rightCalfCm",
            bm.shoulders_cm as "shouldersCm", bm.neck_cm as "neckCm"
        FROM body_scans bs
        LEFT JOIN body_measurements bm ON bm.scan_id = bs.id
        WHERE bs.id = $1
        `,
        [scanId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Scan not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    return mapScanRow(rows[0]);
}

// ─── Helpers ────────────────────────────────────────────────────

function mapScanRow(row: any): BodyScan {
    let aiAnalysisJson: any = null;
    try {
        aiAnalysisJson = typeof row.aiAnalysisJson === 'string'
            ? JSON.parse(row.aiAnalysisJson)
            : row.aiAnalysisJson;
    } catch {
        aiAnalysisJson = null;
    }

    let measurements: BodyMeasurements | undefined;
    if (row.chestCm !== null) {
        measurements = {
            chestCm: parseFloat(row.chestCm),
            waistCm: parseFloat(row.waistCm),
            hipsCm: parseFloat(row.hipsCm),
            leftArmCm: parseFloat(row.leftArmCm),
            rightArmCm: parseFloat(row.rightArmCm),
            leftThighCm: parseFloat(row.leftThighCm),
            rightThighCm: parseFloat(row.rightThighCm),
            leftCalfCm: parseFloat(row.leftCalfCm),
            rightCalfCm: parseFloat(row.rightCalfCm),
            shouldersCm: parseFloat(row.shouldersCm),
            neckCm: parseFloat(row.neckCm),
        };
    }

    let composition: BodyComposition | undefined;
    if (row.bodyFatPercent !== null) {
        composition = {
            bodyFatPercent: parseFloat(row.bodyFatPercent),
            muscleMassKg: parseFloat(row.muscleMassKg),
            boneMassKg: parseFloat(row.boneMassKg),
            waterPercent: parseFloat(row.waterPercent),
            bmi: parseFloat(row.bmi),
        };
    }

    return {
        id: String(row.id),
        userId: String(row.userId),
        frontPhotoUrl: row.frontPhotoUrl,
        sidePhotoUrl: row.sidePhotoUrl,
        backPhotoUrl: row.backPhotoUrl,
        scanStatus: row.scanStatus,
        composition,
        measurements,
        aiAnalysisJson,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}
