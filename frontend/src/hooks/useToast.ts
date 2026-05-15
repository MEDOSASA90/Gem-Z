'use client';

import { useToast as useToastOriginal } from '../components/ui/ToastProvider';
import type { ToastContextValue, ToastOptions } from '../components/ui/ToastProvider';

// ─── Re-export types ─────────────────────────────────────────

export type { ToastContextValue, ToastOptions } from '../components/ui/ToastProvider';

// ─── Hook ────────────────────────────────────────────────────

/**
 * GEM Z — useToast Hook
 *
 * Simple re-export of the toast context hook with convenience methods:
 *   toast(message, type?)        — generic toast
 *   success(message)             — green success toast
 *   error(message)               — red error toast
 *   warning(message)             — amber warning toast
 *   info(message)                — blue info toast
 *   dismiss(id)                  — dismiss a toast by ID
 *   dismissAll()                 — dismiss all toasts
 *   toasts                       — current toast list
 *
 * @example
 *   const { success, error } = useToast();
 *   success('Profile updated!');
 *   error('Something went wrong');
 */
export function useToast(): ToastContextValue {
  return useToastOriginal();
}

export default useToast;
