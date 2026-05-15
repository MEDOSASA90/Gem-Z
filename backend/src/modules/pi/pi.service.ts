/**
 * GEM Z — Pi Network Integration Service
 * 
 * Handles Pi cryptocurrency payments:
 * - U2A: User pays Pi to Gem Z (subscriptions, store, trainer)
 * - A2U: Gem Z pays Pi to users (rewards, refunds, commissions)
 * - Authentication: Verify Pi user identity
 * 
 * Uses: pi-backend (npm) + Pi Platform API
 */

import PiNetwork from 'pi-backend';
import axios from 'axios';
import { Pool, PoolClient } from 'pg';
import { AppError } from '../../core/errors';
import { logger } from '../../core/logging/logger';
import { config } from '../../config';
import { withTransaction } from '../../core/utils/transaction';

// ─── Types ──────────────────────────────────────────────────

export interface PiPaymentData {
  userId: string;
  piUserUid: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  direction: 'user_to_app' | 'app_to_user';
  productType: 'subscription' | 'store' | 'trainer' | 'reward' | 'refund';
  productId?: string;
}

export interface PiPaymentRecord {
  id: string;
  user_id: string;
  pi_user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  direction: 'user_to_app' | 'app_to_user';
  product_type: string;
  product_id?: string;
  payment_id?: string;
  txid?: string;
  status: 'pending' | 'approved' | 'submitted' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

// ─── Pi SDK Initialization ──────────────────────────────────

let piNetwork: PiNetwork | null = null;

function getPiNetwork(): PiNetwork {
  if (!piNetwork) {
    const apiKey = config.piApiKey;
    const walletSeed = config.piWalletSeed;
    
    if (!apiKey || !walletSeed) {
      throw new AppError('PI_NOT_CONFIGURED', 'Pi Network not configured', 500);
    }
    
    piNetwork = new PiNetwork(apiKey, walletSeed);
    logger.info('[Pi] SDK initialized');
  }
  return piNetwork;
}

// ─── Platform API Client ────────────────────────────────────

function getPiApiClient() {
  const apiKey = config.piApiKey;
  if (!apiKey) {
    throw new AppError('PI_NOT_CONFIGURED', 'Pi API key not set', 500);
  }
  
  return axios.create({
    baseURL: 'https://api.minepi.com',
    timeout: 30000,
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Service ────────────────────────────────────────────────

export class PiService {
  
  constructor(private db: Pool) {}
  
  // ═══════════════════════════════════════════════════════════
  // U2A: User-to-App Payment (User pays Gem Z)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Step 1: Store payment intent in DB
   * Called BEFORE frontend creates Pi payment
   */
  async createPaymentIntent(data: PiPaymentData): Promise<string> {
    const client = await this.db.connect();
    try {
      const result = await client.query(
        `INSERT INTO pi_payments 
         (user_id, pi_user_uid, amount, memo, metadata, direction, product_type, product_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
         RETURNING id`,
        [
          data.userId,
          data.piUserUid,
          data.amount,
          data.memo,
          JSON.stringify(data.metadata),
          data.direction,
          data.productType,
          data.productId,
        ]
      );
      
      logger.info(`[Pi] Payment intent created: ${result.rows[0].id}`, {
        userId: data.userId,
        amount: data.amount,
        direction: data.direction,
      });
      
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }
  
  /**
   * Step 2: Server-Side Approval
   * Called when frontend sends paymentID (onReadyForServerApproval)
   */
  async approvePayment(internalPaymentId: string, piPaymentId: string): Promise<void> {
    const apiClient = getPiApiClient();
    
    try {
      // Approve with Pi Servers
      const response = await apiClient.post(`/v2/payments/${piPaymentId}/approve`);
      
      if (response.status === 200) {
        // Update DB
        await this.db.query(
          `UPDATE pi_payments 
           SET payment_id = $1, status = 'approved', updated_at = NOW()
           WHERE id = $2`,
          [piPaymentId, internalPaymentId]
        );
        
        logger.info(`[Pi] Payment approved: ${piPaymentId}`);
      }
    } catch (err: any) {
      logger.error(`[Pi] Approval failed for ${piPaymentId}`, { error: err.message });
      throw new AppError('PI_APPROVAL_FAILED', 'Payment approval failed', 500);
    }
  }
  
  /**
   * Step 3: Server-Side Completion
   * Called when frontend sends txID (onReadyForServerCompletion)
   */
  async completePayment(internalPaymentId: string, piPaymentId: string, txid: string): Promise<PiPaymentRecord> {
    const apiClient = getPiApiClient();
    
    try {
      // Complete with Pi Servers
      const response = await apiClient.post(`/v2/payments/${piPaymentId}/complete`, { txid });
      
      if (response.status === 200) {
        // Update DB
        const result = await this.db.query(
          `UPDATE pi_payments 
           SET txid = $1, status = 'completed', updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [txid, internalPaymentId]
        );
        
        const payment = result.rows[0];
        
        logger.info(`[Pi] Payment completed: ${piPaymentId}, tx: ${txid}`);
        
        // Execute business logic based on product type
        await this.executePostPaymentLogic(payment);
        
        return payment;
      }
      
      throw new AppError('PI_COMPLETION_FAILED', 'Payment completion failed', 500);
    } catch (err: any) {
      logger.error(`[Pi] Completion failed for ${piPaymentId}`, { error: err.message });
      throw new AppError('PI_COMPLETION_FAILED', 'Payment completion failed', 500);
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // A2U: App-to-User Payment (Gem Z pays user)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Create and process A2U payment (rewards, refunds, commissions)
   */
  async createA2UPayment(data: PiPaymentData): Promise<PiPaymentRecord> {
    const pi = getPiNetwork();
    
    // 1. Create payment intent in DB
    const internalId = await this.createPaymentIntent(data);
    
    try {
      // 2. Create payment on Pi Network
      const paymentData = {
        amount: data.amount,
        memo: data.memo,
        metadata: data.metadata,
        uid: data.piUserUid,
      };
      
      const paymentId = await pi.createPayment(paymentData);
      
      // 3. Update DB with payment_id
      await this.db.query(
        `UPDATE pi_payments SET payment_id = $1, status = 'approved' WHERE id = $2`,
        [paymentId, internalId]
      );
      
      // 4. Submit to blockchain
      const txid = await pi.submitPayment(paymentId, false);
      
      // 5. Update DB with txid
      await this.db.query(
        `UPDATE pi_payments SET txid = $1, status = 'submitted' WHERE id = $2`,
        [txid, internalId]
      );
      
      // 6. Complete payment
      const completed = await pi.completePayment(paymentId, txid);
      
      // 7. Finalize in DB
      const result = await this.db.query(
        `UPDATE pi_payments 
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [internalId]
      );
      
      logger.info(`[Pi] A2U payment completed: ${paymentId}, tx: ${txid}`, {
        userId: data.userId,
        amount: data.amount,
      });
      
      return result.rows[0];
    } catch (err: any) {
      // Mark as failed
      await this.db.query(
        `UPDATE pi_payments SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [internalId]
      );
      
      logger.error(`[Pi] A2U payment failed`, { error: err.message, userId: data.userId });
      throw new AppError('PI_A2U_FAILED', `A2U payment failed: ${err.message}`, 500);
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // Authentication
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Verify Pi user identity with Platform API
   */
  async verifyPiUser(accessToken: string): Promise<{
    uid: string;
    username: string;
  }> {
    try {
      const apiClient = axios.create({
        baseURL: 'https://api.minepi.com',
        timeout: 20000,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const response = await apiClient.get('/v2/me');
      
      return {
        uid: response.data.uid,
        username: response.data.username,
      };
    } catch (err: any) {
      logger.error('[Pi] User verification failed', { error: err.message });
      throw new AppError('PI_AUTH_FAILED', 'Pi user verification failed', 401);
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // Post-Payment Business Logic
  // ═══════════════════════════════════════════════════════════
  
  private async executePostPaymentLogic(payment: PiPaymentRecord): Promise<void> {
    switch (payment.product_type) {
      case 'subscription':
        await this.activateSubscription(payment);
        break;
      case 'store':
        await this.confirmOrder(payment);
        break;
      case 'trainer':
        await this.bookTrainerSession(payment);
        break;
      case 'reward':
        await this.processReward(payment);
        break;
      case 'refund':
        await this.processRefund(payment);
        break;
      default:
        logger.warn(`[Pi] Unknown product type: ${payment.product_type}`);
    }
  }
  
  private async activateSubscription(payment: PiPaymentRecord): Promise<void> {
    await this.db.query(
      `UPDATE subscriptions SET status = 'active', activated_at = NOW() 
       WHERE id = $1`,
      [payment.product_id]
    );
    logger.info(`[Pi] Subscription activated: ${payment.product_id}`);
  }
  
  private async confirmOrder(payment: PiPaymentRecord): Promise<void> {
    await this.db.query(
      `UPDATE store_orders SET status = 'confirmed', paid_at = NOW() 
       WHERE id = $1`,
      [payment.product_id]
    );
    logger.info(`[Pi] Store order confirmed: ${payment.product_id}`);
  }
  
  private async bookTrainerSession(payment: PiPaymentRecord): Promise<void> {
    await this.db.query(
      `UPDATE trainer_sessions SET status = 'booked', paid_at = NOW() 
       WHERE id = $1`,
      [payment.product_id]
    );
    logger.info(`[Pi] Trainer session booked: ${payment.product_id}`);
  }
  
  private async processReward(payment: PiPaymentRecord): Promise<void> {
    logger.info(`[Pi] Reward processed for user: ${payment.user_id}`);
  }
  
  private async processRefund(payment: PiPaymentRecord): Promise<void> {
    logger.info(`[Pi] Refund processed: ${payment.product_id}`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════
  
  async getPaymentHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    payments: PiPaymentRecord[];
    total: number;
  }> {
    const offset = (page - 1) * limit;
    
    const [paymentsResult, countResult] = await Promise.all([
      this.db.query(
        `SELECT * FROM pi_payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM pi_payments WHERE user_id = $1`,
        [userId]
      ),
    ]);
    
    return {
      payments: paymentsResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }
  
  async getPaymentById(paymentId: string): Promise<PiPaymentRecord | null> {
    const result = await this.db.query(
      `SELECT * FROM pi_payments WHERE id = $1`,
      [paymentId]
    );
    return result.rows[0] || null;
  }
  
  async getStats(userId?: string): Promise<{
    totalU2A: number;
    totalA2U: number;
    totalU2AAmount: number;
    totalA2UAmount: number;
    pendingCount: number;
  }> {
    const whereClause = userId ? 'WHERE user_id = $1' : '';
    const params = userId ? [userId] : [];
    
    const result = await this.db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE direction = 'user_to_app') as total_u2a,
        COUNT(*) FILTER (WHERE direction = 'app_to_user') as total_a2u,
        COALESCE(SUM(amount) FILTER (WHERE direction = 'user_to_app' AND status = 'completed'), 0) as total_u2a_amount,
        COALESCE(SUM(amount) FILTER (WHERE direction = 'app_to_user' AND status = 'completed'), 0) as total_a2u_amount,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count
       FROM pi_payments ${whereClause}`,
      params
    );
    
    return result.rows[0];
  }
  
  // ═══════════════════════════════════════════════════════════
  // Admin
  // ═══════════════════════════════════════════════════════════
  
  async getAllPayments(page: number = 1, limit: number = 50): Promise<{
    payments: PiPaymentRecord[];
    total: number;
  }> {
    const offset = (page - 1) * limit;
    
    const [paymentsResult, countResult] = await Promise.all([
      this.db.query(
        `SELECT * FROM pi_payments ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      this.db.query(`SELECT COUNT(*) FROM pi_payments`),
    ]);
    
    return {
      payments: paymentsResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }
  
  async cancelPayment(internalPaymentId: string, reason: string): Promise<void> {
    const payment = await this.getPaymentById(internalPaymentId);
    if (!payment) {
      throw new AppError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    }
    
    if (payment.status === 'completed') {
      throw new AppError('PAYMENT_ALREADY_COMPLETED', 'Cannot cancel completed payment', 400);
    }
    
    // Cancel with Pi if payment_id exists
    if (payment.payment_id) {
      try {
        const apiClient = getPiApiClient();
        await apiClient.post(`/v2/payments/${payment.payment_id}/cancel`);
      } catch (err) {
        logger.warn(`[Pi] Could not cancel with Pi servers`, { error: (err as Error).message });
      }
    }
    
    await this.db.query(
      `UPDATE pi_payments SET status = 'cancelled', metadata = metadata || $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ cancellation_reason: reason }), internalPaymentId]
    );
    
    logger.info(`[Pi] Payment cancelled: ${internalPaymentId}, reason: ${reason}`);
  }
}

// ─── Singleton ──────────────────────────────────────────────

export function createPiService(db: Pool): PiService {
  return new PiService(db);
}
