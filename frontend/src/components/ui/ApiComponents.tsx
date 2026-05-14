'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

// ─── ApiButton ───────────────────────────────────────────────

interface ApiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    variant?: 'primary' | 'ghost' | 'danger';
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

/**
 * Button that shows a spinner when `loading` is true.
 * Automatically disabled during loading.
 */
export function ApiButton({
    children,
    loading = false,
    variant = 'primary',
    icon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}: ApiButtonProps) {
    const base =
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all duration-200 px-5 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7b00]';

    const variants: Record<string, string> = {
        primary:
            'bg-[#ff7b00] text-black shadow-[0_0_20px_rgba(255,123,0,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        ghost:
            'bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50',
        danger:
            'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50',
    };

    return (
        <button
            {...props}
            disabled={loading || disabled}
            className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        >
            {loading ? (
                <Loader2 size={16} className="animate-spin" />
            ) : icon ? (
                <span className="flex-shrink-0">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}

// ─── ApiCard ─────────────────────────────────────────────────

interface ApiCardProps {
    loading?: boolean;
    error?: string | null;
    children: React.ReactNode;
    className?: string;
    skeletonLines?: number;
}

/**
 * Card wrapper with skeleton loading and inline error display.
 */
export function ApiCard({
    loading = false,
    error = null,
    children,
    className = '',
    skeletonLines = 3,
}: ApiCardProps) {
    const base =
        'bg-white/[0.04] border border-white/10 rounded-2xl p-5 backdrop-blur-sm';

    if (loading) {
        return (
            <div className={`${base} ${className} space-y-3 animate-pulse`}>
                <div className="h-3 bg-white/10 rounded-full w-1/3" />
                {Array.from({ length: skeletonLines }).map((_, i) => (
                    <div
                        key={i}
                        className="h-3 bg-white/8 rounded-full"
                        style={{ width: `${70 + Math.random() * 25}%` }}
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${base} ${className} flex flex-col items-center gap-3 py-8`}>
                <span
                    className="material-symbols-outlined text-4xl text-red-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    error_outline
                </span>
                <p className="text-red-400 text-sm font-semibold text-center">{error}</p>
            </div>
        );
    }

    return <div className={`${base} ${className}`}>{children}</div>;
}

// ─── SkeletonText ─────────────────────────────────────────────

export function SkeletonText({ width = '100%', className = '' }: { width?: string | number; className?: string }) {
    return (
        <div
            className={`h-3 bg-white/10 rounded-full animate-pulse ${className}`}
            style={{ width }}
        />
    );
}

// ─── SkeletonAvatar ───────────────────────────────────────────

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
    return (
        <div
            className="rounded-full bg-white/10 animate-pulse flex-shrink-0"
            style={{ width: size, height: size }}
        />
    );
}

// ─── ErrorState ───────────────────────────────────────────────

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    message = 'Something went wrong.',
    onRetry,
    className = '',
}: ErrorStateProps) {
    return (
        <div className={`flex flex-col items-center gap-4 py-12 px-6 text-center ${className}`}>
            <span
                className="material-symbols-outlined text-5xl text-red-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
            >
                cloud_off
            </span>
            <p className="text-white/60 text-sm max-w-xs">{message}</p>
            {onRetry && (
                <ApiButton variant="ghost" onClick={onRetry} className="mt-2">
                    Try Again
                </ApiButton>
            )}
        </div>
    );
}

// ─── EmptyState ───────────────────────────────────────────────

interface EmptyStateProps {
    icon?: string;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon = 'inbox', title, subtitle, action, className = '' }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center gap-3 py-12 px-6 text-center ${className}`}>
            <span
                className="material-symbols-outlined text-5xl text-white/20"
                style={{ fontVariationSettings: "'FILL' 1" }}
            >
                {icon}
            </span>
            <p className="text-white/50 font-bold">{title}</p>
            {subtitle && <p className="text-white/30 text-sm">{subtitle}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

// ─── SpinnerOverlay ───────────────────────────────────────────

export function SpinnerOverlay({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
            <Loader2 className="w-10 h-10 animate-spin text-[#ff7b00]" />
            <p className="text-white/50 text-sm font-bold uppercase tracking-widest">{text}</p>
        </div>
    );
}
