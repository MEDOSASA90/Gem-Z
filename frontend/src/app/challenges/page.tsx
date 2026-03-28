'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="bg-black/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-primary-fixed overflow-hidden">
<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" className="w-full h-full object-cover" data-alt="Portrait of a determined elite athlete with sharp lighting and glowing orange neon highlights on a dark studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJVyLgtAH1yMP3Uw-sLa7Rm5n76WgXHQTBlfdCdlaSSbg3vNDJBmi1i2qhP-Q1tDXKD5AiWWV2WfRNrWHbl8th2Q40OD-mTLR7DZmk2GRIBGbr2_fw2C3uIYBx2DS-f_B1EkcxQ6A3FST7utJU6o2WlRbx2SCLQoVzmtej9v7ojKs-I2DVpn7m2G1kTLQQJgu35aCVKYDnMoaTqGx0LnbdwpA758H1W847-WPgolCClCHxxXJgzG3WY_R_dGyxs3SCrqqCSaTJTN_D"/></a>
</div>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</span></a>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex gap-8 items-center">
<Link className="text-[#ff7b00] font-headline font-bold tracking-tight" href="/">{t("Challenges")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors font-headline font-bold tracking-tight" href="/shop">{t("Shop")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors font-headline font-bold tracking-tight" href="/ai-coach">{t("Coach")}</Link>
</nav>
<button className="text-[#ff7b00] scale-95 active:duration-150">
<span className="material-symbols-outlined text-2xl" data-icon="notifications">notifications</span>
</button>
</div>
</header>
<main className="max-w-7xl mx-auto px-6 pt-12">

<section className="mb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
<div className="lg:col-span-7">
<div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed/20 text-primary-fixed mb-6 border border-primary-fixed/30">
<span className="material-symbols-outlined text-sm" data-icon="bolt" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t("Live Challenge")}</span>
</div>
<h1 className="text-6xl md:text-8xl font-black font-headline leading-[0.9] tracking-tighter mb-8 italic uppercase">{t("Neon")}<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed to-tertiary-container">{t("Sprint")}</span> 04
                </h1>
<p className="text-on-surface-variant text-lg md:text-xl max-w-xl mb-10 leading-relaxed">{t("Push your limits in the ultimate 48-hour endurance race. Accumulate steps, burn calories, and climb the ranks to secure exclusive seasonal Gems.")}</p>
<div className="flex flex-wrap gap-4">
<Link href="/register" className="px-10 py-5 bg-primary-fixed text-on-primary-fixed font-headline font-black rounded-lg shadow-[0_0_30px_rgba(255,123,0,0.4)] hover:scale-105 transition-transform flex items-center gap-3 group">{t("JOIN CHALLENGE")}<span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">{t("arrow_forward")}</span>
</Link>
<button className="px-10 py-5 bg-surface-container-high/40 backdrop-blur-md text-on-surface font-headline font-bold rounded-lg border border-outline-variant/30 hover:bg-surface-container-high transition-colors">{t("VIEW REWARDS")}</button>
</div>
</div>
<div className="lg:col-span-5 relative">
<div className="aspect-square rounded-xl overflow-hidden shadow-[0_0_50px_rgba(255,123,0,0.15)] relative group">
<img alt="Challenge Preview" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" data-alt="High-contrast action shot of a runner sprinting on a dark urban track with glowing orange neon lines tracing the movement" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtrpJ1Y6CdoEZOlonAAZMS29owI4f4d9oPFzFPMeBJ_fFJ3Za9cmpgv8fwElpYnUkBnOt8E2gl66hXu2crKUjbOOdV-0qHqCkgLz6eXm1_McqxlQNgecZiSgM8Fx1Z2I9j2ZtfKklocYnim3-mDJLuCsX8nuqJKPesurjL1CQl7y1-24JlBiMmPs5KSDJ2s4m3-77XqZD07s-CHpeaCm64Xzl27Nx8PhI9T8SBouf9Ejy1vXWcxCngyELDEDw8jqsLk_fWkEWM151S"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
<div className="absolute bottom-6 left-6 right-6 p-6 glassmorphism-surface bg-black/40 rounded-lg border border-white/10">
<div className="flex justify-between items-end">
<div>
<p className="text-on-surface-variant text-xs uppercase tracking-widest mb-1">{t("Current Prize Pool")}</p>
<h3 className="text-3xl font-black text-tertiary-container italic">15,000 GEMS</h3>
</div>
<div className="text-right">
<p className="text-on-surface-variant text-xs uppercase tracking-widest mb-1">{t("Participants")}</p>
<h3 className="text-3xl font-black text-on-surface">1,240</h3>
</div>
</div>
</div>
</div>
</div>
</section>

<div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">

<div className="md:col-span-8 bg-surface-container-low rounded-lg p-8 border border-white/5 relative overflow-hidden">
<div className="flex justify-between items-center mb-10">
<h2 className="text-4xl font-black font-headline italic tracking-tighter">{t("LEADERBOARD")}</h2>
<div className="flex gap-2">
<button className="px-4 py-2 bg-primary-fixed text-on-primary-fixed rounded-full text-xs font-bold uppercase tracking-widest">{t("Global")}</button>
<Link href="/squads" className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold uppercase tracking-widest hover:text-on-surface transition-colors">{t("Squads")}</Link>
</div>
</div>
<div className="space-y-4">

<div className="group flex items-center justify-between p-6 bg-surface-container-high/40 rounded-lg border-l-4 border-primary-fixed hover:bg-surface-container-high transition-colors">
<div className="flex items-center gap-6">
<span className="text-2xl font-black italic text-primary-fixed w-8">01</span>
<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-fixed">
<img alt="Rank 1" className="w-full h-full object-cover" data-alt="Cyberpunk style profile avatar of a male athlete with holographic orange interface elements" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9Gu0VPJkcFrVaNB25SB258uAVuOUtW_s4iFJXMDgOqfTrTsn5NQ9UdJ5G0d-UT5vUxA3G820xiTqnI8LbwOM81GuK1-D6ZFY6UChdwawkP68ESX8V3k4hSjOjx79UTsoqWDximS6zJGTJX-73IbbxmcrapequV5l3L0VFWd6K45mLgGVAeZHyb9-mTfcypF4c7yjwkMKh0sFsi2Qc3uTeGml1wgXd-DIKXLBYDzYTZ-G3j6I-6ZP7BBSJfkcn9vxbrrDqwYRwcBRy"/>
</div>
<div>
<h4 className="font-bold text-lg">{t("Xenon_Pulse")}</h4>
<p className="text-on-surface-variant text-sm">Level 64 • 12.4k Gems</p>
</div>
</div>
<div className="text-right">
<div className="text-2xl font-black text-tertiary-container italic">+2,500</div>
<p className="text-on-surface-variant text-[10px] uppercase tracking-widest">{t("Expected Reward")}</p>
</div>
</div>

<div className="group flex items-center justify-between p-6 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
<div className="flex items-center gap-6">
<span className="text-2xl font-black italic text-on-surface-variant w-8">02</span>
<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-outline-variant transition-colors">
<img alt="Rank 2" className="w-full h-full object-cover" data-alt="Minimalist futuristic avatar of a female athlete with orange lighting accents" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1NaM7iyIOvG8hagj8UyF6VZ0s0Oh3tX8Hbf9_DYRKU_86_RC5JgUjoQFY88ZAHb0SpDJpM9JD8PjMoxr73rjeuvCRAtkjl3Y8CgAoA34UKY588_3InZNGjn47QRrRkacuIlc7lY_x-FBbd9EwI9i8YJoOwqQFYvx3ILpvJS8Ps2GJZHLQ10aERhu-z5r3qpqTGYhTNSb0Sq5X41xGSnm7_0XoZ5w3fTpMfJun0TbwWNr8LAJnLE4tM0mqo2PPs5XpgFNAOaSlRWiZ"/>
</div>
<div>
<h4 className="font-bold text-lg">{t("Atlas_Force")}</h4>
<p className="text-on-surface-variant text-sm">Level 51 • 9.8k Gems</p>
</div>
</div>
<div className="text-right">
<div className="text-2xl font-black text-on-surface-variant italic">+1,200</div>
<p className="text-on-surface-variant text-[10px] uppercase tracking-widest">{t("Expected Reward")}</p>
</div>
</div>

<div className="group flex items-center justify-between p-6 bg-gradient-to-r from-secondary-container/30 to-transparent rounded-lg border border-secondary/20 shadow-[0_0_20px_rgba(207,117,2,0.1)]">
<div className="flex items-center gap-6">
<span className="text-2xl font-black italic text-secondary w-8">42</span>
<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-secondary shadow-[0_0_10px_rgba(207,117,2,0.5)]">
<img alt="User Avatar" className="w-full h-full object-cover" data-alt="Elite athlete portrait in dark settings with amber lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_BJdO1XeojU9LuQgsEzIkuByydM63HZc3koR7OsXyE2xWZOeWqp79jx_5gMMnMNRu6M8ri7ngBflqin0MQsYCpB-MpZxfk5L24kQPiFWZKvHym_cv5QYYvx_J17KgGZ82uIBI5QuGZpcklSGcXs9o8LhTIqRje6xQUr54eM9-BMJ4vg_RnhW_paAACksrNJ8KctiGgMkKyUC6nUc_HpgeKhZx7IX5zJEBB1lfzgFujHDgbnBeoNns8cVBOM6Rl3p4M6iuu64GKf9b"/>
</div>
<div>
<h4 className="font-bold text-lg">{t("YOU")}</h4>
<p className="text-secondary text-sm font-bold uppercase tracking-tighter">Elite Athlete • Level 42</p>
</div>
</div>
<div className="text-right">
<div className="text-2xl font-black text-secondary italic">+150</div>
<p className="text-on-surface-variant text-[10px] uppercase tracking-widest">{t("Expected Reward")}</p>
</div>
</div>

<div className="group flex items-center justify-between p-6 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
<div className="flex items-center gap-6">
<span className="text-2xl font-black italic text-on-surface-variant w-8">03</span>
<div className="w-12 h-12 rounded-full overflow-hidden">
<img alt="Rank 3" className="w-full h-full object-cover" data-alt="Aggressive athletic profile with orange backlighting and deep shadows" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYxN861-HjMeEja7ueTFbLsQOtIeISWo0UNsQPkfkjpb_pEcaXMBdfPQfvz2HXZL-mh9WFxN0O3ys6i12Rnsu1zs6z7uFd_IjFOTj0tLWTeGqzaQ2tY5tEIx-IYN9yZOqavNYNfQ_IsrDj376SH3PbSxcrgIo2QUlDdfMCksrHk9AWlyaxk6sCYOZUap8SA6uoigXUnACqFZOYFNL1hKJDKynQXQLL1azoSxDH40lRBOeDvT5BzbDpHZYoTcIJQyN1cpcrXhqXKx1y"/>
</div>
<div>
<h4 className="font-bold text-lg">{t("Cipher_Sprint")}</h4>
<p className="text-on-surface-variant text-sm">Level 48 • 8.2k Gems</p>
</div>
</div>
<div className="text-right">
<div className="text-2xl font-black text-on-surface-variant italic">+800</div>
<p className="text-on-surface-variant text-[10px] uppercase tracking-widest">{t("Expected Reward")}</p>
</div>
</div>
</div>
<Link href="/challenges" className="w-full mt-8 py-4 text-on-surface-variant font-bold uppercase tracking-[0.3em] text-xs hover:text-primary-fixed transition-colors border-t border-white/5">
                    View Full Rankings (500+)
                </Link>
</div>

<div className="md:col-span-4 space-y-6">

<div className="bg-surface-container-high p-8 rounded-lg border border-white/5">
<h3 className="text-xl font-black font-headline italic mb-6">{t("REWARD TIERS")}</h3>
<div className="space-y-6">
<div className="flex justify-between items-center">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-tertiary-container" data-icon="military_tech">military_tech</span>
<span className="text-sm font-bold">Top 1%</span>
</div>
<span className="font-black text-tertiary-container italic">{t("Legendary Gem")}</span>
</div>
<div className="flex justify-between items-center">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-gray-400" data-icon="workspace_premium">{t("workspace_premium")}</span>
<span className="text-sm font-bold">Top 5%</span>
</div>
<span className="font-black text-on-surface italic">{t("Epic Loot Box")}</span>
</div>
<div className="flex justify-between items-center">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-amber-700" data-icon="verified">{t("verified")}</span>
<span className="text-sm font-bold">{t("Participation")}</span>
</div>
<span className="font-black text-on-surface-variant italic">100 Gems</span>
</div>
</div>
</div>

<div className="bg-black border border-primary-fixed/30 p-8 rounded-lg relative overflow-hidden group">
<div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/10 rounded-full blur-2xl group-hover:bg-primary-fixed/20 transition-all"></div>
<h3 className="text-xl font-black font-headline italic mb-6">{t("YOUR PROGRESS")}</h3>
<div className="space-y-4">
<div className="flex justify-between text-xs font-bold uppercase tracking-widest">
<span className="text-on-surface-variant">{t("Daily Goal")}</span>
<span className="text-primary-fixed">78%</span>
</div>
<div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-primary-fixed to-tertiary-container w-[78%]"></div>
</div>
<p className="text-[11px] text-on-surface-variant leading-relaxed pt-2">{t("Only")}<span className="text-on-surface font-bold">2,400 steps</span>{t("left to unlock your daily streak bonus.")}</p>
</div>
</div>

<div className="bg-surface-container-low p-8 rounded-lg border border-white/5">
<h3 className="text-xl font-black font-headline italic mb-4">{t("SQUAD UP")}</h3>
<p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{t("Join forces with your squad to multiply your collective rewards by 1.5x.")}</p>
<Link href="/squads" className="w-full py-3 bg-surface-container-high text-on-surface font-black rounded-lg text-xs uppercase tracking-widest hover:bg-secondary-container/50 transition-colors">{t("INVITE SQUAD")}</Link>
</div>
</div>
</div>
</main>

<aside className="hidden lg:fixed left-0 top-24 bottom-24 h-[calc(100vh-12rem)] w-20 hover:w-80 bg-[#0e0e0e] rounded-r-[2rem] shadow-2xl shadow-orange-900/20 flex flex-col p-6 group transition-all duration-300 ease-in-out z-40">
<div className="flex items-center gap-4 mb-10 overflow-hidden">
<div className="min-w-[3rem] h-12 rounded-full bg-surface-container-high border-2 border-primary-fixed overflow-hidden">
<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" className="w-full h-full object-cover" data-alt="Close-up of a high-performance athlete profile in a dark neon environment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi7jX1LXSKtIhTWFP5BT73nrWaOKaMfeGAFvOyG3ykYF9e9qYQnBrdDFQ5UWisxT-PQYFO2Qr0l6cDHbbKgf0XhMWfqZUHyW2bYZdDstuvTpWHyCE2kuu3fo_Ga5nsrqrUud1OjcneNieKTUlWkej-EN5g0Tx8fgwaK7csLl1sBQv2I9-zL9X7oJChJGU68oyo6E4_mq8V42NhvFCJB9X0MHyA53dpZ900zqAp07kvNqK85wWdc3eeEKrhVwxb5xfvcWr9cZSWF07a"/></a>
</div>
<div className="opacity-0 group-hover:opacity-100 transition-opacity">
<p className="font-headline font-black text-primary-fixed whitespace-nowrap">{t("Elite Athlete")}</p>
<p className="text-xs text-on-surface-variant whitespace-nowrap">Level 42 • 1,240 Gems</p>
</div>
</div>
<nav className="space-y-4">
<Link className="flex items-center gap-4 p-3 rounded-lg text-gray-300 hover:bg-[#1f1f1f] transition-all" href="/ai-coach">
<span className="material-symbols-outlined min-w-[1.5rem]" data-icon="accessibility_new">{t("accessibility_new")}</span>
<span className="opacity-0 group-hover:opacity-100 font-headline text-lg whitespace-nowrap">{t("AI Form Analysis")}</span>
</Link>
<Link className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-[#ff7b00]/20 to-transparent text-[#ff7b00] border-l-4 border-[#ff7b00]" href="/challenges">
<span className="material-symbols-outlined min-w-[1.5rem]" data-icon="bolt">bolt</span>
<span className="opacity-0 group-hover:opacity-100 font-headline text-lg whitespace-nowrap">{t("Challenges")}</span>
</Link>
<Link className="flex items-center gap-4 p-3 rounded-lg text-gray-300 hover:bg-[#1f1f1f] transition-all" href="/ai-nutritionist">
<span className="material-symbols-outlined min-w-[1.5rem]" data-icon="restaurant">restaurant</span>
<span className="opacity-0 group-hover:opacity-100 font-headline text-lg whitespace-nowrap">{t("Nutritionist")}</span>
</Link>
<Link className="flex items-center gap-4 p-3 rounded-lg text-gray-300 hover:bg-[#1f1f1f] transition-all" href="/bidding">
<span className="material-symbols-outlined min-w-[1.5rem]" data-icon="gavel">gavel</span>
<span className="opacity-0 group-hover:opacity-100 font-headline text-lg whitespace-nowrap">{t("Auctions")}</span>
</Link>
<div className="pt-10">
<Link className="flex items-center gap-4 p-3 rounded-lg text-gray-300 hover:bg-[#1f1f1f] transition-all" href="/trainee">
<span className="material-symbols-outlined min-w-[1.5rem]" data-icon="settings">settings</span>
<span className="opacity-0 group-hover:opacity-100 font-headline text-lg whitespace-nowrap">{t("Settings")}</span>
</Link>
</div>
</nav>
</aside>

<nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
<span className="material-symbols-outlined" data-icon="psychology">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/shop">
<span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)]" href="/progress">
<span className="material-symbols-outlined" data-icon="bolt" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Challenges")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/wallet">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/squads">
<span className="material-symbols-outlined" data-icon="groups">{t("groups")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
</Link>
</nav>


<button className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-16 h-16 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-xl border border-primary-fixed/30 text-primary-fixed shadow-2xl transition-transform hover:scale-110 active:scale-95 neon-pulse-glow rtl:left-6 rtl:right-auto md:rtl:left-10 md:rtl:right-auto">
<span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
</button>
    </div>
  );
}
