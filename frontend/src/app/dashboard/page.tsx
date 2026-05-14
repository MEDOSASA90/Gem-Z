'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, Wallet, Users, Award, Bell, Settings,
    LogOut, ChevronRight, Activity, Zap, Shield, Loader2
} from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../hooks/useApi';

// ─── Types ───────────────────────────────────────────────────

interface DashUser {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
    email_verified_at: string | null;
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({ icon, label, value, trend, color, loading }: {
    icon: React.ReactNode; label: string; value: string; trend?: string; color: string; loading?: boolean;
}) {
    return (
        <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 relative overflow-hidden group hover:border-white/15 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: color + '20' }} />
            <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '20', color }}>
                    {icon}
                </div>
                {trend && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">{trend}</span>}
            </div>
            {loading ? (
                <div className="space-y-2 animate-pulse">
                    <div className="h-6 w-20 bg-white/10 rounded" />
                    <div className="h-3 w-14 bg-white/5 rounded" />
                </div>
            ) : (
                <>
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-white/40 text-xs font-semibold mt-1 uppercase tracking-widest">{label}</p>
                </>
            )}
        </div>
    );
}

// ─── Quick Action ─────────────────────────────────────────────

function QuickAction({ icon, label, href, color }: {
    icon: React.ReactNode; label: string; href: string; color: string;
}) {
    return (
        <Link href={href}
            className="flex flex-col items-center gap-2 p-4 bg-white/[0.03] border border-white/8 rounded-2xl hover:bg-white/[0.07] hover:border-white/15 transition-all group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: color + '20', color }}>
                {icon}
            </div>
            <span className="text-xs font-bold text-white/60 group-hover:text-white/90 transition-colors text-center">{label}</span>
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
    const { isArabic } = useLanguage();
    const router = useRouter();

    const [user, setUser] = useState<DashUser | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [notifications] = useState(3);

    // Load user from localStorage (already set during login)
    useEffect(() => {
        const raw = localStorage.getItem('gemz_user');
        if (!raw) { router.replace('/login'); return; }
        try { setUser(JSON.parse(raw)); } catch { router.replace('/login'); }
        finally { setUserLoading(false); }
    }, [router]);

    // Fetch wallet balance
    const { data: walletData, loading: walletLoading } = useApi(() => GemZApi.Finance.getWallet(), { immediate: !!user });

    const handleLogout = async () => {
        setLoggingOut(true);
        try { await GemZApi.Auth.logout(); } catch {}
        localStorage.removeItem('gemz_access_token');
        localStorage.removeItem('gemz_user');
        router.replace('/login');
    };

    const balance = (walletData as any)?.wallet?.available_bal ?? 0;
    const roleLabel = {
        trainee: isArabic ? 'متدرب' : 'Trainee',
        trainer: isArabic ? 'مدرب' : 'Trainer',
        gym_admin: isArabic ? 'مدير صالة' : 'Gym Admin',
        store_admin: isArabic ? 'مدير متجر' : 'Store Owner',
    }[user?.role ?? ''] ?? user?.role;

    const quickActions = [
        { icon: <Wallet size={20} />,   label: isArabic ? 'المحفظة' : 'Wallet',   href: '/wallet',   color: '#ff7b00' },
        { icon: <Activity size={20} />, label: isArabic ? 'التقدم' : 'Progress',  href: '/progress', color: '#22c55e' },
        { icon: <Users size={20} />,    label: isArabic ? 'الفرق' : 'Squads',     href: '/squads',   color: '#a78bfa' },
        { icon: <Award size={20} />,    label: isArabic ? 'التحديات' : 'Challenges', href: '/challenges', color: '#f59e0b' },
        { icon: <Zap size={20} />,      label: isArabic ? 'مدرب AI' : 'AI Coach', href: '/ai-coach', color: '#06b6d4' },
        { icon: <Shield size={20} />,   label: isArabic ? 'التوثيق' : 'KYC',      href: '/kyc',      color: '#10b981' },
    ];

    if (userLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#ff7b00]" />
            </div>
        );
    }

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0a0a0a] text-white pb-24">
            {/* Ambient */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-[#ff7b00]/8 rounded-full blur-[150px]" />
            </div>

            {/* ── Header ── */}
            <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/5 px-5 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href="/" className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">Gem Z</Link>
                    <div className="flex items-center gap-3">
                        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors">
                            <Bell size={16} className="text-white/60" />
                            {notifications > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff7b00] rounded-full text-[9px] font-black text-black flex items-center justify-center">
                                    {notifications}
                                </span>
                            )}
                        </button>
                        <Link href="/profile"
                            className="w-9 h-9 rounded-xl bg-[#ff7b00]/20 border border-[#ff7b00]/30 flex items-center justify-center font-black text-[#ff7b00] text-sm hover:scale-105 transition-transform">
                            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-5 pt-7 space-y-8 relative z-10">

                {/* ── Welcome Banner ── */}
                <section className="bg-gradient-to-br from-[#ff7b00]/15 to-transparent border border-[#ff7b00]/20 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#ffb300]/10 rounded-full blur-3xl" />
                    <div className="flex items-center gap-4 relative z-10">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-2xl bg-[#ff7b00]/20 border border-[#ff7b00]/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-[#ff7b00]">{user?.full_name?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">
                                {isArabic ? 'مرحباً،' : 'Welcome back,'}
                            </p>
                            <h1 className="text-xl font-black text-white truncate mt-0.5">{user?.full_name}</h1>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff7b00]/20 border border-[#ff7b00]/30 text-[#ff7b00]">
                                    {roleLabel}
                                </span>
                                {!user?.email_verified_at && (
                                    <Link href="/verify-email" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                        {isArabic ? 'تحقق من البريد' : 'Verify Email'}
                                    </Link>
                                )}
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
                    </div>
                </section>

                {/* ── Stats ── */}
                <section>
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">
                        {isArabic ? 'إحصاءاتك' : 'Your Stats'}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={<Wallet size={18} />} label={isArabic ? 'الرصيد' : 'Balance'}
                            value={walletLoading ? '—' : `${balance.toLocaleString()} EGP`}
                            trend="+12%" color="#ff7b00" loading={walletLoading} />
                        <StatCard icon={<Activity size={18} />} label={isArabic ? 'جلسات هذا الأسبوع' : 'Weekly Sessions'}
                            value="4" trend="+2" color="#22c55e" />
                        <StatCard icon={<Award size={18} />} label={isArabic ? 'نقاط الجواهر' : 'Gem Points'}
                            value="1,240" color="#a78bfa" />
                        <StatCard icon={<Users size={18} />} label={isArabic ? 'أفراد الفريق' : 'Squad Members'}
                            value="14" color="#06b6d4" />
                    </div>
                </section>

                {/* ── Quick Actions ── */}
                <section>
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">
                        {isArabic ? 'الإجراءات السريعة' : 'Quick Actions'}
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        {quickActions.map(a => <QuickAction key={a.href} {...a} />)}
                    </div>
                </section>

                {/* ── Menu Links ── */}
                <section>
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">
                        {isArabic ? 'الحساب' : 'Account'}
                    </h2>
                    <div className="space-y-2">
                        {[
                            { href: '/profile',  icon: 'person',        label: isArabic ? 'ملفي الشخصي' : 'My Profile',        desc: isArabic ? 'تعديل معلوماتك' : 'Edit your information' },
                            { href: '/kyc',      icon: 'verified_user', label: isArabic ? 'التوثيق الرسمي (KYC)' : 'Identity Verification', desc: isArabic ? 'أرسل مستندات التحقق' : 'Submit verification documents' },
                            { href: '/privacy',  icon: 'shield',        label: isArabic ? 'الأمان والخصوصية' : 'Security & Privacy', desc: isArabic ? 'كلمة المرور والجلسات' : 'Password & sessions' },
                        ].map(item => (
                            <Link key={item.href} href={item.href}
                                className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/8 rounded-2xl hover:bg-white/[0.06] hover:border-white/15 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-white/50 text-xl group-hover:text-[#ff7b00] transition-colors">{item.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm">{item.label}</p>
                                    <p className="text-white/35 text-xs">{item.desc}</p>
                                </div>
                                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── Logout ── */}
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    id="dashboard-logout"
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/8 transition-colors disabled:opacity-50"
                >
                    {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                    {isArabic ? 'تسجيل الخروج' : 'Sign Out'}
                </button>
            </main>
        </div>
    );
}
