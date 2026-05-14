'use client';

import React, {
    createContext, useContext, useState, useCallback, useEffect
} from 'react';

// ─── Types ───────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    toast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
    dismiss: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
    toasts: [],
    toast: () => {},
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
    dismiss: () => {},
});

export const useToast = () => useContext(ToastContext);

// ─── Toast Icon ──────────────────────────────────────────────

const TOAST_ICONS: Record<ToastType, string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
};

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.4)', text: '#22c55e' },
    error:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.4)',  text: '#ef4444' },
    info:    { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.4)', text: '#3b82f6' },
    warning: { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.4)',  text: '#eab308' },
};

// ─── Individual Toast Component ───────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const colors = TOAST_COLORS[toast.type];

    useEffect(() => {
        const timer = setTimeout(onDismiss, toast.duration ?? 4000);
        return () => clearTimeout(timer);
    }, [toast.duration, onDismiss]);

    return (
        <div
            role="alert"
            style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[280px] max-w-[380px] animate-in slide-in-from-right-5 fade-in duration-300"
        >
            <span
                className="material-symbols-outlined text-xl flex-shrink-0"
                style={{ color: colors.text, fontVariationSettings: "'FILL' 1" }}
            >
                {TOAST_ICONS[toast.type]}
            </span>
            <p className="text-sm font-semibold text-white flex-1 leading-snug">
                {toast.message}
            </p>
            <button
                onClick={onDismiss}
                className="material-symbols-outlined text-base flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-white"
            >
                close
            </button>
        </div>
    );
}

// ─── Provider ────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback(
        (message: string, type: ToastType = 'info', duration = 4000) => {
            const id = `toast_${Date.now()}_${Math.random()}`;
            setToasts(prev => [...prev, { id, type, message, duration }]);
        },
        []
    );

    const toast = {
        toast: addToast,
        success: useCallback((m: string) => addToast(m, 'success'), [addToast]),
        error:   useCallback((m: string) => addToast(m, 'error'),   [addToast]),
        info:    useCallback((m: string) => addToast(m, 'info'),     [addToast]),
        warning: useCallback((m: string) => addToast(m, 'warning'),  [addToast]),
        dismiss,
        toasts,
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}

            {/* Toast container — bottom right */}
            <div
                aria-live="polite"
                className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
            >
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem
                            toast={t}
                            onDismiss={() => dismiss(t.id)}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
