'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="bg-black/60 backdrop-blur-xl text-[#ff7b00] font-['Be_Vietnam_Pro'] font-bold tracking-tight docked full-width top-0 sticky z-50 no-border tonal-transition-bg shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20">
<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" className="w-full h-full object-cover" data-alt="Portrait of a determined athlete with a focused expression in a dimly lit high-end fitness studio" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsuBDlyIQql2GU1sPbbChgTAckM3f3hWGChb2siCoOW-3GDywlUjMy59EQWJUPQCGUl4h4DWEEW6Ubssu2PyaGyJW9nhTICQcO5NZLb46sKSxZkQjEd9TNguOSlbUSG7fbCJvZLdv6CjCxBGk7lUnyk7rnq5m38siAhRFa7nfcj0FVStRTAscZlX8zavzIXTOBzwFDgLpug2qiH6D-YxbPj-DWvYrU2piWbguFrCfG86QEY4JM-3kLhiSUOyBRacd-AopwocledZl-"/></a>
</div>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">{t("GEM Z")}</span></a>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest">
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/ai-coach">{t("Coach")}</Link>
<Link className="text-[#ff7b00]" href="/shop">{t("Shop")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/social">{t("Feed")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/wallet">{t("Wallet")}</Link>
</nav>
<button className="material-symbols-outlined text-2xl scale-95 active:duration-150">notifications</button>
</div>
</header>
<main className="relative h-[calc(100vh-72px)] w-full overflow-hidden">

<div className="absolute inset-0 z-0">
<div className="w-full h-full grayscale brightness-50 contrast-125" data-location="Riyadh, SA" >
<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115904.60114002675!2d46.738586!3d24.774265!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f03890d489399%3A0xba974d1c98e79fd5!2sRiyadh%20Saudi%20Arabia!5e0!3m2!1sen!2sae!4v1711200000000!5m2!1sen!2sae" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="opacity-80 pointer-events-auto"></iframe>
<div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
</div>

<div className="absolute top-[30%] left-[25%] group cursor-pointer">
<div className="marker-glow bg-primary-fixed w-6 h-6 rounded-full border-4 border-black flex items-center justify-center">
<div className="w-1.5 h-1.5 bg-black rounded-full"></div>
</div>
<div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-panel bg-surface-container-highest/80 px-3 py-1 rounded-full border border-primary/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
<span className="text-[10px] font-bold tracking-tighter uppercase">{t("Titan Forge Gym")}</span>
</div>
</div>
<div className="absolute top-[55%] left-[65%] group cursor-pointer">
<div className="marker-glow bg-primary-fixed w-8 h-8 rounded-full border-4 border-black flex items-center justify-center">
<span className="material-symbols-outlined text-black text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
</div>
<div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-panel bg-primary-fixed px-3 py-1 rounded-full border border-black whitespace-nowrap">
<span className="text-[10px] font-bold text-black tracking-tighter uppercase">{t("Z-Core Hub (Selected)")}</span>
</div>
</div>
<div className="absolute top-[40%] right-[15%] group cursor-pointer">
<div className="marker-glow bg-secondary w-5 h-5 rounded-full border-2 border-black"></div>
</div>
</div>

<div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-20">
<div className="glass-panel bg-surface-container-highest/60 p-1.5 rounded-full shadow-2xl border border-outline-variant/10 flex items-center gap-3">
<div className="pl-4">
<span className="material-symbols-outlined text-primary text-xl">search</span>
</div>
<input className="bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 w-full font-body text-sm py-2" placeholder="Find your next arena..." type="text"/>
<button className="bg-primary-fixed text-black p-2 rounded-full hover:scale-105 active:scale-95 transition-all">
<span className="material-symbols-outlined text-xl">tune</span>
</button>
</div>

<div className="flex gap-2 mt-4 justify-center no-scrollbar overflow-x-auto px-4">
<button className="glass-panel bg-primary-fixed/20 border border-primary/40 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-primary whitespace-nowrap">24/7 Access</button>
<button className="glass-panel bg-surface-container-high/40 border border-outline-variant/20 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">{t("Crossfit")}</button>
<button className="glass-panel bg-surface-container-high/40 border border-outline-variant/20 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">{t("MMA Cage")}</button>
</div>
</div>

<div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-30">
<div className="glass-panel bg-[#1f1f1f]/90 rounded-lg p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] border-t border-primary/20 flex flex-col md:flex-row gap-6">

<div className="w-full md:w-48 h-32 md:h-auto rounded-xl overflow-hidden flex-shrink-0">
<img alt="Gym Interior" className="w-full h-full object-cover" data-alt="High-end industrial style gym interior with orange neon lighting and professional weightlifting equipment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIawaaz-ME69V_uZyFctR0MKk6DGml8774R6ZPIbJqzT4SvhAdmrn6HntoHCBX1QCGxOpVgtcN_d5cTptsOZENF6mPdB0PVocuBp65Z2NHFXdcPc9LqbbtmTSe-JZB2kr8lOtWPufaOO-_FiaonWg0EuCyP7eQiDWPYm-xOZEhoKoJO1rxWHj6fJ6voYav71OFxifdhvGjE6mZSSjTSaJ-BSBENoR0T7T7pNrMb6Fb8AqT1QEp2eqeV5Jfm_g6eBvfWYlRsP1wM2wb"/>
</div>

<div className="flex-grow space-y-3">
<div className="flex justify-between items-start">
<div>
<h2 className="font-headline text-2xl font-black text-primary italic leading-none tracking-tight">{t("Z-CORE HUB")}</h2>
<p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-1">Downtown Tech District • 0.8km away</p>
</div>
<div className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded text-[10px] font-black italic">{t("ELITE GRADE")}</div>
</div>
<div className="flex items-center gap-4 py-2">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{t("star")}</span>
<span className="text-sm font-bold">4.9</span>
</div>
<div className="w-1 h-1 bg-outline-variant rounded-full"></div>
<div className="text-sm text-on-surface-variant font-medium">850+ Athletes</div>
</div>
<div className="flex flex-wrap gap-2">
<span className="text-[10px] px-2 py-0.5 bg-surface-container-highest border border-outline-variant/30 rounded text-on-surface-variant uppercase font-bold">{t("Steam Room")}</span>
<span className="text-[10px] px-2 py-0.5 bg-surface-container-highest border border-outline-variant/30 rounded text-on-surface-variant uppercase font-bold">{t("Free Weights")}</span>
<span className="text-[10px] px-2 py-0.5 bg-surface-container-highest border border-outline-variant/30 rounded text-on-surface-variant uppercase font-bold">{t("AI Coach")}</span>
</div>
<div className="pt-4 flex items-center justify-between gap-4">
<div className="flex flex-col">
<span className="text-[10px] text-on-surface-variant uppercase font-bold">{t("Daily Pass")}</span>
<span className="text-xl font-headline font-black text-on-surface">15.00 GEMS</span>
</div>
<Link href="/wallet" className="bg-primary-fixed hover:shadow-[0_0_20px_rgba(255,123,0,0.4)] text-black px-8 py-3 rounded-full font-headline font-black italic text-lg transition-all active:scale-95 flex items-center gap-2">{t("BUY PASS")}<span className="material-symbols-outlined">bolt</span>
</Link>
</div>
</div>

<button onClick={toggleLanguage} className="absolute top-4 right-4 text-[10px] font-headline bg-black/80 px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 transition-colors z-50 cursor-pointer text-on-surface">
                    {isArabic ? 'English' : 'عربي'}
                </button>
</div>
</div>

<div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
<button className="w-12 h-12 glass-panel bg-surface-container-highest/80 rounded-full flex items-center justify-center border border-outline-variant/20 hover:border-primary/50 transition-colors">
<span className="material-symbols-outlined text-on-surface">my_location</span>
</button>
<button className="w-12 h-12 glass-panel bg-surface-container-highest/80 rounded-full flex items-center justify-center border border-outline-variant/20 hover:border-primary/50 transition-colors">
<span className="material-symbols-outlined text-on-surface">layers</span>
</button>
<button className="w-12 h-12 glass-panel bg-surface-container-highest/80 rounded-full flex items-center justify-center border border-outline-variant/20 hover:border-primary/50 transition-colors">
<span className="material-symbols-outlined text-on-surface">add</span>
</button>
<button className="w-12 h-12 glass-panel bg-surface-container-highest/80 rounded-full flex items-center justify-center border border-outline-variant/20 hover:border-primary/50 transition-colors">
<span className="material-symbols-outlined text-on-surface">remove</span>
</button>
</div>
<div className="fixed bottom-32 right-6 z-50 md:bottom-10 pointer-events-none">
<button className="group pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full bg-black/80 text-[#ff7b00] shadow-[0_0_30px_rgba(255,123,0,0.4)] backdrop-blur-xl border border-[#ff7b00]/30 transition-all hover:scale-110 hover:shadow-[0_0_50px_rgba(255,123,0,0.6)] active:scale-95">
<span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>navigation</span>

<div className="absolute inset-0 rounded-full border-2 border-[#ff7b00]/20 animate-ping opacity-20 group-hover:opacity-40"></div>
</button>
</div>
</main>

<footer className="md:hidden bg-[#1f1f1f]/70 backdrop-blur-2xl fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 rounded-t-[2rem] z-50 no-border glassmorphism-surface shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
<span className="material-symbols-outlined text-2xl">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform" href="/shop">
<span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
<span className="material-symbols-outlined text-2xl">{t("dynamic_feed")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/wallet">
<span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/squads">
<span className="material-symbols-outlined text-2xl">{t("groups")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
</Link>
</footer>

    </div>
  );
}
