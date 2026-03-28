'use client';
import React, { useState } from 'react';
import { Users, DollarSign, Target, Activity, CheckCircle, TrendingUp, Calendar, ArrowRight, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function TrainerDashboard() {
    const [stats] = useState({ clients: 24, earnings: 4500.50, activePlans: 38 });
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const formatCurrency = (val: number) => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading">
                        {isArabic ? 'مركز قيادة المدرب' : 'Trainer Command Center'}
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic ? 'إدارة قائمة عملائك، الأرباح، والبرامج النشطة.' : 'Manage your roster, revenue, and active protocols.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl transition-colors shrink-0" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button onClick={toggleLanguage} className="py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 shrink-0" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <Globe className="w-4 h-4" /> <span className="text-sm font-medium">{isArabic ? 'EN' : 'عربي'}</span>
                    </button>
                    <button className="px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 group hover:opacity-80" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                        {isArabic ? 'فتح الجدول' : 'Open Schedule'}
                        <Calendar className={`w-4 h-4 group-hover:scale-110 transition-transform ${isArabic ? 'ml-2' : ''}`} style={{ color: 'var(--color-secondary)' }} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="rounded-3xl p-6 glass-panel-hover overflow-hidden relative" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className={`absolute ${isArabic ? '-left-6' : '-right-6'} -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 pointer-events-none`} style={{ background: 'var(--color-primary)' }} />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl text-[var(--color-primary)]" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)' }}>
                            <Users size={24} />
                        </div>
                        <h3 className="font-medium" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'إجمالي العملاء' : 'Total Clients'}</h3>
                    </div>
                    <div className="flex items-end gap-3 p-1">
                        <h2 className="text-4xl font-bold">{stats.clients}</h2>
                        <span className="text-sm text-[var(--color-primary)] flex items-center mb-1 font-bold">
                            <TrendingUp className={`w-4 h-4 ${isArabic ? 'ml-1' : 'mr-1'}`} /> {isArabic ? '+3 هذا الأسبوع' : '+3 this week'}
                        </span>
                    </div>
                </div>

                <div className="rounded-3xl p-6 glass-panel-hover overflow-hidden relative" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className={`absolute ${isArabic ? '-left-6' : '-right-6'} -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 pointer-events-none`} style={{ background: 'var(--color-purple)' }} />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl text-[var(--color-purple)]" style={{ background: 'rgba(167,139,250,0.1)' }}>
                            <DollarSign size={24} />
                        </div>
                        <h3 className="font-medium" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الأرباح الشهرية' : 'Monthly Earnings'}</h3>
                    </div>
                    <div className="flex items-end gap-3 p-1">
                        <h2 className="text-4xl font-bold font-mono" dir="ltr">${formatCurrency(stats.earnings)}</h2>
                    </div>
                </div>

                <div className="rounded-3xl p-6 glass-panel-hover overflow-hidden relative" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className={`absolute ${isArabic ? '-left-6' : '-right-6'} -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 pointer-events-none`} style={{ background: 'var(--color-secondary)' }} />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl text-[var(--color-secondary)]" style={{ background: 'rgba(var(--color-secondary-rgb), 0.1)' }}>
                            <Target size={24} />
                        </div>
                        <h3 className="font-medium" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'البرامج النشطة' : 'Active Plans'}</h3>
                    </div>
                    <div className="flex items-end gap-3 p-1">
                        <h2 className="text-4xl font-bold">{stats.activePlans}</h2>
                        <span className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'من جميع العملاء' : 'Across all clients'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Client Roster list */}
                <div className="lg:col-span-2 rounded-3xl p-6 glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            {isArabic ? 'قائمة العملاء' : 'Client Roster'}
                        </h3>
                        <input
                            type="text"
                            placeholder={isArabic ? 'بحث عن عميل...' : 'Search clients...'}
                            className="rounded-xl px-4 py-2 text-sm outline-none transition-colors w-64" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="space-y-4">
                        {[
                            { name: 'Sarah Jenkins', type: isArabic ? 'مرحلة التضخيم ٢' : 'Hypertrophy Phase 2', progress: 75, status: 'Online', color: 'var(--color-primary)' },
                            { name: 'Marcus D.', type: isArabic ? 'بروتوكول حرق الدهون' : 'Fat Loss Protocol', progress: 42, status: 'Offline', color: 'gray' },
                            { name: 'Elena R.', type: isArabic ? 'تأسيس القوة' : 'Strength Base', progress: 90, status: 'In Gym', color: 'var(--color-secondary)' },
                        ].map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl transition-colors group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-full" style={{ background: 'var(--border-medium)' }} />
                                        <div className={`absolute bottom-0 ${isArabic ? 'left-0' : 'right-0'} w-3 h-3 rounded-full border-2`} style={{ borderColor: 'var(--bg-card)', background: client.color }} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{client.name}</h4>
                                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{client.type}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="hidden sm:block">
                                        <div className="flex justify-between text-xs mb-1 font-bold">
                                            <span style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'التقدم' : 'Progress'}</span>
                                            <span className="font-mono text-[var(--color-primary)]">{client.progress}%</span>
                                        </div>
                                        <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                                            <div className={`h-full ${isArabic ? 'float-right' : ''}`} style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))', width: `${client.progress}%` }} />
                                        </div>
                                    </div>
                                    <button className={`transition-colors hover:text-[var(--color-secondary)] ${isArabic ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }}>
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions / Assign Plan */}
                <div className="rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className={`absolute top-0 ${isArabic ? 'left-0' : 'right-0'} opacity-30 pointer-events-none w-full h-full`} style={{ background: `radial-gradient(circle at top ${isArabic ? 'left' : 'right'}, rgba(var(--color-secondary-rgb), 0.1), transparent 70%)` }} />

                    <div className="relative z-10">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-[var(--color-secondary)]" /> {isArabic ? 'تعيين سريع' : 'Quick Assign'}
                        </h3>
                        <p className="text-sm mb-6 leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {isArabic
                                ? 'اختر عميلاً وأرسل فوراً خطة تغذية مدعومة بالذكاء الاصطناعي أو بروتوكول تمرين إلى تطبيقهم.'
                                : 'Select a client and instantly push a new AI-generated diet plan or workout protocol to their app.'}
                        </p>

                        <div className="space-y-4 w-full">
                            <div className="relative">
                                <select className={`w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none cursor-pointer font-bold transition-colors ${isArabic ? 'pr-4 pl-10' : 'pl-4 pr-10'}`} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                    <option>{isArabic ? 'اختر عميل...' : 'Select Client...'}</option>
                                    <option>Sarah Jenkins</option>
                                    <option>Marcus D.</option>
                                </select>
                            </div>

                            <div className="relative">
                                <select className={`w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none cursor-pointer font-bold transition-colors ${isArabic ? 'pr-4 pl-10' : 'pl-4 pr-10'}`} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                    <option>{isArabic ? 'اختر البروتوكول...' : 'Select Protocol...'}</option>
                                    <option>AI Diet Phase 3</option>
                                    <option>Push/Pull/Legs Pro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-8 text-black font-bold py-3.5 rounded-xl transition-opacity flex items-center justify-center gap-2 relative z-10 hover:opacity-90" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))', boxShadow: isDark ? '0 0 20px rgba(var(--color-secondary-rgb), 0.1)' : 'none' }}>
                        <CheckCircle size={20} /> {isArabic ? 'إرسال إلى تطبيق العميل' : 'Push to Client App'}
                    </button>
                </div>

            </div>
        </div>
    );
}
