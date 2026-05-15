'use client';

import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────

export type ConfirmVariant = 'danger' | 'primary' | 'neutral';

interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Visual variant */
  variant?: ConfirmVariant;
  /** Loading state for confirm action */
  isLoading?: boolean;
  /** Disable confirm button */
  disabled?: boolean;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels or closes */
  onCancel: () => void;
}

// ─── Variant Styles ──────────────────────────────────────────

const VARIANT_STYLES: Record<
  ConfirmVariant,
  {
    confirmBtn: string;
    confirmIcon: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  danger: {
    confirmBtn:
      'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]',
    confirmIcon: 'delete_forever',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
  primary: {
    confirmBtn:
      'bg-[#ff7b00] hover:bg-[#e66d00] shadow-[0_0_20px_rgba(255,123,0,0.3)] hover:shadow-[0_0_30px_rgba(255,123,0,0.4)]',
    confirmIcon: 'check',
    iconBg: 'bg-[#ff7b00]/10',
    iconColor: 'text-[#ff7b00]',
  },
  neutral: {
    confirmBtn:
      'bg-white/10 hover:bg-white/20 border border-white/20',
    confirmIcon: 'check',
    iconBg: 'bg-white/5',
    iconColor: 'text-white/60',
  },
};

// ─── Backdrop Animation ──────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

// ─── Component ───────────────────────────────────────────────

export function ConfirmDialog({
  isOpen, title, description, confirmText, cancelText,
  variant = 'primary', isLoading = false, disabled = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onCancel(); },
    [onCancel]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
        >
          <motion.div
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-[#141414] border border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden"
          >
            {/* Content */}
            <div className="p-6 text-center space-y-4">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className={`w-14 h-14 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto`}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${styles.iconColor}`}
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
                >
                  {styles.confirmIcon}
                </span>
              </motion.div>

              {/* Title */}
              <h3 id="confirm-dialog-title" className="text-lg font-bold text-white">
                {title}
              </h3>

              {/* Description */}
              {description && (
                <p id="confirm-dialog-desc" className="text-sm text-white/50 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-5 pt-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                disabled={isLoading || disabled}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    Loading...
                  </>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
                    >
                      {styles.confirmIcon}
                    </span>
                    {confirmText || 'Confirm'}
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
                >
                  close
                </span>
                {cancelText || 'Cancel'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hook for easy usage ─────────────────────────────────────

import { useState } from 'react';

interface UseConfirmDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  ConfirmDialog: React.FC<Partial<ConfirmDialogProps>>;
}

export function useConfirmDialog(
  baseProps: Omit<ConfirmDialogProps, 'isOpen' | 'onConfirm' | 'onCancel'>
): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const DialogComponent = useCallback(
    (props: Partial<ConfirmDialogProps>) => (
      <ConfirmDialog
        {...baseProps}
        {...props}
        isOpen={isOpen}
        onConfirm={() => { props.onConfirm?.(); close(); }}
        onCancel={() => { props.onCancel?.(); close(); }}
      />
    ),
    [isOpen, close, baseProps]
  );

  return { isOpen, open, close, ConfirmDialog: DialogComponent };
}

export default ConfirmDialog;
