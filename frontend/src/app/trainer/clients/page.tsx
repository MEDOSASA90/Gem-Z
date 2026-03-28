'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { GemZApi } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function TrainerClientsPage() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await GemZApi.request('/trainer/clients');
                if (res.success) {
                    setClients(res.clients || []);
                }
            } catch (err) {
                // Use demo data if API not ready
                setClients([
                    { id: 1, name: 'Ahmed Hassan', email: 'ahmed@example.com', phone: '+20 100 123 4567', plan: 'Build Muscle', status: 'active', joined: '2026-01-15', sessions: 24, progress: 78 },
                    { id: 2, name: 'Sara Mohamed', email: 'sara@example.com', phone: '+20 101 234 5678', plan: 'Fat Loss', status: 'active', joined: '2026-02-01', sessions: 16, progress: 62 },
                    { id: 3, name: 'Omar Ali', email: 'omar@example.com', phone: '+20 102 345 6789', plan: 'Athletic Performance', status: 'paused', joined: '2025-12-10', sessions: 32, progress: 91 },
                    { id: 4, name: 'Nour Youssef', email: 'nour@example.com', phone: '+20 103 456 7890', plan: 'Build Muscle', status: 'active', joined: '2026-03-01', sessions: 8, progress: 35 },
                    { id: 5, name: 'Khaled Ibrahim', email: 'khaled@example.com', phone: '+20 104 567 8901', plan: 'Fat Loss', status: 'expired', joined: '2025-11-20', sessions: 40, progress: 95 },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.plan.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        paused: clients.filter(c => c.status === 'paused').length,
    };

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
<Link className="text-[#ff7b00] font-bold tracking-tight transition-colors" href="/trainer/clients">{t("Clients")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors font-bold tracking-tight" href="/trainer/revenue">{t("Revenue")}</Link>
</nav>
<button onClick={toggleLanguage} className="text-[#ff7b00] font-headline font-bold tracking-tight active:scale-95 duration-200 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">{isArabic ? 'EN' : 'عربي'}</button>
</div>
</header>

<main className="pt-24 pb-32 px-6 max-w-7xl mx-auto space-y-8">

{/* Stats Cards */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-surface-container-low p-8 rounded-lg space-y-3 border-l-4 border-[#ff7b00]">
<span className="material-symbols-outlined text-[#ff7b00] text-3xl">group</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{isArabic ? 'إجمالي العملاء' : 'Total Clients'}</p>
<p className="text-4xl font-black font-headline text-white">{stats.total}</p>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-lg space-y-3 border-l-4 border-green-500">
<span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{isArabic ? 'نشطين' : 'Active'}</p>
<p className="text-4xl font-black font-headline text-white">{stats.active}</p>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-lg space-y-3 border-l-4 border-yellow-500">
<span className="material-symbols-outlined text-yellow-500 text-3xl">pause_circle</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{isArabic ? 'متوقفين' : 'Paused'}</p>
<p className="text-4xl font-black font-headline text-white">{stats.paused}</p>
</div>
</div>
</section>

{/* Client List */}
<section className="space-y-6">
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
<h2 className="text-3xl font-black font-headline tracking-tight text-white italic">{isArabic ? 'قائمة العملاء' : 'CLIENT ROSTER'}</h2>
<div className="relative flex-1 max-w-md">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input 
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full bg-surface-container-low border-b-2 border-outline-variant/20 focus:border-[#ff7b00] transition-all rounded-t-lg px-12 py-3 outline-none text-sm" 
    placeholder={isArabic ? 'ابحث عن عميل...' : 'Search clients...'} 
    type="text"
/>
</div>
</div>

<div className="bg-surface-container-low/20 rounded-xl overflow-hidden glass-panel">
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead>
<tr className="bg-surface-container-low/60 text-on-surface-variant">
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'العميل' : 'Client'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'الهاتف' : 'Phone'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'الخطة' : 'Plan'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'الجلسات' : 'Sessions'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'التقدم' : 'Progress'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em]">{isArabic ? 'الحالة' : 'Status'}</th>
<th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.2em] text-right">{isArabic ? 'إجراء' : 'Action'}</th>
</tr>
</thead>
<tbody className="divide-y divide-white/5">
{filteredClients.map((client) => (
<tr key={client.id} className="hover:bg-[#ff7b00]/5 transition-colors">
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff7b00]/30 to-[#ff7b00]/10 flex items-center justify-center text-[#ff7b00] font-bold text-sm">
{client.name.split(' ').map((n: string) => n[0]).join('')}
</div>
<div>
<p className="font-bold text-white">{client.name}</p>
<p className="text-xs text-on-surface-variant">{client.email}</p>
</div>
</div>
</td>
<td className="px-6 py-5">
<span dir="ltr" className="text-sm text-on-surface-variant font-mono">{client.phone || '—'}</span>
</td>
<td className="px-6 py-5">
<span className="text-xs px-3 py-1 rounded-full bg-white/5 font-bold text-on-surface-variant">{client.plan}</span>
</td>
<td className="px-6 py-5 font-headline font-black text-white">{client.sessions}</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="h-1.5 w-20 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-[#ff7b00] to-green-500 rounded-full transition-all" style={{ width: `${client.progress}%` }}></div>
</div>
<span className="text-xs font-bold text-on-surface-variant">{client.progress}%</span>
</div>
</td>
<td className="px-6 py-5">
<span className={`text-xs px-3 py-1 rounded-full font-bold ${
    client.status === 'active' ? 'bg-green-500/10 text-green-500' :
    client.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' :
    'bg-red-500/10 text-red-500'
}`}>
{client.status === 'active' ? (isArabic ? 'نشط' : 'Active') :
 client.status === 'paused' ? (isArabic ? 'متوقف' : 'Paused') :
 (isArabic ? 'منتهي' : 'Expired')}
</span>
</td>
<td className="px-6 py-5 text-right">
<Link href="/chat" className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">chat</Link>
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
<Link href="/trainer/clients" className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)]">
<span className="material-symbols-outlined">group</span>
</Link>
<Link href="/trainer/ai-generator" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">smart_toy</span>
</Link>
<Link href="/trainer/revenue" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
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
