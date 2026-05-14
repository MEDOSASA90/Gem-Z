'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';

const T = {
    en: {
        title: 'Reset Password',
        subtitle: 'Create a new secure password for your account.',
        newPass: 'New Password',
        confirmPass: 'Confirm New Password',
        submitBtn: 'Update Password',
        successTitle: 'Password Updated!',
        successMsg: 'Your password has been reset successfully.',
        loginBtn: 'Sign In with New Password',
        noToken: 'Invalid or expired reset link. Please request a new one.',
        mismatch: 'Passwords do not match.',
        tooShort: 'Password must be at least 8 characters.',
        errorGeneric: 'Reset failed. The link may have expired.',
        requestNew: 'Request New Link',
    },
    ar: {
        title: 'إعادة تعيين كلمة المرور',
        subtitle: 'أنشئ كلمة مرور جديدة وقوية لحسابك.',
        newPass: 'كلمة المرور الجديدة',
        confirmPass: 'تأكيد كلمة المرور',
        submitBtn: 'تحديث كلمة المرور',
        successTitle: 'تم التحديث!',
        successMsg: 'تم إعادة تعيين كلمة المرور بنجاح.',
        loginBtn: 'تسجيل الدخول بكلمة المرور الجديدة',
        noToken: 'رابط إعادة التعيين غير صالح أو منتهي. يرجى طلب رابط جديد.',
        mismatch: 'كلمات المرور غير متطابقة.',
        tooShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
        errorGeneric: 'فشل إعادة التعيين. قد يكون الرابط منتهياً.',
        requestNew: 'طلب رابط جديد',
    },
};

// Password strength indicator
function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: '8+ chars', ok: password.length >= 8 },
        { label: 'Uppercase', ok: /[A-Z]/.test(password) },
        { label: 'Number', ok: /\d/.test(password) },
        { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = checks.filter(c => c.ok).length;
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1">
                {checks.map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i < score ? colors[score] : 'rgba(255,255,255,0.1)' }}
                    />
                ))}
            </div>
            <div className="flex gap-2 flex-wrap">
                {checks.map(c => (
                    <span
                        key={c.label}
                        className="text-[10px] font-bold"
                        style={{ color: c.ok ? '#22c55e' : 'rgba(255,255,255,0.3)' }}
                    >
                        {c.ok ? '✓' : '·'} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ResetPasswordContent() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Redirect to login after success
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => router.push('/login'), 3000);
            return () => clearTimeout(timer);
        }
    }, [success, router]);

    if (!token) {
        return (
            <div className="text-center space-y-5 py-4">
                <span
                    className="material-symbols-outlined text-5xl text-red-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    link_off
                </span>
                <p className="text-white/60 text-sm">{t.noToken}</p>
                <Link
                    href="/forgot-password"
                    className="inline-block mt-3 px-6 py-3 rounded-xl bg-[#ff7b00] text-black font-bold text-sm"
                >
                    {t.requestNew}
                </Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) { setError(t.tooShort); return; }
        if (newPassword !== confirmPassword) { setError(t.mismatch); return; }

        setLoading(true);
        setError('');

        try {
            await GemZApi.Auth.resetPassword(token, newPassword);
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || t.errorGeneric);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center space-y-5 py-4">
                <CheckCircle2 size={56} className="text-green-400 mx-auto" />
                <h2 className="text-2xl font-bold text-white">{t.successTitle}</h2>
                <p className="text-white/50 text-sm">{t.successMsg}</p>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff7b00] text-black font-bold text-sm hover:opacity-90 transition"
                >
                    {t.loginBtn}
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">{t.title}</h1>
                <p className="text-white/50 text-sm">{t.subtitle}</p>
            </div>

            {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                        {t.newPass}
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/30" />
                        <input
                            id="new-password"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 ps-10 pe-11 text-sm text-white placeholder-white/20 outline-none focus:border-[#ff7b00] transition-colors"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(v => !v)}
                            className="absolute top-1/2 -translate-y-1/2 end-4 text-white/30 hover:text-white/60"
                        >
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <PasswordStrength password={newPassword} />
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                        {t.confirmPass}
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/30" />
                        <input
                            id="confirm-password"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 ps-10 pe-11 text-sm text-white placeholder-white/20 outline-none transition-colors ${
                                confirmPassword && confirmPassword !== newPassword
                                    ? 'border-red-500/50 focus:border-red-500'
                                    : 'border-white/10 focus:border-[#ff7b00]'
                            }`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute top-1/2 -translate-y-1/2 end-4 text-white/30 hover:text-white/60"
                        >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-red-400 text-xs mt-1 font-semibold">{t.mismatch}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword}
                    className="w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-[0_0_25px_rgba(255,123,0,0.3)] bg-[#ff7b00]"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                    {t.submitBtn}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    const { isArabic } = useLanguage();

    return (
        <div
            dir={isArabic ? 'rtl' : 'ltr'}
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0a]"
        >
            <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[200px] pointer-events-none opacity-20 bg-[#ff7b00]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[180px] pointer-events-none opacity-10 bg-[#ffb300]" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <Link href="/">
                        <span className="text-4xl font-black italic text-[#ff7b00] tracking-tighter drop-shadow-[0_0_15px_rgba(255,123,0,0.3)]">
                            Gem Z
                        </span>
                    </Link>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                    <Suspense fallback={<div className="text-white/50 text-center py-8">Loading...</div>}>
                        <ResetPasswordContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
