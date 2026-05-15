'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Page] Caught error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-lg text-center"
      >
        {/* Error Code */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full bg-red-500/5 border border-red-500/10 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-6xl text-red-400/80"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
            >
              report
            </span>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#ff7b00]/10 border border-[#ff7b00]/20 flex items-center justify-center"
          >
            <span className="text-sm font-black text-[#ff7b00]">!</span>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h1 className="text-2xl font-black text-white">Something went wrong</h1>
          <p className="text-sm text-white/50 max-w-sm">
            We encountered an unexpected error. Our team has been notified.
          </p>
        </motion.div>

        {/* Error Details (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-left"
          >
            <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">
              Development Mode
            </p>
            <p className="text-xs font-mono text-red-400/80 break-all">{error.message}</p>
            {error.stack && (
              <pre className="text-[10px] font-mono text-red-400/50 mt-2 overflow-x-auto max-h-40 overflow-y-auto">
                {error.stack}
              </pre>
            )}
            {error.digest && (
              <p className="text-[10px] font-mono text-white/30 mt-2">
                Digest: {error.digest}
              </p>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 pt-2"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff7b00] text-black font-bold text-sm shadow-[0_0_20px_rgba(255,123,0,0.3)] hover:shadow-[0_0_30px_rgba(255,123,0,0.4)] transition-shadow"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
              refresh
            </span>
            Try Again
          </motion.button>

          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white font-bold text-sm border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
              home
            </span>
            Back to Home
          </motion.a>
        </motion.div>

        {/* Support Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-white/30 pt-4"
        >
          Need help?{' '}
          <a href="/support" className="text-[#ff7b00] hover:underline">Contact Support</a>
        </motion.p>
      </motion.div>
    </div>
  );
}
