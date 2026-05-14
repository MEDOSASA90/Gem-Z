'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Zap, Loader2, AlertCircle } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';

// ─── Validation ───────────────────────────────────────────────

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Input Component ──────────────────────────────────────────

function Field({
    label, id, error, children,
}: { label: string; id: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-xs font-bold text-white/50 uppercase tracking-widest">
                {label}
            </label>
            {children}
            {error && (
                <p className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
        </div>
    );
}

const ROLES = [
    { key: 'trainee',     icon: '🏋️', label: 'Trainee',   labelAr: 'متدرب' },
    { key: 'trainer',     icon: '🎯', label: 'Trainer',   labelAr: 'مدرب' },
    { key: 'gym_admin',   icon: '🏢', label: 'Gym',       labelAr: 'صالة' },
    { key: 'store_admin', icon: '🛍️', label: 'Store',     labelAr: 'متجر' },
];

export default function LoginPage() {
    const { isArabic } = useLanguage();
    const router = useRouter();

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [roleIdx, setRoleIdx]   = useState(0);
    const [loading, setLoading]   = useState(false);
    const [errors, setErrors]     = useState<{ email?: string; password?: string; form?: string }>({});

    // ── Validation ──
    const validate = () => {
        const e: typeof errors = {};
        if (!email.trim())             e.email    = isArabic ? 'البريد مطلوب' : 'Email is required';
        else if (!validateEmail(email)) e.email   = isArabic ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
        if (!password)                  e.password = isArabic ? 'كلمة المرور مطلوبة' : 'Password is required';
        else if (password.length < 6)   e.password = isArabic ? 'كلمة المرور قصيرة جداً' : 'Password too short';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ──
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setErrors({});
        try {
            const res: any = await GemZApi.Auth.login({ email: email.trim().toLowerCase(), password });
            const token = res?.data?.accessToken ?? res?.accessToken;
            const user  = res?.data?.user        ?? res?.user;
            if (!token || !user) throw new Error('Invalid response from server');
            localStorage.setItem('gemz_access_token', token);
            localStorage.setItem('gemz_user', JSON.stringify(user));
            const dest = user.role === 'trainee' ? '/trainee'
                        : user.role === 'trainer' ? '/trainer'
                        : user.role === 'gym_admin' ? '/gym'
                        : '/store/dashboard';
            router.push(dest);
        } catch (err: any) {
            setErrors({ form: err.message || (isArabic ? 'خطأ في تسجيل الدخول' : 'Login failed. Check your credentials.') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff7b00]/15 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#ffb300]/8 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <span className="text-5xl font-black italic text-[#ff7b00] tracking-tighter drop-shadow-[0_0_20px_rgba(255,123,0,0.4)]">
                            Gem Z
                        </span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mt-3">
                        {isArabic ? 'مرحباً بعودتك' : 'Welcome Back'}
                    </h1>
                    <p className="text-white/40 text-sm mt-1">
                        {isArabic ? 'سجّل الدخول إلى حسابك' : 'Sign in to your account'}
                    </p>
                </div>

                {/* Role Selector */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                    {ROLES.map((r, i) => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => setRoleIdx(i)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-bold transition-all ${
                                roleIdx === i
                                    ? 'bg-[#ff7b00]/15 border border-[#ff7b00]/50 text-[#ff7b00]'
                                    : 'bg-white/[0.04] border border-white/8 text-white/40 hover:border-white/20'
                            }`}
                        >
                            <span className="text-xl">{r.icon}</span>
                            <span>{isArabic ? r.labelAr : r.label}</span>
                        </button>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                    {/* Form error */}
                    {errors.form && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm font-semibold">{errors.form}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        <Field label={isArabic ? 'البريد الإلكتروني' : 'Email Address'} id="login-email" error={errors.email}>
                            <div className="relative">
                                <Mail size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 text-sm text-white placeholder-white/20 outline-none transition-colors ${
                                        errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#ff7b00]'
                                    }`}
                                />
                            </div>
                        </Field>

                        <Field label={isArabic ? 'كلمة المرور' : 'Password'} id="login-password" error={errors.password}>
                            <div className="relative">
                                <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                <input
                                    id="login-password"
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 pe-11 text-sm text-white placeholder-white/20 outline-none transition-colors ${
                                        errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#ff7b00]'
                                    }`}
                                />
                                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute top-1/2 -translate-y-1/2 end-4 text-white/30 hover:text-white/60 transition-colors">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>

                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-xs text-[#ff7b00] font-bold hover:underline">
                                {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            id="login-submit"
                            className="w-full py-4 rounded-xl font-black text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 bg-[#ff7b00] shadow-[0_0_30px_rgba(255,123,0,0.35)]"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/8" />
                            <span className="text-white/25 text-xs font-bold">{isArabic ? 'أو' : 'OR'}</span>
                            <div className="flex-1 h-px bg-white/8" />
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            {isArabic ? 'المتابعة بـ Google' : 'Continue with Google'}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-6 text-sm text-white/40">
                    {isArabic ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                    <Link href="/register" className="text-[#ff7b00] font-bold hover:underline">
                        {isArabic ? 'إنشاء حساب' : 'Create Account'}
                    </Link>
                </p>
            </div>
        </div>
    );
}
