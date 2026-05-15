/**
 * GEM Z — Pi Network Controller
 * 
 * Handles Pi payment endpoints:
 * - U2A: User pays with Pi (subscriptions, store, trainer)
 * - A2U: App pays user (rewards, refunds)
 * - Auth: Pi user authentication
 * - History: Payment history
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/types';
import { PiService } from './pi.service';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors';

export class PiController {
  constructor(private piService: PiService) {}

  // ═══════════════════════════════════════════════════════════
  // U2A: User-to-App Payments
  // ═══════════════════════════════════════════════════════════

  /**
   * Step 1: Create payment intent
   * Frontend calls this BEFORE creating Pi payment
   */
  async createPaymentIntent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { piUserUid, amount, memo, metadata, productType, productId } = req.body;
      const userId = req.user.id;

      const internalPaymentId = await this.piService.createPaymentIntent({
        userId,
        piUserUid,
        amount,
        memo,
        metadata: metadata || {},
        direction: 'user_to_app',
        productType,
        productId,
      });

      res.status(201).json({
        success: true,
        data: {
          internalPaymentId,
          amount,
          memo,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Step 2: Server-Side Approval
   * Frontend sends paymentID from onReadyForServerApproval
   */
  async approvePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { internalPaymentId, piPaymentId } = req.body;

      await this.piService.approvePayment(internalPaymentId, piPaymentId);

      res.status(200).json({
        success: true,
        message: 'Payment approved',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Step 3: Server-Side Completion
   * Frontend sends txID from onReadyForServerCompletion
   */
  async completePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { internalPaymentId, piPaymentId, txid } = req.body;

      const payment = await this.piService.completePayment(internalPaymentId, piPaymentId, txid);

      res.status(200).json({
        success: true,
        data: {
          paymentId: payment.id,
          status: payment.status,
          txid: payment.txid,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // A2U: App-to-User Payments (Admin only)
  // ═══════════════════════════════════════════════════════════

  /**
   * Send Pi to user (rewards, refunds, commissions)
   */
  async createA2UPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { piUserUid, amount, memo, metadata, productType, productId, userId } = req.body;

      // Admin check
      if (!['super_admin', 'store_admin'].includes(req.user.role)) {
        throw new AppError('FORBIDDEN', 'Only admins can send Pi payments', 403);
      }

      const payment = await this.piService.createA2UPayment({
        userId,
        piUserUid,
        amount,
        memo,
        metadata: metadata || {},
        direction: 'app_to_user',
        productType,
        productId,
      });

      res.status(201).json({
        success: true,
        data: {
          paymentId: payment.id,
          piPaymentId: payment.payment_id,
          txid: payment.txid,
          status: payment.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Authentication
  // ═══════════════════════════════════════════════════════════

  /**
   * Authenticate Pi user
   */
  async authenticatePiUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken } = req.body;

      const piUser = await this.piService.verifyPiUser(accessToken);

      res.status(200).json({
        success: true,
        data: piUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════

  /**
   * Get user's Pi payment history
   */
  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.piService.getPaymentHistory(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Pi payment stats
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const stats = await this.piService.getStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Admin
  // ═══════════════════════════════════════════════════════════

  /**
   * Get all Pi payments (Admin)
   */
  async getAllPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user.role !== 'super_admin') {
        throw new AppError('FORBIDDEN', 'Admin access required', 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.piService.getAllPayments(page, limit);

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Cancel a payment (Admin)
   */
  async cancelPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user.role !== 'super_admin') {
        throw new AppError('FORBIDDEN', 'Admin access required', 403);
      }

      const { id } = req.params;
      const { reason } = req.body;

      await this.piService.cancelPayment(id, reason);

      res.status(200).json({
        success: true,
        message: 'Payment cancelled',
      });
    } catch (err) {
      next(err);
    }
  }
}
