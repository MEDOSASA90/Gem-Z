'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  title?: string;
}

// ─── Icon Map (Material Symbols) ─────────────────────────────

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

// ─── Color Map ───────────────────────────────────────────────

const TOAST_STYLES: Record<
  ToastType,
  {
    bg: string;
    border: string;
    iconColor: string;
    glow: string;
  }
> = {
  success: {
    bg: 'bg-emerald-500/[0.08]',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.15)]',
  },
  error: {
    bg: 'bg-red-500/[0.08]',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  },
  warning: {
    bg: 'bg-amber-500/[0.08]',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.15)]',
  },
  info: {
    bg: 'bg-blue-500/[0.08]',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  },
};

// ─── Animation Variants ──────────────────────────────────────

const toastVariants = {
  initial: (isRTL: boolean) => ({
    opacity: 0,
    x: isRTL ? -100 : 100,
    scale: 0.9,
    y: -10,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: (isRTL: boolean) => ({
    opacity: 0,
    x: isRTL ? -50 : 50,
    scale: 0.95,
    transition: { duration: 0.2 },
  }),
};

// ─── Individual Toast Component ──────────────────────────────

interface ToastProps {
  toast: ToastItem;
  onDismiss: () => void;
  isRTL: boolean;
}

export function Toast({ toast, onDismiss, isRTL }: ToastProps) {
  const styles = TOAST_STYLES[toast.type];

  return (
    <motion.div
      layout
      custom={isRTL}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role="alert"
      className={`
        relative flex items-start gap-3 px-4 py-3.5 rounded-2xl
        backdrop-blur-xl border min-w-[300px] max-w-[420px]
        ${styles.bg} ${styles.border} ${styles.glow}
      `}
    >
      {/* Icon */}
      <span
        className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${styles.iconColor}`}
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
      >
        {TOAST_ICONS[toast.type]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-bold text-white mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm font-medium text-white/80 leading-snug">
          {toast.message}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="material-symbols-outlined text-base flex-shrink-0 text-white/40 hover:text-white/80 transition-colors mt-0.5"
        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
        aria-label="Dismiss toast"
      >
        close
      </button>

      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <ToastProgressBar
          duration={toast.duration}
          type={toast.type}
          isRTL={isRTL}
        />
      )}
    </motion.div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────

function ToastProgressBar({
  duration,
  type,
  isRTL,
}: {
  duration: number;
  type: ToastType;
  isRTL: boolean;
}) {
  const barColors: Record<ToastType, string> = {
    success: 'bg-emerald-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    info: 'bg-blue-400',
  };

  return (
    <motion.div
      initial={{ scaleX: 1 }}
      animate={{ scaleX: 0 }}
      transition={{ duration: duration / 1000, ease: 'linear' }}
      className={`
        absolute bottom-0 left-0 right-0 h-[2px] rounded-full origin-${isRTL ? 'right' : 'left'}
        ${barColors[type]}
      `}
      style={{ originX: isRTL ? 1 : 0 }}
    />
  );
}

// ─── Toast Container ─────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: ToastContainerProps) {
  const isTop = position.startsWith('top');
  const isRTL = position.includes('left');

  return (
    <AnimatePresence mode="popLayout">
      {toasts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`
            fixed z-[9999] flex flex-col gap-2.5 pointer-events-none
            ${isTop ? 'top-4' : 'bottom-24'}
            ${isRTL ? 'left-4' : 'right-4'}
          `}
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatePresence mode="popLayout">
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <Toast
                  toast={t}
                  onDismiss={() => onDismiss(t.id)}
                  isRTL={isRTL}
                />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Toast;
