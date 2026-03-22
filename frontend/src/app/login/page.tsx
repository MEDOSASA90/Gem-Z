'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const T = {
    en: {
        title: 'Welcome Back', subtitle: 'Sign in to your GEM Z account',
        email: 'Email Address', password: 'Password', forgot: 'Forgot Password?',
        login: 'Sign In', or: 'OR', google: 'Continue with Google',
        noAccount: "Don't have an account?", register: 'Create Account',
        roles: ['Trainee', 'Trainer', 'Gym', 'Store'],
        roleLabel: 'I am a',
    },
    ar: {
        title: 'مرحباً بعودتك', subtitle: 'سجّل الدخول إلى حسابك في GEM Z',
        email: 'البريد الإلكتروني', password: 'كلمة المرور', forgot: 'نسيت كلمة المرور؟',
        login: 'تسجيل الدخول', or: 'أو', google: 'المتابعة بواسطة Google',
        noAccount: 'ليس لديك حساب؟', register: 'إنشاء حساب',
        roles: ['متدرب', 'مدرب', 'صالة رياضية', 'متجر'],
        roleLabel: 'أنا',
    }
};

export default function LoginPage() {
    const { isArabic } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [showPass, setShowPass] = useState(false);
    const [role, setRole] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const isDark = theme === 'dark';
    const router = useRouter();

    const roleColors = ['#00FFA3', '#00B8FF', '#A78BFA', '#F59E0B'];
    const roleIcons = ['🏋️', '🎯', '🏢', '🛍️'];
    const roleKeys = ['trainee', 'trainer', 'gym_admin', 'store_admin'];

    const handleLogin = async () => {
        if (!email || !password) {
            setError(isArabic ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await GemZApi.Auth.login({ email, password });
            
            // Wait, the backend doesn't care about role select on login right now because it fetches the role from DB.
            // But from frontend UX we might route them differently later based on DB role.
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));

            if (res.user.role === 'trainee') router.push('/trainee');
            else if (res.user.role === 'trainer') router.push('/trainer');
            else if (res.user.role === 'gym_admin') router.push('/dashboard/gym');
            else router.push('/dashboard/store');

        } catch (err: any) {
            setError(err.message || (isArabic ? 'خطأ في تسجيل الدخول' : 'Login failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Background glows */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[200px] pointer-events-none opacity-30" style={{ background: 'radial-gradient(circle, #00FFA3, transparent)' }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #00B8FF, transparent)' }} />

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="absolute top-6 end-6 p-2.5 rounded-xl transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {isDark ? '☀️' : '🌙'}
            </button>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <img src="/gem-z-logo.png" alt="GEM Z" className="h-14 mx-auto mb-3 object-contain" />
                    </Link>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.title}</h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t.subtitle}</p>
                </div>

                {/* Role Selector */}
                <div className="mb-6">
                    <p className="text-sm mb-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{t.roleLabel}</p>
                    <div className="grid grid-cols-4 gap-2">
                        {t.roles.map((r, i) => (
                            <button
                                key={i}
                                onClick={() => setRole(i)}
                                className="flex flex-col items-center gap-1 p-3 rounded-2xl text-xs font-medium transition-all"
                                style={{
                                    background: role === i ? `${roleColors[i]}15` : 'var(--bg-card)',
                                    border: `1px solid ${role === i ? `${roleColors[i]}40` : 'var(--border-subtle)'}`,
                                    color: role === i ? roleColors[i] : 'var(--text-secondary)',
                                }}
                            >
                                <span className="text-xl">{roleIcons[i]}</span>
                                <span>{r}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card */}
                <div className="p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-5">
                        <div>
                            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{t.email}</label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-4 py-3 rounded-xl text-sm transition-colors input-base" placeholder="you@example.com" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t.password}</label>
                                <a href="#" className="text-sm" style={{ color: roleColors[role] }}>{t.forgot}</a>
                            </div>
                            <div className="relative">
                                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} className="w-full px-4 py-3 rounded-xl text-sm transition-colors input-base pe-12" placeholder="••••••••" />
                                <button onClick={() => setShowPass(!showPass)} className="absolute top-1/2 -translate-y-1/2 end-4" style={{ color: 'var(--text-muted)' }}>
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button onClick={handleLogin} disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 shadow-[0_0_25px_rgba(0,255,163,0.3)]" style={{ background: `linear-gradient(135deg, ${roleColors[role]}, #00B8FF)` }}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /> {t.login}</>}
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.or}</span>
                            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                        </div>

                        <button className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-colors hover:opacity-90" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            {t.google}
                        </button>
                    </div>
                </div>

                <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t.noAccount}{' '}
                    <Link href="/register" className="font-bold hover:underline" style={{ color: roleColors[role] }}>{t.register}</Link>
                </p>
            </div>
        </div>
    );
}
