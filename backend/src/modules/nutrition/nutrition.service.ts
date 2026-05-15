/**
 * GEM Z — Nutrition Scanner Service
 *
 * Analyzes food photos using OpenAI Vision API to estimate nutritional content.
 * Provides detailed calorie, macro, and micronutrient breakdowns.
 * Tracks scan history and nutritional trends for users.
 *
 * Features:
 *   - OpenAI GPT-4o Vision API integration
 *   - Calorie and macro estimation
 *   - Portion size detection
 *   - Scan history persistence
 *   - Daily/weekly nutrition tracking
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
} from '../../core/errors';

const log = createLogger('nutrition');

// ─── Types ──────────────────────────────────────────────────────

export interface NutritionBreakdown {
    foodName: string;
    confidence: number;
    portionSize: string;
    portionWeightGrams: number;
    calories: number;
    protein: number;      // grams
    carbohydrates: number; // grams
    fat: number;          // grams
    fiber: number;        // grams
    sugar: number;        // grams
    sodium: number;       // mg
    cholesterol: number;  // mg
    vitamins: Array<{ name: string; amount: string; dailyPercent: number }>;
    minerals: Array<{ name: string; amount: string; dailyPercent: number }>;
    healthScore: number;  // 0-100
    tags: string[];
    alternatives: Array<{ name: string; calories: number; why: string }>;
}

export interface NutritionScan {
    id: string;
    userId: string;
    imageUrl: string;
    foodName: string;
    confidence: number;
    portionSize: string;
    portionWeightGrams: number;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    healthScore: number;
    fullBreakdown: NutritionBreakdown;
    createdAt: Date;
}

export interface ScanInput {
    imageUrl: string;
    userNotes?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface DailyNutrition {
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
    scanCount: number;
    meals: Array<{
        mealType: string;
        calories: number;
        foodName: string;
    }>;
}

// ─── Rate Limiting ──────────────────────────────────────────────

const RATE_LIMIT_SCANS = 20; // per hour
const RATE_LIMIT_WINDOW = 3600;

async function checkRateLimit(userId: string): Promise<void> {
    const key = `nutrition:ratelimit:${userId}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
        await redisClient.expire(key, RATE_LIMIT_WINDOW);
    }
    if (count > RATE_LIMIT_SCANS) {
        throw new RateLimitError(
            `Scan rate limit: ${RATE_LIMIT_SCANS} scans per hour. Please try again later.`,
            ErrorCode.RATE_LIMIT_EXCEEDED
        );
    }
}

// ─── OpenAI Vision Integration ──────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are a professional nutrition analyst. Analyze food images and provide accurate nutritional estimates.

Rules:
- Estimate portion sizes realistically
- Round calories to the nearest 5
- Round macros to 1 decimal place
- Include common vitamins and minerals found in the food
- Provide a health score (0-100) based on nutritional density
- Suggest 2-3 healthier alternatives when appropriate
- Confidence should reflect clarity of the image

Respond in JSON format only. Do not include markdown formatting.`;

/**
 * Analyze a food image using OpenAI GPT-4o Vision.
 */
async function analyzeFoodImage(imageUrl: string, userNotes?: string): Promise<NutritionBreakdown> {
    if (!config.openaiApiKey) {
        log.warn('OpenAI API key not configured');
        throw new AppError('Nutrition analysis service is not configured', 503, ErrorCode.SERVICE_UNAVAILABLE);
    }

    const userContent = userNotes
        ? `Analyze this food image. Additional notes from user: "${userNotes}"`
        : 'Analyze this food image and provide detailed nutritional information.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: VISION_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userContent },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail: 'high',
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1200,
            temperature: 0.3,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        log.error({ status: response.status, error: errorData }, 'OpenAI Vision API error');
        throw new AppError('Failed to analyze food image', 503, ErrorCode.SERVICE_UNAVAILABLE);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new AppError('Empty response from vision API', 500, ErrorCode.SERVER_ERROR);
    }

    try {
        const parsed = JSON.parse(content);
        return validateAndNormalizeBreakdown(parsed);
    } catch (parseError) {
        log.error({ error: (parseError as Error).message, content: content.slice(0, 500) }, 'Failed to parse vision response');
        throw new AppError('Failed to parse nutrition analysis', 500, ErrorCode.SERVER_ERROR);
    }
}

/**
 * Validate and normalize the breakdown from the API.
 */
function validateAndNormalizeBreakdown(data: any): NutritionBreakdown {
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val || 0));

    const vitamins = (data.vitamins || data.vitaminsAndMinerals?.vitamins || []).map((v: any) => ({
        name: String(v.name || v.vitamin || 'Unknown'),
        amount: String(v.amount || v.value || 'N/A'),
        dailyPercent: clamp(parseFloat(v.dailyPercent || v.percent || 0), 0, 500),
    }));

    const minerals = (data.minerals || data.vitaminsAndMinerals?.minerals || []).map((m: any) => ({
        name: String(m.name || m.mineral || 'Unknown'),
        amount: String(m.amount || m.value || 'N/A'),
        dailyPercent: clamp(parseFloat(m.dailyPercent || m.percent || 0), 0, 500),
    }));

    const alternatives = (data.alternatives || data.healthierAlternatives || []).slice(0, 3).map((a: any) => ({
        name: String(a.name || a.food || 'Unknown'),
        calories: Math.round(parseFloat(a.calories || 0)),
        why: String(a.why || a.reason || 'Lower calorie option'),
    }));

    return {
        foodName: String(data.foodName || data.food || data.name || 'Unknown food'),
        confidence: clamp(parseFloat(data.confidence || 0.8), 0, 1),
        portionSize: String(data.portionSize || data.portion || 'Standard serving'),
        portionWeightGrams: Math.round(parseFloat(data.portionWeightGrams || data.weightGrams || 200)),
        calories: Math.round(parseFloat(data.calories || 0) / 5) * 5,
        protein: Math.round(parseFloat(data.protein || data.proteinGrams || 0) * 10) / 10,
        carbohydrates: Math.round(parseFloat(data.carbohydrates || data.carbs || data.carbsGrams || 0) * 10) / 10,
        fat: Math.round(parseFloat(data.fat || data.fatGrams || 0) * 10) / 10,
        fiber: Math.round(parseFloat(data.fiber || data.fiberGrams || 0) * 10) / 10,
        sugar: Math.round(parseFloat(data.sugar || data.sugarGrams || 0) * 10) / 10,
        sodium: Math.round(parseFloat(data.sodium || data.sodiumMg || 0)),
        cholesterol: Math.round(parseFloat(data.cholesterol || data.cholesterolMg || 0)),
        vitamins,
        minerals,
        healthScore: clamp(parseFloat(data.healthScore || data.healthRating || 50), 0, 100),
        tags: (data.tags || data.foodTags || []).map(String).slice(0, 10),
        alternatives,
    };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Scan a food image and store the nutrition analysis.
 */
export async function scanFood(
    userId: string,
    input: ScanInput
): Promise<NutritionScan> {
    await checkRateLimit(userId);

    if (!input.imageUrl) {
        throw new ValidationError('imageUrl is required', ErrorCode.MISSING_FIELD);
    }

    log.info({ userId, imageUrl: input.imageUrl }, 'Starting food scan');

    const startTime = Date.now();
    const breakdown = await analyzeFoodImage(input.imageUrl, input.userNotes);
    const processingTimeMs = Date.now() - startTime;

    // Persist to database
    const { rows } = await db.query(
        `
        INSERT INTO nutrition_scans (
            user_id, image_url, food_name, confidence,
            portion_size, portion_weight_grams, calories,
            protein, carbohydrates, fat, fiber, sugar,
            sodium, cholesterol, health_score,
            full_breakdown, meal_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, created_at as "createdAt"
        `,
        [
            userId,
            input.imageUrl,
            breakdown.foodName,
            breakdown.confidence,
            breakdown.portionSize,
            breakdown.portionWeightGrams,
            breakdown.calories,
            breakdown.protein,
            breakdown.carbohydrates,
            breakdown.fat,
            breakdown.fiber,
            breakdown.sugar,
            breakdown.sodium,
            breakdown.cholesterol,
            breakdown.healthScore,
            JSON.stringify(breakdown),
            input.mealType || null,
        ]
    );

    const scan: NutritionScan = {
        id: String(rows[0].id),
        userId,
        imageUrl: input.imageUrl,
        foodName: breakdown.foodName,
        confidence: breakdown.confidence,
        portionSize: breakdown.portionSize,
        portionWeightGrams: breakdown.portionWeightGrams,
        calories: breakdown.calories,
        protein: breakdown.protein,
        carbohydrates: breakdown.carbohydrates,
        fat: breakdown.fat,
        fiber: breakdown.fiber,
        sugar: breakdown.sugar,
        sodium: breakdown.sodium,
        cholesterol: breakdown.cholesterol,
        healthScore: breakdown.healthScore,
        fullBreakdown: breakdown,
        createdAt: new Date(rows[0].createdAt),
    };

    log.info({ scanId: scan.id, userId, food: breakdown.foodName, calories: breakdown.calories }, 'Food scan complete');
    logAudit('nutrition_scan', { userId, resource: scan.id, result: 'success', calories: breakdown.calories });

    // Cache for quick retrieval
    await redisClient.setEx(
        `nutrition:latest:${userId}`,
        300,
        JSON.stringify({ id: scan.id, foodName: scan.foodName, calories: scan.calories })
    );

    return scan;
}

/**
 * Get a single scan by ID.
 */
export async function getScanById(scanId: string): Promise<NutritionScan> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", image_url as "imageUrl",
               food_name as "foodName", confidence,
               portion_size as "portionSize",
               portion_weight_grams as "portionWeightGrams",
               calories, protein, carbohydrates, fat,
               fiber, sugar, sodium, cholesterol,
               health_score as "healthScore",
               full_breakdown as "fullBreakdown",
               created_at as "createdAt"
        FROM nutrition_scans
        WHERE id = $1
        `,
        [scanId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Scan not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    return mapScanRow(rows[0]);
}

/**
 * List scans for a user.
 */
export async function listScans(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    mealType?: string
): Promise<{ scans: NutritionScan[]; total: number }> {
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (mealType) {
        whereClause += ` AND meal_type = $${paramIndex++}`;
        params.push(mealType);
    }

    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM nutrition_scans ${whereClause}`,
        params
    );

    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", image_url as "imageUrl",
               food_name as "foodName", confidence,
               portion_size as "portionSize",
               portion_weight_grams as "portionWeightGrams",
               calories, protein, carbohydrates, fat,
               fiber, sugar, sodium, cholesterol,
               health_score as "healthScore",
               full_breakdown as "fullBreakdown",
               created_at as "createdAt"
        FROM nutrition_scans
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        [...params, limit, offset]
    );

    return {
        scans: rows.map(mapScanRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * Get daily nutrition summary for a user.
 */
export async function getDailyNutrition(
    userId: string,
    date?: string
): Promise<DailyNutrition> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { rows } = await db.query(
        `
        SELECT
            COALESCE(SUM(calories), 0)::int as total_calories,
            COALESCE(SUM(protein), 0)::numeric(10,1) as total_protein,
            COALESCE(SUM(carbohydrates), 0)::numeric(10,1) as total_carbs,
            COALESCE(SUM(fat), 0)::numeric(10,1) as total_fat,
            COALESCE(SUM(fiber), 0)::numeric(10,1) as total_fiber,
            COUNT(*) as scan_count,
            COALESCE(JSON_AGG(
                JSON_BUILD_OBJECT(
                    'mealType', COALESCE(meal_type, 'snack'),
                    'calories', calories,
                    'foodName', food_name
                ) ORDER BY created_at
            ) FILTER (WHERE id IS NOT NULL), '[]') as meals
        FROM nutrition_scans
        WHERE user_id = $1 AND DATE(created_at) = $2
        `,
        [userId, targetDate]
    );

    const row = rows[0];
    return {
        date: targetDate,
        totalCalories: parseInt(row.total_calories),
        totalProtein: parseFloat(row.total_protein),
        totalCarbs: parseFloat(row.total_carbs),
        totalFat: parseFloat(row.total_fat),
        totalFiber: parseFloat(row.total_fiber),
        scanCount: parseInt(row.scan_count),
        meals: row.meals || [],
    };
}

/**
 * Get nutrition trends for a user.
 */
export async function getNutritionTrends(
    userId: string,
    days: number = 7
): Promise<Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    healthScore: number;
    scanCount: number;
}>> {
    const { rows } = await db.query(
        `
        SELECT
            DATE(created_at) as date,
            COALESCE(AVG(calories), 0)::int as calories,
            COALESCE(AVG(protein), 0)::numeric(10,1) as protein,
            COALESCE(AVG(carbohydrates), 0)::numeric(10,1) as carbs,
            COALESCE(AVG(fat), 0)::numeric(10,1) as fat,
            COALESCE(AVG(health_score), 0)::int as "healthScore",
            COUNT(*) as "scanCount"
        FROM nutrition_scans
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT $2
        `,
        [userId, days]
    );

    return rows.map((r) => ({
        date: r.date,
        calories: parseInt(r.calories),
        protein: parseFloat(r.protein),
        carbs: parseFloat(r.carbs),
        fat: parseFloat(r.fat),
        healthScore: parseInt(r.healthScore),
        scanCount: parseInt(r.scanCount),
    }));
}

// ─── Helpers ────────────────────────────────────────────────────

function mapScanRow(row: any): NutritionScan {
    let fullBreakdown: NutritionBreakdown;
    try {
        fullBreakdown = typeof row.fullBreakdown === 'string'
            ? JSON.parse(row.fullBreakdown)
            : row.fullBreakdown;
    } catch {
        fullBreakdown = {
            foodName: row.foodName,
            confidence: row.confidence,
            portionSize: row.portionSize,
            portionWeightGrams: row.portionWeightGrams,
            calories: row.calories,
            protein: row.protein,
            carbohydrates: row.carbohydrates,
            fat: row.fat,
            fiber: row.fiber,
            sugar: row.sugar,
            sodium: row.sodium,
            cholesterol: row.cholesterol,
            vitamins: [],
            minerals: [],
            healthScore: row.healthScore,
            tags: [],
            alternatives: [],
        };
    }

    return {
        id: String(row.id),
        userId: String(row.userId),
        imageUrl: row.imageUrl,
        foodName: row.foodName,
        confidence: row.confidence,
        portionSize: row.portionSize,
        portionWeightGrams: row.portionWeightGrams,
        calories: row.calories,
        protein: row.protein,
        carbohydrates: row.carbohydrates,
        fat: row.fat,
        fiber: row.fiber,
        sugar: row.sugar,
        sodium: row.sodium,
        cholesterol: row.cholesterol,
        healthScore: row.healthScore,
        fullBreakdown,
        createdAt: new Date(row.createdAt),
    };
}
