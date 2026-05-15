/**
 * GEM Z — Pi Network Hook
 * 
 * Handles Pi authentication and payments:
 * - Pi.authenticate() — Login with Pi
 * - Pi.createPayment() — U2A payment
 * - Server-side approval/completion flow
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';

// ─── Types ────────────────────────────────────────────────────

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
  productType: 'subscription' | 'store' | 'trainer' | 'reward' | 'refund';
  productId?: string;
}

export interface PiPaymentResult {
  success: boolean;
  paymentId?: string;
  txid?: string;
  error?: string;
}

export interface PiUser {
  uid: string;
  username: string;
}

// ─── Global Pi SDK Type ───────────────────────────────────────

declare global {
  interface Window {
    Pi: {
      init(config: { version: string; sandbox?: boolean }): void;
      authenticate(scopes: string[], onIncompletePaymentFound: (payment: any) => void): Promise<{ accessToken: string; user: PiUser }>;
      createPayment(paymentData: {
        amount: number;
        memo: string;
        metadata?: Record<string, any>;
        uid?: string;
      }, callbacks: {
        onReadyForServerApproval: (paymentId: string) => void;
        onReadyForServerCompletion: (paymentId: string, txid: string) => void;
        onCancel: (paymentId: string) => void;
        onError: (error: Error, payment?: any) => void;
      }): Promise<{ paymentId: string; txid: string }>;
    };
  }
}

// ─── Hook ─────────────────────────────────────────────────────

export function usePi() {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [piBalance, setPiBalance] = useState<number>(0);

  // ─── Initialize Pi SDK ────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Pi) {
      try {
        const isSandbox = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
        window.Pi.init({ 
          version: '2.0',
          sandbox: isSandbox,
        });
        console.log('[Pi] SDK initialized, sandbox:', isSandbox);
      } catch (err) {
        console.warn('[Pi] SDK init failed:', err);
      }
    }
  }, []);

  // ─── Authenticate with Pi ─────────────────────────────────

  const authenticate = useCallback(async (): Promise<PiUser | null> => {
    if (typeof window === 'undefined' || !window.Pi) {
      setError('Pi Browser not detected. Please open this app inside the Pi Browser.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const auth = await window.Pi.authenticate(
        ['username', 'payments'],
        (incompletePayment: any) => {
          console.log('[Pi] Incomplete payment found:', incompletePayment);
        }
      );

      // Send access token to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pi/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: auth.accessToken }),
      });

      if (!response.ok) {
        throw new Error('Pi authentication failed on server');
      }

      setPiUser(auth.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      return auth.user;
    } catch (err: any) {
      setError(err.message || 'Pi authentication failed');
      setIsLoading(false);
      return null;
    }
  }, []);

  // ─── Create U2A Payment ───────────────────────────────────

  const createPayment = useCallback(async (data: PiPaymentData): Promise<PiPaymentResult> => {
    if (!isAuthenticated || !piUser) {
      // Auto-authenticate
      const authResult = await authenticate();
      if (!authResult) {
        return { success: false, error: 'Pi authentication required' };
      }
    }

    if (typeof window === 'undefined' || !window.Pi) {
      return { success: false, error: 'Pi Browser not detected' };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create payment intent on server
      const intentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pi/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          piUserUid: piUser!.uid,
          amount: data.amount,
          memo: data.memo,
          metadata: data.metadata || {},
          productType: data.productType,
          productId: data.productId,
        }),
      });

      if (!intentResponse.ok) {
        const err = await intentResponse.json();
        throw new Error(err.message || 'Failed to create payment intent');
      }

      const { data: intentData } = await intentResponse.json();
      const internalPaymentId = intentData.internalPaymentId;

      // Step 2: Create payment on Pi Network
      const piPayment = await window.Pi.createPayment(
        {
          amount: data.amount,
          memo: data.memo,
          metadata: {
            ...data.metadata,
            internalPaymentId,
            gemzUserId: user?.id,
          },
        },
        {
          // onReadyForServerApproval: Step 2
          onReadyForServerApproval: async (paymentId: string) => {
            console.log('[Pi] Ready for approval:', paymentId);
            
            const approveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pi/payments/approve`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
              body: JSON.stringify({
                internalPaymentId,
                piPaymentId: paymentId,
              }),
            });

            if (!approveResponse.ok) {
              console.error('[Pi] Approval failed');
            }
          },

          // onReadyForServerCompletion: Step 3
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            console.log('[Pi] Ready for completion:', paymentId, txid);
            
            const completeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pi/payments/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
              body: JSON.stringify({
                internalPaymentId,
                piPaymentId: paymentId,
                txid,
              }),
            });

            if (!completeResponse.ok) {
              console.error('[Pi] Completion failed');
            }
          },

          // onCancel
          onCancel: (paymentId: string) => {
            console.log('[Pi] Payment cancelled:', paymentId);
            setIsLoading(false);
          },

          // onError
          onError: (error: Error) => {
            console.error('[Pi] Payment error:', error);
            setError(error.message);
            setIsLoading(false);
          },
        }
      );

      setIsLoading(false);
      
      return {
        success: true,
        paymentId: piPayment.paymentId,
        txid: piPayment.txid,
      };
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, [isAuthenticated, piUser, authenticate, user]);

  // ─── Get Payment History ──────────────────────────────────

  const getPaymentHistory = useCallback(async (page: number = 1, limit: number = 20) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/pi/payments/history?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch history');
      
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // ─── Get Stats ────────────────────────────────────────────

  const getStats = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/pi/stats`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const result = await response.json();
      if (result.data) {
        setPiBalance(result.data.totalU2AAmount || 0);
      }
      
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setPiUser(null);
    setPiBalance(0);
  }, []);

  return {
    // State
    isAuthenticated,
    piUser,
    isLoading,
    error,
    piBalance,
    
    // Methods
    authenticate,
    createPayment,
    getPaymentHistory,
    getStats,
    logout,
    
    // Check
    isPiBrowser: typeof window !== 'undefined' && !!window.Pi,
  };
}
