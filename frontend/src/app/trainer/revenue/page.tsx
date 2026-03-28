'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { GemZApi } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function TrainerRevenuePage() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalRevenue: 0, thisMonth: 0, avgPerClient: 0 });

    useEffect(() => {
        const fetchRevenue = async () => {
            try {
                const res = await GemZApi.request('/trainer/revenue');
                if (res.success) {
                    setTransactions(res.transactions || []);
                    setStats(res.stats || {});
                }
            } catch (err) {
                // Use demo data
                setTransactions([
                    { id: 1, client: 'Ahmed Hassan', type: 'subscription', amount: 1500, date: '2026-03-25', status: 'completed' },
                    { id: 2, client: 'Sara Mohamed', type: 'session', amount: 300, date: '2026-03-24', status: 'completed' },
                    { id: 3, client: 'Omar Ali', type: 'subscription', amount: 1500, date: '2026-03-20', status: 'completed' },
                    { id: 4, client: 'Nour Youssef', type: 'session', amount: 300, date: '2026-03-18', status: 'pending' },
                    { id: 5, client: 'Khaled Ibrahim', type: 'subscription', amount: 2000, date: '2026-03-15', status: 'completed' },
                    { id: 6, client: 'Layla Adel', type: 'ai_plan', amount: 500, date: '2026-03-12', status: 'completed' },
                    { id: 7, client: 'Youssef Tarek', type: 'session', amount: 300, date: '2026-03-10', status: 'refunded' },
                ]);
                setStats({ totalRevenue: 42890, thisMonth: 6400, avgPerClient: 1280 });
            } finally {
                setLoading(false);
            }
        };
        fetchRevenue();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
            <Loader2 className="animate-spin text-[#ff7b00]" size={48} />
        </div>
    );

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">

<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex items-center gap-4">
<Link href="/trainer" className="text-on-surface-variant hover:text-white transition-colors">
<span className="material-symbols-outlined">arrow_back</span>
</Link>
<a href="https://gem-z.shop/"><h1 className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-2xl uppercase">{t("GEM Z")}</h1></a>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex gap-8">
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors font-bold tracking-tight" href="/trainer/clients">{t("Clients")}</Link>
<Link className="text-[#ff7b00] font-bold tracking-tight transition-colors" href="/trainer/revenue">{t("Revenue")}</Link>
</nav>
<button onClick={toggleLanguage} className="text-[#ff7b00] font-headline font-bold tracking-tight active:scale-95 duration-200 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">{isArabic ? 'EN' : 'عربي'}</button>
</div>
</header>

<main className="pt-24 pb-32 px-6 max-w-7xl mx-auto space-y-8">

{/* Revenue Header */}
<section>
<div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
<div className="space-y-1">
<span className="text-secondary uppercase tracking-[0.2em] text-[10px] font-bold">{isArabic ? 'نظرة عامة على الأداء' : 'Performance Overview'}</span>
<h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter text-white">{isArabic ? 'الإيرادات' : 'REVENUE'}</h2>
</div>
<div className="flex gap-2 bg-surface-container-low p-1 rounded-full">
<button onClick={() => setPeriod('weekly')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${period === 'weekly' ? 'bg-primary-container text-on-primary-container shadow-lg' : 'text-on-surface-variant hover:text-white'}`}>{isArabic ? 'أسبوعي' : 'Weekly'}</button>
<button onClick={() => setPeriod('monthly')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${period === 'monthly' ? 'bg-primary-container text-on-primary-container shadow-lg' : 'text-on-surface-variant hover:text-white'}`}>{isArabic ? 'شهري' : 'Monthly'}</button>
</div>
</div>

{/* Revenue Chart */}
<div className="relative bg-surface-container-low/40 rounded-xl p-8 glass-panel border border-white/5 h-[300px] overflow-hidden">
<div className="absolute inset-0 opacity-20 pointer-events-none">
<div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10"></div>
<div className="absolute top-1/4 left-0 w-full h-[1px] bg-white/5"></div>
<div className="absolute top-3/4 left-0 w-full h-[1px] bg-white/5"></div>
</div>
<svg className="w-full h-full overflow-visible" viewBox="0 0 1000 250">
<defs>
<linearGradient id="revenueGradient" x1="0%" x2="100%" y1="0%" y2="0%">
<stop offset="0%" stopColor="#ff7b00"></stop>
<stop offset="100%" stopColor="#00ffa3"></stop>
</linearGradient>
<filter id="glowRevenue">
<feGaussianBlur result="coloredBlur" stdDeviation="4"></feGaussianBlur>
<feMerge>
<feMergeNode in="coloredBlur"></feMergeNode>
<feMergeNode in="SourceGraphic"></feMergeNode>
</feMerge>
</filter>
</defs>
<path d="M0,200 Q80,180 160,190 T320,120 T480,150 T640,80 T800,50 T1000,30" fill="none" filter="url(#glowRevenue)" stroke="url(#revenueGradient)" strokeLinecap="round" strokeWidth="4"></path>
<path d="M0,200 Q80,180 160,190 T320,120 T480,150 T640,80 T800,50 T1000,30 V250 H0 Z" fill="url(#revenueGradient)" fillOpacity="0.05"></path>
<circle cx="1000" cy="30" fill="#ff7b00" filter="url(#glowRevenue)" r="6"></circle>
</svg>
<div className="absolute top-8 left-8 flex flex-col">
<span className="text-3xl font-black font-headline text-white">{stats.totalRevenue.toLocaleString()} EGP</span>
<span className="text-[#ff7b00] font-bold text-sm">+18.2% {isArabic ? 'عن الفترة السابقة' : 'vs last period'}</span>
</div>
</div>
</section>

{/* Stats Cards */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-surface-container-low p-8 rounded-lg space-y-3 border-l-4 border-[#ff7b00]">
<span className="material-symbols-outlined text-[#ff7b00] text-3xl">payments</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{isArabic ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
<p className="text-3xl font-black font-headline text-white">{stats.totalRevenue.toLocaleString()} EGP</p>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-lg space-y-3 border-l-4 border-secondary">
<span className="material-symbols-outlined text-secondary text-3xl">trending_up</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{isArabic ? 'هذا الشهر' : 'This Month'}</p>
<p className="text-3xl font-black font-headline text-white">{stats.thisMonth.toLocaleString()} EGP</p>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-lg space-y-3 border-l-4 border-tertiary">
<span className="material-symbols-outlined text-tertiary text-3xl">person</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{isArabic ? 'متوسط لكل عميل' : 'Avg Per Client'}</p>
<p className="text-3xl font-black font-headline text-white">{stats.avgPerClient.toLocaleString()} EGP</p>
</div>
</div>
</section>

{/* Transactions */}
<section className="space-y-6">
<h3 className="text-3xl font-black font-headline tracking-tight text-white italic">{isArabic ? 'المعاملات' : 'TRANSACTIONS'}</h3>
<div className="bg-surface-container-low/20 rounded-xl overflow-hidden glass-panel">
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead>
<tr className="bg-surface-container-low/60 text-on-surface-variant">
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'العميل' : 'Client'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'النوع' : 'Type'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'المبلغ' : 'Amount'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'التاريخ' : 'Date'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'الحالة' : 'Status'}</th>
</tr>
</thead>
<tbody className="divide-y divide-white/5">
{transactions.map((tx) => (
<tr key={tx.id} className="hover:bg-[#ff7b00]/5 transition-colors">
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff7b00]/30 to-[#ff7b00]/10 flex items-center justify-center text-[#ff7b00] font-bold text-xs">
{tx.client.split(' ').map((n: string) => n[0]).join('')}
</div>
<span className="font-bold text-white">{tx.client}</span>
</div>
</td>
<td className="px-6 py-5">
<span className={`text-xs px-3 py-1 rounded-full font-bold ${
    tx.type === 'subscription' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' :
    tx.type === 'session' ? 'bg-blue-500/10 text-blue-400' :
    'bg-purple-500/10 text-purple-400'
}`}>
{tx.type === 'subscription' ? (isArabic ? 'اشتراك' : 'Subscription') :
 tx.type === 'session' ? (isArabic ? 'جلسة' : 'Session') :
 (isArabic ? 'خطة AI' : 'AI Plan')}
</span>
</td>
<td className="px-6 py-5 font-headline font-black text-lg text-white">{tx.amount} EGP</td>
<td className="px-6 py-5 text-on-surface-variant text-sm">{tx.date}</td>
<td className="px-6 py-5">
<span className={`text-xs px-3 py-1 rounded-full font-bold ${
    tx.status === 'completed' ? 'bg-green-500/10 text-green-500' :
    tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
    'bg-red-500/10 text-red-500'
}`}>
{tx.status === 'completed' ? (isArabic ? 'مكتمل' : 'Completed') :
 tx.status === 'pending' ? (isArabic ? 'معلق' : 'Pending') :
 (isArabic ? 'مسترد' : 'Refunded')}
</span>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
</section>

</main>

{/* Bottom Nav */}
<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link href="/trainer" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
</Link>
<Link href="/trainer/clients" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">group</span>
</Link>
<Link href="/trainer/ai-generator" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">smart_toy</span>
</Link>
<Link href="/trainer/revenue" className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)]">
<span className="material-symbols-outlined">account_balance_wallet</span>
</Link>
<Link href="/chat" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">chat</span>
</Link>
</nav>

<div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ff7b00]/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

    </div>
  );
}
