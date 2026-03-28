'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full overflow-hidden border border-primary/30">
<img alt="Store Owner Profile" className="w-full h-full object-cover" data-alt="Close-up portrait of a stylish modern business owner with professional lighting and minimalist background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTmtR2g3F8FfhTx6m4IK0Q1Rt9H98tCc7CdNLsdyU0fVjhxFvAYcRDSA90-m79CWM1Yd-wvjpKCag_bJm1c1nzVpMyV0zq0HbUGzIMU-Rr93Qe6aa-71ccbNP_NkM9-vqYs9QVau21YfRkFnCEpZJRiMYlFwBkjYNUstB_8ERC3L7Tq75nxNymj6JMr6l-nsGDBQx1STTbYan4JnLSMcm54eSbYTaE4g9NerOFAs_FGhzPRc71y1E_xljCxyPXP_A2EpA2R3_qzK1q"/>
</div>
<a href="https://gem-z.shop/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</h1></a>
</div>
<button onClick={toggleLanguage} className="text-[#ff7b00] font-headline font-bold tracking-tight hover:text-[#ff7b00] transition-colors active:scale-95 duration-200 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            {isArabic ? 'EN' : 'عربي'}
        </button>
</header>
<main className="pt-24 px-6 max-w-7xl mx-auto space-y-12">

<section>
<div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
<div className="space-y-1">
<span className="text-secondary uppercase tracking-[0.2em] text-[10px] font-bold">{t("Performance Overview")}</span>
<h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter text-white">{t("REVENUE")}</h2>
</div>
<div className="flex gap-2 bg-surface-container-low p-1 rounded-full">
<button className="px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-primary-container text-on-primary-container shadow-lg">{t("Weekly")}</button>
<button className="px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-white transition-colors">{t("Monthly")}</button>
</div>
</div>

<div className="relative bg-surface-container-low/40 rounded-xl p-8 glass-panel border border-white/5 h-[350px] overflow-hidden">
<div className="absolute inset-0 opacity-20 pointer-events-none">
<div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10"></div>
<div className="absolute top-1/4 left-0 w-full h-[1px] bg-white/5"></div>
<div className="absolute top-3/4 left-0 w-full h-[1px] bg-white/5"></div>
</div>

<svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300">
<defs>
<linearGradient id="neonGradient" x1="0%" x2="100%" y1="0%" y2="0%">
<stop offset="0%" ></stop>
<stop offset="100%" ></stop>
</linearGradient>
<filter id="glow">
<feGaussianBlur result="coloredBlur" stdDeviation="5"></feGaussianBlur>
<feMerge>
<feMergeNode in="coloredBlur"></feMergeNode>
<feMergeNode in="SourceGraphic"></feMergeNode>
</feMerge>
</filter>
</defs>
<path d="M0,250 Q100,220 200,240 T400,100 T600,180 T800,40 T1000,60" fill="none" filter="url(#glow)" stroke="url(#neonGradient)" strokeLinecap="round" strokeWidth="6"></path>
<path d="M0,250 Q100,220 200,240 T400,100 T600,180 T800,40 T1000,60 V300 H0 Z" fill="url(#neonGradient)" fill-opacity="0.05"></path>

<circle cx="800" cy="40" fill="#ff7b00" filter="url(#glow)" r="8"></circle>
</svg>
<div className="absolute top-12 left-12 flex flex-col">
<span className="text-4xl font-black font-headline text-white">$42,890.00</span>
<span className="text-primary font-bold text-sm">+12.4% vs last period</span>
</div>
</div>
</section>

<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-surface-container-low p-8 rounded-lg space-y-4 border-l-4 border-primary">
<span className="material-symbols-outlined text-primary text-3xl">shopping_bag</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{t("Total Orders")}</p>
<p className="text-3xl font-black font-headline text-white">1,284</p>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-lg space-y-4 border-l-4 border-secondary">
<span className="material-symbols-outlined text-secondary text-3xl">group</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{t("New Customers")}</p>
<p className="text-3xl font-black font-headline text-white">342</p>
</div>
</div>
<div className="bg-surface-container-low p-8 rounded-lg space-y-4 border-l-4 border-tertiary">
<span className="material-symbols-outlined text-tertiary text-3xl">account_balance_wallet</span>
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{t("Avg. Ticket")}</p>
<p className="text-3xl font-black font-headline text-white">$156.20</p>
</div>
</div>
</section>

<section className="space-y-8">
<div className="flex items-center justify-between">
<h3 className="text-3xl font-black font-headline tracking-tight text-white italic">{t("INVENTORY")}</h3>
<div className="relative flex-1 max-w-md ml-8 hidden md:block">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input className="w-full bg-surface-container-low border-b-2 border-outline-variant/20 focus:border-primary transition-all rounded-t-lg px-12 py-3 outline-none text-sm" placeholder="Search products..." type="text"/>
</div>
</div>

<div className="bg-surface-container-low/20 rounded-xl overflow-hidden glass-panel">
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead>
<tr className="bg-surface-container-low/60 text-on-surface-variant">
<th className="px-8 py-6 text-xs font-bold uppercase tracking-[0.2em]">{t("Product Name")}</th>
<th className="px-8 py-6 text-xs font-bold uppercase tracking-[0.2em]">{t("Stock Level")}</th>
<th className="px-8 py-6 text-xs font-bold uppercase tracking-[0.2em]">{t("Price")}</th>
<th className="px-8 py-6 text-xs font-bold uppercase tracking-[0.2em] text-right">{t("Action")}</th>
</tr>
</thead>
<tbody className="divide-y divide-white/5">
<tr className="hover:bg-primary/5 transition-colors">
<td className="px-8 py-6">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden">
<img alt="Product" className="w-full h-full object-cover" data-alt="Close-up of high-end vibrant orange designer sneaker with studio lighting and clean background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEqLtyUrpzzNkk2fFjXFhFBGF2Rno-ZAYzKd4VnGgqhf7YQjXYRKK3TaX2reKF1nTIKP6gRDi-63BA3v4rtzSlCaidJ_ess_gHuaUHxKgBqX7d_aak9ftE-U0FvmTLWqeudZj86R0egO3li0TmN2ADcEUQPOyeMNSTRqW9i2rVZ78Eu4YLnSYY8cylVI1iFBgS9KBTImFZF3xVFSLzUdr4vXaxUXMGW_w55cS7Buaqsrnt34OSlW4yKTM-ZOdKRAdcJhjofWa0l2Wp"/>
</div>
<div>
<p className="font-bold text-white">{t("Hyper-Volt Sneaker")}</p>
<p className="text-xs text-on-surface-variant">{t("ID: HV-2024-X")}</p>
</div>
</div>
</td>
<td className="px-8 py-6">
<div className="flex flex-col gap-2">
<div className="flex justify-between text-[10px] font-bold uppercase">
<span>42 Units</span>
<span className="text-primary">{t("Optimized")}</span>
</div>
<div className="h-1 w-32 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full kinetic-gradient w-[70%]"></div>
</div>
</div>
</td>
<td className="px-8 py-6 font-headline font-black text-lg">$280.00</td>
<td className="px-8 py-6 text-right">
<button className="material-symbols-outlined text-on-surface-variant hover:text-white">{t("edit_note")}</button>
</td>
</tr>
<tr className="bg-surface-container-low/30 hover:bg-primary/5 transition-colors">
<td className="px-8 py-6">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden">
<img alt="Product" className="w-full h-full object-cover" data-alt="Sleek modern minimalist smartwatch with silver casing and white band on a dark textured surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy48wevh0UxmHIPGgSQ9bOvlwK8RBU-IM3L-Emj33XJ8qSKIZ1YyTMXJVq1QYLnPHarCCFyAAQmTjl0JGARnd24rWxd5UmydtLqewK3ds2kIu9FP_ISgOBOnWWJmPu0I6E_ytc-UDIhA8qsc-ozeJVe49Il6vyN8f6SkD7fMlIRinq1-nhAaiMpOfO9rT6LDHQGQI60Aots20cWcGSAPsHsXnJoKhSzocX8I9BGtQ2924Ws7yVSIMzx8jh7tsX2pz0TtOZ_39ojY_0"/>
</div>
<div>
<p className="font-bold text-white">{t("Gem-Z Chronos")}</p>
<p className="text-xs text-on-surface-variant">{t("ID: CH-9912-A")}</p>
</div>
</div>
</td>
<td className="px-8 py-6">
<div className="flex flex-col gap-2">
<div className="flex justify-between text-[10px] font-bold uppercase">
<span>12 Units</span>
<span className="text-error">{t("Low Stock")}</span>
</div>
<div className="h-1 w-32 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-error w-[20%]"></div>
</div>
</div>
</td>
<td className="px-8 py-6 font-headline font-black text-lg">$450.00</td>
<td className="px-8 py-6 text-right">
<button className="material-symbols-outlined text-on-surface-variant hover:text-white">{t("edit_note")}</button>
</td>
</tr>
<tr className="hover:bg-primary/5 transition-colors">
<td className="px-8 py-6">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden">
<img alt="Product" className="w-full h-full object-cover" data-alt="High-fidelity black wireless headphones on a wooden desk with golden hour lighting shadows" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFQkRqC-0X5XpPvrNSWZNF6GG5VyxlrmyxLqhQqsrToJ9Z_qkvIe5M0quLWHNIw8jouUUJrzfugifBLATT3qck4DczTCZ1TTsmy8XJULv3W8Q3AxklTHgAMUGru31BqKHQZUEf3iOpxgJnnDjSU3PWfSDB5_MTOcLe08HoDmWQfiki02dAA0ZknSAyTL79zDz71Ufk8VrxFJ1rmKtdnzzOUPeUkCZGSqR2lP9EP4xoDsnIKfQtEktNi_hwn0-pkRcCq2gFr-69_Pih"/>
</div>
<div>
<p className="font-bold text-white">{t("Sonic-Boom Pro")}</p>
<p className="text-xs text-on-surface-variant">{t("ID: SB-5502-K")}</p>
</div>
</div>
</td>
<td className="px-8 py-6">
<div className="flex flex-col gap-2">
<div className="flex justify-between text-[10px] font-bold uppercase">
<span>89 Units</span>
<span className="text-secondary">{t("Overstock")}</span>
</div>
<div className="h-1 w-32 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-secondary w-[90%]"></div>
</div>
</div>
</td>
<td className="px-8 py-6 font-headline font-black text-lg">$199.00</td>
<td className="px-8 py-6 text-right">
<button className="material-symbols-outlined text-on-surface-variant hover:text-white">{t("edit_note")}</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
</main>

<button className="fixed bottom-24 right-8 w-16 h-16 kinetic-gradient rounded-full flex items-center justify-center text-on-primary shadow-[0_0_20px_rgba(255,123,0,0.6)] active:scale-90 transition-transform duration-300 z-[60]">
<span className="material-symbols-outlined text-3xl font-black">{t("add")}</span>
</button>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link href="/store/dashboard" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined" data-icon="home">home</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Home")}</span>
</Link>
<Link href="/store/dashboard" className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)] active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Analytics")}</span>
</Link>
<Link href="/shop" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Products")}</span>
</Link>
<Link href="/squads" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined" data-icon="group">group</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Staff")}</span>
</Link>
<Link href="/wallet" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Bank")}</span>
</Link>
</nav>

    </div>
  );
}
