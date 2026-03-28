'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 h-16 w-full">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed">
<img alt="Admin Avatar" className="w-full h-full object-cover" data-alt="Close up portrait of a professional male administrator in a high-tech office setting with soft neon background lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnFj4W23PjD3VHTVLzRpfjCw9dg4RoH-ey3msorXJLRCRANKiE-9O14OwuGtncvq06-eypeQroE04r5FH_M8uP5qdqFX_bnVh0MP8w5f8d6H18Omv9ua8S5VEZp8EIMKuSYTacqlRCEgdMviYdp7LdHBNdZ_NzuCuEGA7A8IH9Pr8kTrmvz7K5pBC-iS9_0oEqg7HotNwK7eZtQJRMxfUp9Zx9qrgn4Mz2MQdoU34scBBqLFJWffXd6FoPl5zVLOZtsaj67fxj9Swr"/>
</div>
<a href="https://gem-z.shop/"><h1 className="font-headline text-2xl font-black italic text-[#ff7b00] tracking-tighter">{t("GEM Z")}</h1></a>
</div>
<nav className="hidden md:flex items-center gap-8 font-headline font-bold tracking-tight">
<Link className="text-[#ff7b00] hover:text-[#ff7b00] transition-colors" href="/">{t("Overview")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/">{t("Analytics")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/">{t("Reports")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/">{t("Settings")}</Link>
</nav>
<button className="font-headline font-bold text-[#ff7b00] hover:text-white transition-colors active:scale-95 duration-200">
            العربية
        </button>
</header>
<main className="pt-24 pb-32 px-6 max-w-7xl mx-auto space-y-12">

<section className="space-y-2">
<span className="text-primary tracking-[0.2em] text-[10px] uppercase font-bold">{t("System Status: Optimal")}</span>
<h2 className="text-5xl md:text-7xl font-headline font-black text-on-surface tracking-tighter">{t("Super Admin Dashboard")}</h2>
</section>

<section className="grid grid-cols-1 md:grid-cols-3 gap-6">

<div className="glass-panel p-8 rounded-lg relative overflow-hidden group">
<div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span className="material-symbols-outlined text-9xl text-primary">group</span>
</div>
<div className="relative z-10 space-y-4">
<p className="text-sm font-label uppercase tracking-widest text-on-surface-variant">{t("Total Users")}</p>
<div className="flex items-baseline gap-2">
<span className="text-5xl font-headline font-black text-white">42.8k</span>
<span className="text-primary text-sm font-bold">+12%</span>
</div>
<div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
<div className="bg-primary h-full w-[75%] shadow-[0_0_10px_#ff7b00]"></div>
</div>
</div>
</div>

<div className="glass-panel p-8 rounded-lg border-l-4 border-primary relative overflow-hidden group">
<div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span className="material-symbols-outlined text-9xl text-secondary">account_balance_wallet</span>
</div>
<div className="relative z-10 space-y-4">
<p className="text-sm font-label uppercase tracking-widest text-on-surface-variant">{t("Gross Earnings")}</p>
<div className="flex items-baseline gap-2">
<span className="text-5xl font-headline font-black text-white">$1.2M</span>
<span className="text-primary text-sm font-bold">{t("Peak")}</span>
</div>
<p className="text-xs text-on-surface-variant italic">Revenue increase of 8% this month</p>
</div>
</div>

<div className="glass-panel p-8 rounded-lg relative overflow-hidden group">
<div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span className="material-symbols-outlined text-9xl text-tertiary">fitness_center</span>
</div>
<div className="relative z-10 space-y-4">
<p className="text-sm font-label uppercase tracking-widest text-on-surface-variant">{t("Partner Gyms")}</p>
<div className="flex items-baseline gap-2">
<span className="text-5xl font-headline font-black text-white">186</span>
<span className="text-on-surface-variant text-sm">{t("Active")}</span>
</div>
<div className="flex -space-x-2">
<img alt="Gym 1" className="w-8 h-8 rounded-full border-2 border-surface" data-alt="Gym logo 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTDXxPJG5GBYur3fmpqsDQAsSrP-29Bj9WaDGr5HAgXo33uxFF5nRDIfd7iL8dkmIT8cuz3L3o8ens48XbUxh6aCZLdAgHBVXsKKuRplLu3zmNfhFAUODTs62iXjMUX64Pf7f50ti2xJVEg1Ba0nlB-sxYW7PhNvAWU6dP8NOSb0vJ4LSsdttiJsAS4bx4X1VOYUL2k5tN8ZNsjnPawbC8tIJH5RXFen9rSZ4ppDbvQdiK2ladiPRdip840dCgTRPjKArBWaeUq67B"/>
<img alt="Gym 2" className="w-8 h-8 rounded-full border-2 border-surface" data-alt="Gym logo 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhiH3S3P839pyVX4xISU5wUq11njpP9IMgzX_PyXAq7Ti2G9XgV1yHa6bppETP-bpwoNAr45gL7_C-bLhUwNVwqidWtfZLn1f_HCqLnKjLd8b4XeeUPgyECxBnmQvyvjzekub6MiS1TcneJEb2Nof03NflRs2lhCNRfdCx5aElys1mT-1nAuAM5MTKdBuxamQ1dtUhRImHLnjkFcbELcUkUafUBLsJ8hz2uLNO_6eHxt-YY0tPhSfHf236s8bzWr6IS2mfun0S_Smq"/>
<img alt="Gym 3" className="w-8 h-8 rounded-full border-2 border-surface" data-alt="Gym logo 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDc4SLt6oREu40r4bqHITucDixnsdO2peYR4sVdQuofHksWGY0ykafYKLbHzsDK-dHSLwrwRHpSbKBQACWKzpc7POVj3WU971djcU12Sy4lZi7srSGQ9eHDpx1W9Ac67FEgLwOrQC8WCSUo4JhyO697FKIFJhBbO0djKE5yp-s9kezOAtQjqtsEBfYJgBvo4nYM98tqWiwbmJvVnmikucT3LgrPnk9tf1ripHmyRughwZBcB0cK9eRTuEJqNNvQ7IHy3iye0dbXekbR"/>
<div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-surface flex items-center justify-center text-[10px] font-bold">+12</div>
</div>
</div>
</div>
</section>

<section className="space-y-6">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div className="space-y-1">
<h3 className="text-3xl font-headline font-black text-on-surface italic">{t("Resolution Center")}</h3>
<p className="text-on-surface-variant font-label text-sm">{t("Priority tickets and user flags requiring intervention")}</p>
</div>
<div className="flex gap-4">
<button className="px-6 py-2 rounded-full border border-outline-variant text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">{t("Filter All")}</button>
<button className="px-6 py-2 rounded-full bg-primary-container text-on-primary-container text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform">{t("Export Logs")}</button>
</div>
</div>
<div className="glass-panel rounded-lg overflow-hidden">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-high/50 text-primary text-[10px] uppercase tracking-[0.2em] font-black">
<th className="px-8 py-5">{t("Reporter")}</th>
<th className="px-8 py-5">{t("Issue Category")}</th>
<th className="px-8 py-5">{t("Status")}</th>
<th className="px-8 py-5">{t("Timestamp")}</th>
<th className="px-8 py-5 text-right">{t("Action")}</th>
</tr>
</thead>
<tbody className="divide-y divide-white/5">
<tr className="hover:bg-white/5 transition-colors group">
<td className="px-8 py-6">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs">JS</div>
<div>
<p className="text-on-surface font-bold text-sm">{t("John Smith")}</p>
<p className="text-[10px] text-on-surface-variant">{t("UID: 99281-Z")}</p>
</div>
</div>
</td>
<td className="px-8 py-6">
<span className="px-3 py-1 rounded-full bg-error-container/20 text-error text-[10px] font-black uppercase">{t("Fraudulent Activity")}</span>
</td>
<td className="px-8 py-6">
<div className="flex items-center gap-2">
<div className="w-1.5 h-1.5 rounded-full bg-primary neon-glow-primary"></div>
<span className="text-xs font-label text-on-surface">{t("Reviewing")}</span>
</div>
</td>
<td className="px-8 py-6 text-xs text-on-surface-variant">2 mins ago</td>
<td className="px-8 py-6 text-right">
<button className="text-primary-fixed hover:underline text-xs font-black uppercase italic tracking-tighter">{t("Resolve Now")}</button>
</td>
</tr>
<tr className="bg-surface-container-low hover:bg-white/5 transition-colors group">
<td className="px-8 py-6">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs">AR</div>
<div>
<p className="text-on-surface font-bold text-sm">{t("Ahmed R.")}</p>
<p className="text-[10px] text-on-surface-variant">{t("UID: 10452-G")}</p>
</div>
</div>
</td>
<td className="px-8 py-6">
<span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-black uppercase">{t("Payment Failure")}</span>
</td>
<td className="px-8 py-6">
<div className="flex items-center gap-2">
<div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
<span className="text-xs font-label text-on-surface-variant">{t("Queued")}</span>
</div>
</td>
<td className="px-8 py-6 text-xs text-on-surface-variant">15 mins ago</td>
<td className="px-8 py-6 text-right">
<button className="text-primary-fixed hover:underline text-xs font-black uppercase italic tracking-tighter">{t("Assign")}</button>
</td>
</tr>
<tr className="hover:bg-white/5 transition-colors group">
<td className="px-8 py-6">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs">SC</div>
<div>
<p className="text-on-surface font-bold text-sm">{t("Sarah Chen")}</p>
<p className="text-[10px] text-on-surface-variant">{t("UID: 88203-A")}</p>
</div>
</div>
</td>
<td className="px-8 py-6">
<span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase">{t("Account Access")}</span>
</td>
<td className="px-8 py-6">
<div className="flex items-center gap-2">
<div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
<span className="text-xs font-label text-on-surface">{t("Escalated")}</span>
</div>
</td>
<td className="px-8 py-6 text-xs text-on-surface-variant">1 hour ago</td>
<td className="px-8 py-6 text-right">
<button className="text-primary-fixed hover:underline text-xs font-black uppercase italic tracking-tighter">{t("View Details")}</button>
</td>
</tr>
</tbody>
</table>
</div>
</section>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)] transition-all active:scale-90 duration-300 ease-out" href="/trainee">
<span className="material-symbols-outlined">home</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Dashboard")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/ai-coach">
<span className="material-symbols-outlined">smart_toy</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Automation")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/shop">
<span className="material-symbols-outlined">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Market")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/squads">
<span className="material-symbols-outlined">group</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Teams")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/wallet">
<span className="material-symbols-outlined">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Finance")}</span>
</Link>
</nav>

<button className="fixed bottom-24 right-8 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-on-primary-fixed shadow-[0_8px_32px_rgba(255,123,0,0.4)] active:scale-90 transition-all z-40">
<span className="material-symbols-outlined font-black">{t("add")}</span>
</button>

    </div>
  );
}
