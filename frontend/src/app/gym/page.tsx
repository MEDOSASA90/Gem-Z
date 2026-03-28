'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('gemz_user');
        if (storedUser) setUser(JSON.parse(storedUser));

        const fetchStats = async () => {
            try {
                const res = await GemZApi.Gym.getDashboard();
                if (res.success) {
                    setStats(res.data);
                }
            } catch (err) {
                console.error("Failed to load gym dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center text-primary-fixed">
                <Loader2 className="animate-spin w-16 h-16 mb-4" />
                <span className="font-headline font-bold uppercase tracking-widest">{t("Syncing Kinetics...")}</span>
            </div>
        );
    }

    const availableBal = stats?.availableBal || 0;
    const totalMembers = stats?.totalMembers || 0;
    const visits = stats?.visits || [];
    
    const liveCount = visits.filter((v: any) => !v.check_out_time).length;
    const maxCapacity = 500;
    const capacityPct = Math.min((liveCount / maxCapacity) * 100, 100).toFixed(0);

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body pb-32">
      
<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 h-16">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full overflow-hidden border border-primary/30">
<img alt="Owner Profile" data-alt="Close-up portrait of a professional gym owner in modern athletic wear, sharp lighting, high-end fitness studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlEDfcp5dojgwqTTgOw46CVNek1VdRH6CD8sEfD0EKDGbl0UDc-ISf6LAQSJx1FzeQUmdJWju9YaRu5C2ly9S-My0ZoUiz38EArmeHX-8jHtFnlkyaz9rRAj_RBubl4IXCUg85VGxXp6MEOS6DERXg-61menhx0GQh5CPxD2RNifQCo_8oNFG_59jNiPB5NBKDkVqw30niRv7ZoVdSYBXOCoQ5nWUUc2a68REkHV7rbjI5yzz97sXFcjQXy_hRhn-CbH2m6SClZbb-"/>
</div>
<a href="https://gem-z.shop/"><h1 className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-2xl uppercase">{t("GEM Z")}</h1></a>
</div>
<button onClick={toggleLanguage} className="font-headline font-bold tracking-tight text-[#ff7b00] hover:text-[#ff7b00] transition-colors active:scale-95 duration-200 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            {isArabic ? 'EN' : 'عربي'}
        </button>
</header>
<main className="pt-24 px-6 max-w-7xl mx-auto space-y-8">

<section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
<div className="space-y-1">
<p className="text-on-surface-variant font-label text-sm uppercase tracking-[0.2em]">{t("Dashboard Overview")}</p>
<h2 className="font-headline font-black text-4xl md:text-6xl text-on-surface tracking-tighter uppercase leading-none">
    {t("Good Morning,")}<br/><span className="text-primary-fixed">{user?.fullName || t("Commander")}</span>
</h2>
</div>
<Link href="/gym/scanner" className="group relative bg-primary-fixed text-on-primary-fixed font-headline font-black px-8 py-5 rounded-lg flex items-center gap-4 neon-glow-primary active:scale-95 transition-all duration-300">
<span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
<span className="text-xl tracking-tight uppercase">{t("Launch QR Scanner")}</span>
</Link>
</section>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

<div className="glass-panel p-8 rounded-lg relative overflow-hidden group">
<div className="relative z-10 flex flex-col h-full justify-between">
<div>
<div className="flex justify-between items-start">
<p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">{t("Total Revenue")}</p>
<span className="material-symbols-outlined text-primary-fixed">trending_up</span>
</div>
<h3 className="text-4xl font-black font-headline mt-2">${availableBal.toLocaleString()}</h3>
<p className="text-primary-fixed text-sm mt-1">{t("Liquid Wallet Balance")}</p>
</div>
<div className="mt-8 h-24 flex items-end gap-1">

<svg className="w-full h-full" viewBox="0 0 200 60">
<path className="chart-line-neon" d="M0 50 Q 25 45, 50 30 T 100 35 T 150 15 T 200 5" fill="none" stroke="#ff7b00" strokeWidth="3"></path>
<path d="M0 50 Q 25 45, 50 30 T 100 35 T 150 15 T 200 5 V 60 H 0 Z" fill="url(#grad1)" opacity="0.2"></path>
<defs>
<linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ff7b00"></stop>
<stop offset="100%" stopColor="transparent"></stop>
</linearGradient>
</defs>
</svg>
</div>
</div>
</div>

<div className="glass-panel p-8 rounded-lg relative overflow-hidden group">
<div className="relative z-10 flex flex-col h-full justify-between">
<div>
<div className="flex justify-between items-start">
<p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">{t("Active Members")}</p>
<span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
</div>
<h3 className="text-4xl font-black font-headline mt-2">{totalMembers.toLocaleString()}</h3>
<p className="text-secondary text-sm mt-1">{t("All subscribed users")}</p>
</div>
<div className="mt-8 h-24 flex items-end gap-1">
<svg className="w-full h-full" viewBox="0 0 200 60">
<path className="chart-line-neon" d="M0 55 Q 50 50, 80 40 T 130 20 T 200 10" fill="none" stroke="#fd9831" strokeWidth="3" ></path>
</svg>
</div>
</div>
</div>

<div className="glass-panel p-8 rounded-lg flex flex-col justify-center items-center text-center">
<div className="relative w-32 h-32 flex items-center justify-center">
<svg className="w-full h-full transform -rotate-90">
<circle className="text-surface-container-highest/30" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
<circle className="text-primary-fixed chart-line-neon" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364" strokeDashoffset={364 - ((364 * Number(capacityPct)) / 100)} strokeWidth="8"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="text-2xl font-black font-headline">{capacityPct}%</span>
<span className="text-[10px] uppercase font-label text-on-surface-variant">{t("Live Load")}</span>
</div>
</div>
<p className="mt-4 font-headline font-bold text-on-surface">{capacityPct > '80' ? t("Peak Hour Approaching") : t("Optimal Capacity")}</p>
<p className="text-xs text-on-surface-variant mt-1">{liveCount} {t("people currently in facility")}</p>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-12 gap-6">

<div className="md:col-span-8 glass-panel rounded-lg p-6">
<div className="flex justify-between items-center mb-6">
<h4 className="font-headline font-black text-xl tracking-tight uppercase italic">{t("Live Entrance Log")}</h4>
<button className="text-primary-fixed font-label text-xs uppercase tracking-widest flex items-center gap-2">{t("View All")}<span className="material-symbols-outlined text-sm">arrow_forward</span>
</button>
</div>
<div className="space-y-3">
    {visits.length > 0 ? visits.slice(0, 5).map((visit: any) => (
        <div key={visit.id || Math.random()} className="flex items-center justify-between p-4 rounded-lg bg-surface-container-low/50 hover:bg-surface-container-high transition-colors">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center bg-surface-container-highest">
                    <span className="material-symbols-outlined text-primary-fixed text-xl">person</span>
                </div>
                <div>
                    <p className="font-bold text-on-surface">{visit.trainee_name}</p>
                    <p className="text-xs text-on-surface-variant">{t("Membership: Active")}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-label font-bold text-primary-fixed">{new Date(visit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${visit.check_out_time ? 'bg-surface-container-highest text-surface-variant' : 'bg-primary/10 text-primary'}`}>
                    {visit.check_out_time ? t("Departed") : t("Live")}
                </span>
            </div>
        </div>
    )) : (
        <p className="text-on-surface-variant text-sm p-4 text-center">{t("No recent scans.")}</p>
    )}
</div>
</div>

<div className="md:col-span-4 space-y-6">
<div className="glass-panel rounded-lg p-6 bg-gradient-to-br from-surface-container-highest/60 to-surface-container/20">
<h4 className="font-headline font-black text-lg tracking-tight uppercase italic mb-4">{t("Quick Alerts")}</h4>
<div className="space-y-4">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
<div className="flex-1">
<p className="text-sm font-bold text-on-surface">{t("Inventory Low")}</p>
<p className="text-[10px] text-on-surface-variant">{t("Whey Isolate (Chocolate) - 2 units left")}</p>
</div>
</div>
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
<div className="flex-1">
<p className="text-sm font-bold text-on-surface">{t("Maintenance Due")}</p>
<p className="text-[10px] text-on-surface-variant">{t("Treadmill Zone B (3 units)")}</p>
</div>
</div>
</div>
</div>
</div>
</div>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link href="/gym" className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)]">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
</Link>
<Link href="/ai-coach" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">smart_toy</span>
</Link>
<Link href="/shop" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">shopping_bag</span>
</Link>
<Link href="/squads" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">group</span>
</Link>
<Link href="/wallet" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined">account_balance_wallet</span>
</Link>
</nav>

    </div>
  );
}
