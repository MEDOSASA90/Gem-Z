/**
 * GEM Z — Gym Service Layer
 *
 * Business logic for gym operations:
 *   - Gym stats aggregation
 *   - Daily pass management (buy, scan, validate)
 *   - Smart locker control
 *   - Live crowd tracking
 *   - Equipment tutorials
 *   - Branch CRUD
 *   - Subscription plan CRUD
 *   - Off-peak pricing
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';

const log = createLogger('gym');

// ─── Types ──────────────────────────────────────────────────────

export interface GymStats {
    gymId: string;
    availableBal: number;
    pendingBal: number;
    totalMembers: number;
    activeSubscribers: GymSubscriber[];
    recentVisits: GymVisit[];
    totalBranches: number;
    todayCheckIns: number;
}

export interface GymSubscriber {
    id: string;
    startDate: Date;
    endDate: Date;
    traineeName: string;
    planName: string;
    status: string;
}

export interface GymVisit {
    id: string;
    checkInTime: Date;
    checkOutTime: Date | null;
    traineeName: string;
    method: string;
}

export interface DailyPass {
    id: string;
    gymId: string;
    traineeId: string;
    pricePaid: number;
    qrCode: string;
    isUsed: boolean;
    scannedAt: Date | null;
    createdAt: Date;
    expiresAt: Date;
}

export interface Branch {
    id: string;
    gymId: string;
    name: string;
    address: string;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    capacity: number | null;
    opensAt: string | null;
    closesAt: string | null;
    amenities: string[] | null;
    isActive: boolean;
    createdAt: Date;
}

export interface SubscriptionPlan {
    id: string;
    gymId: string;
    branchId: string | null;
    name: string;
    durationDays: number;
    basePriceEgp: number;
    features: string[] | null;
    maxFreezes: number;
    isActive: boolean;
    createdAt: Date;
}

export interface OffPeakPricing {
    branchId: string;
    name: string;
    discountPct: number;
    validDays: number[];
    startTime: string;
    endTime: string;
    isActive: boolean;
}

export interface EquipmentTutorial {
    id: string;
    name: string;
    qrCode: string;
    videoUrl: string;
    instructions: string[];
    targetedMuscles: string[];
    difficulty: string;
    safetyTips: string[];
}

export interface CrowdData {
    branchId: string;
    currentOccupancy: number;
    capacity: number;
    percentage: number;
    status: 'Quiet' | 'Moderate' | 'Busy' | 'Very Busy';
    estimatedWaitMinutes: number;
    peakHours: string[];
}

// ─── Constants ──────────────────────────────────────────────────

const PASS_EXPIRY_HOURS = 24;
const CROWD_CACHE_TTL = 300; // 5 minutes
const LOCKER_UNLOCK_TTL = 600; // 10 minutes

// ─── Gym Stats ──────────────────────────────────────────────────

/**
 * Get comprehensive gym statistics for a gym owner.
 */
export async function getGymStatsByOwner(ownerUserId: string): Promise<GymStats> {
    // Resolve gym ID
    const gymRes = await db.query('SELECT id FROM gyms WHERE owner_user_id = $1', [ownerUserId]);
    if (gymRes.rowCount === 0 || !gymRes.rowCount) {
        throw new NotFoundError('Gym profile not found', ErrorCode.NOT_FOUND_GYM);
    }
    const gymId = gymRes.rows[0].id;

    // Wallet balances
    const walletRes = await db.query(
        `SELECT balance_egp FROM wallets WHERE user_id = $1`,
        [ownerUserId]
    );
    const availableBal = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].balance_egp) || 0 : 0;
    const pendingBal = 0; // Legacy field — not in current schema

    // Active subscribers with plan info
    const subsRes = await db.query(
        `
        SELECT gs.id, gs.starts_at as "startDate", gs.expires_at as "endDate",
               u.full_name as "traineeName", p.name as "planName", gs.status
        FROM gym_subscriptions gs
        JOIN users u ON gs.trainee_id = u.id
        JOIN gym_subscription_plans p ON gs.plan_id = p.id
        WHERE gs.branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1)
          AND gs.status = 'active'
        ORDER BY gs.created_at DESC
        `,
        [gymId]
    );
    const activeSubscribers: GymSubscriber[] = subsRes.rows.map((row) => ({
        id: String(row.id),
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        traineeName: row.traineeName || 'Unknown',
        planName: row.planName || 'Unknown Plan',
        status: row.status,
    }));

    // Today's visits
    const visitsRes = await db.query(
        `
        SELECT al.id, al.checked_in_at as "checkInTime", al.checked_out_at as "checkOutTime",
               u.full_name as "traineeName", al.method
        FROM attendance_logs al
        JOIN users u ON al.trainee_id = u.id
        WHERE al.branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1)
          AND al.checked_in_at >= CURRENT_DATE
        ORDER BY al.checked_in_at DESC
        LIMIT 50
        `,
        [gymId]
    );
    const recentVisits: GymVisit[] = visitsRes.rows.map((row) => ({
        id: String(row.id),
        checkInTime: new Date(row.checkInTime),
        checkOutTime: row.checkOutTime ? new Date(row.checkOutTime) : null,
        traineeName: row.traineeName || 'Unknown',
        method: row.method || 'qr',
    }));

    // Branch count
    const branchRes = await db.query(
        'SELECT COUNT(*) as count FROM gym_branches WHERE gym_id = $1',
        [gymId]
    );
    const totalBranches = parseInt(branchRes.rows[0].count) || 0;

    // Today's check-ins count
    const checkInRes = await db.query(
        `
        SELECT COUNT(*) as count FROM attendance_logs
        WHERE branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $1)
          AND checked_in_at >= CURRENT_DATE
        `,
        [gymId]
    );
    const todayCheckIns = parseInt(checkInRes.rows[0].count) || 0;

    return {
        gymId: String(gymId),
        availableBal,
        pendingBal,
        totalMembers: activeSubscribers.length,
        activeSubscribers,
        recentVisits,
        totalBranches,
        todayCheckIns,
    };
}

// ─── Daily Passes ───────────────────────────────────────────────

/**
 * Purchase a daily gym pass.
 */
export async function buyDailyPass(
    traineeId: string,
    gymId: string,
    price: number
): Promise<DailyPass> {
    if (!gymId || !price || price <= 0) {
        throw new ValidationError('Valid gym ID and price are required', ErrorCode.INVALID_INPUT);
    }

    // Verify gym exists
    const gymRes = await db.query('SELECT id FROM gyms WHERE id = $1', [gymId]);
    if (gymRes.rowCount === 0 || !gymRes.rowCount) {
        throw new NotFoundError('Gym not found', ErrorCode.NOT_FOUND_GYM);
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const qrCode = `PASS_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + PASS_EXPIRY_HOURS);

        const { rows } = await client.query(
            `
            INSERT INTO gym_daily_passes (gym_id, trainee_id, price_paid, qr_code, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, gym_id as "gymId", trainee_id as "traineeId",
                      price_paid as "pricePaid", qr_code as "qrCode",
                      is_used as "isUsed", scanned_at as "scannedAt",
                      created_at as "createdAt", expires_at as "expiresAt"
            `,
            [gymId, traineeId, price, qrCode, expiresAt]
        );

        // Create financial transaction (20% platform fee)
        const platformFee = Number(price) * 0.20;
        const netAmount = Number(price) - platformFee;

        await client.query(
            `
            INSERT INTO financial_transactions (user_id, amount, platform_fee, net_amount, type, description, status)
            VALUES ($1, $2, $3, $4, 'GYM_PASS', $5, 'completed')
            `,
            [traineeId, price, platformFee, netAmount, `Daily pass purchase - ${qrCode}`]
        );

        await client.query('COMMIT');

        log.info({ traineeId, gymId, passId: rows[0].id }, 'Daily pass purchased');
        logAudit('daily_pass_purchased', {
            userId: traineeId,
            gymId,
            amount: price,
            result: 'success',
        });

        return {
            id: String(rows[0].id),
            gymId: String(rows[0].gymId),
            traineeId: String(rows[0].traineeId),
            pricePaid: parseFloat(rows[0].pricePaid),
            qrCode: rows[0].qrCode,
            isUsed: rows[0].isUsed,
            scannedAt: rows[0].scannedAt ? new Date(rows[0].scannedAt) : null,
            createdAt: new Date(rows[0].createdAt),
            expiresAt: new Date(rows[0].expiresAt),
        };
    } catch (error) {
        await client.query('ROLLBACK');
        log.error({ error: (error as Error).message, traineeId, gymId }, 'Daily pass purchase failed');
        throw new AppError('Failed to purchase daily pass', 500, ErrorCode.DATABASE_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Scan and validate a daily pass QR code.
 */
export async function scanDailyPass(
    scannerUserId: string,
    qrCode: string
): Promise<{ success: boolean; message: string; pass?: DailyPass }> {
    if (!qrCode) {
        throw new ValidationError('QR code is required', ErrorCode.MISSING_FIELD);
    }

    // Resolve gym from scanner
    const gymRes = await db.query('SELECT id FROM gyms WHERE owner_user_id = $1', [scannerUserId]);
    if (gymRes.rowCount === 0 || !gymRes.rowCount) {
        throw new NotFoundError('Gym profile not found for scanner', ErrorCode.NOT_FOUND_GYM);
    }
    const gymId = gymRes.rows[0].id;

    // Find pass
    const passRes = await db.query(
        `
        SELECT id, gym_id as "gymId", trainee_id as "traineeId",
               price_paid as "pricePaid", qr_code as "qrCode",
               is_used as "isUsed", scanned_at as "scannedAt",
               created_at as "createdAt", expires_at as "expiresAt"
        FROM gym_daily_passes
        WHERE qr_code = $1 AND gym_id = $2
        `,
        [qrCode, gymId]
    );

    if (passRes.rowCount === 0 || !passRes.rowCount) {
        throw new NotFoundError('Invalid pass for this gym', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const pass = passRes.rows[0];

    if (pass.isUsed) {
        throw new ValidationError('Pass has already been used', ErrorCode.INVALID_INPUT);
    }

    if (new Date() > new Date(pass.expiresAt)) {
        throw new ValidationError('Pass has expired', ErrorCode.INVALID_INPUT);
    }

    // Mark as used
    await db.query(
        `UPDATE gym_daily_passes SET is_used = TRUE, scanned_at = NOW() WHERE id = $1`,
        [pass.id]
    );

    logAudit('daily_pass_scanned', {
        userId: scannerUserId,
        gymId,
        passId: pass.id,
        result: 'success',
    });

    return {
        success: true,
        message: 'Access granted! Pass consumed.',
    };
}

/**
 * Get trainee's purchased passes.
 */
export async function getTraineePasses(traineeId: string): Promise<DailyPass[]> {
    const { rows } = await db.query(
        `
        SELECT p.id, p.gym_id as "gymId", p.trainee_id as "traineeId",
               p.price_paid as "pricePaid", p.qr_code as "qrCode",
               p.is_used as "isUsed", p.scanned_at as "scannedAt",
               p.created_at as "createdAt", p.expires_at as "expiresAt"
        FROM gym_daily_passes p
        WHERE p.trainee_id = $1
        ORDER BY p.created_at DESC
        `,
        [traineeId]
    );

    return rows.map((row) => ({
        id: String(row.id),
        gymId: String(row.gymId),
        traineeId: String(row.traineeId),
        pricePaid: parseFloat(row.pricePaid),
        qrCode: row.qrCode,
        isUsed: row.isUsed,
        scannedAt: row.scannedAt ? new Date(row.scannedAt) : null,
        createdAt: new Date(row.createdAt),
        expiresAt: new Date(row.expiresAt),
    }));
}

// ─── Smart Lockers ──────────────────────────────────────────────

/**
 * Unlock a smart locker for a user.
 * Uses Redis for temporary unlock token storage.
 */
export async function unlockSmartLocker(
    userId: string,
    lockerId: string,
    gymId: string
): Promise<{ unlockToken: string; expiresAt: Date }> {
    if (!lockerId || !gymId) {
        throw new ValidationError('Locker ID and gym ID are required', ErrorCode.MISSING_FIELD);
    }

    // Verify gym/branch exists
    const branchRes = await db.query(
        'SELECT id FROM gym_branches WHERE gym_id = $1 AND is_active = TRUE LIMIT 1',
        [gymId]
    );
    if (branchRes.rowCount === 0 || !branchRes.rowCount) {
        throw new NotFoundError('Gym branch not found', ErrorCode.NOT_FOUND_BRANCH);
    }

    const unlockToken = `LOCK_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + LOCKER_UNLOCK_TTL);

    // Store unlock session in Redis
    await redisClient.setex(
        `gemz:locker:${lockerId}`,
        LOCKER_UNLOCK_TTL,
        JSON.stringify({ userId, unlockToken, gymId, expiresAt: expiresAt.toISOString() })
    );

    log.info({ userId, lockerId, gymId }, 'Smart locker unlocked');
    logAudit('locker_unlocked', { userId, resource: lockerId, result: 'success' });

    return { unlockToken, expiresAt };
}

// ─── Crowd Tracking ─────────────────────────────────────────────

/**
 * Get live crowd data for a gym branch.
 * Uses Redis cache with database fallback.
 */
export async function getLiveCrowd(branchId: string): Promise<CrowdData> {
    // Try cache first
    const cached = await redisClient.get(`gemz:crowd:${branchId}`);
    if (cached) {
        return JSON.parse(cached) as CrowdData;
    }

    // Get branch capacity
    const branchRes = await db.query(
        'SELECT capacity FROM gym_branches WHERE id = $1',
        [branchId]
    );
    if (branchRes.rowCount === 0 || !branchRes.rowCount) {
        throw new NotFoundError('Branch not found', ErrorCode.NOT_FOUND_BRANCH);
    }

    const capacity = branchRes.rows[0].capacity || 100;

    // Count today's check-ins that haven't checked out
    const crowdRes = await db.query(
        `
        SELECT COUNT(*) as count
        FROM attendance_logs
        WHERE branch_id = $1
          AND checked_in_at >= CURRENT_DATE
          AND checked_out_at IS NULL
        `,
        [branchId]
    );
    const currentOccupancy = parseInt(crowdRes.rows[0].count) || 0;
    const percentage = Math.min(Math.round((currentOccupancy / capacity) * 100), 100);

    let status: CrowdData['status'];
    if (percentage < 30) status = 'Quiet';
    else if (percentage < 60) status = 'Moderate';
    else if (percentage < 85) status = 'Busy';
    else status = 'Very Busy';

    const estimatedWaitMinutes = percentage > 80 ? Math.round((percentage - 80) / 5) * 5 : 0;

    const data: CrowdData = {
        branchId,
        currentOccupancy,
        capacity,
        percentage,
        status,
        estimatedWaitMinutes,
        peakHours: ['17:00', '18:00', '19:00', '20:00'],
    };

    // Cache for 2 minutes
    await redisClient.setex(`gemz:crowd:${branchId}`, 120, JSON.stringify(data));

    return data;
}

// ─── Equipment Tutorials ────────────────────────────────────────

/**
 * Get equipment tutorial by QR code.
 */
export async function getEquipmentTutorial(qrCode: string): Promise<EquipmentTutorial> {
    if (!qrCode) {
        throw new ValidationError('QR code is required', ErrorCode.MISSING_FIELD);
    }

    // Mock tutorials database — in production this would query an equipment table
    const tutorials: Record<string, EquipmentTutorial> = {
        default: {
            id: 'eq_001',
            name: 'Pec Deck Machine',
            qrCode,
            videoUrl: 'https://gemz.app/tutorials/pec-deck.mp4',
            instructions: [
                'Adjust seat height so handles align with mid-chest',
                'Keep back straight against the pad',
                'Squeeze chest at the center hold for 1 second',
                'Return slowly to starting position',
            ],
            targetedMuscles: ['Chest', 'Front Delts'],
            difficulty: 'Beginner',
            safetyTips: [
                'Do not lock elbows at full extension',
                'Keep shoulders down and back',
                'Use controlled tempo — avoid swinging',
            ],
        },
    };

    const tutorial = tutorials[qrCode] || tutorials.default;
    tutorial.qrCode = qrCode;

    return tutorial;
}

// ─── Branch CRUD ────────────────────────────────────────────────

/**
 * List all branches for a gym.
 */
export async function listBranches(gymId?: string): Promise<Branch[]> {
    let query = `
        SELECT id, gym_id as "gymId", name, address, city,
               latitude, longitude, phone, capacity,
               opens_at as "opensAt", closes_at as "closesAt",
               amenities, is_active as "isActive", created_at as "createdAt"
        FROM gym_branches
    `;
    const params: string[] = [];

    if (gymId) {
        query += ' WHERE gym_id = $1';
        params.push(gymId);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);

    return rows.map((row) => ({
        id: String(row.id),
        gymId: String(row.gymId),
        name: row.name,
        address: row.address,
        city: row.city || null,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        phone: row.phone || null,
        capacity: row.capacity ? parseInt(row.capacity) : null,
        opensAt: row.opensAt || null,
        closesAt: row.closesAt || null,
        amenities: row.amenities || null,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
    }));
}

/**
 * Add a new branch.
 */
export async function addBranch(data: {
    gymId: string;
    name: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    capacity?: number;
    opensAt?: string;
    closesAt?: string;
    amenities?: string[];
}): Promise<Branch> {
    const { rows } = await db.query(
        `
        INSERT INTO gym_branches (gym_id, name, address, city, latitude, longitude, phone, capacity, opens_at, closes_at, amenities)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, gym_id as "gymId", name, address, city,
                  latitude, longitude, phone, capacity,
                  opens_at as "opensAt", closes_at as "closesAt",
                  amenities, is_active as "isActive", created_at as "createdAt"
        `,
        [
            data.gymId, data.name, data.address, data.city || null,
            data.latitude || null, data.longitude || null,
            data.phone || null, data.capacity || null,
            data.opensAt || null, data.closesAt || null,
            data.amenities || null,
        ]
    );

    const row = rows[0];
    log.info({ branchId: row.id, gymId: data.gymId }, 'Branch created');
    logAudit('branch_created', { actorId: data.gymId, resource: row.id, result: 'success' });

    return {
        id: String(row.id),
        gymId: String(row.gymId),
        name: row.name,
        address: row.address,
        city: row.city || null,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        phone: row.phone || null,
        capacity: row.capacity ? parseInt(row.capacity) : null,
        opensAt: row.opensAt || null,
        closesAt: row.closesAt || null,
        amenities: row.amenities || null,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Update a branch.
 */
export async function updateBranch(
    branchId: string,
    data: Partial<{
        name: string;
        address: string;
        city: string;
        latitude: number;
        longitude: number;
        phone: string;
        capacity: number;
        opensAt: string;
        closesAt: string;
        amenities: string[];
        isActive: boolean;
    }>
): Promise<Branch> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
    if (data.address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(data.address); }
    if (data.city !== undefined) { fields.push(`city = $${paramIndex++}`); values.push(data.city); }
    if (data.latitude !== undefined) { fields.push(`latitude = $${paramIndex++}`); values.push(data.latitude); }
    if (data.longitude !== undefined) { fields.push(`longitude = $${paramIndex++}`); values.push(data.longitude); }
    if (data.phone !== undefined) { fields.push(`phone = $${paramIndex++}`); values.push(data.phone); }
    if (data.capacity !== undefined) { fields.push(`capacity = $${paramIndex++}`); values.push(data.capacity); }
    if (data.opensAt !== undefined) { fields.push(`opens_at = $${paramIndex++}`); values.push(data.opensAt); }
    if (data.closesAt !== undefined) { fields.push(`closes_at = $${paramIndex++}`); values.push(data.closesAt); }
    if (data.amenities !== undefined) { fields.push(`amenities = $${paramIndex++}`); values.push(data.amenities); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.isActive); }

    if (fields.length === 0) {
        throw new ValidationError('No fields to update', ErrorCode.INVALID_INPUT);
    }

    values.push(branchId);

    const { rows } = await db.query(
        `
        UPDATE gym_branches
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, gym_id as "gymId", name, address, city,
                  latitude, longitude, phone, capacity,
                  opens_at as "opensAt", closes_at as "closesAt",
                  amenities, is_active as "isActive", created_at as "createdAt"
        `,
        values
    );

    if (rows.length === 0) {
        throw new NotFoundError('Branch not found', ErrorCode.NOT_FOUND_BRANCH);
    }

    const row = rows[0];
    log.info({ branchId }, 'Branch updated');

    return {
        id: String(row.id),
        gymId: String(row.gymId),
        name: row.name,
        address: row.address,
        city: row.city || null,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        phone: row.phone || null,
        capacity: row.capacity ? parseInt(row.capacity) : null,
        opensAt: row.opensAt || null,
        closesAt: row.closesAt || null,
        amenities: row.amenities || null,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Delete a branch.
 */
export async function deleteBranch(branchId: string): Promise<void> {
    const result = await db.query('DELETE FROM gym_branches WHERE id = $1 RETURNING id', [branchId]);
    if (result.rowCount === 0 || !result.rowCount) {
        throw new NotFoundError('Branch not found', ErrorCode.NOT_FOUND_BRANCH);
    }
    log.info({ branchId }, 'Branch deleted');
    logAudit('branch_deleted', { resource: branchId, result: 'success' });
}

// ─── Subscription Plans ─────────────────────────────────────────

/**
 * List subscription plans for a gym.
 */
export async function listPlans(gymId?: string): Promise<SubscriptionPlan[]> {
    let query = `
        SELECT id, gym_id as "gymId", branch_id as "branchId", name,
               duration_days as "durationDays", base_price_egp as "basePriceEgp",
               features, max_freezes as "maxFreezes", is_active as "isActive",
               created_at as "createdAt"
        FROM gym_subscription_plans
    `;
    const params: string[] = [];

    if (gymId) {
        query += ' WHERE gym_id = $1 AND is_active = TRUE';
        params.push(gymId);
    }

    query += ' ORDER BY base_price_egp ASC';

    const { rows } = await db.query(query, params);

    return rows.map((row) => ({
        id: String(row.id),
        gymId: String(row.gymId),
        branchId: row.branchId ? String(row.branchId) : null,
        name: row.name,
        durationDays: parseInt(row.durationDays),
        basePriceEgp: parseFloat(row.basePriceEgp),
        features: row.features || null,
        maxFreezes: parseInt(row.maxFreezes) || 0,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
    }));
}

/**
 * Create a subscription plan.
 */
export async function createPlan(data: {
    gymId: string;
    branchId?: string;
    name: string;
    durationDays: number;
    basePriceEgp: number;
    features?: string[];
    maxFreezes?: number;
}): Promise<SubscriptionPlan> {
    const { rows } = await db.query(
        `
        INSERT INTO gym_subscription_plans (gym_id, branch_id, name, duration_days, base_price_egp, features, max_freezes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, gym_id as "gymId", branch_id as "branchId", name,
                  duration_days as "durationDays", base_price_egp as "basePriceEgp",
                  features, max_freezes as "maxFreezes", is_active as "isActive",
                  created_at as "createdAt"
        `,
        [
            data.gymId, data.branchId || null, data.name,
            data.durationDays, data.basePriceEgp,
            data.features || null, data.maxFreezes || 0,
        ]
    );

    const row = rows[0];
    log.info({ planId: row.id, gymId: data.gymId }, 'Subscription plan created');

    return {
        id: String(row.id),
        gymId: String(row.gymId),
        branchId: row.branchId ? String(row.branchId) : null,
        name: row.name,
        durationDays: parseInt(row.durationDays),
        basePriceEgp: parseFloat(row.basePriceEgp),
        features: row.features || null,
        maxFreezes: parseInt(row.maxFreezes) || 0,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Update a subscription plan.
 */
export async function updatePlan(
    planId: string,
    data: Partial<{
        name: string;
        durationDays: number;
        basePriceEgp: number;
        features: string[];
        maxFreezes: number;
        isActive: boolean;
    }>
): Promise<SubscriptionPlan> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
    if (data.durationDays !== undefined) { fields.push(`duration_days = $${paramIndex++}`); values.push(data.durationDays); }
    if (data.basePriceEgp !== undefined) { fields.push(`base_price_egp = $${paramIndex++}`); values.push(data.basePriceEgp); }
    if (data.features !== undefined) { fields.push(`features = $${paramIndex++}`); values.push(data.features); }
    if (data.maxFreezes !== undefined) { fields.push(`max_freezes = $${paramIndex++}`); values.push(data.maxFreezes); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.isActive); }

    if (fields.length === 0) {
        throw new ValidationError('No fields to update', ErrorCode.INVALID_INPUT);
    }

    values.push(planId);

    const { rows } = await db.query(
        `
        UPDATE gym_subscription_plans
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, gym_id as "gymId", branch_id as "branchId", name,
                  duration_days as "durationDays", base_price_egp as "basePriceEgp",
                  features, max_freezes as "maxFreezes", is_active as "isActive",
                  created_at as "createdAt"
        `,
        values
    );

    if (rows.length === 0) {
        throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND_PLAN);
    }

    const row = rows[0];
    log.info({ planId }, 'Subscription plan updated');

    return {
        id: String(row.id),
        gymId: String(row.gymId),
        branchId: row.branchId ? String(row.branchId) : null,
        name: row.name,
        durationDays: parseInt(row.durationDays),
        basePriceEgp: parseFloat(row.basePriceEgp),
        features: row.features || null,
        maxFreezes: parseInt(row.maxFreezes) || 0,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
    };
}

// ─── Off-Peak Pricing ───────────────────────────────────────────

/**
 * Set off-peak pricing for a gym's branches.
 */
export async function setOffPeakPricing(
    ownerUserId: string,
    isActive: boolean,
    discountPercentage?: number
): Promise<OffPeakPricing> {
    const gymRes = await db.query('SELECT id FROM gyms WHERE owner_user_id = $1', [ownerUserId]);
    if (gymRes.rowCount === 0 || !gymRes.rowCount) {
        throw new NotFoundError('Gym profile not found', ErrorCode.NOT_FOUND_GYM);
    }
    const gymId = gymRes.rows[0].id;

    const discount = discountPercentage ?? 15;

    const updateResult = await db.query(
        `
        UPDATE gym_pricing_rules
        SET is_active = $1,
            discount_pct = $2
        WHERE branch_id IN (SELECT id FROM gym_branches WHERE gym_id = $3)
        RETURNING branch_id as "branchId", name, discount_pct as "discountPct",
                  valid_days as "validDays", start_time as "startTime",
                  end_time as "endTime", is_active as "isActive"
        `,
        [isActive, discount, gymId]
    );

    if (updateResult.rowCount && updateResult.rowCount > 0) {
        const row = updateResult.rows[0];
        log.info({ gymId }, 'Off-peak pricing updated');
        return {
            branchId: String(row.branchId),
            name: row.name,
            discountPct: parseFloat(row.discountPct),
            validDays: row.validDays || [0, 1, 2, 3, 4, 5, 6],
            startTime: row.startTime || '12:00',
            endTime: row.endTime || '16:00',
            isActive: row.isActive,
        };
    }

    // No existing rules — create one for the first branch
    const branchRes = await db.query(
        'SELECT id FROM gym_branches WHERE gym_id = $1 ORDER BY created_at ASC LIMIT 1',
        [gymId]
    );

    if (branchRes.rowCount === 0 || !branchRes.rowCount) {
        throw new NotFoundError('No gym branches found', ErrorCode.NOT_FOUND_BRANCH);
    }

    const branchId = branchRes.rows[0].id;

    const { rows } = await db.query(
        `
        INSERT INTO gym_pricing_rules (branch_id, name, discount_pct, valid_days, start_time, end_time, is_active)
        VALUES ($1, 'Off-Peak', $2, ARRAY[0,1,2,3,4,5,6]::smallint[], '12:00', '16:00', $3)
        RETURNING branch_id as "branchId", name, discount_pct as "discountPct",
                  valid_days as "validDays", start_time as "startTime",
                  end_time as "endTime", is_active as "isActive"
        `,
        [branchId, discount, isActive]
    );

    const row = rows[0];
    log.info({ gymId, branchId }, 'Off-peak pricing created');

    return {
        branchId: String(row.branchId),
        name: row.name,
        discountPct: parseFloat(row.discountPct),
        validDays: row.validDays || [0, 1, 2, 3, 4, 5, 6],
        startTime: row.startTime || '12:00',
        endTime: row.endTime || '16:00',
        isActive: row.isActive,
    };
}
