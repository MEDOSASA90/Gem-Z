'use client';

import React, { type ReactNode } from 'react';
import { QueryClientProvider } from '../components/QueryClientProvider';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { SocketProvider } from '../context/SocketContext';
import { ToastProvider } from '../components/ui/ToastProvider';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// ─── Types ───────────────────────────────────────────────────

interface ProvidersProps {
  children: ReactNode;
  /** Toast auto-dismiss duration in ms */
  toastDuration?: number;
  /** Toast position on screen */
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Max toasts visible at once */
  maxToasts?: number;
}

// ─── Combined Providers ──────────────────────────────────────

/**
 * GEM Z — Root Providers
 *
 * Wraps the app with all context providers in the correct order:
 * 1. QueryClientProvider (TanStack Query)
 * 2. ThemeProvider (dark/light mode)
 * 3. LanguageProvider (i18n)
 * 4. ToastProvider (notifications)
 * 5. SocketProvider (real-time)
 * 6. ErrorBoundary (error catching)
 *
 * Usage in layout.tsx:
 *   <Providers>
 *     <App />
 *   </Providers>
 */
export function Providers({
  children,
  toastDuration = 5000,
  toastPosition = 'top-right',
  maxToasts = 5,
}: ProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider
              defaultDuration={toastDuration}
              position={toastPosition}
              maxToasts={maxToasts}
            >
              <SocketProvider>{children}</SocketProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// ─── Re-exports for convenience ──────────────────────────────

export { QueryClientProvider } from '../components/QueryClientProvider';
export { ThemeProvider } from '../context/ThemeContext';
export { LanguageProvider } from '../context/LanguageContext';
export { SocketProvider } from '../context/SocketContext';
export { ToastProvider, useToast } from '../components/ui/ToastProvider';
export { ErrorBoundary, withErrorBoundary } from '../components/ui/ErrorBoundary';
