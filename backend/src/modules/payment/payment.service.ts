/**
 * GEM Z — Payment Service
 *
 * Business logic for payment processing:
 * - Checkout session creation
 * - Payment method management
 * - Payment gateway webhooks (Fawry, Paymob)
 * - Refund processing
 * - Transaction history
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createLogger } from '../../core/logging/logger';
import { config } from '../../config';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('payment-service');

// ─── Types ──────────────────────────────────────────────────────

export interface CheckoutSession {
    sessionId: string;
    paymentUrl: string;
    amount: number;
    currency: string;
    expiresAt: Date;
    gateway: 'fawry' | 'paymob';
}

export interface PaymentMethod {
    id: string;
    userId: string;
    type: 'card' | 'wallet' | 'fawry' | 'paymob';
    lastFour?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
    isDefault: boolean;
    gatewayToken?: string;
    createdAt: Date;
}

export interface Transaction {
    id: string;
    userId: string;
    type: string;
    amount: number;
    netAmount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    gateway: string;
    gatewayRef: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface RefundRequest {
    refundId: string;
    transactionId: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    createdAt: Date;
}

// ─── Service ────────────────────────────────────────────────────

export class PaymentService {
    constructor(private pool: Pool) {}

    // ─── Checkout ─────────────────────────────────────────────

    /**
     * Create a checkout session for payment.
     */
    async createCheckout(
        userId: string,
        data: { amount: number; currency?: string; gateway?: 'fawry' | 'paymob'; description?: string; returnUrl?: string }
    ): Promise<CheckoutSession> {
        const amount = data.amount;
        if (!amount || amount <= 0) {
            throw new ValidationError('Amount must be greater than 0', ErrorCode.INVALID_INPUT);
        }

        const gateway = data.gateway || 'fawry';
        const currency = data.currency || 'EGP';
        const sessionId = uuidv4();
        const merchantRef = `TOPUP-${userId}-${Date.now()}`;

        try {
            // Record the pending transaction
            await this.pool.query(
                `
                INSERT INTO payment_sessions (id, user_id, amount, currency, gateway, merchant_ref, status, description, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW() + INTERVAL '30 minutes')
                `,
                [sessionId, userId, amount, currency, gateway, merchantRef, data.description || 'Wallet Top-up']
            );

            // Build payment URL based on gateway
            let paymentUrl: string;
            if (gateway === 'fawry') {
                const fawryConfig = this.getFawryConfig();
                paymentUrl = await this.buildFawryPaymentUrl(sessionId, amount, merchantRef, fawryConfig);
            } else {
                const paymobConfig = this.getPaymobConfig();
                paymentUrl = await this.buildPaymobPaymentUrl(sessionId, amount, merchantRef, paymobConfig);
            }

            log.info({ sessionId, userId, amount, gateway }, 'Checkout session created');

            return {
                sessionId,
                paymentUrl,
                amount,
                currency,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                gateway,
            };
        } catch (error) {
            log.error({ error, userId, amount }, 'Failed to create checkout session');
            throw new AppError('Failed to create checkout session', 500, ErrorCode.SERVER_ERROR);
        }
    }

    // ─── Payment Methods ──────────────────────────────────────

    /**
     * Get user's saved payment methods.
     */
    async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
        const result = await this.pool.query(
            `
            SELECT 
                id,
                user_id as "userId",
                type::text as type,
                last_four as "lastFour",
                brand,
                expiry_month as "expiryMonth",
                expiry_year as "expiryYear",
                is_default as "isDefault",
                created_at as "createdAt"
            FROM payment_methods
            WHERE user_id = $1
            ORDER BY is_default DESC, created_at DESC
            `,
            [userId]
        );

        return result.rows;
    }

    /**
     * Add a payment method for a user.
     */
    async addPaymentMethod(
        userId: string,
        data: { type: 'card' | 'wallet' | 'fawry' | 'paymob'; token: string; lastFour?: string; brand?: string; expiryMonth?: string; expiryYear?: string; setDefault?: boolean }
    ): Promise<PaymentMethod> {
        const methodId = uuidv4();

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // If setting as default, unset current default
            if (data.setDefault) {
                await client.query(
                    `UPDATE payment_methods SET is_default = false WHERE user_id = $1`,
                    [userId]
                );
            }

            const result = await client.query(
                `
                INSERT INTO payment_methods (
                    id, user_id, type, gateway_token, last_four, brand, 
                    expiry_month, expiry_year, is_default
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING 
                    id,
                    user_id as "userId",
                    type::text as type,
                    last_four as "lastFour",
                    brand,
                    expiry_month as "expiryMonth",
                    expiry_year as "expiryYear",
                    is_default as "isDefault",
                    created_at as "createdAt"
                `,
                [
                    methodId,
                    userId,
                    data.type,
                    data.token,
                    data.lastFour || null,
                    data.brand || null,
                    data.expiryMonth || null,
                    data.expiryYear || null,
                    data.setDefault || false,
                ]
            );

            await client.query('COMMIT');

            log.info({ methodId, userId, type: data.type }, 'Payment method added');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, userId }, 'Failed to add payment method');
            throw new AppError('Failed to add payment method', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    /**
     * Remove a payment method.
     */
    async removePaymentMethod(methodId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `DELETE FROM payment_methods WHERE id = $1 AND user_id = $2 RETURNING id`,
            [methodId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Payment method not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ methodId, userId }, 'Payment method removed');
    }

    // ─── Webhooks ─────────────────────────────────────────────

    /**
     * Process Fawry webhook callback.
     */
    async processFawryWebhook(payload: {
        referenceNumber: string;
        merchantRefNumber: string;
        amount: number;
        status: string;
        signature: string;
        [key: string]: any;
    }): Promise<{ received: boolean; processed: boolean; message?: string }> {
        log.debug({ referenceNumber: payload.referenceNumber, status: payload.status }, 'Fawry webhook received');

        // Verify signature
        const secret = process.env.FAWRY_SECURE_KEY;
        if (!secret) {
            log.warn('FAWRY_SECURE_KEY not configured');
            return { received: true, processed: false, message: 'Fawry secret not configured' };
        }

        const dataToSign = `${payload.referenceNumber}${payload.amount}${payload.status}`;
        const expectedSig = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

        let signatureValid = false;
        try {
            signatureValid = crypto.timingSafeEqual(
                Buffer.from(payload.signature || '', 'hex'),
                Buffer.from(expectedSig, 'hex')
            );
        } catch {
            signatureValid = false;
        }

        if (!signatureValid) {
            log.warn({ referenceNumber: payload.referenceNumber }, 'Invalid Fawry webhook signature');
            return { received: false, processed: false, message: 'Invalid signature' };
        }

        if (payload.status !== 'PAID') {
            log.debug({ status: payload.status, ref: payload.referenceNumber }, 'Ignoring non-PAID status');
            return { received: true, processed: false };
        }

        try {
            // Update session status
            await this.pool.query(
                `
                UPDATE payment_sessions 
                SET status = 'completed', 
                    gateway_ref = $1,
                    updated_at = NOW()
                WHERE merchant_ref = $2 AND status = 'pending'
                RETURNING user_id, amount
                `,
                [payload.referenceNumber, payload.merchantRefNumber]
            );

            // Extract user ID from merchantRefNumber (format: TOPUP-{userId}-{timestamp})
            const userId = this.extractUserIdFromMerchantRef(payload.merchantRefNumber);
            if (userId) {
                // Credit user's wallet (handled by wallet service, record here)
                const txnId = uuidv4();
                await this.pool.query(
                    `
                    INSERT INTO financial_transactions (
                        id, user_id, type, amount, net_amount, status, currency, 
                        gateway, gateway_ref, description
                    ) VALUES ($1, $2, 'top_up', $3, $3, 'COMPLETED', 'EGP', 'fawry', $4, 'Wallet top-up via Fawry')
                    ON CONFLICT DO NOTHING
                    `,
                    [txnId, userId, payload.amount, payload.referenceNumber]
                );

                log.info({ userId, amount: payload.amount, ref: payload.referenceNumber }, 'Fawry payment processed');
            }

            return { received: true, processed: true };
        } catch (error) {
            log.error({ error, ref: payload.referenceNumber }, 'Failed to process Fawry webhook');
            throw new AppError('Webhook processing failed', 500, ErrorCode.SERVER_ERROR);
        }
    }

    /**
     * Process Paymob webhook callback.
     */
    async processPaymobWebhook(payload: {
        obj: {
            id: number;
            order: { id: number; merchant_order_id: string };
            success: boolean;
            amount_cents: number;
            source_data: { type: string };
            [key: string]: any;
        };
        hmac: string;
    }): Promise<{ received: boolean; processed: boolean; message?: string }> {
        log.debug({ orderId: payload.obj?.order?.id, success: payload.obj?.success }, 'Paymob webhook received');

        // Verify HMAC
        const secret = process.env.PAYMOB_HMAC_SECRET;
        if (!secret) {
            log.warn('PAYMOB_HMAC_SECRET not configured');
            return { received: true, processed: false, message: 'Paymob HMAC not configured' };
        }

        const obj = payload.obj || {};
        const fields = [
            obj.amount_cents, obj.created_at, obj.currency, obj.error_occured,
            obj.has_parent_transaction, obj.id, obj.integration_id, obj.is_3d_secure,
            obj.is_auth, obj.is_capture, obj.is_refunded, obj.is_standalone_payment,
            obj.is_voided, obj.order?.id, obj.owner, obj.pending,
            obj.source_data?.pan, obj.source_data?.sub_type, obj.source_data?.type, obj.success
        ].join('');

        const expectedHmac = crypto.createHmac('sha512', secret).update(fields).digest('hex');

        let signatureValid = false;
        try {
            signatureValid = crypto.timingSafeEqual(
                Buffer.from(payload.hmac || '', 'utf-8'),
                Buffer.from(expectedHmac, 'utf-8')
            );
        } catch {
            signatureValid = false;
        }

        if (!signatureValid) {
            log.warn({ orderId: obj.order?.id }, 'Invalid Paymob webhook HMAC');
            return { received: false, processed: false, message: 'Invalid HMAC' };
        }

        if (!obj.success) {
            log.debug({ orderId: obj.order?.id }, 'Paymob payment not successful');
            return { received: true, processed: false };
        }

        try {
            const merchantOrderId = obj.order?.merchant_order_id || '';
            const userId = this.extractUserIdFromMerchantRef(merchantOrderId);
            const amountEGP = obj.amount_cents / 100;

            // Update session and create transaction
            if (userId) {
                const txnId = uuidv4();
                await this.pool.query(
                    `
                    INSERT INTO financial_transactions (
                        id, user_id, type, amount, net_amount, status, currency,
                        gateway, gateway_ref, description
                    ) VALUES ($1, $2, 'top_up', $3, $3, 'COMPLETED', 'EGP', 'paymob', $4, 'Wallet top-up via Paymob')
                    ON CONFLICT DO NOTHING
                    `,
                    [txnId, userId, amountEGP, `paymob-${obj.id}`]
                );

                log.info({ userId, amount: amountEGP, orderId: obj.order?.id }, 'Paymob payment processed');
            }

            return { received: true, processed: true };
        } catch (error) {
            log.error({ error, orderId: obj.order?.id }, 'Failed to process Paymob webhook');
            throw new AppError('Webhook processing failed', 500, ErrorCode.SERVER_ERROR);
        }
    }

    // ─── Refunds ──────────────────────────────────────────────

    /**
     * Request a refund for a transaction.
     */
    async requestRefund(
        userId: string,
        data: { transactionId: string; amount?: number; reason: string }
    ): Promise<RefundRequest> {
        // Verify the transaction belongs to the user
        const txnCheck = await this.pool.query(
            `
            SELECT id, amount, status, gateway_ref 
            FROM financial_transactions 
            WHERE id = $1 AND user_id = $2
            `,
            [data.transactionId, userId]
        );

        if (txnCheck.rows.length === 0) {
            throw new NotFoundError('Transaction not found', ErrorCode.NOT_FOUND_TRANSACTION);
        }

        const txn = txnCheck.rows[0];
        if (txn.status !== 'COMPLETED') {
            throw new ValidationError('Only completed transactions can be refunded', ErrorCode.INVALID_INPUT);
        }

        const refundAmount = data.amount || txn.amount;
        if (refundAmount > txn.amount) {
            throw new ValidationError('Refund amount cannot exceed transaction amount', ErrorCode.INVALID_INPUT);
        }

        const refundId = uuidv4();

        // Create refund request record
        await this.pool.query(
            `
            INSERT INTO refund_requests (id, transaction_id, user_id, amount, reason, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            `,
            [refundId, data.transactionId, userId, refundAmount, data.reason]
        );

        // Mark original transaction as having a pending refund
        await this.pool.query(
            `UPDATE financial_transactions SET status = 'refund_pending' WHERE id = $1`,
            [data.transactionId]
        );

        log.info({ refundId, transactionId: data.transactionId, userId, amount: refundAmount }, 'Refund requested');

        return {
            refundId,
            transactionId: data.transactionId,
            amount: refundAmount,
            status: 'pending',
            reason: data.reason,
            createdAt: new Date(),
        };
    }

    // ─── Transaction History ──────────────────────────────────

    /**
     * Get user's transaction history.
     */
    async getTransactionHistory(
        userId: string,
        filters: { status?: string; type?: string; limit?: number; offset?: number }
    ): Promise<{ transactions: Transaction[]; total: number }> {
        const limit = Math.min(filters.limit || 50, 100);
        const offset = filters.offset || 0;

        let whereClause = 'WHERE user_id = $1';
        const params: any[] = [userId];
        let paramIdx = 2;

        if (filters.status) {
            whereClause += ` AND status = $${paramIdx}`;
            params.push(filters.status.toUpperCase());
            paramIdx++;
        }

        if (filters.type) {
            whereClause += ` AND type = $${paramIdx}`;
            params.push(filters.type.toLowerCase());
            paramIdx++;
        }

        const countResult = await this.pool.query(
            `SELECT COUNT(*) as total FROM financial_transactions ${whereClause}`,
            params
        );

        const dataResult = await this.pool.query(
            `
            SELECT 
                id,
                user_id as "userId",
                type::text as type,
                amount,
                net_amount as "netAmount",
                currency,
                status::text as status,
                gateway,
                gateway_ref as "gatewayRef",
                description,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM financial_transactions
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
            `,
            [...params, limit, offset]
        );

        return {
            transactions: dataResult.rows,
            total: Number(countResult.rows[0].total),
        };
    }

    // ─── Helpers ──────────────────────────────────────────────

    private getFawryConfig() {
        return {
            merchantCode: process.env.FAWRY_MERCHANT_CODE || '',
            secureKey: process.env.FAWRY_SECURE_KEY || '',
            baseUrl: process.env.FAWRY_BASE_URL || 'https://atfawry.com/fawrypay-api/api',
        };
    }

    private getPaymobConfig() {
        return {
            apiKey: process.env.PAYMOB_API_KEY || '',
            integrationId: process.env.PAYMOB_INTEGRATION_ID || '',
            hmacSecret: process.env.PAYMOB_HMAC_SECRET || '',
            baseUrl: process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com/api',
        };
    }

    private async buildFawryPaymentUrl(
        sessionId: string,
        amount: number,
        merchantRef: string,
        fawryConfig: { merchantCode: string; secureKey: string; baseUrl: string }
    ): Promise<string> {
        // In production, this would call Fawry's API to generate a payment URL
        // For now, return a mock URL structure
        const returnUrl = `${config.apiUrl}/api/v1/payment/callback/fawry`;
        return `${fawryConfig.baseUrl}/pay?merchantCode=${fawryConfig.merchantCode}&merchantRef=${merchantRef}&amount=${amount}&returnUrl=${encodeURIComponent(returnUrl)}`;
    }

    private async buildPaymobPaymentUrl(
        sessionId: string,
        amount: number,
        merchantRef: string,
        paymobConfig: { apiKey: string; integrationId: string; hmacSecret: string; baseUrl: string }
    ): Promise<string> {
        // In production, this would call Paymob's authentication + order + payment key APIs
        // For now, return a mock URL structure
        return `${paymobConfig.baseUrl}/accept/pay?token=mock-token-${sessionId}`;
    }

    private extractUserIdFromMerchantRef(ref: string): string | null {
        if (!ref) return null;

        // Try "TOPUP-{uuid}-{timestamp}" format
        const match = ref.match(/TOPUP-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (match) return match[1];

        // Try raw UUID format
        const uuidMatch = ref.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
        if (uuidMatch) return ref;

        return null;
    }
}
