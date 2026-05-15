'use client';

import React, { Component, type ReactNode } from 'react';
import { motion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Fallback UI Component ───────────────────────────────────

function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
        >
          <span
            className="material-symbols-outlined text-4xl text-red-400"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error_outline
          </span>
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Something went wrong
          </h2>
          <p className="text-sm text-white/50">
            We apologize for the inconvenience. Please try again.
          </p>
        </div>

        {/* Error Message (dev mode) */}
        {isDev && error && (
          <div className="w-full bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-left overflow-hidden">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="text-[10px] font-mono text-red-400/60 mt-2 overflow-x-auto max-h-32 overflow-y-auto">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff7b00] text-black font-bold text-sm shadow-[0_0_20px_rgba(255,123,0,0.3)] hover:shadow-[0_0_30px_rgba(255,123,0,0.4)] transition-shadow"
          >
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
            >
              refresh
            </span>
            Try Again
          </motion.button>

          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-white font-bold text-sm border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
            >
              home
            </span>
            Home
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Error Boundary Class Component ──────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // TODO: Sentry.captureException(error, { extra: errorInfo });
      console.error('[ErrorBoundary] Error captured:', error.message);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// ─── Hook-compatible wrapper for functional components ───────

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
