'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="bg-black/60 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] no-border tonal-transition-bg">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-primary/20">
<img className="w-full h-full object-cover" data-alt="Close up of a professional athlete with intense focus, sweating during a workout in a dark gym environment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0xOZEaPl48VeXRQTXPqM4jogXEyT_9CsI3OBwsWO3FTdOlDqidmMSgyL8_AXKoRH64FTTjtqJCyBe797DgyH_RWRHiDPaxoxT0oJlvs3uHXGlI9PovdOvBEkm60udxmwuVTMzNBsrL1Pa2gUeSCO9Orh3Gf9nq_0jLxiSzfwZVaOL36584e4Wvzaui5Jud5TuwJjwlmFSxVKRkENh9Ru64oHlskbPPQVPl-owsaVb7WPRI7tmcmwsBT10_XmuzSECaWw5pw4DT_xN"/>
</div>
<a href="https://gem-z.shop/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-['Be_Vietnam_Pro']">{t("GEM Z")}</h1></a>
</div>
<div className="hidden md:flex items-center gap-8">
<span className="text-[#ff7b00] font-['Be_Vietnam_Pro'] font-bold tracking-tight cursor-pointer">{t("Coach")}</span>
<span className="text-gray-400 font-['Be_Vietnam_Pro'] font-bold tracking-tight hover:text-[#ff7b00] transition-colors cursor-pointer">{t("Shop")}</span>
<span className="text-gray-400 font-['Be_Vietnam_Pro'] font-bold tracking-tight hover:text-[#ff7b00] transition-colors cursor-pointer">{t("Feed")}</span>
<span className="text-gray-400 font-['Be_Vietnam_Pro'] font-bold tracking-tight hover:text-[#ff7b00] transition-colors cursor-pointer">{t("Wallet")}</span>
</div>
<div className="flex items-center gap-3">
<div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/20">
<span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{t("diamond")}</span>
<span className="text-primary font-bold text-xs">1,240</span>
</div>
<span className="material-symbols-outlined text-[#ff7b00] cursor-pointer">notifications</span>
</div>
</header>

<main className="flex-1 relative flex flex-col md:flex-row overflow-hidden pb-20">

<section className="flex-1 relative bg-black group overflow-hidden">
<img className="absolute inset-0 w-full h-full object-cover opacity-80" data-alt="Intense high-intensity interval training session in a dark industrial gym with orange neon lighting and atmospheric smoke" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAQvLR3jhkn-MZsOyCFuaXjTkRzK3DivJkQmdbGg5qEj4vGrNEwHyhWEH_gk8XNkaslGrFmtiEOx__PbV4rhsl7Hkw0sODgnQZlElEQEAxI_nmKyA-F3Drw-o9rBs-3nIdaTMbnZ2vdcVqllZFXyz3kpBsD9ypazLfMevnPmA2JJy7upXFyLg33FjNUvz3YJfgig5-_pVKYGvbwV3G_9cJtUuKrnAbe-e-U3-23ON8BsZS6isGSo3kXmFWFKHKW-R1pt8zc-5sZfpW"/>

<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 p-6 flex flex-col justify-between">
<div className="flex justify-between items-start">
<div className="flex flex-col gap-2">
<div className="flex items-center gap-2 bg-error/20 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-error/30">
<span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
<span className="text-error text-xs font-black uppercase tracking-widest">{t("Live")}</span>
</div>
<h2 className="text-4xl md:text-6xl font-black text-white font-headline leading-tight tracking-tighter drop-shadow-2xl">{t("HYPER-BURN")}<br/>{t("SESSION")}</h2>
<p className="text-on-surface-variant text-sm font-medium">{t("with Coach Sarah \"The Blade\" Jenkins")}</p>
</div>
<div className="flex flex-col items-end gap-3">
<div className="bg-black/40 backdrop-blur-xl p-4 rounded-lg flex items-center gap-4">
<div className="text-center">
<p className="text-[10px] uppercase tracking-tighter text-on-surface-variant">{t("Heart Rate")}</p>
<p className="text-2xl font-black text-primary">164</p>
</div>
<div className="h-8 w-[1px] bg-outline-variant/30"></div>
<div className="text-center">
<p className="text-[10px] uppercase tracking-tighter text-on-surface-variant">{t("Calories")}</p>
<p className="text-2xl font-black text-tertiary">412</p>
</div>
</div>
</div>
</div>
<div className="flex items-end justify-between">
<div className="flex items-center gap-4 mb-8">
<button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary-fixed kinetic-glow hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{t("pause")}</span>
</button>
<div className="flex flex-col">
<span className="text-white font-bold">24:18 / 45:00</span>
<div className="w-48 h-1 bg-surface-container-highest rounded-full mt-1 overflow-hidden">
<div className="w-[54%] h-full bg-gradient-to-r from-primary to-secondary"></div>
</div>
</div>
</div>

<Link href="/progress" className="mb-8 relative group flex items-center gap-3 bg-gradient-to-r from-primary to-secondary p-1 rounded-full pr-6 hover:shadow-[0_0_30px_rgba(255,123,0,0.5)] transition-all scale-95 active:scale-90">
<div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
<span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{t("card_giftcard")}</span>
</div>
<span className="text-black font-black uppercase text-sm tracking-tighter">{t("Send Gift")}</span>
<div className="absolute -top-2 -right-2 bg-white text-black text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg animate-bounce">
                            +10% XP
                        </div>
</Link>
</div>
</div>
</section>

<aside className="w-full md:w-96 bg-[#0e0e0e] border-l border-outline-variant/10 flex flex-col pb-20">
<div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
<h3 className="text-lg font-black text-white font-headline">{t("Live Chat")}</h3>
<div className="flex items-center gap-2 text-on-surface-variant">
<span className="material-symbols-outlined text-sm">{t("groups")}</span>
<span className="text-xs font-bold">12.4k watching</span>
</div>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4">

<div className="flex gap-3 items-start">
<div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0 overflow-hidden border border-outline-variant/30">
<img className="w-full h-full object-cover" data-alt="Portrait of a young man with a focused expression, athletic appearance, studio lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBO071PJbha_FPy3cCucaBv-pUe9uPCs4cXF7wcrQ3Mk8vX5WQGgYo2i9bBmcFeoNWUmUMXynzso2_jjOY4J7jOCKaijF6R2e3k5daYQZmkmqm1_qT7vEDbeA7BGh_dZX7yd4VXnPxaPV22KlxzemEB1Fa0c-5NZXFmgPyJkxKkjGL3E0WJ33iAD4gfmymGSYDk_u-yDpbLtj1B3dW6mGEwPSdqr18WBTCZRcqnDDX4oj5Jh_qdfB7A7PdrCMVnxv3yhjyWbtDXRWBH"/>
</div>
<div className="flex flex-col">
<span className="text-xs font-bold text-secondary">{t("Ahmad_Fit")}</span>
<p className="text-sm text-on-surface">This session is intense! Let's go team! 🔥</p>
</div>
</div>

<div className="flex gap-3 items-start flex-row-reverse text-right">
<div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0 overflow-hidden border border-outline-variant/30">
<img className="w-full h-full object-cover" data-alt="Arabic male athlete portrait, smiling, natural sunlight, depth of field" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNxpiFyFpM6zmsXpJbd42Wf3PEJU78jZdDo3pOrmfV1lT4r1rvT6J7wo3XxB6NV2dqNy8NKPEm2xnuQZ2nl1Qmn-UGWMpm0VqkXTT5i7QWBNJilYL9D_FLTQ8hZJgastuMAbf2XGLgOGhGmDinheFr6TNtebinZSfoHDqoLTQFItRs2Ehq8gGa4LW50LlxKAAcbrHdDfLK6KIRfHCjlsGaqGiite3SdJk7fxE61YZg9_hgZiCNo6B1VBRULGSRT812ADttY7NBvJHx"/>
</div>
<div className="flex flex-col">
<span className="text-xs font-bold text-primary">{t("Omar.K")}</span>
<p className="text-sm text-on-surface" dir="rtl">تمارين رائعة جداً، شكراً كوتش سارة!</p>
</div>
</div>

<div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-center gap-3">
<span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{t("stars")}</span>
<p className="text-xs text-on-surface italic"><span className="font-bold text-primary">{t("Elite Athlete")}</span>{t("donated")}<span className="text-primary font-black">500 Gems</span>!</p>
</div>
<div className="flex gap-3 items-start">
<div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0 overflow-hidden border border-outline-variant/30">
<img className="w-full h-full object-cover" data-alt="Smiling fitness influencer portrait, energetic vibe, soft focus gym background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5b3zATg6kBCyJbSFDjZZ1RVv0mfEAwRQyUzEbIKIRDG5ty-u2p92oO8KZ49GyciimkiiZ7xiA_zt9728ysEJA2RyYvTB_eB5CNGCb5rLDsOJAZNJz7pFfeFbp4s5swHy0XqeLTJ2r2reIIdua9Mw4bAO91dXMsssmWU0rLDe3ZOkJbBDGCyPdquS7ReTiDDG7EGiYnZH7Q7G_nQVWuhY2tp38DAubhZSWIAvuKvr8VDgM2E6KiWasWnYEMO3IndVtz89PVfEUxEkY"/>
</div>
<div className="flex flex-col">
<span className="text-xs font-bold text-tertiary">{t("Sarah_GymRat")}</span>
<p className="text-sm text-on-surface">{t("Feeling the burn in my quads already!")}</p>
</div>
</div>

<div className="flex gap-3 items-start">
<div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0"></div>
<div className="flex flex-col gap-1 w-full">
<div className="h-3 w-20 bg-surface-container rounded"></div>
<div className="h-3 w-full bg-surface-container-low rounded"></div>
</div>
</div>
</div>

<div className="p-4 bg-[#131313]">
<div className="flex items-center gap-2 bg-surface-container-high rounded-full px-4 py-2 border border-outline-variant/20">
<input className="bg-transparent border-none focus:ring-0 text-sm w-full text-white placeholder:text-gray-600" placeholder="Say something..." type="text"/>
<button className="text-primary hover:scale-110 transition-transform">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
</button>
</div>
</div>
</aside>
</main>

<nav className="md:hidden bg-[#1f1f1f]/70 backdrop-blur-2xl fixed bottom-0 w-full rounded-t-[2rem] z-50 flex justify-around items-center pt-3 pb-8 px-4 no-border glassmorphism-surface shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<div className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] animate-pulse-on-click">
<span className="material-symbols-outlined">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
</div>
<div className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
</div>
<div className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined">{t("dynamic_feed")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
</div>
<div className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
</div>
<div className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined">{t("groups")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
</div>
</nav>
<Link href="/squads" className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-16 h-16 rounded-full bg-black/80 backdrop-blur-xl border border-primary/30 flex items-center justify-center shadow-[0_0_40px_-5px_#ff7b00] hover:shadow-[0_0_50px_0px_#ff7b00] transition-all duration-300 group z-[60] active:scale-90">
<span className="material-symbols-outlined text-primary text-3xl transition-transform group-hover:scale-125" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<div className="absolute -inset-1 rounded-full bg-primary/20 animate-ping opacity-20"></div>
</Link>
    </div>
  );
}
