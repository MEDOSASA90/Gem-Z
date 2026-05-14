'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';

// ─── Validation helpers ───────────────────────────────────────

function validateEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function validatePhone(v: string) { return /^\+?[0-9\s\-]{8,15}$/.test(v.trim()); }

// ─── Password Strength bar ────────────────────────────────────

function PasswordStrength({ pw }: { pw: string }) {
    if (!pw) return null;
    const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
    const score = checks.filter(Boolean).length;
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return (
        <div className="space-y-1.5 mt-2">
            <div className="flex gap-1">
                {checks.map((_, i) => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
                        style={{ background: i < score ? colors[score] : 'rgba(255,255,255,0.1)' }} />
                ))}
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold" style={{ color: score > 0 ? colors[score] : 'transparent' }}>
                    {labels[score]}
                </span>
                <div className="flex gap-3">
                    {[{l:'8+ chars', ok: checks[0]}, {l:'Upper', ok: checks[1]}, {l:'Number', ok: checks[2]}, {l:'Symbol', ok: checks[3]}].map(c => (
                        <span key={c.l} className="text-[9px] font-bold" style={{ color: c.ok ? '#22c55e' : 'rgba(255,255,255,0.25)' }}>
                            {c.ok ? '✓' : '·'} {c.l}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Form Field ───────────────────────────────────────────────

function Field({ label, id, error, required, children }: {
    label: string; id: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-bold text-white/50 uppercase tracking-widest block">
                {label}{required && <span className="text-[#ff7b00] ms-1">*</span>}
            </label>
            {children}
            {error && (
                <p className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                    <AlertCircle size={11} /> {error}
                </p>
            )}
        </div>
    );
}

// ─── Role config ──────────────────────────────────────────────

const ROLES = [
    { key: 'trainee',     icon: '🏋️', label: 'Trainee',   labelAr: 'متدرب',   desc: 'Train & track progress' },
    { key: 'trainer',     icon: '🎯', label: 'Trainer',   labelAr: 'مدرب',     desc: 'Coach clients' },
    { key: 'gym_admin',   icon: '🏢', label: 'Gym',       labelAr: 'صالة',     desc: 'Manage your gym' },
    { key: 'store_admin', icon: '🛍️', label: 'Store',     labelAr: 'متجر',     desc: 'Sell products' },
];

// ─── Step indicators ──────────────────────────────────────────

function Steps({ step, total }: { step: number; total: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <React.Fragment key={i}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                        i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#ff7b00] text-black' : 'bg-white/8 text-white/30'
                    }`}>
                        {i < step ? <CheckCircle2 size={16} /> : i + 1}
                    </div>
                    {i < total - 1 && (
                        <div className="flex-1 h-px" style={{ background: i < step ? '#22c55e' : 'rgba(255,255,255,0.08)' }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function RegisterPage() {
    const { isArabic } = useLanguage();
    const router = useRouter();

    const [step, setStep]     = useState(0); // 0=role, 1=credentials, 2=profile
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [form, setForm] = useState({
        role: 'trainee',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        referralCode: '',
        agreeTerms: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
    const ic  = (k: string) => errors[k] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#ff7b00]';

    // ── Validation per step ──
    const validateStep = (s: number) => {
        const e: Record<string, string> = {};
        if (s === 1) {
            if (!form.fullName.trim())                  e.fullName = isArabic ? 'الاسم مطلوب' : 'Full name required';
            if (!form.email.trim())                     e.email    = isArabic ? 'البريد مطلوب' : 'Email required';
            else if (!validateEmail(form.email))        e.email    = isArabic ? 'بريد غير صالح' : 'Invalid email';
            if (form.phone && !validatePhone(form.phone)) e.phone  = isArabic ? 'رقم غير صالح' : 'Invalid phone number';
            if (!form.password)                          e.password = isArabic ? 'كلمة المرور مطلوبة' : 'Password required';
            else if (form.password.length < 8)           e.password = isArabic ? '8 أحرف على الأقل' : 'Minimum 8 characters';
            if (form.password !== form.confirmPassword)  e.confirmPassword = isArabic ? 'كلمتان غير متطابقتان' : 'Passwords do not match';
            if (!form.agreeTerms)                        e.agreeTerms = isArabic ? 'يجب الموافقة على الشروط' : 'You must agree to the terms';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) setStep(prev => prev + 1);
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(step)) return;
        setLoading(true);
        setErrors({});
        try {
            await GemZApi.Auth.register({
                full_name: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                phone: form.phone || undefined,
                role: form.role,
                referral_code: form.referralCode || undefined,
            });
            router.push('/verify-email');
        } catch (err: any) {
            setErrors({ form: err.message || (isArabic ? 'فشل التسجيل. حاول مرة أخرى.' : 'Registration failed. Please try again.') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff7b00]/12 rounded-full blur-[130px]" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#ffb300]/6 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-lg relative z-10 py-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <span className="text-4xl font-black italic text-[#ff7b00] tracking-tighter drop-shadow-[0_0_20px_rgba(255,123,0,0.35)]">
                            Gem Z
                        </span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mt-3">
                        {isArabic ? 'إنشاء حساب جديد' : 'Create Account'}
                    </h1>
                </div>

                {/* Steps */}
                <Steps step={step} total={3} />

                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                    {errors.form && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm font-semibold">{errors.form}</p>
                        </div>
                    )}

                    {/* ── STEP 0: Role Selection ── */}
                    {step === 0 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">{isArabic ? 'كيف ستستخدم Gem Z؟' : 'How will you use Gem Z?'}</h2>
                                <p className="text-white/40 text-sm">{isArabic ? 'اختر نوع حسابك' : 'Choose your account type'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {ROLES.map(r => (
                                    <button
                                        key={r.key}
                                        type="button"
                                        id={`role-${r.key}`}
                                        onClick={() => set('role', r.key)}
                                        className={`p-5 rounded-2xl text-start transition-all border ${
                                            form.role === r.key
                                                ? 'bg-[#ff7b00]/15 border-[#ff7b00]/50'
                                                : 'bg-white/[0.03] border-white/8 hover:border-white/20'
                                        }`}
                                    >
                                        <span className="text-3xl block mb-2">{r.icon}</span>
                                        <span className="font-black text-white block">{isArabic ? r.labelAr : r.label}</span>
                                        <span className="text-xs text-white/40">{r.desc}</span>
                                        {form.role === r.key && (
                                            <div className="mt-2 flex justify-end">
                                                <CheckCircle2 size={16} className="text-[#ff7b00]" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={nextStep}
                                className="w-full py-4 rounded-xl bg-[#ff7b00] text-black font-black hover:opacity-90 transition-all">
                                {isArabic ? 'التالي →' : 'Continue →'}
                            </button>
                        </div>
                    )}

                    {/* ── STEP 1: Credentials ── */}
                    {step === 1 && (
                        <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-5" noValidate>
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">{isArabic ? 'بياناتك الأساسية' : 'Your Credentials'}</h2>
                                <p className="text-white/40 text-sm">{isArabic ? 'بيانات تسجيل الدخول' : 'Account login details'}</p>
                            </div>

                            <Field label={isArabic ? 'الاسم الكامل' : 'Full Name'} id="reg-name" error={errors.fullName} required>
                                <div className="relative">
                                    <User size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                    <input id="reg-name" type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                                        placeholder={isArabic ? 'أحمد محمد' : 'John Smith'} autoComplete="name"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 text-sm text-white placeholder-white/20 outline-none transition-colors ${ic('fullName')}`} />
                                </div>
                            </Field>

                            <Field label={isArabic ? 'البريد الإلكتروني' : 'Email Address'} id="reg-email" error={errors.email} required>
                                <div className="relative">
                                    <Mail size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                    <input id="reg-email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                        placeholder="you@example.com" autoComplete="email"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 text-sm text-white placeholder-white/20 outline-none transition-colors ${ic('email')}`} />
                                </div>
                            </Field>

                            <Field label={isArabic ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'} id="reg-phone" error={errors.phone}>
                                <div className="relative">
                                    <Phone size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                    <input id="reg-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                                        placeholder="+20 1xx xxx xxxx" autoComplete="tel"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 text-sm text-white placeholder-white/20 outline-none transition-colors ${ic('phone')}`} />
                                </div>
                            </Field>

                            <Field label={isArabic ? 'كلمة المرور' : 'Password'} id="reg-pass" error={errors.password} required>
                                <div className="relative">
                                    <Lock size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                    <input id="reg-pass" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                                        placeholder="••••••••" autoComplete="new-password"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 pe-11 text-sm text-white placeholder-white/20 outline-none transition-colors ${ic('password')}`} />
                                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute top-1/2 -translate-y-1/2 end-4 text-white/30 hover:text-white/60">
                                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                <PasswordStrength pw={form.password} />
                            </Field>

                            <Field label={isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'} id="reg-confirm" error={errors.confirmPassword} required>
                                <div className="relative">
                                    <Lock size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                    <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                                        placeholder="••••••••" autoComplete="new-password"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 pe-11 text-sm text-white placeholder-white/20 outline-none transition-colors ${ic('confirmPassword')}`} />
                                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute top-1/2 -translate-y-1/2 end-4 text-white/30 hover:text-white/60">
                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </Field>

                            {/* Terms */}
                            <label className={`flex items-start gap-3 cursor-pointer ${errors.agreeTerms ? 'opacity-100' : ''}`}>
                                <div className="flex-shrink-0 mt-0.5">
                                    <input id="reg-terms" type="checkbox" checked={form.agreeTerms} onChange={e => set('agreeTerms', e.target.checked)} className="sr-only" />
                                    <div onClick={() => set('agreeTerms', !form.agreeTerms)}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                                            form.agreeTerms ? 'bg-[#ff7b00] border-[#ff7b00]' : errors.agreeTerms ? 'border-red-500/50' : 'border-white/20'
                                        }`}>
                                        {form.agreeTerms && <CheckCircle2 size={12} className="text-black" />}
                                    </div>
                                </div>
                                <span className="text-xs text-white/50 leading-relaxed">
                                    {isArabic ? 'أوافق على ' : 'I agree to the '}
                                    <Link href="/terms" className="text-[#ff7b00] hover:underline">{isArabic ? 'شروط الاستخدام' : 'Terms of Service'}</Link>
                                    {isArabic ? ' و' : ' and '}
                                    <Link href="/privacy" className="text-[#ff7b00] hover:underline">{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
                                </span>
                            </label>
                            {errors.agreeTerms && <p className="text-red-400 text-xs font-semibold flex items-center gap-1"><AlertCircle size={11} />{errors.agreeTerms}</p>}

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(0)} className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors">
                                    {isArabic ? '← رجوع' : '← Back'}
                                </button>
                                <button type="submit" className="flex-[2] py-4 rounded-xl bg-[#ff7b00] text-black font-black hover:opacity-90 transition-all">
                                    {isArabic ? 'التالي →' : 'Continue →'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── STEP 2: Optional extras + Submit ── */}
                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">{isArabic ? 'لمسة أخيرة' : 'Almost Done!'}</h2>
                                <p className="text-white/40 text-sm">{isArabic ? 'خطوة إضافية اختيارية' : 'Optional finishing touches'}</p>
                            </div>

                            <Field label={isArabic ? 'كود الإحالة (اختياري)' : 'Referral Code (optional)'} id="reg-referral">
                                <input id="reg-referral" type="text" value={form.referralCode} onChange={e => set('referralCode', e.target.value.toUpperCase())}
                                    placeholder="GEMZ-XXXX" maxLength={10}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#ff7b00] transition-colors font-mono tracking-widest" />
                            </Field>

                            {/* Summary card */}
                            <div className="bg-black/30 border border-white/8 rounded-2xl p-5 space-y-3">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                                    {isArabic ? 'ملخص الحساب' : 'Account Summary'}
                                </h3>
                                {[
                                    { label: isArabic ? 'النوع' : 'Role', value: ROLES.find(r => r.key === form.role)?.[isArabic ? 'labelAr' : 'label'] },
                                    { label: isArabic ? 'الاسم' : 'Name', value: form.fullName },
                                    { label: isArabic ? 'البريد' : 'Email', value: form.email },
                                    ...(form.phone ? [{ label: isArabic ? 'الهاتف' : 'Phone', value: form.phone }] : []),
                                ].map(row => (
                                    <div key={row.label} className="flex justify-between items-center">
                                        <span className="text-white/40 text-sm">{row.label}</span>
                                        <span className="text-white font-semibold text-sm">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors">
                                    {isArabic ? '← رجوع' : '← Back'}
                                </button>
                                <button type="submit" disabled={loading} id="register-submit"
                                    className="flex-[2] py-4 rounded-xl bg-[#ff7b00] text-black font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    {isArabic ? 'إنشاء الحساب' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <p className="text-center mt-5 text-sm text-white/40">
                    {isArabic ? 'لديك حساب؟ ' : 'Already have an account? '}
                    <Link href="/login" className="text-[#ff7b00] font-bold hover:underline">
                        {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                    </Link>
                </p>
            </div>
        </div>
    );
}
