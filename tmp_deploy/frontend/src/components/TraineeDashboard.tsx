'use client';
import React, { useState, useEffect } from 'react';
import {
    Zap, QrCode, Flame, Droplets, Dumbbell, Apple, Trophy, Star,
    TrendingUp, ChevronRight, Heart, Moon, Watch, Target, Award,
    BarChart3, Calendar, CheckCircle, Play, Lock, Globe, Wallet,
    ArrowUpRight, ArrowDownLeft, Bell, Settings, User, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useWearables } from '../hooks/useWearables';
import { GemZApi } from '../lib/api';
import { useRouter } from 'next/navigation';

const BADGES = [
    { icon: '🔥', name: '7-Day Streak', nameAr: 'إنجاز ٧ أيام', earned: true, color: 'var(--color-orange)' },
    { icon: '💪', name: 'First Rep', nameAr: 'أول تمرين', earned: true, color: 'var(--color-primary)' },
    { icon: '🥗', name: 'Clean Eater', nameAr: 'أكل صحي', earned: true, color: '#34C759' },
    { icon: '🏆', name: 'Top 10 Leaderboard', nameAr: 'أفضل ١٠', earned: false, color: 'var(--color-warning)' },
    { icon: '🚀', name: '30-Day Legend', nameAr: 'أسطورة ٣٠ يوم', earned: false, color: 'var(--color-purple)' },
    { icon: '❤️', name: 'Cardio King', nameAr: 'ملك الكارديو', earned: false, color: 'var(--color-danger)' },
];

const WORKOUT = [
    { name: 'Bench Press', nameAr: 'ضغط صدر', sets: 4, reps: 10, weight: '80 kg', done: true, muscle: 'Chest' },
    { name: 'Incline Dumbbell', nameAr: 'دمبل مائل', sets: 3, reps: 12, weight: '25 kg', done: true, muscle: 'Chest' },
    { name: 'Cable Fly', nameAr: 'فتحة كابل', sets: 3, reps: 15, weight: '30 kg', done: false, muscle: 'Chest' },
    { name: 'Overhead Press', nameAr: 'ضغط أكتاف', sets: 4, reps: 10, weight: '60 kg', done: false, muscle: 'Shoulders' },
    { name: 'Lateral Raise', nameAr: 'رفع جانبي', sets: 3, reps: 15, weight: '12 kg', done: false, muscle: 'Shoulders' },
];

const MEALS = [
    { time: '07:00', type: 'Breakfast', typeAr: 'إفطار', kcal: 520, protein: 38, carbs: 55, fat: 12, done: true, items: 'Oats + Eggs + Banana', itemsAr: 'شوفان + بيض + موز', color: 'var(--color-warning)' },
    { time: '10:30', type: 'Snack', typeAr: 'سناك', kcal: 200, protein: 20, carbs: 15, fat: 5, done: true, items: 'Greek Yogurt + Almonds', itemsAr: 'يوغرت يوناني + لوز', color: 'var(--color-secondary)' },
    { time: '13:00', type: 'Lunch', typeAr: 'غداء', kcal: 680, protein: 50, carbs: 70, fat: 15, done: false, items: 'Chicken + Rice + Broccoli', itemsAr: 'دجاج + أرز + بروكلي', color: 'var(--color-primary)' },
    { time: '16:00', type: 'Pre-Workout', typeAr: 'قبل التمرين', kcal: 280, protein: 25, carbs: 30, fat: 6, done: false, items: 'Protein Shake + Dates', itemsAr: 'بروتين شيك + تمر', color: 'var(--color-purple)' },
    { time: '20:00', type: 'Dinner', typeAr: 'عشاء', kcal: 560, protein: 45, carbs: 40, fat: 18, done: false, items: 'Salmon + Sweet Potato', itemsAr: 'سمك + بطاطا حلوة', color: 'var(--color-orange)' },
];

const TRANSACTIONS = [
    { id: 'TXN-991', desc: 'Gold Gym Subscription', descAr: 'اشتراك جولد جيم', amount: -850, time: '2 days ago', timeAr: 'منذ يومين', type: 'out' },
    { id: 'TXN-988', desc: 'Referral Bonus', descAr: 'مكافأة إحالة', amount: 50, time: '5 days ago', timeAr: 'منذ 5 أيام', type: 'in' },
    { id: 'TXN-982', desc: 'Protein Powder Order', descAr: 'طلب بروتين', amount: -320, time: '1 week ago', timeAr: 'منذ أسبوع', type: 'out' },
    { id: 'TXN-975', desc: 'Wallet Top-up', descAr: 'شحن محفظة', amount: 2000, time: '2 weeks ago', timeAr: 'منذ أسبوعين', type: 'in' },
];

export default function TraineeDashboard() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState('overview');
    const [qrVisible, setQrVisible] = useState(false);
    const [waterCups, setWaterCups] = useState(5);
    const [workoutDone, setWorkoutDone] = useState([true, true, false, false, false]);

    // Dynamic QR Token (TOTP Simulation)
    const [qrToken, setQrToken] = useState('QR-AHM-INIT');
    const [qrTimer, setQrTimer] = useState(30);

    const { wearableData, connectDevice, disconnectDevice } = useWearables();
    
    // Live Database State
    const [user, setUser] = useState<{ id: string, full_name: string, email: string, referral_code?: string } | null>(null);
    const [dashData, setDashData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('gemz_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(storedUser));

        GemZApi.Trainee.getDashboard()
            .then((res: any) => {
                if(res.success) setDashData(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [router]);

    const totalKcal = MEALS.reduce((a, m) => a + m.kcal, 0);
    const consumedKcal = MEALS.filter(m => m.done).reduce((a, m) => a + m.kcal, 0);
    const totalProtein = MEALS.reduce((a, m) => a + m.protein, 0);
    
    // Fallbacks if data is still loading or empty
    const walletBalance = dashData?.wallet?.available_bal ? Number(dashData.wallet.available_bal) : 0;
    const streakDays = dashData?.workoutStreak || 0;
    const totalPoints = dashData?.profile?.gems_coins || 0;
    
    const weight = dashData?.profile?.weight_kg || '--';
    const bodyFat = dashData?.profile?.body_fat_pct || '--';
    const activeSub = dashData?.subscription;

    const tabs = [
        { id: 'overview', icon: BarChart3, labelEn: 'Overview', labelAr: 'نظرة عامة' },
        { id: 'workout', icon: Dumbbell, labelEn: "Today's Workout", labelAr: 'تمرين اليوم' },
        { id: 'diet', icon: Apple, labelEn: 'Diet Plan', labelAr: 'الخطة الغذائية' },
        { id: 'wallet', icon: Wallet, labelEn: 'Wallet', labelAr: 'المحفظة' },
        { id: 'badges', icon: Trophy, labelEn: 'Badges', labelAr: 'الأوسمة' },
    ];

    const displayBarcode = user?.referral_code || user?.id?.substring(0, 8).toUpperCase() || 'SCAN-ME';

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen p-4 md:p-8 font-sans pb-28" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-black font-bold text-xl">
                            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-primary)] border-2 border-[#0A0A0A]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'أهلاً،' : 'Welcome back,'}</p>
                        <h1 className="text-xl font-bold font-heading">{user?.full_name || '...'} 💪</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Flame size={14} className="text-[var(--color-orange)]" />
                            <span className="text-xs font-bold text-[var(--color-orange)]">{streakDays} {isArabic ? 'يوم متتالي 🔥' : 'day streak 🔥'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button onClick={toggleLanguage} className="p-2.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <Globe size={16} />
                    </button>
                    <button onClick={() => setQrVisible(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-black neon-glow" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                        <QrCode size={16} /> {isArabic ? 'QR الدخول' : 'Check-In QR'}
                    </button>
                </div>
            </div>

            {/* QR Modal */}
            {qrVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setQrVisible(false)}>
                    <div className="rounded-3xl p-8 flex flex-col items-center gap-6 max-w-sm w-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h2 className="text-xl font-bold font-heading mb-1">{isArabic ? 'باركود الدخول الذكي' : 'Smart Check-In QR'}</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'اعرض هذا الكود على المسح في الجيم' : 'Show this code at gym scanner'}</p>
                        </div>
                        {/* Stylized QR Code */}
                        <div className="relative p-4 rounded-2xl" style={{ background: '#fff' }}>
                            <div className="w-48 h-48 grid grid-cols-7 gap-0.5 p-2" title={displayBarcode}>
                                {Array.from({ length: 49 }).map((_, i) => {
                                    const pattern = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
                                    const shouldFill = Math.random() > 0.45 || pattern[i] === 0;
                                    return <div key={i} className="rounded-sm" style={{ background: shouldFill ? '#0A0A0A' : '#fff', aspectRatio: '1' }} />;
                                })}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-[var(--color-primary)] font-bold text-sm shadow-lg">GZ</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-mono text-xl font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--text-primary)' }}>
                                {displayBarcode}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'صالح: جميع الفروع المشترك بها' : 'Valid: All Enrolled Branches'}</p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                {activeSub ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                        <span className="text-xs text-[var(--color-primary)] font-bold">{isArabic ? 'الاشتراك نشط ✓' : 'Subscription Active ✓'}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        <span className="text-xs text-yellow-500 font-bold">{isArabic ? 'ادفع لكل زيارة' : 'Pay-Per-Visit / Trial'}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setQrVisible(false)} className="w-full py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                            {isArabic ? 'إغلاق' : 'Close'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-all"
                        style={{ background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--bg-card)', color: activeTab === tab.id ? '#000' : 'var(--text-secondary)', border: `1px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'var(--border-subtle)'}` }}>
                        <tab.icon size={15} /> {isArabic ? tab.labelAr : tab.labelEn}
                    </button>
                ))}
            </div>

            {/* ====== OVERVIEW TAB ====== */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Flame, label: isArabic ? 'السعرات اليوم' : "Today's Calories", value: `${consumedKcal} / ${totalKcal}`, color: 'var(--color-orange)', sub: `${Math.round((consumedKcal / totalKcal) * 100)}% ${isArabic ? 'مكتمل' : 'done'}` },
                            { icon: Droplets, label: isArabic ? 'الماء المشروب' : 'Water Intake', value: `${waterCups}/8`, color: 'var(--color-secondary)', sub: isArabic ? 'كوب اليوم' : 'cups today' },
                            { icon: Target, label: isArabic ? 'تمارين مكتملة' : 'Exercises Done', value: `${workoutDone.filter(Boolean).length}/${workoutDone.length}`, color: 'var(--color-primary)', sub: isArabic ? 'من التمرين' : 'of workout' },
                            { icon: Star, label: isArabic ? 'النقاط المكتسبة' : 'Total Points', value: totalPoints.toLocaleString(), color: 'var(--color-warning)', sub: isArabic ? 'نقطة GEM Z' : 'GEM Z pts' },
                        ].map((stat, i) => (
                            <div key={i} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="absolute -bottom-4 -right-4 opacity-5" style={{ color: stat.color }}><stat.icon size={80} /></div>
                                <div className="p-2 rounded-xl w-fit mb-3" style={{ background: `${stat.color}15`, color: stat.color }}><stat.icon size={18} /></div>
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
                                <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Water Tracker */}
                    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Droplets className="text-[var(--color-secondary)]" size={18} />{isArabic ? 'متابعة الماء' : 'Water Tracker'}</h3>
                        <div className="flex gap-3 flex-wrap">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <button key={i} onClick={() => setWaterCups(i < waterCups ? i : i + 1)}
                                    className="w-10 h-10 rounded-xl text-lg transition-all hover:scale-110"
                                    style={{ background: i < waterCups ? 'rgba(var(--color-secondary-rgb), 0.1)' : 'var(--bg-input)', border: `1px solid ${i < waterCups ? 'var(--color-secondary)' : 'var(--border-subtle)'}` }}>
                                    💧
                                </button>
                            ))}
                        </div>
                        <p className="text-xs mt-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {waterCups < 8 ? `${8 - waterCups} ${isArabic ? 'أكواب متبقية' : 'cups remaining'}` : (isArabic ? '🎉 هدف اليوم مكتمل!' : '🎉 Daily goal complete!')}
                        </p>
                    </div>

                    {/* Body Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <h3 className="font-bold mb-5 flex items-center gap-2"><TrendingUp className="text-[var(--color-primary)]" size={18} />{isArabic ? 'إحصائيات الجسم' : 'Body Stats'}</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: isArabic ? 'الوزن' : 'Weight', value: `${weight} kg`, trend: '--', color: 'var(--color-primary)' },
                                    { label: isArabic ? 'الدهون' : 'Body Fat', value: `${bodyFat}%`, trend: '--', color: 'var(--color-secondary)' },
                                    { label: isArabic ? 'العضلات' : 'Muscle', value: '--', trend: '--', color: 'var(--color-purple)' },
                                ].map((s, i) => (
                                    <div key={i} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                                        <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                                        <p className="text-xs text-[#34C759] mt-1">↓ {s.trend}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex justify-between items-start mb-5">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Watch className={wearableData.isConnected ? "text-[var(--color-primary)]" : "text-[var(--color-purple)]"} size={18} />
                                    {isArabic ? 'بيانات الساعة الذكية' : 'Wearable Data'}
                                </h3>
                                <button
                                    onClick={wearableData.isConnected ? disconnectDevice : connectDevice}
                                    className="text-xs px-3 py-1 rounded-full font-bold transition-colors"
                                    style={{
                                        background: wearableData.isConnected ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--bg-input)',
                                        color: wearableData.isConnected ? 'var(--color-primary)' : 'var(--text-secondary)',
                                        border: `1px solid ${wearableData.isConnected ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--border-subtle)'}`
                                    }}
                                >
                                    {wearableData.isConnected ? (isArabic ? 'متصل' : 'Connected') : (isArabic ? 'ربط الجهاز' : 'Connect')}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                {[
                                    { icon: Heart, label: isArabic ? 'النبض' : 'Heart Rate', value: `${wearableData.heartRate} bpm`, color: 'var(--color-danger)', highlight: wearableData.isConnected },
                                    { icon: Target, label: isArabic ? 'الخطوات' : 'Steps', value: wearableData.steps.toLocaleString(), color: 'var(--color-warning)', highlight: false },
                                    { icon: Moon, label: isArabic ? 'النوم' : 'Sleep', value: `${wearableData.sleepHours} hrs`, color: 'var(--color-secondary)', highlight: false },
                                    { icon: Flame, label: isArabic ? 'المحروق' : 'Burned', value: `${wearableData.caloriesBurned} kcal`, color: 'var(--color-orange)', highlight: false },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl transition-colors duration-500" style={{ background: 'var(--bg-input)' }}>
                                        <s.icon size={16} style={{ color: s.color }} className={s.highlight ? "animate-pulse" : ""} />
                                        <div>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                                            <p className="font-bold text-sm" style={{ color: s.color }}>{s.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {wearableData.isConnected && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />
                            )}
                        </div>
                    </div>

                    {/* Active Subscription */}
                    {activeSub ? (
                        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--color-primary-rgb), 0.25)', borderTop: '2px solid var(--color-primary)' }}>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-primary)]/5 rounded-full blur-2xl" />
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الاشتراك النشط' : 'Active Subscription'}</p>
                                    <h3 className="text-xl font-bold text-[var(--color-primary)]">{activeSub.gym_name} — {activeSub.plan_name}</h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        {isArabic ? 'ينتهي في' : 'Expires'}: {new Date(activeSub.expires_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button onClick={() => setQrVisible(true)} className="flex flex-col items-center gap-1 p-3 rounded-xl" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)', border: '1px solid rgba(var(--color-primary-rgb), 0.25)' }}>
                                    <QrCode size={24} className="text-[var(--color-primary)]" />
                                    <span className="text-[10px] text-[var(--color-primary)] font-bold">CHECK IN</span>
                                </button>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    <span>{isArabic ? 'متبقي' : 'Remaining'}</span>
                                    <span>36 {isArabic ? 'يوم' : 'days'}</span>
                                </div>
                                <div className="h-2 rounded-full" style={{ background: 'var(--bg-input)' }}>
                                    <div className="h-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" style={{ width: '40%' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl p-6 relative overflow-hidden text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'ليس لديك اشتراك حالي' : 'No active subscription'}</p>
                            <button className="px-5 py-2 rounded-xl text-sm font-bold text-black neon-glow" style={{ background: 'var(--color-primary)' }}>
                                {isArabic ? 'تصفح الجيمات المتاحة' : 'Browse Gyms'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ====== WORKOUT TAB ====== */}
            {activeTab === 'workout' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h2 className="text-xl font-bold font-heading">{isArabic ? 'يوم الصدر والأكتاف 💪' : 'Chest & Shoulders Day 💪'}</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الثلاثاء، ١٠ مارس' : 'Tuesday, March 10'}</p>
                        </div>
                        <div className="text-center px-4 py-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-2xl font-bold font-mono text-[var(--color-primary)]">{workoutDone.filter(Boolean).length}/{workoutDone.length}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'مكتمل' : 'done'}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 rounded-full" style={{ background: 'var(--bg-card)' }}>
                        <div className="h-3 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all"
                            style={{ width: `${(workoutDone.filter(Boolean).length / workoutDone.length) * 100}%` }} />
                    </div>

                    {WORKOUT.map((ex, i) => (
                        <div key={i} className="rounded-2xl p-5 flex items-center gap-4 transition-all"
                            style={{ background: 'var(--bg-card)', border: `1px solid ${workoutDone[i] ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--border-subtle)'}`, opacity: workoutDone[i] ? 0.85 : 1 }}>
                            <button onClick={() => { const next = [...workoutDone]; next[i] = !next[i]; setWorkoutDone(next); }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                                style={{ background: workoutDone[i] ? 'var(--color-primary)' : 'var(--bg-input)', border: `1px solid ${workoutDone[i] ? 'var(--color-primary)' : 'var(--border-medium)'}` }}>
                                {workoutDone[i] ? <CheckCircle size={20} className="text-black" /> : <div className="w-3 h-3 rounded-full" style={{ background: 'var(--border-medium)' }} />}
                            </button>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold ${workoutDone[i] ? 'line-through' : ''}`} style={{ color: workoutDone[i] ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                        {isArabic ? ex.nameAr : ex.name}
                                    </h4>
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{ex.muscle}</span>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {ex.sets} {isArabic ? 'سيت' : 'sets'} × {ex.reps} {isArabic ? 'تكرار' : 'reps'} • {ex.weight}
                                </p>
                            </div>
                            {workoutDone[i] && <CheckCircle size={16} className="text-[var(--color-primary)] shrink-0" />}
                        </div>
                    ))}

                    <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تمرين مكتمل؟ احصل على نقاطك!' : 'Workout complete? Claim your points!'}</p>
                        <button className="px-8 py-3 rounded-xl font-bold text-black transition-opacity hover:opacity-90 neon-glow"
                            style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                            {isArabic ? '🏆 إنهاء التمرين (+120 نقطة)' : '🏆 Complete Workout (+120 pts)'}
                        </button>
                    </div>
                </div>
            )}

            {/* ====== DIET TAB ====== */}
            {activeTab === 'diet' && (
                <div className="space-y-4">
                    {/* Macro Summary */}
                    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h3 className="font-bold mb-4">{isArabic ? 'ملخص المغذيات اليومية' : 'Daily Macro Summary'}</h3>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: isArabic ? 'سعرات' : 'Calories', value: `${consumedKcal}`, total: totalKcal, color: 'var(--color-orange)', unit: 'kcal' },
                                { label: isArabic ? 'بروتين' : 'Protein', value: '133', total: totalProtein, color: 'var(--color-primary)', unit: 'g' },
                                { label: isArabic ? 'كارب' : 'Carbs', value: '155', total: 210, color: 'var(--color-secondary)', unit: 'g' },
                                { label: isArabic ? 'دهون' : 'Fat', value: '38', total: 56, color: 'var(--color-purple)', unit: 'g' },
                            ].map((m, i) => (
                                <div key={i} className="text-center">
                                    <div className="relative w-16 h-16 mx-auto mb-2">
                                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-input)" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke={m.color} strokeWidth="3"
                                                strokeDasharray={`${(Number(m.value) / m.total) * 100} 100`} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold" style={{ color: m.color }}>{Math.round((Number(m.value) / m.total) * 100)}%</span>
                                        </div>
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.label}</p>
                                    <p className="font-bold text-sm" style={{ color: m.color }}>{m.value}{m.unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {MEALS.map((meal, i) => (
                        <div key={i} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: `1px solid ${meal.done ? `${meal.color}40` : 'var(--border-subtle)'}` }}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full mt-1" style={{ background: meal.color }} />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold">{isArabic ? meal.typeAr : meal.type}</h4>
                                            {meal.done && <CheckCircle size={14} className="text-[#34C759]" />}
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{meal.time}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold font-mono" style={{ color: meal.color }}>{meal.kcal} kcal</p>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g</p>
                                </div>
                            </div>
                            <p className="text-sm px-5" style={{ color: 'var(--text-secondary)' }}>
                                {isArabic ? meal.itemsAr : meal.items}
                            </p>
                            {!meal.done && (
                                <button className="mt-3 mx-5 text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: `${meal.color}15`, color: meal.color, border: `1px solid ${meal.color}40` }}>
                                    {isArabic ? '+ تسجيل الوجبة' : '+ Log Meal'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ====== WALLET TAB ====== */}
            {activeTab === 'wallet' && (
                <div className="space-y-5">
                    {/* Balance Card */}
                    <div className="rounded-3xl p-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A0F, #0A0F1A)', border: '1px solid rgba(var(--color-primary-rgb), 0.25)' }}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary)]/8 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--color-secondary)]/8 rounded-full blur-2xl" />
                        <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{isArabic ? 'رصيد المحفظة' : 'Wallet Balance'}</p>
                        <p className="text-5xl font-bold font-mono text-white mb-1" dir="ltr">EGP {walletBalance.toLocaleString()}</p>
                        <p className="text-sm text-[var(--color-primary)]">≈ ${(walletBalance / 50).toFixed(0)} USD</p>
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 py-3 rounded-xl font-bold text-black text-sm" style={{ background: 'var(--color-primary)' }}>
                                💳 {isArabic ? 'شحن' : 'Top Up'}
                            </button>
                            <button className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                                ↗ {isArabic ? 'سحب' : 'Withdraw'}
                            </button>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h3 className="font-bold mb-4">{isArabic ? 'طرق الشحن' : 'Top-Up Methods'}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { name: 'Instapay', color: '#6B48FF', icon: '⚡' },
                                { name: 'Fawry', color: '#FF6B00', icon: '🟠' },
                                { name: 'Vodafone Cash', color: '#E60000', icon: '📱' },
                                { name: 'Paymob', color: '#0047FF', icon: '💳' },
                            ].map((pm, i) => (
                                <button key={i} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-105"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                    <span className="text-2xl">{pm.icon}</span>
                                    <span className="font-bold text-sm">{pm.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <h3 className="font-bold">{isArabic ? 'سجل المعاملات' : 'Transaction History'}</h3>
                        </div>
                        {TRANSACTIONS.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-5 border-b hover:bg-white/2 transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center`}
                                        style={{ background: tx.type === 'in' ? 'rgba(var(--color-primary-rgb), 0.1)' : 'rgba(255,59,48,0.1)' }}>
                                        {tx.type === 'in' ? <ArrowDownLeft size={18} className="text-[var(--color-primary)]" /> : <ArrowUpRight size={18} className="text-[var(--color-danger)]" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{isArabic ? tx.descAr : tx.desc}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? tx.timeAr : tx.time}</p>
                                    </div>
                                </div>
                                <p className="font-bold font-mono" style={{ color: tx.type === 'in' ? 'var(--color-primary)' : 'var(--color-danger)' }} dir="ltr">
                                    {tx.type === 'in' ? '+' : ''}{tx.amount} EGP
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ====== BADGES TAB ====== */}
            {activeTab === 'badges' && (
                <div className="space-y-6">
                    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,204,0,0.3)' }}>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-warning)] to-[var(--color-orange)] flex items-center justify-center text-3xl">🏆</div>
                        <div>
                            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'المستوى الحالي' : 'Current Level'}</p>
                            <h2 className="text-xl font-bold text-[var(--color-warning)]">{isArabic ? 'المحارب الذهبي' : 'Gold Warrior'}</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{totalPoints} / 5000 {isArabic ? 'نقطة للمستوى التالي' : 'pts to next level'}</p>
                            <div className="h-2 mt-2 rounded-full w-48" style={{ background: 'var(--bg-input)' }}>
                                <div className="h-2 rounded-full" style={{ background: 'linear-gradient(to right, var(--color-warning), var(--color-orange))', width: `${(totalPoints / 5000) * 100}%` }} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-4">{isArabic ? 'الأوسمة المحققة' : 'Earned Badges'}</h3>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4" style={{ perspective: "1000px" }}>
                            {BADGES.filter(b => b.earned).map((badge, i) => (
                                <motion.div key={i}
                                    whileHover={{ scale: 1.05, rotateY: 15, rotateX: -15, z: 20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                                    style={{ background: 'var(--bg-card)', border: `1px solid ${badge.color}40`, transformStyle: "preserve-3d" }}>
                                    <div className="text-4xl" style={{ transform: "translateZ(20px)" }}>{badge.icon}</div>
                                    <p className="text-xs font-bold" style={{ color: badge.color, transform: "translateZ(10px)" }}>{isArabic ? badge.nameAr : badge.name}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Lock size={16} className="opacity-50" />{isArabic ? 'الأوسمة القادمة' : 'Upcoming Badges'}</h3>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4" style={{ perspective: "1000px" }}>
                            {BADGES.filter(b => !b.earned).map((badge, i) => (
                                <motion.div key={i}
                                    whileHover={{ scale: 1.02, rotateY: 5, rotateX: -5 }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center opacity-40"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', filter: 'grayscale(1)', transformStyle: "preserve-3d" }}>
                                    <div className="text-4xl" style={{ transform: "translateZ(10px)" }}>{badge.icon}</div>
                                    <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)', transform: "translateZ(5px)" }}>{isArabic ? badge.nameAr : badge.name}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <h3 className="font-bold">{isArabic ? 'لوحة الصدارة الأسبوعية' : 'Weekly Leaderboard'}</h3>
                        </div>
                        {[
                            { rank: 1, name: 'Mohamed Ali', pts: 4820, medal: '🥇' },
                            { rank: 2, name: 'Sara Ahmed', pts: 4150, medal: '🥈' },
                            { rank: 3, name: 'Karim Hassan', pts: 3890, medal: '🥉' },
                            { rank: 7, name: isArabic ? 'أنت (أحمد)' : 'You (Ahmed)', pts: totalPoints, medal: '⭐', isMe: true },
                        ].map((entry, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b transition-colors"
                                style={{ borderColor: 'var(--border-subtle)', background: entry.isMe ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent', borderLeft: entry.isMe ? '3px solid var(--color-primary)' : '3px solid transparent' }}>
                                <span className="text-2xl w-8 text-center">{entry.medal}</span>
                                <span className="font-mono text-sm w-6" style={{ color: 'var(--text-muted)' }}>#{entry.rank}</span>
                                <p className="flex-1 font-bold text-sm">{entry.name}</p>
                                <p className="font-mono font-bold" style={{ color: entry.isMe ? 'var(--color-primary)' : 'var(--text-primary)' }}>{entry.pts.toLocaleString()} pts</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
