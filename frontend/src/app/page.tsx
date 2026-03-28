'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage() {
    const { t, isArabic } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<nav className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-xl tonal-shift bg-zinc-900/40 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
<div className="text-2xl font-black text-orange-500 italic tracking-tighter font-['Be_Vietnam_Pro']">{t("Gem Z")}</div>
<div className="hidden md:flex items-center space-x-10 font-['Be_Vietnam_Pro'] tracking-tight">
<Link className="text-orange-500 font-bold border-b-2 border-orange-500 pb-1 transition-all duration-300" href="/">{t("Features")}</Link>
<Link className="text-zinc-400 hover:text-white transition-colors transition-all duration-300" href="/shop">{t("Shop")}</Link>
<Link className="text-zinc-400 hover:text-white transition-colors transition-all duration-300" href="/challenges">{t("Leaderboard")}</Link>
</div>
<div className="flex items-center space-x-6">
<div className="flex items-center space-x-4">
<Link href="/login">
<span className="material-symbols-outlined text-zinc-400 hover:text-orange-500 cursor-pointer transition-colors" data-icon="person">{t("person")}</span>
</Link>
</div>
</div>
</div>
</nav>
<main>

<section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
<div className="absolute inset-0 z-0">
<div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10"></div>
<img alt="" className="w-full h-full object-cover opacity-60 scale-105" data-alt="Dynamic 3D digital athlete in a futuristic neon studio with orange energy trails and cinematic lighting, high-performance atmosphere." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaWraq-BN3B39PtERtg0AwmkMHvQTnw5FAwiZnUCzowm5vO4oaWoe08CtBNIc7P05ENeucDsfDZNXCZOrlmLRU9cFTpe6A6_iTLrJ60fNu92zOeJb-MwecvOeTiPtVm7SnvUiSIYJABniVAdrR9bf060pFWAM7Z6DQUEiFbJmkLLZ93xru3WzsLTPx5NJ32tmjJbn6eKJdIbThDpyyFCUwug8gn_5SHFD9AS164apIIIWSeMuMArizsypmiTCIXIfC-JWqjeTRwsw2"/>
</div>
<div className="relative z-20 text-center px-6 max-w-5xl">
<h1 className={`font-headline font-black italic tracking-tighter text-white uppercase leading-[0.9] mb-8 ${isArabic ? "text-5xl md:text-6xl lg:text-7xl" : "text-6xl md:text-8xl lg:text-9xl"}`}>{t("THE KINETIC")}<br/> <span className="kinetic-gradient-text">{t("REVOLUTION")}</span> <br/>{t("IS HERE")}</h1>
<p className="font-body text-xl md:text-2xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">{t("Unleash your potential in the world's most advanced fitness ecosystem. AI-driven precision, high-octane community, and elite gear.")}</p>
<div className="flex flex-col sm:flex-row items-center justify-center gap-6">
<Link href="/register" className="px-10 py-5 bg-primary-fixed text-on-primary-fixed font-headline font-bold text-lg rounded-full shadow-[0_0_20px_rgba(255,123,0,0.4)] hover:scale-105 active:scale-95 transition-all duration-300">{t("Join the Revolution")}</Link>
<Link href="/shop" className="px-10 py-5 glass-panel text-white font-headline font-bold text-lg rounded-full border border-white/10 hover:bg-white/10 transition-all">{t("Explore Ecosystem")}</Link>
</div>
</div>
<div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
<span className="material-symbols-outlined text-primary text-3xl" data-icon="keyboard_double_arrow_down">{t("keyboard_double_arrow_down")}</span>
</div>
</section>

<section className="py-24 px-8 max-w-screen-2xl mx-auto">
<div className="mb-20">
<span className="font-label text-primary tracking-[0.3em] uppercase text-sm font-bold">{t("Performance Modules")}</span>
<h2 className="font-headline text-5xl md:text-7xl font-black text-white mt-4 tracking-tighter">{t("ENGINEERED FOR")}<br/>{t("PEAK RESULTS.")}</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

<div className="glass-panel neon-border-glow p-8 rounded-lg flex flex-col justify-between h-[400px] group hover:translate-y-[-8px] transition-all duration-500">
<div>
<span className="material-symbols-outlined text-primary text-4xl mb-6" data-icon="psychology" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
<h3 className="font-headline text-2xl font-bold text-white mb-4">AI Coach &amp; Form Analysis</h3>
<p className="text-on-surface-variant leading-relaxed">{t("Real-time biomechanical feedback and personalized programming powered by neural networks.")}</p>
</div>
<div className="w-12 h-1 bg-primary/20 group-hover:w-full transition-all duration-500"></div>
</div>

<div className="glass-panel neon-border-glow p-8 rounded-lg flex flex-col justify-between h-[400px] group hover:translate-y-[-8px] transition-all duration-500">
<div>
<span className="material-symbols-outlined text-primary text-4xl mb-6" data-icon="nutrition" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>{t("nutrition")}</span>
<h3 className="font-headline text-2xl font-bold text-white mb-4">{t("Precision Nutrition")}</h3>
<p className="text-on-surface-variant leading-relaxed">{t("Macro-tracking and bio-integrated meal plans that sync with your metabolic load.")}</p>
</div>
<div className="w-12 h-1 bg-primary/20 group-hover:w-full transition-all duration-500"></div>
</div>

<div className="glass-panel neon-border-glow p-8 rounded-lg flex flex-col justify-between h-[400px] group hover:translate-y-[-8px] transition-all duration-500">
<div>
<span className="material-symbols-outlined text-primary text-4xl mb-6" data-icon="shopping_bag" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
<h3 className="font-headline text-2xl font-bold text-white mb-4">E-Commerce &amp; Auctions</h3>
<p className="text-on-surface-variant leading-relaxed">{t("Exclusive drops and live auctions for elite performance gear and limited digital assets.")}</p>
</div>
<div className="w-12 h-1 bg-primary/20 group-hover:w-full transition-all duration-500"></div>
</div>

<div className="glass-panel neon-border-glow p-8 rounded-lg flex flex-col justify-between h-[400px] group hover:translate-y-[-8px] transition-all duration-500">
<div>
<span className="material-symbols-outlined text-primary text-4xl mb-6" data-icon="groups" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>{t("groups")}</span>
<h3 className="font-headline text-2xl font-bold text-white mb-4">{t("Social Squads")}</h3>
<p className="text-on-surface-variant leading-relaxed">{t("Join high-performance communities and dominate global leaderboards with your crew.")}</p>
</div>
<div className="w-12 h-1 bg-primary/20 group-hover:w-full transition-all duration-500"></div>
</div>
</div>
</section>

<section className="py-24 bg-surface-container-lowest">
<div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row items-center gap-16 px-8">
<div className="lg:w-1/2">
<div className="relative rounded-lg overflow-hidden aspect-video neon-border-glow">
<img alt="" className="w-full h-full object-cover" data-alt="High-tech fitness data dashboard on a transparent screen with glowing amber and orange UI elements, futuristic analytical vibe." src="https://lh3.googleusercontent.com/aida-public/AB6AXuALvHYvlRuBihYg8j3LtIVMk3nBkwJFeDIer-oFVLsiRx0zgi8AheiT7qDW4bqtoiAbnG48Tiek2MQ6OF5M702FnNZP0pXnW3oXtUXiPTHcCldORPSYKGm7rKnpeA7h7b7hWEnz_srVhsIhSB2QUegzk3cwT53sjoBswsAAee8KIZ9WzPry1pdW4PzV6G5a5i92kYRR6FB2EbsUrCCEeWi913Tq5mV3c-oeIGFSIxnKyvjbSiJLfJAo8lamADzdQPVW7a9y0v3X5Hgh"/>
<div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"></div>
</div>
</div>
<div className="lg:w-1/2">
<h2 className="font-headline text-5xl font-black text-white mb-8 tracking-tight">{t("DATA IS YOUR")}<br/><span className="text-secondary">{t("NEW MUSCLE.")}</span></h2>
<p className="text-xl text-on-surface-variant mb-8 leading-relaxed">
                        Every rep, every calorie, every heartbeat is transformed into actionable intelligence. Gem Z doesn't just track your progress—it predicts your peak.
                    </p>
<ul className="space-y-4">
<li className="flex items-center space-x-4 text-white font-body">
<span className="material-symbols-outlined text-primary" data-icon="check_circle">{t("check_circle")}</span>
<span>{t("Predictive Recovery Analytics")}</span>
</li>
<li className="flex items-center space-x-4 text-white font-body">
<span className="material-symbols-outlined text-primary" data-icon="check_circle">{t("check_circle")}</span>
<span>{t("Neural Form Correction (Live)")}</span>
</li>
<li className="flex items-center space-x-4 text-white font-body">
<span className="material-symbols-outlined text-primary" data-icon="check_circle">{t("check_circle")}</span>
</li>
</ul>
</div>
</div>
</section>

<section className="py-24 px-8 max-w-screen-2xl mx-auto overflow-hidden">
<h2 className="font-headline text-4xl font-black text-white mb-16 text-center tracking-tight">{t("VOICES FROM THE VOID")}</h2>
<div className="flex flex-col md:flex-row gap-8 overflow-x-auto pb-8 snap-x no-scrollbar">

<div className="glass-panel p-10 rounded-lg min-w-full md:min-w-[450px] snap-center border border-white/5">
<p className="text-white text-xl italic font-body mb-8">"The AI coach corrected a deadlift form error I've had for years. It's like having an Olympic trainer in my pocket 24/7."</p>
<div className="flex items-center space-x-4">
<img alt="" className="w-14 h-14 rounded-full border-2 border-primary" data-alt="Close-up portrait of a fit young man with short hair, confident expression, soft dramatic lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7AWZbz0MBHx5Fd4HMs4Ul_Vs1U5F6ixsORzWyAqdO2LrkD4jlrkami_hPae-hoKjMuvesFy58Y_JiiYiqmR-pmDD70OCJHN7BFiB-9n1ZtRlpJQjdOC6Lex-wtD4any4m1C_v33Y4p3lk5uB7OGfOun-L3uMcY5GGuXSfqSSNCW0ot0CFEMiLJXOM8aEMkMIqDlQ9uMlznvKtgMcCPvh4yfPCKtOr-DhdBJWDVwl4Ig2tW9DA-5XdpuKUqXT5nHOvS17fwy_sSZoI"/>
<div>
<h4 className="text-white font-bold font-headline">{t("Marcus V.")}</h4>
<p className="text-primary text-sm font-label tracking-widest uppercase">{t("Elite Athlete")}</p>
</div>
</div>
</div>

<div className="glass-panel p-10 rounded-lg min-w-full md:min-w-[450px] snap-center border border-white/5">
<p className="text-white text-xl italic font-body mb-8">"The community squads keep me accountable. We're not just working out; we're competing for the future of fitness."</p>
<div className="flex items-center space-x-4">
<img alt="" className="w-14 h-14 rounded-full border-2 border-secondary" data-alt="Close-up portrait of an athletic woman with tied-back hair, smiling confidently, urban gym setting background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuChVX6-8RM1lriq6z-uPRarRTM9pZE8a1-f1zrlPQZVAFUn7ANWZXvGJ_cEm-7vXenPC4LZhiBGXAxos3MV5FoEIT2kbfJdYzo-7JbC6L593YxsdSebrtNkZioAQOxmFb7MZX3fcYinpg6R_TH0w2mTBtuqxqNE9yvYlh-gXKFLCEOTrzg1-yjNEU2P8ugOuNkHI14Gbx55aeKY8_GQ_wn9KlTgsLor3OdgD10U6O5Aj0VnTiqMT3WzRt_5eCTOorXDtJCVJNDPGmKo"/>
<div>
<h4 className="text-white font-bold font-headline">{t("Sarah J.")}</h4>
<p className="text-secondary text-sm font-label tracking-widest uppercase">{t("Squad Leader")}</p>
</div>
</div>
</div>

<div className="glass-panel p-10 rounded-lg min-w-full md:min-w-[450px] snap-center border border-white/5">
<p className="text-white text-xl italic font-body mb-8">"Exclusive drops in the shop are insane. The gear quality matches the digital experience—both are absolute top-tier."</p>
<div className="flex items-center space-x-4">
<img alt="" className="w-14 h-14 rounded-full border-2 border-primary" data-alt="Portrait of a professional male fitness coach, serious and disciplined look, high-contrast black and white photography style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTAlxcpDINutpuHqAvlyucBJHccY5e8Cwd7OeVkasW6ysRJsAdwuXguSMKav117ihFYihpIW2PtBPQ62qBSRS04dEe421EDNvI3-wjBULWeXnjbcdnPiOIzfg8AF5Fy5TiezQ229gbbo1CQJ4dh5SUoBqZOSmbL1XY2Z_GvD6516By_BRoMSUZiIRbBGmA3N87ecQxrhJfO8FpY9Ihqj65kjYE571DFVar7oNT736gbd2eBcmlufQJxg-mlyN-iQDb1y0R7OlaQPJA"/>
<div>
<h4 className="text-white font-bold font-headline">{t("David K.")}</h4>
<p className="text-primary text-sm font-label tracking-widest uppercase">{t("Performance Coach")}</p>
</div>
</div>
</div>
</div>
</section>

<section className="py-24 px-8">
<div className="max-w-4xl mx-auto glass-panel p-16 rounded-xl text-center relative overflow-hidden">
<div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
<div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
<h2 className="font-headline text-5xl font-black text-white mb-6 tracking-tight">{t("READY TO UNLEASH?")}</h2>
<p className="text-xl text-on-surface-variant mb-10 max-w-xl mx-auto">{t("Don't settle for average. Enter the Kinetic Void and redefine your limits today.")}</p>
<Link href="/register" className="px-12 py-6 bg-primary-fixed text-on-primary-fixed font-headline font-black text-xl rounded-full hover:shadow-[0_0_30px_rgba(255,123,0,0.6)] transition-all transform hover:scale-105 active:scale-95">{t("GET STARTED NOW")}</Link>
</div>
</section>
</main>

<footer className="bg-black w-full py-12 border-t border-zinc-800/20 tonal-shift bg-zinc-950">
<div className="flex flex-col md:flex-row justify-between items-center px-12 space-y-6 md:space-y-0 max-w-screen-2xl mx-auto">
<div className="text-lg font-bold text-zinc-500 font-['Be_Vietnam_Pro'] tracking-tight">{t("Gem Z")}</div>
<div className="flex flex-wrap justify-center gap-8 font-['Inter'] text-sm uppercase tracking-widest text-zinc-500">
<Link className="hover:text-orange-500 transition-colors hover:translate-y-[-2px] duration-300" href="/privacy">{t("Privacy Policy")}</Link>
<Link className="hover:text-orange-500 transition-colors hover:translate-y-[-2px] duration-300" href="/terms">{t("Terms of Service")}</Link>
<Link className="hover:text-orange-500 transition-colors hover:translate-y-[-2px] duration-300" href="/support">{t("Support")}</Link>
<Link className="hover:text-orange-500 transition-colors hover:translate-y-[-2px] duration-300" href="/contact">{t("Contact")}</Link>
<Link className="hover:text-orange-500 transition-colors hover:translate-y-[-2px] duration-300" href="/careers">{t("Careers")}</Link>
</div>
<p className="font-['Inter'] text-xs uppercase tracking-widest text-zinc-600">
                © {new Date().getFullYear()} Gem Z Fitness Ecosystem. Kinetic Energy Unleashed.
            </p>
</div>
</footer>

    </div>
  );
}
