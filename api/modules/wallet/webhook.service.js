"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const transaction_service_1 = require("./transaction.service");
/**
 * GEM Z — Webhook Service
 *
 * Handles payment gateway callbacks with:
 * 1. HMAC signature verification (prevents spoofing)
 * 2. Idempotency (duplicate callbacks are safely ignored)
 * 3. Atomic crediting via TransactionService
 */
class WebhookService {
    pool;
    transactionService;
    constructor(pool) {
        this.pool = pool;
        this.transactionService = new transaction_service_1.TransactionService(pool);
    }
    // ─── Fawry ───────────────────────────────────────────────
    /**
     * Handle Fawry payment callback.
     * Expected payload: { referenceNumber, merchantRefNumber, amount, status, signature }
     */
    async handleFawryCallback(payload) {
        // 1. Verify signature
        const isValid = this.verifyFawrySignature(payload);
        if (!isValid) {
            console.error('[Webhook:Fawry] INVALID SIGNATURE. Possible spoofing attempt.', {
                referenceNumber: payload.referenceNumber,
                receivedSig: payload.signature
            });
            throw new Error('Invalid webhook signature.');
        }
        // 2. Ignore non-PAID statuses
        if (payload.status !== 'PAID' && payload.status !== 'NEW') {
            console.log(`[Webhook:Fawry] Ignoring status: ${payload.status} for ref: ${payload.referenceNumber}`);
            return { processed: false };
        }
        // 3. Extract user ID from merchantRefNumber (format: "TOPUP-{userId}")
        const userId = this.extractUserIdFromMerchantRef(payload.merchantRefNumber);
        if (!userId) {
            throw new Error(`Cannot extract userId from merchantRefNumber: ${payload.merchantRefNumber}`);
        }
        // 4. Process top-up (idempotent — safe to call multiple times)
        const result = await this.transactionService.processTopUp({
            userId,
            amount: payload.amount,
            gateway: 'fawry',
            gatewayRef: payload.referenceNumber,
            gatewayResponse: payload,
            idempotencyKey: `fawry-${payload.referenceNumber}`
        });
        console.log(`[Webhook:Fawry] Successfully processed ${payload.amount} EGP for user ${userId}. TXN: ${result.referenceNo}`);
        return { processed: true, txnId: result.txnId };
    }
    // ─── Paymob ──────────────────────────────────────────────
    /**
     * Handle Paymob transaction callback.
     * Expected payload: { obj: { id, order, success, amount_cents, ... }, hmac }
     */
    async handlePaymobCallback(payload) {
        // 1. Verify HMAC
        const isValid = this.verifyPaymobHMAC(payload);
        if (!isValid) {
            console.error('[Webhook:Paymob] INVALID HMAC. Possible spoofing attempt.');
            throw new Error('Invalid webhook signature.');
        }
        // 2. Check success
        if (!payload.obj.success) {
            console.log(`[Webhook:Paymob] Payment not successful for order: ${payload.obj.order?.id}`);
            return { processed: false };
        }
        // 3. Extract user ID
        const merchantOrderId = payload.obj.order?.merchant_order_id || '';
        const userId = this.extractUserIdFromMerchantRef(merchantOrderId);
        if (!userId) {
            throw new Error(`Cannot extract userId from merchant_order_id: ${merchantOrderId}`);
        }
        // 4. Convert amount from cents to EGP
        const amountEGP = payload.obj.amount_cents / 100;
        // 5. Process top-up
        const result = await this.transactionService.processTopUp({
            userId,
            amount: amountEGP,
            gateway: 'paymob',
            gatewayRef: `paymob-${payload.obj.id}`,
            gatewayResponse: payload.obj,
            idempotencyKey: `paymob-${payload.obj.id}`
        });
        console.log(`[Webhook:Paymob] Successfully processed ${amountEGP} EGP for user ${userId}. TXN: ${result.referenceNo}`);
        return { processed: true, txnId: result.txnId };
    }
    // ─── InstaPay ────────────────────────────────────────────
    /**
     * Handle InstaPay webhook callback.
     */
    async handleInstapayCallback(payload) {
        // 1. Verify signature
        const isValid = this.verifyInstapaySignature(payload);
        if (!isValid) {
            console.error('[Webhook:InstaPay] INVALID SIGNATURE.');
            throw new Error('Invalid webhook signature.');
        }
        if (payload.status !== 'SUCCESS') {
            return { processed: false };
        }
        const userId = this.extractUserIdFromMerchantRef(payload.customerReference);
        if (!userId) {
            throw new Error(`Cannot extract userId from customerReference: ${payload.customerReference}`);
        }
        const result = await this.transactionService.processTopUp({
            userId,
            amount: payload.amount,
            gateway: 'instapay',
            gatewayRef: payload.transactionId,
            gatewayResponse: payload,
            idempotencyKey: `instapay-${payload.transactionId}`
        });
        console.log(`[Webhook:InstaPay] Successfully processed ${payload.amount} EGP for user ${userId}. TXN: ${result.referenceNo}`);
        return { processed: true, txnId: result.txnId };
    }
    // ─── Signature Verification ──────────────────────────────
    verifyFawrySignature(payload) {
        const secret = process.env.FAWRY_SECURE_KEY;
        if (!secret) {
            console.warn('[Webhook:Fawry] FAWRY_SECURE_KEY not set. SKIPPING signature verification in dev mode.');
            return process.env.NODE_ENV !== 'production';
        }
        const dataToSign = `${payload.referenceNumber}${payload.amount}${payload.status}`;
        const expectedSig = crypto_1.default.createHmac('sha256', secret).update(dataToSign).digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(payload.signature || '', 'hex'), Buffer.from(expectedSig, 'hex'));
    }
    verifyPaymobHMAC(payload) {
        const secret = process.env.PAYMOB_HMAC_SECRET;
        if (!secret) {
            console.warn('[Webhook:Paymob] PAYMOB_HMAC_SECRET not set. SKIPPING in dev mode.');
            return process.env.NODE_ENV !== 'production';
        }
        // Paymob concatenates specific fields in a specific order
        const obj = payload.obj || {};
        const fields = [
            obj.amount_cents, obj.created_at, obj.currency, obj.error_occured,
            obj.has_parent_transaction, obj.id, obj.integration_id, obj.is_3d_secure,
            obj.is_auth, obj.is_capture, obj.is_refunded, obj.is_standalone_payment,
            obj.is_voided, obj.order?.id, obj.owner, obj.pending,
            obj.source_data?.pan, obj.source_data?.sub_type, obj.source_data?.type, obj.success
        ].join('');
        const expectedHmac = crypto_1.default.createHmac('sha512', secret).update(fields).digest('hex');
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(payload.hmac || ''), Buffer.from(expectedHmac));
        }
        catch {
            return false;
        }
    }
    verifyInstapaySignature(payload) {
        const secret = process.env.INSTAPAY_SECRET_KEY;
        if (!secret) {
            console.warn('[Webhook:InstaPay] INSTAPAY_SECRET_KEY not set. SKIPPING in dev mode.');
            return process.env.NODE_ENV !== 'production';
        }
        const dataToSign = `${payload.transactionId}${payload.amount}${payload.status}`;
        const expectedSig = crypto_1.default.createHmac('sha256', secret).update(dataToSign).digest('hex');
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(payload.signature || ''), Buffer.from(expectedSig));
        }
        catch {
            return false;
        }
    }
    // ─── Helpers ─────────────────────────────────────────────
    /**
     * Extract userId from merchant reference.
     * Expected format: "TOPUP-{uuid}" or just a UUID.
     */
    extractUserIdFromMerchantRef(ref) {
        if (!ref)
            return null;
        // Try "TOPUP-{uuid}" format
        const match = ref.match(/TOPUP-(.+)/);
        if (match)
            return match[1];
        // Try raw UUID format
        const uuidMatch = ref.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        if (uuidMatch)
            return ref;
        return null;
    }
}
exports.WebhookService = WebhookService;
