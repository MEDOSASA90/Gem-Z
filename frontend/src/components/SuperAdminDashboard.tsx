'use client';
import React, { useState } from 'react';
import { Globe, Activity, AlertTriangle, ShieldCheck, Ticket, Settings, Save, Link as LinkIcon, Edit2, CheckCircle, MessageSquare, CreditCard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function SuperAdminDashboard() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const [metrics] = useState({
        revenue: 1245000.75,
        activeUsers: 84320,
        disputes: 12,
        platformHealth: 99.9
    });

    const [activeTab, setActiveTab] = useState('overview');

    const [settings, setSettings] = useState({
        platformFee: '20',
        withdrawalFee: '1.5',
        maintenanceMode: false,
    });

    const [socials, setSocials] = useState({
        instagram: 'https://instagram.com/gemz',
        facebook: 'https://facebook.com/gemz',
        twitter: 'https://twitter.com/gemz',
    });

    const formatCurrency = (val: number) => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-[var(--color-primary)]" /> {isArabic ? 'نقطة قيادة منصة GEM Z' : 'GEM Z Command Node'}
                    </h1>
                    <p className="mt-2 text-sm uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic ? 'تصريح مستوى ٥' : 'Level 5 Clearance'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button onClick={toggleLanguage} className="py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <Globe className="w-4 h-4" /> <span className="text-sm font-medium">{isArabic ? 'EN' : 'عربي'}</span>
                    </button>
                    <div className="flex items-center gap-3 py-2.5 px-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                        <span className="text-sm font-mono text-[var(--color-primary)]">
                            {isArabic ? 'النظام متصل • ' : 'System Online • '} {metrics.platformHealth}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                {[
                    { id: 'overview', icon: Activity, labelEn: 'Overview', labelAr: 'نظرة عامة' },
                    { id: 'support', icon: MessageSquare, labelEn: 'Support Inbox', labelAr: 'صندوق الدعم' },
                    { id: 'settings', icon: Settings, labelEn: 'Platform Settings', labelAr: 'إعدادات المنصة' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shrink-0`}
                        style={{
                            background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--bg-card)',
                            color: activeTab === tab.id ? '#000' : 'var(--text-secondary)',
                            border: `1px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'var(--border-subtle)'}`
                        }}
                    >
                        <tab.icon size={16} /> {isArabic ? tab.labelAr : tab.labelEn}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <Globe className={`absolute ${isArabic ? '-left-4' : '-right-4'} -bottom-4 w-32 h-32 opacity-5`} />
                            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'المستخدمين' : 'Total Users'}</h3>
                            <p className="text-4xl font-bold font-mono tracking-tight">{formatCurrency(metrics.activeUsers)}</p>
                        </div>

                        <div className="rounded-2xl p-6 relative overflow-hidden md:col-span-2 shadow-[0_0_30px_rgba(var(--color-primary-rgb), 0.3] border-t border-t-[var(--color-primary)]/30" style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الإيرادات المتراكمة للمنصة' : 'Cumulative Platform Revenue'}</h3>
                                    <p className="text-4xl font-bold font-mono tracking-tight text-[var(--color-primary)]" dir="ltr">
                                        EGP {formatCurrency(metrics.revenue)}
                                    </p>
                                </div>
                                <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl"><Activity className="w-6 h-6" /></div>
                            </div>
                            <div className="flex gap-4 text-xs font-mono mt-4" style={{ color: 'var(--text-muted)' }}>
                                <span>{isArabic ? 'من المتدربين: ٤٥٪' : 'Trainee: 45%'}</span>
                                <span>{isArabic ? 'الصالات: ٣٠٪' : 'Gym Cuts: 30%'}</span>
                                <span>{isArabic ? 'المتاجر: ٢٥٪' : 'Store: 25%'}</span>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 relative overflow-hidden border-t border-t-[var(--color-danger)]/30" style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'النزاعات المفتوحة' : 'Open Disputes'}</h3>
                            <div className="flex items-center justify-between">
                                <p className="text-4xl font-bold font-mono text-[var(--color-danger)]">{metrics.disputes}</p>
                                <button onClick={() => setActiveTab('support')} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] font-bold">
                                    {isArabic ? 'عرض' : 'View'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Ledger */}
                        <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-[var(--color-secondary)]" />
                                    {isArabic ? 'دفتر الأستاذ المباشر' : 'Live Ledger Stream'}
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[400px] p-2">
                                {[
                                    { id: 'TXN-998', type: 'Payout', user: 'Gold Gym', amount: '-4,500 EGP', time: '2m ago', fee: 'N/A' },
                                    { id: 'TXN-997', type: 'Subscription', user: 'Ahmed Trainer', amount: '+499 EGP', time: '14m ago', fee: 'Platform (100%)' },
                                    { id: 'TXN-996', type: 'Store Sale', user: 'Muscle Pharm', amount: '+12,000 EGP', time: '1h ago', fee: '12% Cut' }
                                ].map((log, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-xl" style={{ borderColor: 'var(--border-subtle)' }}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>{log.id}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--border-medium)', color: 'var(--text-primary)' }}>{log.type}</span>
                                            </div>
                                            <p className="text-sm font-medium">{log.user}</p>
                                        </div>
                                        <div className={`text-${isArabic ? 'left' : 'right'}`}>
                                            <span className="block font-bold" dir="ltr" style={{ color: 'var(--text-primary)' }}>{log.amount}</span>
                                            <span className="text-xs text-[var(--color-primary)]" dir="ltr">{isArabic ? 'رسوم: ' : 'Fee: '}{log.fee}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Disputes */}
                        <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Ticket className="w-5 h-5 text-gray-400" />
                                    {isArabic ? 'تذاكر الدعم المؤخرة' : 'Recent Support Tickets'}
                                </h3>
                            </div>
                            <table className={`w-full text-${isArabic ? 'right' : 'left'} text-sm flex-1`}>
                                <thead className="uppercase font-mono text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                                    <tr>
                                        <th className="px-6 py-4">{isArabic ? 'التذكرة' : 'Ticket'}</th>
                                        <th className="px-6 py-4">{isArabic ? 'الحالة' : 'Status'}</th>
                                        <th className="px-6 py-4">{isArabic ? 'الأولوية' : 'Priority'}</th>
                                        <th className={`px-6 py-4 text-${isArabic ? 'left' : 'right'}`}>{isArabic ? 'إجراء' : 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                                    {[
                                        { id: 'TKT-992', status: 'Open', priority: 'High', statusAr: 'مفتوح', priorityAr: 'مستعجل' },
                                        { id: 'TKT-843', status: 'Pending', priority: 'Medium', statusAr: 'قيد الانتظار', priorityAr: 'متوسط' },
                                        { id: 'TKT-112', status: 'Open', priority: 'Low', statusAr: 'مفتوح', priorityAr: 'منخفض' }
                                    ].map((ticket, i) => (
                                        <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-mono font-medium">{ticket.id}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs ${ticket.status === 'Open' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'bg-gray-800 text-gray-400'}`}>
                                                    {isArabic ? ticket.statusAr : ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-1 ${ticket.priority === 'High' ? 'text-[var(--color-danger)]' : 'text-gray-400'}`}>
                                                    {ticket.priority === 'High' && <AlertTriangle className="w-3 h-3" />}
                                                    {isArabic ? ticket.priorityAr : ticket.priority}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-${isArabic ? 'left' : 'right'}`}>
                                                <button onClick={() => setActiveTab('support')} className="text-xs px-3 py-1.5 rounded transition-colors font-semibold" style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                                    {isArabic ? 'مراجعة' : 'Review'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PLATFORM SETTINGS */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Financial & General Settings */}
                    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <Settings className="text-[var(--color-secondary)]" />
                            <h2 className="text-xl font-bold">{isArabic ? 'الإعدادات العامة' : 'General Settings'}</h2>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'نسبة عمولة المنصة (%)' : 'Platform Fee Percentage (%)'}
                                </label>
                                <div className="flex gap-3">
                                    <input type="number" value={settings.platformFee} onChange={e => setSettings({ ...settings, platformFee: e.target.value })} className="flex-1 px-4 py-3 rounded-xl text-sm font-mono input-base" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'رسوم السحب للمدربين (%)' : 'Withdrawal Fee (%)'}
                                </label>
                                <div className="flex gap-3">
                                    <input type="number" value={settings.withdrawalFee} onChange={e => setSettings({ ...settings, withdrawalFee: e.target.value })} className="flex-1 px-4 py-3 rounded-xl text-sm font-mono input-base" />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold">{isArabic ? 'وضع الصيانة' : 'Maintenance Mode'}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'يوقف دخول المستخدمين مؤقتاً' : 'Temporarily disables user login'}</p>
                                </div>
                                <button onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-[var(--color-danger)]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.maintenanceMode ? (isArabic ? 'right-7' : 'left-7') : (isArabic ? 'right-1' : 'left-1')}`} />
                                </button>
                            </div>

                            <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-black font-bold transition-opacity hover:opacity-90" style={{ background: 'var(--color-secondary)' }}>
                                <Save size={18} /> {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Social Links Manager */}
                    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <LinkIcon className="text-[var(--color-purple)]" />
                            <h2 className="text-xl font-bold">{isArabic ? 'وسائل التواصل' : 'Social Media Links'}</h2>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'instagram', label: 'Instagram', val: socials.instagram },
                                { id: 'facebook', label: 'Facebook', val: socials.facebook },
                                { id: 'twitter', label: 'Twitter (X)', val: socials.twitter },
                            ].map(item => (
                                <div key={item.id}>
                                    <label className="text-sm font-medium mb-1.5 block capitalize" style={{ color: 'var(--text-secondary)' }}>{item.label}</label>
                                    <div className="flex items-center gap-3 relative">
                                        <input type="url" value={item.val} onChange={e => setSocials({ ...socials, [item.id]: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm input-base pe-10" />
                                        <Edit2 size={16} className="absolute end-4" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </div>
                            ))}

                            <button className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition-opacity hover:opacity-90" style={{ background: 'var(--color-purple)' }}>
                                <CheckCircle size={18} /> {isArabic ? 'تحديث الروابط' : 'Update Links'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SUPPORT INBOX */}
            {activeTab === 'support' && (
                <div className="flex flex-col md:flex-row gap-6 h-[70vh]">
                    {/* Tickets List */}
                    <div className="w-full md:w-1/3 rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <h2 className="font-bold flex items-center gap-2"><Ticket size={18} className="text-[var(--color-warning)]" /> {isArabic ? 'صندوق الوارد' : 'Inbox'}</h2>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {[
                                { id: 'TKT-992', user: 'Ahmed Trainer', issue: 'Payment not received for client plan', status: 'Open', priority: 'High', time: '10 mins ago' },
                                { id: 'TKT-843', user: 'Gold Gym Elite', issue: 'QR scanner hardware error', status: 'Pending', priority: 'Medium', time: '2 hrs ago' },
                                { id: 'TKT-112', user: 'Muscle Pharm', issue: 'Updating store tax info', status: 'Resolved', priority: 'Low', time: '1 day ago' }
                            ].map((t, i) => (
                                <div key={i} className="p-4 border-b cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-subtle)', borderLeft: i === 0 ? '4px solid var(--color-danger)' : '4px solid transparent' }}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{t.id}</span>
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.time}</span>
                                    </div>
                                    <p className="font-bold text-sm mb-1">{t.user}</p>
                                    <p className="text-xs truncate mb-2" style={{ color: 'var(--text-secondary)' }}>{t.issue}</p>
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-[var(--color-danger)]/10 text-[var(--color-danger)]">{t.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="w-full md:w-2/3 rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div>
                                <h3 className="font-bold text-lg">TKT-992 • Ahmed Trainer</h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Payment not received for client plan</p>
                            </div>
                            <button className="px-4 py-2 rounded-lg text-sm font-bold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 hover:bg-[#34C759] hover:text-white transition-all">
                                {isArabic ? 'إغلاق التذكرة' : 'Mark Resolved'}
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            <div className={`p-4 rounded-xl max-w-[80%] ${isArabic ? 'ml-auto' : 'mr-auto'}`} style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}>
                                <p className="text-xs mb-1 font-bold" style={{ color: 'var(--text-secondary)' }}>Ahmed Trainer • 10:14 AM</p>
                                <p className="text-sm">Hello admin, my recent client transfer of 1500 EGP is showing as 'Pending' in my wallet for 2 days now. Can you check?</p>
                            </div>

                            <div className={`p-4 rounded-xl max-w-[80%] flex flex-col ${isArabic ? 'mr-auto items-end bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'ml-auto items-end bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`} style={{ border: '1px solid rgba(var(--color-primary-rgb), 0.25)' }}>
                                <p className="text-xs mb-1 font-bold">Admin Support • 10:20 AM</p>
                                <p className="text-sm font-medium">Hello Ahmed. The bank is currently processing the settlement batch. It should reflect in your balance by 2 PM today.</p>
                            </div>
                        </div>

                        <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                            <input type="text" placeholder={isArabic ? 'اكتب ردك هنا...' : 'Type your reply...'} className="flex-1 px-4 py-3 rounded-xl text-sm input-base focus:border-[var(--color-primary)]" />
                            <button className="px-6 py-3 rounded-xl font-bold text-black transition-opacity hover:opacity-90 leading-none" style={{ background: 'var(--color-primary)' }}>
                                {isArabic ? 'إرسال' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
