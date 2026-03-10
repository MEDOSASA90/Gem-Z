'use client';
import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Activity, Clock, TrendingUp, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function GymDashboard() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const [isOffPeakActive, setIsOffPeakActive] = useState(false);
    const [stats, setStats] = useState({ availableBal: 0, pendingBal: 0, totalMembers: 0 });

    useEffect(() => {
        setStats({ availableBal: 12500.50, pendingBal: 800.00, totalMembers: 842 });
    }, []);

    const toggleOffPeak = async () => {
        setIsOffPeakActive(!isOffPeakActive);
        // API Call to gym.controller.ts -> setOffPeakPricing
    };

    const formatCurrency = (val: number) => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Header section with Off-Peak Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading">
                        {isArabic ? 'لوحة تحكم الصالة الرياضية' : 'Gym Admin Terminal'}
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic ? 'إدارة العمليات، الإيرادات، والتدفق النشط.' : 'Manage operations, revenue, and active flow.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl transition-colors shrink-0" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button onClick={toggleLanguage} className="py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 shrink-0" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <Globe className="w-4 h-4" /> <span className="text-sm font-medium">{isArabic ? 'EN' : 'عربي'}</span>
                    </button>
                    <div className="flex items-center gap-3 px-6 py-2.5 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <Clock className="w-5 h-5 text-[#A78BFA]" />
                        <span className="font-medium text-sm whitespace-nowrap">{isArabic ? 'ساعات الهدوء' : 'Quiet Hours'}</span>
                        <button
                            onClick={toggleOffPeak}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isOffPeakActive ? 'bg-[#A78BFA]' : 'bg-gray-400 dark:bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isOffPeakActive ? (isArabic ? 'right-7' : 'left-7') : (isArabic ? 'right-1' : 'left-1')}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-3xl flex items-center gap-6 glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="p-4 rounded-2xl" style={{ background: 'rgba(0,255,163,0.1)' }}>
                        <DollarSign className="w-8 h-8 text-[#00FFA3]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الرصيد المتاح' : 'Available Balance'}</p>
                        <h2 className="text-3xl font-bold font-mono tracking-tight" dir="ltr">${formatCurrency(stats.availableBal)}</h2>
                    </div>
                </div>

                <div className="p-6 rounded-3xl flex items-center gap-6 glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="p-4 rounded-2xl" style={{ background: 'rgba(167,139,250,0.1)' }}>
                        <Activity className="w-8 h-8 text-[#A78BFA]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'قيد التخليص' : 'Pending Clearing'}</p>
                        <h2 className="text-3xl font-bold font-mono tracking-tight" dir="ltr">${formatCurrency(stats.pendingBal)}</h2>
                    </div>
                </div>

                <div className="p-6 rounded-3xl flex items-center gap-6 glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--border-medium)', color: 'var(--text-primary)' }}>
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الأعضاء النشطين' : 'Active Members'}</p>
                        <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.totalMembers)}</h2>
                    </div>
                </div>
            </div>

            {/* Analytics & Live Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart Placeholder */}
                <div className="lg:col-span-2 rounded-3xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#A78BFA]" />
                            {isArabic ? 'تحليلات الإيرادات' : 'Revenue Analytics'}
                        </h3>
                        <select className="text-sm rounded-lg px-3 py-2 outline-none font-medium cursor-pointer" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                            <option>{isArabic ? 'آخر ٧ أيام' : 'Last 7 Days'}</option>
                            <option>{isArabic ? 'هذا الشهر' : 'This Month'}</option>
                        </select>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-3 px-2">
                        {/* Mock Chart Bars */}
                        {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                            <div key={i} className="w-full rounded-t-lg relative group transition-all duration-300 hover:opacity-100 opacity-60 flex-1" style={{ background: '#A78BFA', height: `${h}%` }}>
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs py-1.5 px-3 rounded-lg font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg pointer-events-none" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                                    ${h * 50}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Check-ins Feed */}
                <div className="rounded-3xl p-6 flex flex-col h-full max-h-[400px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00B8FF] animate-pulse" />
                        {isArabic ? 'الاختمارات الحية' : 'Live Check-ins'}
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00FFA3] to-[#A78BFA] p-[2px]">
                                        <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-primary)' }}>
                                            U{i}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">User_{1024 + i}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'الآن' : 'Just now'}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(0,184,255,0.1)', color: '#00B8FF' }}>Scan</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
