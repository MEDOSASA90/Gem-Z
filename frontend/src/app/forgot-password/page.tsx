'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';

const T = {
    en: {
        title: 'Forgot Password',
        subtitle: "Enter your email and we'll send you a reset link.",
        emailLabel: 'Email Address',
        submitBtn: 'Send Reset Link',
        backToLogin: 'Back to Login',
        successTitle: 'Check Your Inbox',
        successSubtitle:
            'If this email is registered, you will receive a password reset link shortly.',
        errorGeneric: 'Something went wrong. Please try again.',
        emailRequired: 'Please enter your email address.',
    },
    ar: {
        title: 'نسيت كلمة المرور',
        subtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',
        emailLabel: 'البريد الإلكتروني',
        submitBtn: 'إرسال رابط الاستعادة',
        backToLogin: 'العودة لتسجيل الدخول',
        successTitle: 'تحقق من بريدك',
        successSubtitle:
            'إذا كان هذا البريد مسجلاً، ستتلقى رابط إعادة التعيين قريباً.',
        errorGeneric: 'حدث خطأ ما. يرجى المحاولة مجدداً.',
        emailRequired: 'يرجى إدخال البريد الإلكتروني.',
    },
};

export default function ForgotPasswordPage() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { setError(t.emailRequired); return; }

        setLoading(true);
        setError('');

        try {
            await GemZApi.Auth.forgotPassword(email.trim().toLowerCase());
            setSent(true);
        } catch {
            // Always show the same message to prevent email enumeration
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            dir={isArabic ? 'rtl' : 'ltr'}
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0a]"
        >
            {/* Background glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[200px] pointer-events-none opacity-20 bg-[#ff7b00]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[180px] pointer-events-none opacity-10 bg-[#ffb300]" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link href="/">
                        <span className="text-4xl font-black italic text-[#ff7b00] tracking-tighter drop-shadow-[0_0_15px_rgba(255,123,0,0.3)]">
                            Gem Z
                        </span>
                    </Link>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">

                    {sent ? (
                        /* ── Success State ── */
                        <div className="text-center space-y-5 py-4">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                                <span
                                    className="material-symbols-outlined text-4xl text-green-400"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    mark_email_read
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold text-white">{t.successTitle}</h1>
                            <p className="text-white/50 text-sm leading-relaxed">
                                {t.successSubtitle}
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-[#ff7b00] font-bold text-sm mt-4 hover:underline"
                            >
                                <ArrowLeft size={16} />
                                {t.backToLogin}
                            </Link>
                        </div>
                    ) : (
                        /* ── Form ── */
                        <>
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    {t.title}
                                </h1>
                                <p className="text-white/50 text-sm">{t.subtitle}</p>
                            </div>

                            {error && (
                                <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                        {t.emailLabel}
                                    </label>
                                    <div className="relative">
                                        <Mail
                                            size={16}
                                            className="absolute top-1/2 -translate-y-1/2 start-4 text-white/30"
                                        />
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 ps-10 text-sm text-white placeholder-white/20 outline-none focus:border-[#ff7b00] transition-colors"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-[0_0_25px_rgba(255,123,0,0.3)] bg-[#ff7b00]"
                                >
                                    {loading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Zap size={18} />
                                    )}
                                    {t.submitBtn}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-white/40 hover:text-[#ff7b00] text-sm font-semibold transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    {t.backToLogin}
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
