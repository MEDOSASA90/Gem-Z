/**
 * GEM Z — Gift Cards + Subscription Gifting Service
 *
 * Manages digital gift card creation, validation, and redemption.
 * Supports both balance gifts and subscription gifting.
 *
 * Features:
 *   - Create digital gift cards with QR codes
 *   - Balance-based and subscription-based gifts
 *   - Gift card validation by code
 *   - Secure redemption with wallet credit
 *   - Beautiful themed digital gift cards
 *   - Email delivery integration
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
} from '../../core/i18n/errors';

const log = createLogger('gift');

// ─── Types ──────────────────────────────────────────────────────

export interface GiftCardInput {
    recipientEmail: string;
    recipientName?: string;
    recipientPhone?: string;
    message?: string;
    giftType: 'balance' | 'subscription';
    amount?: number;
    currency?: string;
    subscriptionPlanId?: string;
    subscriptionMonths?: number;
    designTheme?: string;
    expiryDays?: number;
}

export interface GiftCard {
    id: string;
    code: string;
    senderId: string;
    recipientEmail: string;
    recipientName?: string;
    recipientPhone?: string;
    message?: string;
    giftType: 'balance' | 'subscription';
    amount?: number;
    currency: string;
    subscriptionPlanId?: string;
    subscriptionMonths: number;
    status: 'active' | 'redeemed' | 'expired' | 'cancelled';
    expiryDate: Date;
    redeemedBy?: string;
    redeemedAt?: Date;
    qrCodeUrl?: string;
    designTheme: string;
    createdAt: Date;
}

export interface GiftValidationResult {
    valid: boolean;
    giftCardId?: string;
    giftType?: string;
    amount?: number;
    currency?: string;
    message?: string;
    senderName?: string;
    expiryDate?: Date;
    error?: string;
}

export interface GiftRedemptionResult {
    success: boolean;
    giftCardId: string;
    redeemedAmount?: number;
    currency?: string;
    walletTransactionId?: string;
    message: string;
}

// ─── Gift Code Generation ───────────────────────────────────────

function generateGiftCode(): string {
    // Format: XXXX-XXXX-XXXX-XXXX, uppercase alphanumeric
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function generateUniqueGiftCode(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
        const code = generateGiftCode();
        const { rows } = await db.query(
            `SELECT 1 FROM gift_cards WHERE code = $1`,
            [code]
        );
        if (rows.length === 0) return code;
        attempts++;
    }
    throw new AppError('Failed to generate unique gift code', 500, ErrorCode.SERVER_ERROR);
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Create a new gift card.
 */
export async function createGiftCard(
    senderId: string,
    input: GiftCardInput
): Promise<GiftCard> {
    // Validate
    if (!input.recipientEmail || !input.recipientEmail.includes('@')) {
        throw new ValidationError('recipientEmail must be a valid email address', ErrorCode.INVALID_INPUT);
    }

    if (input.giftType === 'balance' && (!input.amount || input.amount <= 0)) {
        throw new ValidationError('amount must be positive for balance gift', ErrorCode.INVALID_INPUT);
    }

    if (input.giftType === 'subscription' && !input.subscriptionPlanId) {
        throw new ValidationError('subscriptionPlanId is required for subscription gift', ErrorCode.MISSING_FIELD);
    }

    const code = await generateUniqueGiftCode();
    const expiryDays = input.expiryDays || 365;
    const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const currency = input.currency || 'USD';
    const designTheme = input.designTheme || 'gold';

    const { rows } = await db.query(
        `
        INSERT INTO gift_cards (
            code, sender_id, recipient_email, recipient_name, recipient_phone,
            message, gift_type, amount, currency, subscription_plan_id,
            subscription_months, expiry_date, design_theme, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
        RETURNING *
        `,
        [
            code,
            senderId,
            input.recipientEmail,
            input.recipientName || null,
            input.recipientPhone || null,
            input.message || null,
            input.giftType,
            input.amount || null,
            currency,
            input.subscriptionPlanId || null,
            input.subscriptionMonths || 1,
            expiryDate,
            designTheme,
        ]
    );

    const giftCard = mapGiftCardRow(rows[0]);

    // Generate QR code data URL (simple format, can be enhanced with a QR library)
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=GEMZ-GIFT:${giftCard.code}`;
    await db.query(
        `UPDATE gift_cards SET qr_code_url = $1 WHERE id = $2`,
        [qrDataUrl, giftCard.id]
    );
    giftCard.qrCodeUrl = qrDataUrl;

    log.info({ giftCardId: giftCard.id, senderId, recipient: input.recipientEmail }, 'Gift card created');
    logAudit('gift_card_created', {
        userId: senderId,
        resource: giftCard.id,
        result: 'success',
        amount: input.amount,
        giftType: input.giftType,
    });

    return giftCard;
}

/**
 * Validate a gift card by code.
 */
export async function validateGiftCard(
    code: string,
    recipientEmail?: string
): Promise<GiftValidationResult> {
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    const { rows } = await db.query(
        `
        SELECT gc.*, u.full_name as sender_name
        FROM gift_cards gc
        JOIN users u ON gc.sender_id = u.id
        WHERE gc.code = $1
        `,
        [normalizedCode]
    );

    if (rows.length === 0) {
        return { valid: false, error: 'Invalid gift card code' };
    }

    const gift = mapGiftCardRow(rows[0]);

    // Check expiry
    if (new Date() > gift.expiryDate) {
        await db.query(`UPDATE gift_cards SET status = 'expired' WHERE id = $1`, [gift.id]);
        return { valid: false, giftCardId: gift.id, error: 'Gift card has expired' };
    }

    // Check status
    if (gift.status === 'redeemed') {
        return { valid: false, giftCardId: gift.id, error: 'Gift card has already been redeemed' };
    }
    if (gift.status === 'cancelled') {
        return { valid: false, giftCardId: gift.id, error: 'Gift card has been cancelled' };
    }
    if (gift.status === 'expired') {
        return { valid: false, giftCardId: gift.id, error: 'Gift card has expired' };
    }

    // Optionally validate recipient email
    if (recipientEmail && gift.recipientEmail !== recipientEmail) {
        return { valid: false, giftCardId: gift.id, error: 'Gift card is not intended for this email address' };
    }

    return {
        valid: true,
        giftCardId: gift.id,
        giftType: gift.giftType,
        amount: gift.amount,
        currency: gift.currency,
        message: gift.message,
        senderName: rows[0].sender_name,
        expiryDate: gift.expiryDate,
    };
}

/**
 * Redeem a gift card.
 */
export async function redeemGiftCard(
    code: string,
    redeemedBy: string,
    recipientEmail?: string,
    ipAddress?: string,
    userAgent?: string
): Promise<GiftRedemptionResult> {
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    // Validate first
    const validation = await validateGiftCard(normalizedCode, recipientEmail);
    if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid gift card', ErrorCode.INVALID_INPUT);
    }

    const giftCardId = validation.giftCardId!;

    // Start transaction to ensure atomicity
    const client = await db.connect();
    let walletTransactionId: string | undefined;

    try {
        await client.query('BEGIN');

        // Get gift card details
        const { rows: giftRows } = await client.query(
            `SELECT * FROM gift_cards WHERE id = $1 FOR UPDATE`,
            [giftCardId]
        );
        const gift = mapGiftCardRow(giftRows[0]);

        // Double-check status
        if (gift.status !== 'active') {
            await client.query('ROLLBACK');
            throw new ValidationError('Gift card is no longer active', ErrorCode.INVALID_INPUT);
        }

        // Handle balance gift
        if (gift.giftType === 'balance' && gift.amount) {
            // Credit user's wallet
            const { rows: walletRows } = await client.query(
                `
                INSERT INTO wallet_transactions (user_id, amount, type, currency, status, description)
                VALUES ($1, $2, 'credit', $3, 'completed', 'Gift card redemption')
                RETURNING id
                `,
                [redeemedBy, gift.amount, gift.currency]
            );
            walletTransactionId = walletRows[0].id;

            // Update wallet balance
            await client.query(
                `
                INSERT INTO wallets (user_id, balance, currency, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    balance = wallets.balance + EXCLUDED.balance,
                    updated_at = NOW()
                `,
                [redeemedBy, gift.amount, gift.currency]
            );
        }

        // Mark gift card as redeemed
        await client.query(
            `
            UPDATE gift_cards
            SET status = 'redeemed', redeemed_by = $1, redeemed_at = NOW()
            WHERE id = $2
            `,
            [redeemedBy, giftCardId]
        );

        // Record redemption
        await client.query(
            `
            INSERT INTO gift_redemptions (gift_card_id, redeemed_by, ip_address, user_agent, wallet_transaction_id)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [giftCardId, redeemedBy, ipAddress || null, userAgent || null, walletTransactionId || null]
        );

        await client.query('COMMIT');

        const result: GiftRedemptionResult = {
            success: true,
            giftCardId,
            redeemedAmount: gift.amount || undefined,
            currency: gift.currency,
            walletTransactionId,
            message: gift.giftType === 'balance'
                ? `Successfully redeemed $${gift.amount} ${gift.currency}`
                : `Successfully redeemed subscription gift`,
        };

        log.info({ giftCardId, redeemedBy, amount: gift.amount }, 'Gift card redeemed');
        logAudit('gift_card_redeemed', {
            userId: redeemedBy,
            resource: giftCardId,
            result: 'success',
            amount: gift.amount,
        });

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * List gift cards sent by a user.
 */
export async function listSentGifts(
    senderId: string,
    limit: number = 20,
    offset: number = 0
): Promise<{ gifts: GiftCard[]; total: number }> {
    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM gift_cards WHERE sender_id = $1`,
        [senderId]
    );

    const { rows } = await db.query(
        `
        SELECT * FROM gift_cards
        WHERE sender_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [senderId, limit, offset]
    );

    return {
        gifts: rows.map(mapGiftCardRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * List gift cards received (redeemed) by a user.
 */
export async function listReceivedGifts(
    userId: string,
    limit: number = 20,
    offset: number = 0
): Promise<{ gifts: GiftCard[]; total: number }> {
    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM gift_cards WHERE redeemed_by = $1`,
        [userId]
    );

    const { rows } = await db.query(
        `
        SELECT * FROM gift_cards
        WHERE redeemed_by = $1
        ORDER BY redeemed_at DESC
        LIMIT $2 OFFSET $3
        `,
        [userId, limit, offset]
    );

    return {
        gifts: rows.map(mapGiftCardRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * Cancel a gift card (only by sender).
 */
export async function cancelGiftCard(
    giftCardId: string,
    senderId: string
): Promise<void> {
    const { rows } = await db.query(
        `SELECT sender_id, status FROM gift_cards WHERE id = $1`,
        [giftCardId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Gift card not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    if (String(rows[0].sender_id) !== senderId) {
        throw new ValidationError('Only the sender can cancel this gift card', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }

    if (rows[0].status === 'redeemed') {
        throw new ValidationError('Cannot cancel a redeemed gift card', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
    }

    await db.query(
        `UPDATE gift_cards SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [giftCardId]
    );

    log.info({ giftCardId, senderId }, 'Gift card cancelled');
    logAudit('gift_card_cancelled', { userId: senderId, resource: giftCardId, result: 'success' });
}

// ─── Helpers ────────────────────────────────────────────────────

function mapGiftCardRow(row: any): GiftCard {
    return {
        id: String(row.id),
        code: row.code,
        senderId: String(row.sender_id),
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        recipientPhone: row.recipient_phone,
        message: row.message,
        giftType: row.gift_type,
        amount: row.amount ? parseFloat(row.amount) : undefined,
        currency: row.currency,
        subscriptionPlanId: row.subscription_plan_id,
        subscriptionMonths: parseInt(row.subscription_months || 1),
        status: row.status,
        expiryDate: new Date(row.expiry_date),
        redeemedBy: row.redeemed_by,
        redeemedAt: row.redeemed_at,
        qrCodeUrl: row.qr_code_url,
        designTheme: row.design_theme,
        createdAt: new Date(row.created_at),
    };
}
