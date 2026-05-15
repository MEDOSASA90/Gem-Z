/**
 * GEM Z — Pi Payment Button
 * 
 * A reusable button component for Pi Network payments.
 * Handles the full payment flow: authenticate → create → approve → complete
 */

'use client';

import React, { useState } from 'react';
import { usePi, PiPaymentData } from '../../hooks/usePi';
import { useToast } from '../../hooks/useToast';

// ─── Props ────────────────────────────────────────────────────

interface PiPaymentButtonProps {
  amount: number;
  memo: string;
  productType: 'subscription' | 'store' | 'trainer' | 'reward' | 'refund';
  productId?: string;
  metadata?: Record<string, any>;
  onSuccess?: (result: { paymentId: string; txid: string }) => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showBalance?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export function PiPaymentButton({
  amount,
  memo,
  productType,
  productId,
  metadata = {},
  onSuccess,
  onError,
  children,
  className = '',
  disabled = false,
  variant = 'primary',
  size = 'md',
  showBalance = false,
}: PiPaymentButtonProps) {
  const { isAuthenticated, authenticate, createPayment, isLoading, error, piBalance } = usePi();
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'processing' | 'completed' | 'failed'>('idle');

  // ─── Styles ─────────────────────────────────────────────────

  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-800 hover:bg-gray-900 text-white focus:ring-gray-500 shadow-md hover:shadow-lg',
    outline: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50 focus:ring-violet-500',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${isLoading ? 'opacity-75 cursor-wait' : ''} ${disabled || isLoading ? 'cursor-not-allowed opacity-60' : ''} ${className}`;

  // ─── Handle Payment ─────────────────────────────────────────

  const handlePayment = async () => {
    if (isLoading) return;

    setStatus('idle');

    // Step 1: Authenticate if needed
    if (!isAuthenticated) {
      setStatus('authenticating');
      const user = await authenticate();
      
      if (!user) {
        const msg = 'يرجى فتح التطبيق من متصفح Pi Browser لتفعيل الدفع';
        toast.error(msg);
        setStatus('failed');
        onError?.(msg);
        return;
      }
    }

    // Step 2: Create payment
    setStatus('processing');
    
    const result = await createPayment({
      amount,
      memo,
      productType,
      productId,
      metadata,
    });

    if (result.success) {
      setStatus('completed');
      toast.success(`تم الدفع بنجاح! ${amount} Pi`);
      onSuccess?.({
        paymentId: result.paymentId!,
        txid: result.txid!,
      });
    } else {
      setStatus('failed');
      toast.error(result.error || 'فشل الدفع');
      onError?.(result.error || 'Payment failed');
    }
  };

  // ─── Status Messages ────────────────────────────────────────

  const getButtonText = () => {
    if (children) return children;
    
    switch (status) {
      case 'authenticating':
        return 'جاري المصادقة...';
      case 'processing':
        return 'جاري المعالجة...';
      case 'completed':
        return 'تم الدفع ✅';
      case 'failed':
        return 'إعادة المحاولة';
      default:
        return `ادفع ${amount} Pi`;
    }
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Balance Display */}
      {showBalance && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          رصيد Pi: <span className="font-semibold text-violet-600">{piBalance.toFixed(4)} π</span>
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={disabled || isLoading}
        className={combinedStyles}
        type="button"
      >
        {/* Pi Logo */}
        <svg 
          className="w-5 h-5 ml-2" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="10" fillOpacity="0.1" />
          <text 
            x="12" 
            y="17" 
            textAnchor="middle" 
            fontSize="14" 
            fontWeight="bold"
            fill="currentColor"
          >
            π
          </text>
        </svg>

        {getButtonText()}

        {/* Loading Spinner */}
        {isLoading && (
          <svg className="animate-spin mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-1 text-center">
          {error}
        </p>
      )}

      {/* Status Indicator */}
      {status === 'completed' && (
        <p className="text-green-500 text-sm mt-1">
          ✅ تم الدفع بنجاح على Pi Network
        </p>
      )}
    </div>
  );
}

// ─── Pi Login Button ──────────────────────────────────────────

export function PiLoginButton({ 
  onSuccess,
  onError,
  className = '',
}: {
  onSuccess?: (user: { uid: string; username: string }) => void;
  onError?: (error: string) => void;
  className?: string;
}) {
  const { authenticate, isLoading, isAuthenticated, piUser } = usePi();
  const { toast } = useToast();

  const handleLogin = async () => {
    const user = await authenticate();
    
    if (user) {
      toast.success(`مرحباً ${user.username}!`);
      onSuccess?.(user);
    } else {
      const msg = 'يرجى فتح التطبيق من Pi Browser';
      toast.error(msg);
      onError?.(msg);
    }
  };

  if (isAuthenticated && piUser) {
    return (
      <div className={`flex items-center gap-2 text-violet-600 ${className}`}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold">π</text>
        </svg>
        <span className="font-medium">@{piUser.username}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all ${isLoading ? 'opacity-75' : ''} ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold">π</text>
      </svg>
      {isLoading ? 'جاري...' : 'تسجيل الدخول بـ Pi'}
    </button>
  );
}

// ─── Pi Balance Card ──────────────────────────────────────────

export function PiBalanceCard({ className = '' }: { className?: string }) {
  const { piBalance, getStats, isLoading } = usePi();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          رصيد Pi Network
        </h3>
        <svg className="w-8 h-8 text-violet-600" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fillOpacity="0.1" />
          <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor">π</text>
        </svg>
      </div>

      <div className="text-3xl font-bold text-violet-600 mb-2">
        {piBalance.toFixed(4)} <span className="text-lg">π</span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        يمكنك استخدام Pi لشراء الاشتراكات والمنتجات
      </p>

      <button
        onClick={() => getStats()}
        disabled={isLoading}
        className="mt-4 text-sm text-violet-600 hover:text-violet-700 font-medium"
      >
        {isLoading ? 'جاري التحديث...' : 'تحديث الرصيد'}
      </button>
    </div>
  );
}
