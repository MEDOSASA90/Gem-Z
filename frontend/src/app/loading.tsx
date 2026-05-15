'use client';

import React from 'react';
import { motion } from 'framer-motion';

// ─── Loading Page ────────────────────────────────────────────

/**
 * Next.js Loading UI
 * Shown automatically while a page segment is loading.
 * Uses skeleton components with shimmer animations.
 */
export default function LoadingPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[1440px] mx-auto space-y-8"
      >
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white/[0.06] rounded-xl animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-white/[0.06] rounded-full animate-pulse" />
            <div className="h-10 w-10 bg-white/[0.06] rounded-full animate-pulse" />
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 bg-white/[0.06] rounded-xl animate-pulse" />
                <div className="h-4 w-16 bg-white/[0.06] rounded-full animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-white/[0.06] rounded-full animate-pulse" />
              <div className="h-3 w-full bg-white/[0.06] rounded-full animate-pulse" />
            </motion.div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-5 w-40 bg-white/[0.06] rounded-full animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.25 }}
                className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl"
              >
                <div className="h-12 w-12 bg-white/[0.06] rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/[0.06] rounded-full animate-pulse" />
                  <div className="h-3 w-2/3 bg-white/[0.06] rounded-full animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-white/[0.06] rounded-lg animate-pulse flex-shrink-0" />
              </motion.div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="h-5 w-32 bg-white/[0.06] rounded-full animate-pulse" />
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-3/4 bg-white/[0.06] rounded-full animate-pulse" />
                  <div className="h-3 w-full bg-white/[0.06] rounded-full animate-pulse" />
                  <div className="h-3 w-2/3 bg-white/[0.06] rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Spinner Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-3 pt-8"
        >
          <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-sm text-white/30 ml-2 font-medium">Loading...</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
