'use client';

import React from 'react';
import { motion } from 'framer-motion';

// ─── Shimmer Base ────────────────────────────────────────────

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white/[0.06] rounded-lg animate-pulse ${className}`}
    />
  );
}

// ─── Card Skeleton ───────────────────────────────────────────

interface CardSkeletonProps {
  count?: number;
  className?: string;
  hasImage?: boolean;
  lines?: number;
}

export function CardSkeleton({
  count = 1,
  className = '',
  hasImage = true,
  lines = 3,
}: CardSkeletonProps) {
  return (
    <div className={`grid gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3"
        >
          {hasImage && (
            <Shimmer className="w-full h-40 rounded-xl" />
          )}
          <div className="space-y-2.5">
            <Shimmer className="h-4 w-3/4 rounded-full" />
            {Array.from({ length: lines }).map((_, j) => (
              <Shimmer
                key={j}
                className="h-3 rounded-full"
                style={{ width: `${70 + Math.random() * 25}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Shimmer className="h-8 w-24 rounded-xl" />
            <Shimmer className="h-8 w-8 rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── List Skeleton ───────────────────────────────────────────

interface ListSkeletonProps {
  count?: number;
  className?: string;
  hasAvatar?: boolean;
  hasAction?: boolean;
}

export function ListSkeleton({
  count = 5,
  className = '',
  hasAvatar = true,
  hasAction = true,
}: ListSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
          className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl"
        >
          {hasAvatar && (
            <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2 min-w-0">
            <Shimmer className="h-3.5 w-1/2 rounded-full" />
            <Shimmer className="h-3 w-3/4 rounded-full" />
          </div>
          {hasAction && (
            <Shimmer className="h-8 w-16 rounded-lg flex-shrink-0" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Dashboard Skeleton ──────────────────────────────────────

interface DashboardSkeletonProps {
  className?: string;
  statCards?: number;
  chartHeight?: number;
}

export function DashboardSkeleton({
  className = '',
  statCards = 4,
  chartHeight = 200,
}: DashboardSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: statCards }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Shimmer className="h-8 w-8 rounded-lg" />
              <Shimmer className="h-4 w-12 rounded-full" />
            </div>
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-3 w-full rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* Chart Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-32 rounded-full" />
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
        <Shimmer className="w-full rounded-xl" style={{ height: chartHeight }} />
      </motion.div>

      {/* Recent Activity */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <Shimmer className="h-5 w-40 rounded-full" />
        <ListSkeleton count={4} hasAvatar hasAction />
      </div>
    </div>
  );
}

// ─── Table Skeleton ──────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  hasHeader?: boolean;
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
  className = '',
  hasHeader = true,
}: TableSkeletonProps) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      {hasHeader && (
        <div className="grid gap-4 p-4 border-b border-white/[0.06] bg-white/[0.02]"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Shimmer key={i} className="h-4 rounded-full" style={{ width: '60%' }} />
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <motion.div
            key={rowIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: rowIdx * 0.03, duration: 0.2 }}
            className="grid gap-4 p-4 items-center"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Shimmer
                key={colIdx}
                className="h-3.5 rounded-full"
                style={{ width: `${50 + Math.random() * 40}%` }}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile Skeleton ────────────────────────────────────────

interface ProfileSkeletonProps {
  className?: string;
}

export function ProfileSkeleton({ className = '' }: ProfileSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cover + Avatar Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <Shimmer className="w-full h-40 rounded-2xl" />
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <Shimmer className="w-20 h-20 rounded-full border-4 border-[#0a0a0a]" />
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="pt-10 space-y-4 text-center"
      >
        <Shimmer className="h-6 w-40 mx-auto rounded-full" />
        <Shimmer className="h-4 w-56 mx-auto rounded-full" />
        <Shimmer className="h-3 w-32 mx-auto rounded-full" />
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="grid grid-cols-3 gap-4"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-center">
            <Shimmer className="h-5 w-12 mx-auto rounded-full" />
            <Shimmer className="h-3 w-16 mx-auto rounded-full" />
          </div>
        ))}
      </motion.div>

      {/* Details Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
      >
        <Shimmer className="h-5 w-32 rounded-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-20 rounded-full" />
              <Shimmer className="h-3 w-full rounded-full" />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Generic Skeleton ────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  circle?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  circle = false,
}: SkeletonProps) {
  return (
    <div
      className={`bg-white/[0.06] animate-pulse ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{ width, height }}
    />
  );
}

// ─── Page Skeleton (full page loader) ────────────────────────

export function PageSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-48 rounded-xl" />
        <Shimmer className="h-10 w-10 rounded-full" />
      </div>
      <DashboardSkeleton />
    </div>
  );
}

// ─── Compact Skeleton (for inline loading) ───────────────────

export function CompactSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className="h-3 rounded-full"
          style={{ width: `${60 + Math.random() * 35}%` }}
        />
      ))}
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────

export { Shimmer };
export default {
  Card: CardSkeleton,
  List: ListSkeleton,
  Dashboard: DashboardSkeleton,
  Table: TableSkeleton,
  Profile: ProfileSkeleton,
  Page: PageSkeleton,
  Compact: CompactSkeleton,
  Skeleton,
};
