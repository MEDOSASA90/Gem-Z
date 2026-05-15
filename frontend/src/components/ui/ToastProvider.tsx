'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import { ToastContainer } from './Toast';
import type { ToastType, ToastItem } from './Toast';

// ─── Types ───────────────────────────────────────────────────

interface ToastContextValue {
  /** Show a generic toast */
  toast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  /** Show a success toast */
  success: (message: string, options?: ToastOptions) => void;
  /** Show an error toast */
  error: (message: string, options?: ToastOptions) => void;
  /** Show an info toast */
  info: (message: string, options?: ToastOptions) => void;
  /** Show a warning toast */
  warning: (message: string, options?: ToastOptions) => void;
  /** Dismiss a toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Current toasts */
  toasts: ToastItem[];
}

interface ToastOptions {
  duration?: number;
  title?: string;
  id?: string;
}

interface ToastProviderProps {
  children: React.ReactNode;
  /** Default auto-dismiss duration in ms */
  defaultDuration?: number;
  /** Toast container position */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
}

// ─── Context ─────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  dismiss: () => {},
  dismissAll: () => {},
  toasts: [],
});

/** Hook to access the toast system from any component */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ─── Provider ────────────────────────────────────────────────

export function ToastProvider({
  children,
  defaultDuration = 5000,
  position = 'top-right',
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clearToastTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearToastTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearToastTimer]
  );

  const dismissAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = options?.id || `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const duration = options?.duration ?? defaultDuration;

      // Dismiss existing toast with same ID (prevents duplicates)
      clearToastTimer(id);
      setToasts((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        const toastItem: ToastItem = {
          id,
          type,
          message,
          duration,
          title: options?.title,
        };
        // Enforce max toasts
        const next = [...filtered, toastItem];
        if (next.length > maxToasts) {
          const toRemove = next.slice(0, next.length - maxToasts);
          toRemove.forEach((t) => clearToastTimer(t.id));
          return next.slice(-maxToasts);
        }
        return next;
      });

      // Auto-dismiss timer
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [defaultDuration, maxToasts, dismiss, clearToastTimer]
  );

  const ctx: ToastContextValue = {
    toast: addToast,
    success: useCallback(
      (msg: string, opts?: ToastOptions) => addToast(msg, 'success', opts),
      [addToast]
    ),
    error: useCallback(
      (msg: string, opts?: ToastOptions) => addToast(msg, 'error', opts),
      [addToast]
    ),
    info: useCallback(
      (msg: string, opts?: ToastOptions) => addToast(msg, 'info', opts),
      [addToast]
    ),
    warning: useCallback(
      (msg: string, opts?: ToastOptions) => addToast(msg, 'warning', opts),
      [addToast]
    ),
    dismiss,
    dismissAll,
    toasts,
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
