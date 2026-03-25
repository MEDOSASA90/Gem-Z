'use client';
import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Activity, Clock, TrendingUp, Globe, Loader2, QrCode, LogIn, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { GemZApi } from '../lib/api';

export default function GymDashboard() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const [isOffPeakActive, setIsOffPeakActive] = useState(false);
    const [stats, setStats] = useState<any>({ availableBal: 0, pendingBal: 0, totalMembers: 0, subscribers: [], visits: [] });
    const [loading, setLoading] = useState(true);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [scanLoading, setScanLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res: any = await GemZApi.Gym.getDashboard();
            if (res.success && res.data) {
                setStats(res.data);
            }
        } catch (error) {
            console.error('Failed to load gym stats', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleOffPeak = async () => {
        setIsOffPeakActive(!isOffPeakActive);
        try {
            await GemZApi.Gym.setOffPeak(!isOffPeakActive, 20);
        } catch (error) {
            console.error('Failed to toggle off peak', error);
            setIsOffPeakActive(isOffPeakActive); // revert on fail
        }
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!barcodeInput.trim()) return;
        
        setScanLoading(true);
        try {
            // Future Backend Action
            await GemZApi.request('/gym/scan', {
                method: 'POST',
                body: JSON.stringify({ barcode: barcodeInput })
            });
            setBarcodeInput('');
            fetchStats(); // refresh logic
        } catch(error) {
            console.error('Scan Failed', error);
            alert(isArabic ? 'رمز الاستجابة غير صالح أو منتهي!' : 'Invalid or Expired Barcode!');
        } finally {
            setScanLoading(false);
        }
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
                        <Clock className="w-5 h-5 text-[var(--color-purple)]" />
                        <span className="font-medium text-sm whitespace-nowrap">{isArabic ? 'ساعات الهدوء' : 'Quiet Hours'}</span>
                        <button
                            onClick={toggleOffPeak}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isOffPeakActive ? 'bg-[var(--color-purple)]' : 'bg-gray-400 dark:bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isOffPeakActive ? (isArabic ? 'right-7' : 'left-7') : (isArabic ? 'right-1' : 'left-1')}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-3xl flex items-center gap-6 glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="p-4 rounded-2xl" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)' }}>
                        <DollarSign className="w-8 h-8 text-[var(--color-primary)]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الرصيد المتاح' : 'Available Balance'}</p>
                        <h2 className="text-3xl font-bold font-mono tracking-tight" dir="ltr">${formatCurrency(stats?.availableBal || 0)}</h2>
                    </div>
                </div>

                <div className="p-6 rounded-3xl flex items-center gap-6 glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="p-4 rounded-2xl" style={{ background: 'rgba(167,139,250,0.1)' }}>
                        <Activity className="w-8 h-8 text-[var(--color-purple)]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'قيد التخليص' : 'Pending Clearing'}</p>
                        <h2 className="text-3xl font-bold font-mono tracking-tight" dir="ltr">${formatCurrency(stats?.pendingBal || 0)}</h2>
                    </div>
                </div>

                <div className="p-6 rounded-3xl flex items-center gap-6 glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--border-medium)', color: 'var(--text-primary)' }}>
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الأعضاء النشطين' : 'Active Members'}</p>
                        <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(stats?.totalMembers || 0)}</h2>
                    </div>
                </div>
            </div>

            {/* Interactive Grid: Barcode Scanner & Live Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* Check-In Action Module */}
                <div className="rounded-3xl p-6 flex flex-col justify-center text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)' }}>
                        <QrCode className="w-8 h-8 text-[var(--color-purple)]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                        {isArabic ? 'مسح رمز الاستجابة للتدريب' : 'Scan Trainee Barcode'}
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic ? 'قم بإدخال الكود يدويا أو استخدم الماسح الضوئي لتسجيل الدخول والانصراف' : 'Manually enter or scan to log IN/OUT time.'}
                    </p>
                    
                    <form onSubmit={handleScan} className="flex gap-2">
                        <input 
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            type="text" 
                            placeholder="Trainee ID / Barcode..." 
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-mono font-bold uppercase transition-colors outline-none focus:border-[var(--color-purple)]"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                        />
                        <button type="submit" disabled={scanLoading} className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--color-purple)' }}>
                            {scanLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isArabic ? 'إرسال' : 'Scan'}
                        </button>
                    </form>
                </div>

                {/* Live Check-ins Feed */}
                <div className="lg:col-span-2 rounded-3xl p-6 flex flex-col h-full max-h-[400px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-secondary)] animate-pulse" />
                        {isArabic ? 'سجل الزيارات المباشر' : 'Live Check-INs / OUTs'}
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {loading && <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-[var(--color-purple)]" />}
                        {!loading && stats?.visits?.length === 0 && (
                           <p className="text-center text-sm mt-10" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'لا توجد زيارات حديثة.' : 'No recent visits.'}</p> 
                        )}
                        {!loading && stats?.visits?.map((v: any, i: number) => (
                            <div key={v.id || i} className="flex items-center justify-between p-3 rounded-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-[2px]">
                                        <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold truncate p-1" style={{ background: 'var(--bg-primary)' }}>
                                            {v.trainee_name?.slice(0, 2).toUpperCase() || 'TR'}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{v.trainee_name || `Trainee_${i+1}`}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(v.check_in_time).toLocaleTimeString()} {v.check_out_time ? `- ${new Date(v.check_out_time).toLocaleTimeString()}` : ''}
                                        </p>
                                    </div>
                                </div>
                                
                                {v.check_out_time ? (
                                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)' }}>
                                        <LogOut className="w-3 h-3" /> {isArabic ? 'مغادرة' : 'OUT'}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' }}>
                                        <LogIn className="w-3 h-3" /> {isArabic ? 'دخول' : 'IN'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Subscriber Roster */}
            <div className="rounded-3xl p-6 overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--color-purple)]" />
                    {isArabic ? 'سجل المشتركين الفعالين' : 'Active Subscribers Roster'}
                </h3>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                            <th className="pb-4 font-semibold">{isArabic ? 'المتدرب' : 'Trainee'}</th>
                            <th className="pb-4 font-semibold text-center">{isArabic ? 'بداية الاشتراك' : 'Start Date'}</th>
                            <th className="pb-4 font-semibold text-center">{isArabic ? 'نهاية الاشتراك' : 'End Date'}</th>
                            <th className="pb-4 font-semibold text-right">{isArabic ? 'الأيام المتبقية' : 'Days Left'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={4} className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-purple)]" /></td></tr>}
                        {!loading && stats?.subscribers?.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'لا يوجد مشتركين حاليا.' : 'No active subscribers found.'}</td></tr>
                        )}
                        {!loading && stats?.subscribers?.map((sub: any, i: number) => {
                            const endD = new Date(sub.end_date);
                            const now = new Date();
                            const daysDiff = Math.ceil((endD.getTime() - now.getTime()) / (1000 * 3600 * 24));
                            const isLow = daysDiff <= 5;

                            return (
                                <tr key={sub.id || i} className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <td className="py-4 font-medium text-sm flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                        {sub.trainee_name}
                                    </td>
                                    <td className="py-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                                        {new Date(sub.start_date).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                                        {endD.toLocaleDateString()}
                                    </td>
                                    <td className="py-4 text-sm text-right font-bold" style={{ color: isLow ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                                        {daysDiff} {isArabic ? 'أيام' : 'days'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
