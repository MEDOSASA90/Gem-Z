import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const subscriptionSchema = z.object({
  gymId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  planId: z.string().uuid(),
});

export class FinancialController {
  static async getWalletBalance(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      return res.status(200).json({
        success: true,
        wallet: { available_bal: 12000, pending_bal: 0, currency: 'EGP', lifetime_earned: 45000 }
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async purchaseGymSubscription(req: AuthRequest, res: Response) {
    try {
      const traineeId = req.user!.userId;
      const validData = subscriptionSchema.parse(req.body);
      const { gymId, branchId, planId } = validData;

      try {
        return res.status(200).json({
          success: true,
          message: 'Subscription purchased successfully. (Mock)',
          transactionId: 'mock-financial-txn-sub',
          totalPaid: 1500
        });

      } catch (error: any) {
        console.error('LEDGER ENGINE ERROR:', error);
        return res.status(500).json({ success: false, message: 'Financial Engine Execution Failed.' });
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: error.errors });
      }
      return res.status(500).json({ success: false, message: 'Server Configuration Error' });
    }
  }
}
