'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16 w-full shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full overflow-hidden border border-primary-fixed/30">
<img className="w-full h-full object-cover" data-alt="professional fitness trainer portrait with athletic build and confident expression in a dark high-end gym setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEfPcdc7yKTa860Kn09M2B9cdv7LLXbiSNZjBkBQtMm6QLS9OSIq0GesjLVAQHvVn60AgxDzGya1NVLj65WrBOtJ7T-_kzSHm55bWl8lpDwSLBG_SKf3YVQJL3X3fld4c42Hzi5MigVS-x45Ofonu9-gg4GW5Q1DTKYp2oiSDl9NwtxHydMDtAjXE0uib0vr4rFx7xBz_i8iGS--heyr29O4E6dFfhUqjAJG6lB5x7a3WF3NKS9P-3bosIbz7JIzxr3GJ68VLKcHis"/>
</div>
<a href="https://gem-z.shop/"><h1 className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-2xl">{t("GEM Z")}</h1></a>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex gap-8">
<Link className="text-[#ff7b00] font-bold tracking-tight transition-colors" href="/">{t("Dashboard")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors font-bold tracking-tight" href="/trainer/clients">{t("Clients")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors font-bold tracking-tight" href="/trainer/revenue">{t("Revenue")}</Link>
</nav>
<button onClick={toggleLanguage} className="text-[#ff7b00] font-headline font-bold tracking-tight active:scale-95 duration-200 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">{isArabic ? 'EN' : 'عربي'}</button>
</div>
</header>
<main className="pt-24 pb-32 px-6 max-w-7xl mx-auto space-y-12">

<section className="flex flex-col md:flex-row justify-between items-end gap-6">
<div className="space-y-2">
<span className="text-primary-fixed font-headline font-bold tracking-widest uppercase text-xs">{t("Performance Overview")}</span>
<h2 className="text-5xl md:text-7xl font-headline font-black text-on-surface tracking-tighter leading-none">{t("TRAINER")}<br/><span className="text-primary-fixed">{t("PULSE")}</span></h2>
</div>
<div className="w-full md:w-auto">
<Link href="/ai-coach" className="w-full md:w-auto group relative px-8 py-4 kinetic-gradient rounded-full font-headline font-black text-black tracking-tight active:scale-95 duration-300 overflow-hidden shadow-[0_0_20px_rgba(255,123,0,0.4)]">
<span className="relative z-10 flex items-center justify-center gap-2">
<span className="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>{t("GENERATE AI WORKOUT")}</span>
<div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
</Link>
</div>
</section>

<section className="grid grid-cols-1 md:grid-cols-3 gap-6">

<div className="md:col-span-2 glass-card rounded-lg p-8 relative overflow-hidden group">
<div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-fixed/10 rounded-full blur-3xl group-hover:bg-primary-fixed/20 transition-colors duration-500"></div>
<div className="relative z-10 flex flex-col h-full justify-between">
<div>
<div className="flex items-center gap-2 text-primary-fixed mb-4">
<span className="material-symbols-outlined" data-icon="group" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
<span className="font-headline font-bold tracking-widest text-xs uppercase">{t("Roster Strength")}</span>
</div>
<div className="flex items-baseline gap-4">
<span className="text-7xl font-headline font-black text-on-surface tracking-tighter">142</span>
<span className="text-secondary-dim font-bold">+12% this month</span>
</div>
</div>
<div className="mt-8 flex gap-2">
<div className="flex -space-x-3">
<img className="w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover" data-alt="portrait of a fit woman smiling after workout" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBR4GZ723xZfvfNMsLk1JD_DyEQh53cT084gQd4yIXK3K2uv22AXo5-A1nNj_5IxKPESTvaxW6ce8sReO34et10ajAwXBbZoTxtA0nzCCxRTgz4FQxTI7kHHE0pYScvZhM-Zovgf6Nedy2d1BZVn4uNBm2AjjbSVfpiGat8IMxD-I0u3CnxVZuUDAMC8oY4mJc-3doOfll684hPfvSHJMRLmdm3yq-9wfzd23V1XSs0dRNL6ZN0PkE6zlMaHEdw6m-Dfuo16tFRRb5P"/>
<img className="w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover" data-alt="portrait of an athletic man in gym wear" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuhSjGBYjolAzexwV6kh7eGnQsYaerrqVGbOsvQRgTC4ZHP8ht8dw5Tj60kV-RrHjyDm9cgojoRMzdP1Iw1O-UUfrc4IBYZ84AEerQcfeLogrUl1mnYqxN4SQ0VUIsSaeFRhFZMjCYRmfrjeQaXcuIC9gbi7j6olQJ22Md3dhtGDR8fVNvHql93qAtRSOCo0qrmz7XqUtlRNjFWUpGjtEt7IDAZz5hyXIa_nLF3DskoljXU7Dge5QOjOREWx3yl7rzT6KFpRnTheO4"/>
<img className="w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover" data-alt="portrait of a focused female athlete" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfr-yeExshgfSy9mPVTGefT81cqMDgBvm6qYHsgmacSg-g3Xh7Fo2bDu_8_WFSjHuUxaDlR8AVsrA-1g6GE4Ou6c2D2vQhFp_74aGe0FD_B6iUcibgT_zryorAyksF-hTiukRzdnZNlNBQ79aKvbqfUcXCBQ3mbn3oyJMsORQPyqYjF01mXGEXZQVuUiMqZuE8-sH9Hg38FsZMdQobixtiAE5mKEyYBCWPvoElI3MJNNCa3jrSDdEB64EDc-09oz2-HJ9od1xWTXDr"/>
<div className="w-10 h-10 rounded-full border-2 border-surface-container-lowest bg-surface-container-highest flex items-center justify-center text-[10px] font-bold">+139</div>
</div>
<span className="text-sm self-center ml-2 text-on-surface-variant italic">{t("Active Clients currently training")}</span>
</div>
</div>
</div>

<div className="glass-card rounded-lg p-8 flex flex-col justify-between border-l-4 border-primary-fixed">
<div>
<div className="flex items-center gap-2 text-primary-fixed mb-4">
<span className="material-symbols-outlined" data-icon="account_balance_wallet" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
<span className="font-headline font-bold tracking-widest text-xs uppercase">{t("Monthly Yield")}</span>
</div>
<span className="text-5xl font-headline font-black text-on-surface tracking-tighter">$12.4K</span>
</div>
<div className="mt-4 space-y-4">
<div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full kinetic-gradient w-[85%] rounded-full"></div>
</div>
<div className="flex justify-between text-xs font-bold tracking-widest uppercase">
<span>Target: $15K</span>
<span className="text-primary-fixed">85% Achieved</span>
</div>
</div>
</div>
</section>

<section className="grid grid-cols-1 lg:grid-cols-5 gap-10">

<div className="lg:col-span-3 space-y-8">
<div className="flex justify-between items-center">
<h3 className="font-headline font-black text-3xl text-on-surface tracking-tight uppercase italic">{t("Live Schedule")}</h3>
<button className="text-primary-fixed font-bold text-sm hover:underline">{t("View Calendar")}</button>
</div>
<div className="space-y-4">

<div className="group glass-card hover:bg-surface-container p-6 rounded-lg transition-all duration-300 flex items-center justify-between">
<div className="flex items-center gap-6">
<div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="close up of heavy dumbbells in a modern luxury gym environment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHehcAv-qAjqlx0nhKL2g9SiulObmtPBKWeB_z-kn-M9p2qVGCgjS1g5zEhNlHH5gcucruJrcUM3friSIw8B7MIClRkGg5BV9-DdlUpByVnJPH2aCPdjPQrWEPZxEDyexk8zXm7Vxxvy0KmXhZqmpeL-j8_o7fhffu6KaENwqLRtEMrP88ZbRIqRlchDRqDU22Rni1wvP2RvSabyG5UsvC7FYaTeEc6l8iHHTfpJLGz0sHbMsrUTOwqoOoKExEUultHj34KsDCp0Y1"/>
</div>
<div>
<h4 className="font-headline font-bold text-lg text-on-surface">{t("Hypertrophy Max")}</h4>
<div className="flex gap-4 text-sm text-on-surface-variant font-medium">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" data-icon="schedule">{t("schedule")}</span> 09:00 AM</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" data-icon="group">group</span> 42 Joined</span>
</div>
</div>
</div>
<button className="bg-primary-fixed/10 text-primary-fixed px-6 py-2 rounded-full font-bold text-sm group-hover:bg-primary-fixed group-hover:text-black transition-all">{t("START")}</button>
</div>

<div className="group glass-card hover:bg-surface-container p-6 rounded-lg transition-all duration-300 flex items-center justify-between">
<div className="flex items-center gap-6">
<div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="person doing pilates on a mat in a bright minimalist studio" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZ083fg6iEXRpeR5m3stoZoPcyk5n-ODyQgRE-zGlvClkpuQ33dmPInzh7BjhrsDDdmz4WBsiQD_0OVafmj-1WDUKwWSeYARavU8yGYnZAzjXBIU5Zm9rSwghsWZ000hgmv4e7-nKhmmT-InEkUvw3d_ZvHQcKpnPi6ifrXDpJcH3DJm7OkrW-9NW15VZ__SV_k662foXEo9yNuei5f9OO2hTUtCIAl97qoLGAXea0rpcAdXGrhZcM3t6dQ8Kf3jZj1XEi4G3M1Aui"/>
</div>
<div>
<h4 className="font-headline font-bold text-lg text-on-surface">Flow &amp; Core Elite</h4>
<div className="flex gap-4 text-sm text-on-surface-variant font-medium">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" data-icon="schedule">{t("schedule")}</span> 11:30 AM</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" data-icon="group">group</span> 18 Joined</span>
</div>
</div>
</div>
<button className="bg-primary-fixed/10 text-primary-fixed px-6 py-2 rounded-full font-bold text-sm group-hover:bg-primary-fixed group-hover:text-black transition-all">{t("PREP")}</button>
</div>

<div className="group glass-card hover:bg-surface-container p-6 rounded-lg transition-all duration-300 flex items-center justify-between">
<div className="flex items-center gap-6">
<div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
<img className="w-full h-full object-cover" data-alt="heavy barbells and metal weight plates in an industrial gym setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUOGAUeyRUBfGec8Z3Ayd-GyWFoUYp8RYcsEa6jAAJ0ZFQvsm7lAebU7daLzXhEUoYoIDpunmlkPDATAU0ee-XpS99uyAF5S7u-ipYBLDPnjxW7WWK0x42RDR1GrzgGDV7FQ7uBAFWeLfCQzActVee4hXLpLMYY5JpITyklRMEzSSkYO2_JKluLYjXmVslaTWVK9D0nhh5H8B-OyeTE5eHG1_nADCW6476A8O0wT00t1HJ1hACbyJqXRURPERCG3dnNkCwLMuc2ZW-"/>
</div>
<div>
<h4 className="font-headline font-bold text-lg text-on-surface">{t("Powerlifting Basics")}</h4>
<div className="flex gap-4 text-sm text-on-surface-variant font-medium">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" data-icon="schedule">{t("schedule")}</span> 04:00 PM</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm" data-icon="group">group</span> 12 Joined</span>
</div>
</div>
</div>
<button className="bg-primary-fixed/10 text-primary-fixed px-6 py-2 rounded-full font-bold text-sm group-hover:bg-primary-fixed group-hover:text-black transition-all">{t("PREP")}</button>
</div>
</div>
</div>

<div className="lg:col-span-2 space-y-8">
<h3 className="font-headline font-black text-3xl text-on-surface tracking-tight uppercase italic">{t("Live Activity")}</h3>
<div className="space-y-6">
<div className="flex gap-4">
<div className="w-1 h-12 bg-primary-fixed rounded-full"></div>
<div>
<p className="text-on-surface font-bold text-sm">{t("Sarah Jenkins")}<span className="font-normal text-on-surface-variant">{t("completed")}</span>{t("Power HIIT")}</p>
<span className="text-xs text-secondary-dim uppercase tracking-tighter">2 minutes ago</span>
</div>
</div>
<div className="flex gap-4">
<div className="w-1 h-12 bg-surface-container-highest rounded-full"></div>
<div>
<p className="text-on-surface font-bold text-sm">{t("Marco Polo")}<span className="font-normal text-on-surface-variant">{t("milestone:")}</span> 100 Workouts</p>
<span className="text-xs text-secondary-dim uppercase tracking-tighter">15 minutes ago</span>
</div>
</div>
<div className="flex gap-4">
<div className="w-1 h-12 bg-primary-fixed rounded-full"></div>
<div>
<p className="text-on-surface font-bold text-sm">{t("Elena Drago")}<span className="font-normal text-on-surface-variant">{t("booked")}</span>{t("Personal Consult")}</p>
<span className="text-xs text-secondary-dim uppercase tracking-tighter">1 hour ago</span>
</div>
</div>
</div>

<div className="glass-card rounded-lg p-6">
<span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant block mb-4">{t("Training Intensity Heatmap")}</span>
<div className="grid grid-cols-7 gap-1">
<div className="aspect-square rounded-sm bg-surface-container-highest/10"></div>
<div className="aspect-square rounded-sm bg-surface-container-highest/30"></div>
<div className="aspect-square rounded-sm bg-primary-fixed/40"></div>
<div className="aspect-square rounded-sm bg-primary-fixed/60"></div>
<div className="aspect-square rounded-sm bg-primary-fixed"></div>
<div className="aspect-square rounded-sm bg-primary-fixed/80"></div>
<div className="aspect-square rounded-sm bg-primary-fixed/20"></div>

</div>
</div>
</div>
</section>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] md:hidden">
<Link className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)] transition-all active:scale-90 duration-300 ease-out" href="/trainee">
<span className="material-symbols-outlined" data-icon="home" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Home")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/ai-coach">
<span className="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">AI</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/shop">
<span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/squads">
<span className="material-symbols-outlined" data-icon="group">group</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Teams")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all active:scale-90 duration-300 ease-out" href="/wallet">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest mt-1">{t("Wallet")}</span>
</Link>
</nav>

    </div>
  );
}
