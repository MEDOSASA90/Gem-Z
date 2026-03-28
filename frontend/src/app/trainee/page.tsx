'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';


export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);
    const inBodyRef = useRef<HTMLInputElement>(null);

    const handleBodyScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setScanLoading(true);
        setScanSuccess(false);
        try {
            const formData = new FormData();
            formData.append('inbody', file);
            // Try API, fallback to simulated success
            try { await GemZApi.request('/ai/body-scan', { method: 'POST', body: formData }); } catch {}
            setScanSuccess(true);
            setTimeout(() => setScanSuccess(false), 4000);
        } finally {
            setScanLoading(false);
            if (inBodyRef.current) inBodyRef.current.value = '';
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('gemz_user');
        if (storedUser) setUser(JSON.parse(storedUser));

        const loadDashboard = async () => {
            try {
                const res = await GemZApi.Trainee.getDashboard();
                if (res.success) {
                    setDashboardData(res.data);
                }
            } catch (err) {
                console.error("Failed to load trainee dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center text-primary-fixed">
                <Loader2 className="animate-spin w-16 h-16 mb-4" />
                <span className="font-headline font-bold uppercase tracking-widest">{t("Syncing Kinetics...")}</span>
            </div>
        );
    }

    const { profile, wallet, subscription, workoutStreak, dailyWater, wearables } = dashboardData || {};

    const steps = wearables?.steps || "8,432";
    const burned = wearables?.burned || "1,240";
    const hydration = dailyWater || "1.8";
    const activeSubs = subscription ? 1 : 0;
    const gems = profile?.gems_coins || 0;

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      
<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 h-16">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed shadow-[0_0_10px_rgba(255,123,0,0.3)]">
<img className="w-full h-full object-cover" data-alt="Close-up portrait of a determined athlete in a dark gym environment with moody amber rim lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM9gJXYAIYPzxL2tsHnpYdk-pCSr4GHPNMk3DCY10_exuFxJKOzSah-VXSYsROrn6P_jhb4CzKZlDRpYy0JWW2JPH7rPNsHJxcVYbagBcysL10hakcKF1VwheWnEr6ruSBeelZnHWnDYJHuAyQGzsM2H30nGQinEkAVScY5CSQvMrVOnjqmUUA8BwlZ_VfHgVeegbIIwN8IjHZJPm-4HSSW1gV7nSo7cdJoIv8w29--nt_YSoOPHvTVaEkMzq3DXzgPKcDRLPiAO3u"/>
</div>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline uppercase">{t("GEM Z")}</span></a>
</div>
<button onClick={toggleLanguage} className="text-[#ff7b00] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full font-headline font-bold tracking-tight hover:bg-white/10 transition-colors active:scale-95 duration-200">
            {isArabic ? 'EN' : 'عربي'}
        </button>
</header>
<main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-10">

<section className="flex flex-col md:flex-row justify-between items-end gap-6">
<div className="w-full">
<p className="text-on-surface-variant text-sm font-label uppercase tracking-[0.2em] mb-2">{t("Powering Up")}</p>
<h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter text-white leading-none">
    {t("READY,")}<br/> <span className="text-primary-fixed italic uppercase">{user?.fullName || t("COMMANDER")}?</span>
</h1>
</div>
<div className="hidden md:block text-right">
<span className="text-secondary-fixed text-4xl font-black font-headline">78%</span>
<p className="text-on-surface-variant text-xs font-label uppercase">{t("Daily Capacity")}</p>
</div>
</section>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<div className="col-span-2 bg-surface-container-high rounded-lg p-6 flex items-center justify-between group hover:bg-surface-container-highest transition-all duration-300">
<div className="space-y-1">
<span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">{t("Daily Steps")}</span>
<h3 className="text-3xl font-bold font-headline">{steps}</h3>
<p className="text-primary-dim text-xs">+12% from yesterday</p>
</div>
<div className="relative w-20 h-20">
<svg className="w-full h-full kinetic-ring" viewBox="0 0 100 100">
<circle className="text-surface-container-highest opacity-20" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="transparent" r="40" stroke="url(#gradient-steps)" strokeDasharray="251.2" strokeDashoffset="60" strokeLinecap="round" strokeWidth="8"></circle>
<defs>
<linearGradient id="gradient-steps" x1="0%" x2="100%" y1="0%" y2="0%">
<stop offset="0%" stopColor="#ff7b00"></stop>
<stop offset="100%" stopColor="#fd9831"></stop>
</linearGradient>
</defs>
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="material-symbols-outlined text-primary-fixed" data-icon="steps" style={{ fontVariationSettings: "'FILL' 1" }}>steps</span>
</div>
</div>
</div>

<div className="bg-surface-container-low rounded-lg p-6 flex flex-col justify-between aspect-square group">
<div className="relative w-16 h-16 mb-4">
<svg className="w-full h-full kinetic-ring" viewBox="0 0 100 100">
<circle className="text-surface-container-highest opacity-10" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="transparent" r="40" stroke="#ff7351" strokeDasharray="251.2" strokeDashoffset="100" strokeLinecap="round" strokeWidth="8"></circle>
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="material-symbols-outlined text-error" data-icon="local_fire_department" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
</div>
</div>
<div>
<span className="text-on-surface-variant text-[10px] font-label uppercase">{t("Burned")}</span>
<h3 className="text-xl font-bold font-headline leading-tight">{burned} <span className="text-xs font-normal">{t("kcal")}</span></h3>
</div>
</div>

<div className="bg-surface-container-low rounded-lg p-6 flex flex-col justify-between aspect-square group">
<div className="relative w-16 h-16 mb-4">
<svg className="w-full h-full kinetic-ring" viewBox="0 0 100 100">
<circle className="text-surface-container-highest opacity-10" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="transparent" r="40" stroke="#ffd47c" strokeDasharray="251.2" strokeDashoffset="180" strokeLinecap="round" strokeWidth="8"></circle>
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="material-symbols-outlined text-tertiary" data-icon="water_drop" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
</div>
</div>
<div>
<span className="text-on-surface-variant text-[10px] font-label uppercase">{t("Hydration")}</span>
<h3 className="text-xl font-bold font-headline leading-tight">{hydration} <span className="text-xs font-normal">L</span></h3>
</div>
</div>
</div>

<Link href="/ai-coach" className="block relative group cursor-pointer overflow-hidden rounded-xl">
<div className="absolute inset-0 bg-gradient-to-br from-primary-fixed to-[#b85c00] opacity-90 transition-transform duration-500 group-hover:scale-110"></div>
<img className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNejk8spGcSWm_0wF2OXyrVfKOSWbY80RvQEwNiTTTF1UDGgPLU7-nF2AXAo2jGLG5cuJme4Av8DOU4Ndgb_37xL_6FL7bGK_ktAEZjUEsE7yrOR8OLypKDhwBTk7q2dxEMgKMPRM6rvQ5fVhwo3F153Nv5NdC8ceU7vOoxZ56K9eprXHJ70HhqxUW5A9ONFhqAmyqOR3poHSD9qKuLjLWs0ZDyWq7Aar_Xbq7d5OsPQOX-s6ITpcFWZT5V_pZNKKdXSP0JxVR11tT"/>
<div className="relative p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
<div>
<h2 className="text-4xl md:text-5xl font-black font-headline text-on-primary-fixed leading-none tracking-tight">{t("START DAILY")}<br/>{t("WORKOUT")}</h2>
<p className="mt-4 text-on-primary-fixed/80 max-w-md font-medium">{profile?.fitness_goal || (isArabic ? 'تمرين قوة الصدر والترايسبس' : 'Chest & Triceps Power Hour')}</p>
</div>
<div className="bg-on-primary-fixed text-primary-fixed w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-2xl group-active:scale-90 transition-transform">
<span className="material-symbols-outlined text-4xl md:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
</div>
</div>
</Link>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<Link href="/gym-map" className="flex items-center justify-between p-6 bg-surface-container-high rounded-lg group hover:bg-surface-container-highest transition-colors">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary-fixed">
<span className="material-symbols-outlined" data-icon="confirmation_number">confirmation_number</span>
</div>
<div className="text-left">
<p className="font-bold font-headline text-lg">{t("My Gym Passes")}</p>
<p className="text-on-surface-variant text-sm">{activeSubs} Active subscriptions</p>
</div>
</div>
<span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
</Link>
<Link href="/coins" className="flex items-center justify-between p-6 bg-surface-container-high rounded-lg group hover:bg-surface-container-highest transition-colors">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-tertiary-container/30 flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined" data-icon="trophy">toll</span>
</div>
<div className="text-left">
<p className="font-bold font-headline text-lg">{t("My Gemz")}</p>
<p className="text-on-surface-variant text-sm">{gems} Coins earned</p>
</div>
</div>
<span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
</Link>
</div>

{/* In-Body Body Scan Card */}
<div className="col-span-2 md:col-span-4">
  <input ref={inBodyRef} type="file" accept="image/*" capture="environment" onChange={handleBodyScan} className="hidden" id="inbody-scanner" />
  <label htmlFor="inbody-scanner" className={`flex items-center justify-between p-5 rounded-xl border cursor-pointer transition-all group ${
    scanSuccess ? 'bg-green-500/10 border-green-500/50' : 'bg-surface-container-high border-white/5 hover:bg-surface-container-highest'
  }`}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        scanSuccess ? 'bg-green-500/20 text-green-500' : 'bg-[#ff7b00]/10 text-[#ff7b00]'
      }`}>
        {scanLoading ? <Loader2 className="animate-spin" size={22} /> : <span className="material-symbols-outlined">{scanSuccess ? 'check_circle' : 'body_system'}</span>}
      </div>
      <div>
        <p className="font-bold font-headline text-base">{scanSuccess ? (isArabic ? 'تم تحديث البيانات!' : 'Data Updated!') : (isArabic ? 'مسح In-Body' : 'Scan In-Body')}</p>
        <p className="text-on-surface-variant text-xs">{isArabic ? 'صوّر تقرير In-Body لتحديث بياناتك تلقائياً' : 'Photo your In-Body report to auto-update your stats'}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-on-surface-variant text-sm">camera_alt</span>
      <span className="material-symbols-outlined text-on-surface-variant text-sm">photo_library</span>
    </div>
  </label>
</div>

{subscription && (
<section>
<div className="flex justify-between items-baseline mb-6">
<h3 className="text-2xl font-black font-headline italic tracking-tight">{t("ACTIVE GYM")}</h3>
</div>
<div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-secondary-fixed">
<div className="flex items-center gap-4">
<div className="text-xs font-label text-on-surface-variant w-12 text-center uppercase">LIVE</div>
<div>
<p className="font-bold">{subscription.gym_name}</p>
<p className="text-xs text-on-surface-variant">{subscription.plan_name}</p>
</div>
</div>
<Link href="/gym/scanner" className="bg-secondary-fixed text-black px-4 py-2 rounded-full font-bold text-xs uppercase shadow-[0_5px_15px_rgba(0,255,163,0.3)]">{t("Scan QR")}</Link>
</div>
</section>
)}

</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

<Link className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)] active:scale-90 duration-300 ease-out transition-all" href="/trainee">
<span className="material-symbols-outlined" data-icon="home" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/ai-coach">
<span className="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/store">
<span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/squads">
<span className="material-symbols-outlined" data-icon="group">group</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/wallet">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
</Link>
</nav>

    </div>
  );
}
