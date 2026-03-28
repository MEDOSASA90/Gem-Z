'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="bg-black/60 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full docked full-width top-0 sticky z-50 tonal-transition-bg shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full overflow-hidden border border-primary-fixed/20">
<Link href="/trainee" className="w-full h-full block">
<img className="w-full h-full object-cover" data-alt="Portrait of a professional athlete with focused expression, cinematic lighting on dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtSbqX9toB24gP72hlBO68w9NOAhEvOGJmCLXZBRNxOfyKcl6BZamTmdI9481L5lLDvvwt_tPMIjchMuMBiRRDWn-MYXAnHAfzJROpc5ICb73qSz9BeKT0hP60IyQRexmUceLn2WQ_ghY0HDxgEj_fS8UIym-PYK6g4uV-ZUFnhL8CrYuVwrJgJhW8JZgAb-w_ZvaR1OCqBdllbYg7razL_4yavvq5nzyJvNII2RwyF1SnsfT3w2GtHqAiLRhRBOR0r5PH00J9nJND"/>
</Link>
</div>
<a href="https://gem-z.shop/"><span className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-2xl">{t("GEM Z")}</span></a>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex gap-8 items-center">
<Link className="text-gray-400 font-headline font-bold tracking-tight hover:text-[#ff7b00] transition-colors" href="/ai-coach">{t("Coach")}</Link>
<Link className="text-gray-400 font-headline font-bold tracking-tight hover:text-[#ff7b00] transition-colors" href="/shop">{t("Shop")}</Link>
<Link className="text-gray-400 font-headline font-bold tracking-tight hover:text-[#ff7b00] transition-colors" href="/social">{t("Feed")}</Link>
<Link className="text-[#ff7b00] font-headline font-bold tracking-tight" href="/bidding">{t("Auctions")}</Link>
</nav>
<div className="flex items-center gap-4">
    <button onClick={toggleLanguage} className="text-[#ff7b00] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full font-headline font-bold tracking-tight hover:bg-white/10 transition-colors active:scale-95 duration-200">
        {isArabic ? 'EN' : 'عربي'}
    </button>
    <button translate="no" className="material-symbols-outlined text-[#ff7b00] scale-95 active:duration-150" onClick={() => alert(isArabic ? 'التنبيهات سيتم تفعيلها قريباً 🔔' : 'Notifications coming soon 🔔')}>notifications</button>
</div>
</div>
</header>
<main className="min-h-screen pb-32">

<section className="relative w-full h-[530px] overflow-hidden">
<img className="w-full h-full object-cover" data-alt="Close-up of a premium limited edition orange athletic sneaker floating in a dark, high-tech digital void with neon orange light trails" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiv7K3cu8hpVM99R3dXfjcv83VtzplDNbUqLJggDH3jLQxKUw-VobooUWwM4O6s1k3jAsb7jvBVIxeTpLG_h5-FlgJfUynhnxEeo4FoyKmf_z2KkfwSv7H8uvuULPgQJwpr14hkeal_PucIXME239uT8mZQeKWvape8qOs5Xd4ymrFhdk6qsY144yeNbz5lWYFpAaqPpMQ9_vTZ3YRbyd_jEqa-0YXzsWcWtRz_pk2Efa_i8oygdDrhKCfOWKmDRgboLqV6_3ro45L"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
<div className="absolute bottom-12 left-6 right-6 md:left-12 md:right-12">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
<div className="max-w-2xl">
<span className="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed text-xs font-black uppercase tracking-widest mb-4 rounded-sm">{t("Exclusive Drop")}</span>
<h1 className="text-5xl md:text-7xl font-headline font-black tracking-tighter text-on-surface leading-none uppercase">{t("Nebula-X")}<br/>{t("Prototype")}</h1>
</div>

<div className="glass-card p-6 rounded-lg border-l-4 border-primary-fixed kinetic-glow">
<p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">{t("Time Remaining")}</p>
<div className="flex gap-4 font-headline font-black text-3xl text-primary-fixed tabular-nums">
<div>04<span className="text-xs ml-1 font-bold text-on-surface-variant">H</span></div>
<div className="animate-pulse">:</div>
<div>22<span className="text-xs ml-1 font-bold text-on-surface-variant">M</span></div>
<div className="animate-pulse">:</div>
<div>59<span className="text-xs ml-1 font-bold text-on-surface-variant">S</span></div>
</div>
</div>
</div>
</div>
</section>

<section className="px-6 md:px-12 -mt-8 relative z-10">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

<div className="lg:col-span-7 space-y-8">
<div className="bg-surface-container-high p-8 rounded-lg border border-outline-variant/20 shadow-2xl">
<div className="flex justify-between items-start mb-10">
<div>
<p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">{t("Current Highest Bid")}</p>
<div className="flex items-baseline gap-2 mt-2">
<span className="text-5xl font-headline font-black text-primary-fixed tracking-tight">12,450</span>
<span className="text-xl font-headline font-bold text-secondary">{t("GEMS")}</span>
</div>
</div>
<div className="text-right">
<p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">{t("Total Bids")}</p>
<p className="text-2xl font-headline font-bold mt-2">142</p>
</div>
</div>

<div className="space-y-6">
<div className="relative">
<label className="absolute -top-3 left-4 px-2 bg-surface-container-high text-xs font-bold text-primary-fixed uppercase tracking-widest">{t("Your Bid Amount")}</label>
<div className="flex items-center border-b-2 border-outline-variant hover:border-primary-fixed transition-all duration-300 group">
<input className="bg-transparent border-none w-full py-6 text-2xl font-headline font-bold focus:ring-0 placeholder:text-surface-variant" placeholder="Enter amount..." type="number"/>
<span className="text-on-surface-variant font-bold pr-4">{t("GEMS")}</span>
</div>
</div>
<Link href="/bidding" className="w-full bg-primary-fixed text-on-primary-fixed py-6 rounded-lg font-headline font-black text-xl uppercase tracking-widest hover:shadow-[0_0_30px_rgba(255,123,0,0.4)] transition-all duration-300 active:scale-95">{t("Place Bid Now")}</Link>
<p className="text-center text-xs text-on-surface-variant font-medium">{t("Minimum increment: 50 GEMS")}</p>
</div>
</div>

<div className="space-y-4">
<h3 className="text-lg font-headline font-bold uppercase tracking-widest text-on-surface-variant ml-2">{t("Recent Activity")}</h3>
<div className="space-y-1">

<div className="bg-surface-container-low p-4 flex justify-between items-center hover:bg-surface-container transition-colors group">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary-fixed">
<span translate="no" className="material-symbols-outlined">person</span>
</div>
<div>
<p className="font-bold">{t("Alpha_User_99")}</p>
<p className="text-xs text-on-surface-variant">2 minutes ago</p>
</div>
</div>
<div className="text-right">
<p className="font-headline font-black text-primary-fixed">12,450 GEMS</p>
</div>
</div>

<div className="bg-surface-container p-4 flex justify-between items-center hover:bg-surface-container transition-colors group">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
<span translate="no" className="material-symbols-outlined">person</span>
</div>
<div>
<p className="font-bold">{t("FitPro_Sarah")}</p>
<p className="text-xs text-on-surface-variant">5 minutes ago</p>
</div>
</div>
<div className="text-right">
<p className="font-headline font-black text-on-surface">12,400 GEMS</p>
</div>
</div>
</div>
</div>
</div>

<div className="lg:col-span-5 space-y-8">

<div className="grid grid-cols-2 gap-4">
<div className="bg-surface-container-high p-6 rounded-lg">
<span translate="no" className="material-symbols-outlined text-primary-fixed mb-4">military_tech</span>
<p className="text-xs text-on-surface-variant font-bold uppercase tracking-tighter">{t("Condition")}</p>
<p className="text-xl font-headline font-bold">{t("Pristine")}</p>
</div>
<div className="bg-surface-container-high p-6 rounded-lg">
<span translate="no" className="material-symbols-outlined text-primary-fixed mb-4">history</span>
<p className="text-xs text-on-surface-variant font-bold uppercase tracking-tighter">{t("Edition")}</p>
<p className="text-xl font-headline font-bold">1 of 1</p>
</div>
<div className="bg-surface-container-high p-6 rounded-lg col-span-2">
<span translate="no" className="material-symbols-outlined text-primary-fixed mb-4">description</span>
<p className="text-xs text-on-surface-variant font-bold uppercase tracking-tighter">{t("Item Description")}</p>
<p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{t("A high-performance carbon-fiber prototype developed for elite sprinters. Features integrated kinetic sensors that sync directly with the GEM Z Coach app.")}</p>
</div>
</div>

<div className="bg-surface-container-low p-6 rounded-lg border-r-4 border-secondary-dim text-right" dir="rtl">
<p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest font-headline mb-2">معلومات المزاد</p>
<h4 className="text-xl font-headline font-bold mb-3">نموذج Nebula-X الأولي</h4>
<p className="text-sm text-on-surface-variant leading-loose">
                            هذا الإصدار المحدود يمثل قمة الابتكار في المعدات الرياضية. متاح حصرياً لنخبة رياضيي GEM Z.
                        </p>
</div>

<div className="bg-gradient-to-br from-surface-container-high to-black p-6 rounded-lg flex items-center gap-4">
<div className="w-16 h-16 rounded-xl bg-primary-fixed/10 flex items-center justify-center">
<span translate="no" className="material-symbols-outlined text-primary-fixed text-4xl" data-weight="fill">verified</span>
</div>
<div>
<p className="font-headline font-bold">{t("Verified Creator")}</p>
<p className="text-sm text-on-surface-variant">{t("GEM Z Lab Collections")}</p>
</div>
</div>
</div>
</div>
</section>
</main>


<div className="fixed bottom-32 right-6 z-[60] md:right-12 lg:right-16">
<Link href="/squads" className="relative group flex items-center justify-center w-16 h-16 bg-black/80 backdrop-blur-xl rounded-full border border-primary-fixed/30 text-primary-fixed shadow-[0_0_20px_rgba(255,123,0,0.4)] hover:shadow-[0_0_35px_rgba(255,123,0,0.7)] transition-all duration-500 active:scale-90 animate-bounce-slow">
<span className="absolute inset-0 rounded-full bg-primary-fixed/20 animate-ping opacity-75"></span>
<span className="material-symbols-outlined text-3xl z-10" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
<span className="absolute -top-12 right-0 scale-0 group-hover:scale-100 transition-all duration-300 origin-bottom-right bg-primary-fixed text-on-primary-fixed px-3 py-1.5 rounded-lg text-xs font-headline font-black uppercase tracking-widest whitespace-nowrap shadow-xl">{t("Quick Bid")}</span>
</Link>
</div>
<style dangerouslySetInnerHTML={{ __html: `
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-bounce-slow {
    animation: bounce-slow 3s ease-in-out infinite;
  }
` }} /><nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 glassmorphism-surface shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
<span translate="no" className="material-symbols-outlined">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/shop">
<span translate="no" className="material-symbols-outlined">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
<span translate="no" className="material-symbols-outlined">dynamic_feed</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/wallet">
<span translate="no" className="material-symbols-outlined">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
</Link>

<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform" href="/squads">
<span translate="no" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
</Link>
</nav>

<div className="hidden lg:block fixed left-6 top-1/2 -translate-y-1/2 z-40">
<div className="flex flex-col gap-4 bg-surface-container-high/40 backdrop-blur-md p-3 rounded-full border border-outline-variant/10">
<Link href="/trainee" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-fixed transition-colors">
<span translate="no" className="material-symbols-outlined">accessibility_new</span>
</Link>
<Link href="/ai-nutritionist" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-fixed transition-colors">
<span translate="no" className="material-symbols-outlined">restaurant</span>
</Link>
<Link href="/challenges" className="w-10 h-10 flex items-center justify-center text-primary-fixed bg-primary-fixed/10 rounded-full">
<span translate="no" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
</Link>
<Link href="/bidding" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-fixed transition-colors">
<span translate="no" className="material-symbols-outlined">gavel</span>
</Link>
<div className="h-px bg-outline-variant/20 mx-2"></div>
<button onClick={() => alert(isArabic ? 'الإعدادات المتقدمة' : 'Advanced Settings')} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-fixed transition-colors">
<span translate="no" className="material-symbols-outlined">settings</span>
</button>
</div>
</div>

    </div>
  );
}
