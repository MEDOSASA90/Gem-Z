'use client';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [inBodyUploaded, setInBodyUploaded] = useState(false);
    const [inBodyLoading, setInBodyLoading] = useState(false);
    const inBodyRef = useRef<HTMLInputElement>(null);
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const handleInBodyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setInBodyLoading(true);
        try {
            // Simulate upload - replace with actual API call
            await new Promise(r => setTimeout(r, 1500));
            setInBodyUploaded(true);
        } finally {
            setInBodyLoading(false);
            if (inBodyRef.current) inBodyRef.current.value = '';
        }
    };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="bg-black/60 backdrop-blur-xl text-[#ff7b00] docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-4">
<Link href="/trainee" className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center overflow-hidden block">
<img className="w-full h-full object-cover" data-alt="Close up portrait of a fit athlete with dramatic lighting and dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpmKEjMN-ap7nM1WEK2qHt6MUaKknhXVAerFW-VfMHO-qDndH-9eYL64gI4VOAxcQqP-ioQecLxU91EpOQSltzUymm6MLfZXA48EKdHm9FqdrK2VmuYvnkHvJY0uMIYgFw735Dv39fTTaxJ0BhkIqfkKsG3Q_pM373CBCC1y1YwxW6_uHRqs3g_U1x77DvNSMAlw55ZHa9JgF4nDpnZIxXK5DP11-WrhHgjmq68BAciLVGgoZhyGv6i8U_iNUuV0RXYhcYu1XlxYmy"/>
</Link>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-['Be_Vietnam_Pro']">{t("GEM Z")}</span></a>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex items-center gap-8 font-['Be_Vietnam_Pro'] font-bold tracking-tight">
<Link className="text-[#ff7b00] transition-colors" href="/ai-coach">{t("Coach")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/shop">{t("Shop")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/social">{t("Feed")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/wallet">{t("Wallet")}</Link>
</nav>
<div className="flex items-center gap-4">
    <button onClick={toggleLanguage} className="text-[#ff7b00] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full font-headline font-bold tracking-tight hover:bg-white/10 transition-colors active:scale-95 duration-200">
        {isArabic ? 'EN' : 'عربي'}
    </button>
    <button translate="no" className="material-symbols-outlined text-[#ff7b00] scale-95 active:duration-150" onClick={() => alert(isArabic ? 'التنبيهات سيتم تفعيلها قريباً 🔔' : 'Notifications coming soon 🔔')}>notifications</button>
</div>
</div>
</header>
<main className="max-w-7xl mx-auto px-6 pt-8 pb-32">

{/* In-Body Monthly Upload - Mandatory */}
<div className={`mb-8 p-5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${inBodyUploaded ? 'border-green-500/50 bg-green-500/5' : 'border-[#ff7b00]/50 bg-[#ff7b00]/5 animate-pulse'}`}>
<div className="flex items-center gap-4">
<div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${inBodyUploaded ? 'bg-green-500/20 text-green-500' : 'bg-[#ff7b00]/20 text-[#ff7b00]'}`}>
{inBodyLoading ? <Loader2 className="animate-spin" size={24} /> : <span className="material-symbols-outlined text-2xl">{inBodyUploaded ? 'check_circle' : 'warning'}</span>}
</div>
<div>
<p className={`font-bold font-headline ${inBodyUploaded ? 'text-green-500' : 'text-[#ff7b00]'}`}>
{inBodyUploaded ? (isArabic ? 'تم رفع In-Body لهذا الشهر ✓' : `In-Body Uploaded for ${currentMonth} ✓`) : (isArabic ? `تنبيه: لم يُرفع In-Body لشهر ${currentMonth}` : `Required: Upload In-Body for ${currentMonth}`)}
</p>
<p className="text-on-surface-variant text-xs mt-0.5">{isArabic ? 'رفع تقرير In-Body الشهري إلزامي لمتابعة تقدمك بدقة' : 'Monthly In-Body upload is required to accurately track your progress'}</p>
</div>
</div>
{!inBodyUploaded && (
<>
<input ref={inBodyRef} type="file" accept="image/*,application/pdf" onChange={handleInBodyUpload} className="hidden" id="inbody-monthly" />
<label htmlFor="inbody-monthly" className="shrink-0 flex items-center gap-2 bg-[#ff7b00] text-black font-black px-5 py-3 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
<span className="material-symbols-outlined text-sm">upload</span>
{isArabic ? 'رفع الآن' : 'Upload Now'}
</label>
</>
)}
</div>

<div className="mb-12">
<h1 className="font-headline font-black text-6xl md:text-8xl text-on-surface tracking-tighter leading-none mb-2">{t("EVOLVE")}<span className="text-primary-fixed italic text-4xl md:text-6xl">.</span>
</h1>
<p className="font-body text-on-surface-variant max-w-md text-lg">{t("Your performance data visualized in high-definition. Track your peak state.")}</p>
</div>

<div className="grid grid-cols-1 md:grid-cols-12 gap-6">

<div className="md:col-span-8 bg-surface-container-low rounded-lg p-8 relative overflow-hidden group">
<div className="flex justify-between items-start mb-8">
<div>
<h3 className="text-xs uppercase tracking-[0.3em] font-bold text-on-surface-variant mb-1">{t("Body Weight")}</h3>
<div className="flex items-baseline gap-2">
<span className="text-4xl font-black text-on-surface font-headline italic">78.4</span>
<span className="text-primary-fixed font-bold">KG</span>
<span className="ml-4 text-sm text-green-500 flex items-center gap-1">
<span translate="no" className="material-symbols-outlined text-sm">trending_down</span>
                                -1.2kg {t("this week")}
                            </span>
</div>
</div>
<div className="flex gap-2">
<button onClick={() => alert(isArabic ? 'إحصائيات 7 أيام قريباً 📊' : '7 Days stats coming soon 📊')} className="px-3 py-1 rounded-full bg-surface-container-highest text-[10px] font-bold text-primary-fixed border border-primary-fixed/20 uppercase tracking-widest active:scale-95 transition-all">7 Days</button>
<button onClick={() => alert(isArabic ? 'إحصائيات 30 يوم قريباً 📊' : '30 Days stats coming soon 📊')} className="px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-on-surface transition-all active:scale-95">30 Days</button>
</div>
</div>

<div className="h-64 w-full relative flex items-end">
<svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
<defs>
<linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ff7b00" stopOpacity="0.3"></stop>
<stop offset="100%" stopColor="#ff7b00" stopOpacity="0"></stop>
</linearGradient>
</defs>
<path d="M0,150 Q100,130 200,140 T400,100 T600,120 T800,80 L800,200 L0,200 Z" fill="url(#chartGradient)"></path>
<path className="drop-shadow-[0_0_8px_rgba(255,123,0,0.8)]" d="M0,150 Q100,130 200,140 T400,100 T600,120 T800,80" fill="none" stroke="#ff7b00" strokeLinecap="round" strokeWidth="4"></path>
<circle className="animate-pulse" cx="800" cy="80" fill="#ff7b00" r="6"></circle>
</svg>

<div className="absolute right-0 top-12 glass-card bg-surface-container-highest/60 p-3 rounded-lg border border-outline-variant/20 neon-glow-primary">
<span className="block text-[10px] uppercase font-bold text-on-surface-variant">{t("Today")}</span>
<span className="block text-lg font-black text-on-surface">78.4 KG</span>
</div>
</div>
</div>

<div className="md:col-span-4 bg-primary-fixed rounded-lg p-8 flex flex-col justify-between items-start text-on-primary-fixed relative overflow-hidden group">
<div className="relative z-10">
<span translate="no" className="material-symbols-outlined text-5xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
<h2 className="text-3xl font-black font-headline italic leading-tight mb-4">{t("CAPTURE THE GRIND.")}</h2>
<p className="font-body text-sm font-semibold opacity-80 mb-6">{t("Compare side-by-side progress and witness your physical transformation.")}</p>
</div>
<button onClick={(e) => alert(isArabic ? 'رفع الصور قريباً 📸' : 'Photo upload coming soon 📸')} className="relative z-10 w-full bg-black text-primary-fixed font-black py-4 rounded-full uppercase tracking-widest text-xs hover:scale-105 transition-transform active:scale-95">{t("Upload Progress Photo")}</button>

<div className="absolute -bottom-10 -right-10 w-40 h-40 bg-on-primary-fixed-variant/20 rounded-full blur-3xl group-hover:bg-on-primary-fixed-variant/40 transition-colors"></div>
</div>

<div className="md:col-span-5 bg-surface-container-high rounded-lg p-6 flex flex-col border border-outline-variant/10">
<div className="flex justify-between items-center mb-6">
<h3 className="text-xs uppercase tracking-[0.3em] font-bold text-on-surface-variant">{t("Strength Milestones")}</h3>
<span translate="no" className="material-symbols-outlined text-primary-fixed">military_tech</span>
</div>
<div className="space-y-4">
<div className="flex justify-between items-center group">
<div className="flex items-center gap-4">
<div className="w-12 h-12 bg-surface-container-highest rounded-lg flex items-center justify-center font-black text-primary-fixed italic">DL</div>
<div>
<h4 className="font-bold text-on-surface">{t("Deadlift")}</h4>
<p className="text-[10px] text-on-surface-variant uppercase">{t("Last PR: 2 days ago")}</p>
</div>
</div>
<div className="text-right">
<span className="block text-xl font-black text-on-surface">180<span className="text-xs text-primary-fixed ml-1">KG</span></span>
</div>
</div>
<div className="h-[1px] bg-gradient-to-r from-outline-variant/20 to-transparent"></div>
<div className="flex justify-between items-center group">
<div className="flex items-center gap-4">
<div className="w-12 h-12 bg-surface-container-highest rounded-lg flex items-center justify-center font-black text-primary-fixed italic">BS</div>
<div>
<h4 className="font-bold text-on-surface">{t("Back Squat")}</h4>
<p className="text-[10px] text-on-surface-variant uppercase">{t("Last PR: 1 week ago")}</p>
</div>
</div>
<div className="text-right">
<span className="block text-xl font-black text-on-surface">145<span className="text-xs text-primary-fixed ml-1">KG</span></span>
</div>
</div>
</div>
</div>

<div className="md:col-span-7 bg-surface-container-low rounded-lg p-6 relative overflow-hidden">
<h3 className="text-xs uppercase tracking-[0.3em] font-bold text-on-surface-variant mb-6">{t("Energy Distribution")}</h3>
<div className="grid grid-cols-7 gap-2">

<div className="h-12 bg-primary-fixed/10 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/40 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/60 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/20 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/90 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/100 rounded-sm animate-pulse shadow-[0_0_10px_#ff7b00]"></div>
<div className="h-12 bg-surface-container-highest rounded-sm"></div>

<div className="h-12 bg-primary-fixed/30 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/70 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/10 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/50 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/20 rounded-sm"></div>
<div className="h-12 bg-primary-fixed/80 rounded-sm"></div>
<div className="h-12 bg-surface-container-highest rounded-sm"></div>
</div>
<div className="mt-6 flex justify-between items-end">
<p className="text-[10px] text-on-surface-variant uppercase max-w-[150px]">Daily average intensity peaked at 88% today.</p>
<div className="flex items-baseline gap-1">
<span className="text-4xl font-black text-on-surface italic">88</span>
<span className="text-xs font-bold text-primary-fixed">%</span>
</div>
</div>
</div>
</div>

<div className="mt-12">
<div className="flex justify-between items-end mb-8">
<h2 className="text-2xl font-black font-headline text-on-surface italic">{t("BODY RECOMPOSITION")}</h2>
<button onClick={() => alert(isArabic ? 'المعرض الشخصي قريباً 🖼️' : 'Personal Gallery coming soon 🖼️')} className="text-primary-fixed font-bold text-xs uppercase tracking-widest border-b-2 border-primary-fixed pb-1 hover:opacity-80 transition-opacity active:scale-95">{t("View Gallery")}</button>
</div>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<div className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/20">
<img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" data-alt="Athletic person in fitness gear posing in a dark gym environment with sharp shadows" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEVm-ITN0afpS5X_9Yuw7runNzs6puT1i7-xExqaWHU3bRhPTKCfrD_ozBt9alxvXEGzY6DELNTbTzdRp7QmhtRtVaXTAayzUVQd6hIsKiRnoLncapznYJwYGI61kJQ2c6OS-bjvEucfq_saYu30y58sA03DlC7aWhsMlRyBBccexONB57vcGmPfTJx81LNb8SGAzjVn7R4U722KNy5DCeP8vrMU_Djkwzv-ZL0YUQm3zzd6M2FAm4dy_2QhIGB9rbq8df60Nmgj-a"/>
<div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
<span className="block text-[10px] font-bold uppercase tracking-widest text-primary-fixed">{t("Oct 12")}</span>
<span className="text-white font-black italic">82.1 KG</span>
</div>
</div>
<div className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/20">
<img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" data-alt="Close up of abs and core of a fit male athlete under strong overhead gym lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgXATvV6vkSM4Q6OHh_LjqH_Y3bPU5SlF7o-Z5_B0dITlOAAraS8LvRXRvKanIe3H8jdC-Ld4powUuZ9AcLilSsO_Zj7hLEnpQmP72iY1u1h_q84LvTHjZthy9vvM76DG6Vuud7GbPCH-XszhtNmYV3L1h6FmV9D5kBB2013X29svAztxpDWII3Czn952q2WTisppfS0AcJRnNjN1ITu2qpdwTd5k8GTsnnukclFo6HJYNlrgx8SFnXePgja7sT4OLIidrT-XOmE6H"/>
<div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
<span className="block text-[10px] font-bold uppercase tracking-widest text-primary-fixed">{t("Nov 04")}</span>
<span className="text-white font-black italic">80.5 KG</span>
</div>
</div>
<div className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/20">
<img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" data-alt="Female athlete flexing in high-contrast dark room with moody atmosphere" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0njABprfIhtqgcl_yo4-3yFhtqjdRvxDs-GyxvxgTb3xCeJQeFBRUm5gZRmAzlcav2rimZtzR9ECKU5GWsKQIMzJCiPes7Srrwli46Xr4dCn-OVJQL1xZTbJd_xm0cFeY5qqDJafbs3aVIZnC-med8M8NFy0X0w6KV7sxK-YtkRNvlM3t7n5HNrcQrcCGMdEw3gDuoe2NwN1fMZVIOqGudak6PjHtn552E-ijgmUMJXys5buGuZOLiaXSQ4dT8gq7_s5wINLiQxfo"/>
<div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
<span className="block text-[10px] font-bold uppercase tracking-widest text-primary-fixed">{t("Dec 15")}</span>
<span className="text-white font-black italic">79.2 KG</span>
</div>
</div>
<div className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/20 ring-2 ring-primary-fixed">
<img className="w-full h-full object-cover transition-all duration-500" data-alt="Highly defined muscular male back in a dimly lit industrial gym setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSXkOuBwSjxj5P8fOyzQfki2ZsoHqS9Url3aJdlfrOMVsylJ6djEJBfbbwQOsmEXmXwFqrrfKRqXNX_LPR9LpXCZcMH922r9V8Xno7q1HSI2HKt9zoRGe_APE1W8buSx0KKH3DYhsYZIEFk3AdYr8b5vd2t4XIggsNEOS6zpMamvwAvl1yM1t1MyMDRRmX8du6nzWPQvS0dqLvBGvnJ_vDVJTX3uOoTXj5FXFHcuEow9QJHWsFifuPi_iE1BsyGS8d4EkerdX3RNsB"/>
<div className="absolute top-4 right-4 bg-primary-fixed text-on-primary-fixed text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">{t("Current")}</div>
<div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
<span className="block text-[10px] font-bold uppercase tracking-widest text-primary-fixed">{t("Jan 22")}</span>
<span className="text-white font-black italic">78.4 KG</span>
</div>
</div>
</div>
</div>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl z-50 rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/5">
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform active:scale-90" href="/social">
<span translate="no" className="material-symbols-outlined mb-1">dynamic_feed</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform active:scale-90" href="/ai-coach">
<span translate="no" className="material-symbols-outlined mb-1">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform active:scale-90" href="/shop">
<span translate="no" className="material-symbols-outlined mb-1">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform active:scale-90" href="/wallet">
<span translate="no" className="material-symbols-outlined mb-1">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform active:scale-90" href="/squads">
<span translate="no" className="material-symbols-outlined mb-1">groups</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Squads")}</span>
</Link>
</nav>

<div className="fixed bottom-28 md:bottom-12 right-6 md:right-12 z-[60]">
<button onClick={() => alert(isArabic ? 'مولد البرامج الجسدية قريباً ⚡' : 'Physics Program Generator coming soon ⚡')} className="glass-fab animate-neon-pulse shadow-[0_0_30px_rgba(255,123,0,0.4)] bg-black/80 backdrop-blur-xl border border-primary-fixed/30 w-16 h-16 rounded-full flex items-center justify-center text-[#ff7b00] transition-transform active:scale-90 hover:scale-110 hover:shadow-[0_0_40px_rgba(255,123,0,0.6)] group">
<span translate="no" className="material-symbols-outlined text-4xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
</button>
</div>

    </div>
  );
}
