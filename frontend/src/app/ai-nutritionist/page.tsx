'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [isGenerating, setIsGenerating] = useState(false);
    const [weight, setWeight] = useState('78.4');
    const [targetWeight, setTargetWeight] = useState('82.0');
    const [userName, setUserName] = useState('');
    const [planGenerated, setPlanGenerated] = useState(false);

    // Auto-load trainee data from dashboard
    useEffect(() => {
        try {
            const stored = localStorage.getItem('gemz_user');
            if (stored) {
                const user = JSON.parse(stored);
                if (user.fullName) setUserName(user.fullName.split(' ')[0]);
                if (user.weight) setWeight(String(user.weight));
                if (user.targetWeight) setTargetWeight(String(user.targetWeight));
            }
            // Also check dashboard data
            const dashboard = localStorage.getItem('gemz_dashboard');
            if (dashboard) {
                const data = JSON.parse(dashboard);
                if (data.currentWeight) setWeight(String(data.currentWeight));
                if (data.targetWeight) setTargetWeight(String(data.targetWeight));
            }
        } catch {}
    }, []);

    const handleGeneratePlan = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setPlanGenerated(true);
        }, 2000);
    };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body pb-32">
      
<header className="bg-black/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-3">
<Link href="/trainee" className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 overflow-hidden block">
<img className="w-full h-full object-cover" data-alt="close-up portrait of a determined young athlete with sweat on forehead in dramatic dark lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaJVC1QQ8VihcaPEAK65JBLatKZfAmdApQvZn3rWAiJNZODLhxdCwY5oRU3FlZeLbM0MlFEv5oyg-RndVmiayhD1aUZVRFeb_TJDzG6wvzE4UDO9JCdD_rCb65alqOBgawqIniSuc1qlMrvaMzP5H5HZ-ZyBIbe3HApQEHP4tBiIXP7lVwpL0p3Y0lttKCpQuZSnnAuoW2M6JYhws1JOeN1wmWcmhThaYEmfEHZJ3dd4jsuIb_35W-2nJYwVVZnqTS6rBMw8AkafYw"/>
</Link>
<Link href="/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</h1></Link>
</div>
<div className="flex items-center gap-4">
    <button onClick={toggleLanguage} className="text-[#ff7b00] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full font-headline font-bold tracking-tight hover:bg-white/10 transition-colors active:scale-95 duration-200">
        {isArabic ? 'EN' : 'عربي'}
    </button>
    <button translate="no" className="material-symbols-outlined text-gray-400 hover:text-[#ff7b00] transition-colors scale-95 active:duration-150" onClick={() => alert(isArabic ? 'التنبيهات سيتم تفعيلها قريباً 🔔' : 'Notifications coming soon 🔔')}>notifications</button>
</div>
</header>

<main className="px-6 pt-8 max-w-4xl mx-auto space-y-12">

{/* Personalized Greeting */}
{userName && (
<div className="bg-[#ff7b00]/5 border border-[#ff7b00]/10 rounded-2xl p-4 flex items-center gap-4">
<span className="material-symbols-outlined text-[#ff7b00]">person_check</span>
<div>
<p className="font-bold text-white text-sm">{isArabic ? `مرحباً ${userName}! بياناتك محملة تلقائياً` : `Welcome back, ${userName}! Your data is auto-loaded.`}</p>
<p className="text-xs text-on-surface-variant">{isArabic ? 'تم جلب بيانات جسمك من لوحة التحكم' : 'Body metrics pulled from your dashboard'}</p>
</div>
</div>
)}

<section className="space-y-2">
<span className="text-primary-fixed font-label text-[10px] uppercase tracking-[0.2em] font-bold">{t("Performance Fueling")}</span>
<div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
<h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter text-on-surface-variant text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed to-tertiary-fixed">{t("Nutritionist")}</h2>
<div className="flex items-center gap-2 text-on-surface-variant/60 cursor-pointer hover:text-primary-fixed transition-colors active:scale-95" onClick={toggleLanguage}>
<span translate="no" className="material-symbols-outlined text-sm">language</span>
<span className="text-xs font-label uppercase tracking-widest">{isArabic ? 'العربية | EN' : 'EN | AR'}</span>
</div>
</div>
</section>

<section className="grid grid-cols-1 md:grid-cols-12 gap-6">

<div className="md:col-span-8 glass-panel rounded-lg p-8 space-y-8 border border-white/5">
<h3 className="text-xl font-bold font-headline flex items-center gap-2">
<span translate="no" className="material-symbols-outlined text-primary-fixed">monitor_weight</span>{t("Body Metrics")}
<span className="text-[10px] text-[#ff7b00] bg-[#ff7b00]/10 px-2 py-0.5 rounded-full font-bold ml-2">{isArabic ? 'محمّل تلقائياً' : 'Auto-loaded'}</span>
</h3>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
<div className="space-y-2 group">
<label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{t("Current Weight (kg)")}</label>
<input value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-outline-variant/20 focus:border-primary-fixed focus:ring-0 text-3xl font-headline transition-all placeholder:text-surface-container-highest" type="number"/>
</div>
<div className="space-y-2 group">
<label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{t("Target Weight (kg)")}</label>
<input value={targetWeight} onChange={e => setTargetWeight(e.target.value)} className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-outline-variant/20 focus:border-primary-fixed focus:ring-0 text-3xl font-headline transition-all placeholder:text-surface-container-highest" type="number"/>
</div>
</div>
</div>

<div className="md:col-span-4 glass-panel rounded-lg p-8 flex flex-col justify-between border border-white/5">
<div className="space-y-6">
<h3 className="text-xl font-bold font-headline flex items-center gap-2">
<span translate="no" className="material-symbols-outlined text-primary-fixed">no_food</span>{t("Allergies")}</h3>
<div className="flex flex-wrap gap-2">
<button onClick={(e) => e.currentTarget.classList.toggle('bg-primary-fixed/10')} className="px-3 py-1.5 rounded-full border border-outline-variant/30 text-xs font-bold font-label hover:border-primary-fixed transition-colors active:scale-95">{t("Dairy")}</button>
<button onClick={(e) => e.currentTarget.classList.toggle('bg-primary-fixed/10')} className="px-3 py-1.5 rounded-full border border-primary-fixed bg-primary-fixed/10 text-primary-fixed text-xs font-bold font-label active:scale-95">{t("Nuts")}</button>
<button onClick={(e) => e.currentTarget.classList.toggle('bg-primary-fixed/10')} className="px-3 py-1.5 rounded-full border border-outline-variant/30 text-xs font-bold font-label hover:border-primary-fixed transition-colors active:scale-95">{t("Gluten")}</button>
<button onClick={(e) => e.currentTarget.classList.toggle('bg-primary-fixed/10')} className="px-3 py-1.5 rounded-full border border-outline-variant/30 text-xs font-bold font-label hover:border-primary-fixed transition-colors active:scale-95">{t("Soy")}</button>
</div>
</div>
<button onClick={() => alert(isArabic ? 'إضافة حساسية مخصصة قريباً 📝' : 'Custom Allergies arriving soon 📝')} className="mt-8 flex items-center justify-between group hover:text-primary-fixed transition-colors active:scale-95">
<span className="text-[10px] uppercase tracking-widest font-bold">{t("Add Custom")}</span>
<span translate="no" className="material-symbols-outlined text-primary-fixed group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">add_circle</span>
</button>
</div>

<div className="md:col-span-12">
{/* Sponsored Ad Banner */}
<div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-[#ff7b00]/5 border border-purple-500/20 flex items-center gap-3 cursor-pointer hover:bg-purple-500/15 transition-all">
<span className="material-symbols-outlined text-purple-400 text-sm">campaign</span>
<p className="text-xs flex-1">
<span className="font-black text-purple-400">{isArabic ? '✦ ممول: ' : '✦ Sponsored: '}</span>
<span className="text-on-surface-variant">{isArabic ? 'مكمل Keto Pro — خصم 25% لمشتركي Gem Z' : 'Keto Pro Supplement — 25% off for Gem Z members'}</span>
</p>
<span className="material-symbols-outlined text-on-surface-variant text-sm">open_in_new</span>
</div>
<button 
    onClick={handleGeneratePlan}
    disabled={isGenerating}
    className="disabled:opacity-70 w-full py-6 rounded-lg bg-gradient-to-r from-primary-fixed to-tertiary-fixed text-on-primary-fixed font-black text-xl uppercase tracking-widest flex items-center justify-center gap-4 hover:shadow-[0_0_30px_rgba(255,123,0,0.4)] transition-all active:scale-[0.98]"
>
    {isGenerating ? <Loader2 className="animate-spin w-6 h-6" /> : t("Generate Meal Plan")}
    {!isGenerating && <span translate="no" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>}
</button>
</div>
</section>

<section className="space-y-8 pt-12">
<div className="flex items-end justify-between">
<h3 className="text-4xl font-black font-headline tracking-tighter">{t("Your daily stats")}</h3>
<span className="text-on-surface-variant/40 text-[10px] md:text-xs font-label">{t("BASED ON ELITE ATHLETE PROFILE")}</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

<div className="bg-surface-container-low rounded-lg p-6 border border-white/5 relative overflow-hidden group hover:border-primary-fixed/30 transition-colors">
<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
<span translate="no" className="material-symbols-outlined text-6xl text-primary-fixed">restaurant</span>
</div>
<span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{t("Proteins")}</span>
<div className="mt-4 flex items-baseline gap-2">
<span className="text-5xl font-black font-headline text-primary-fixed">180</span>
<span className="text-xl font-bold font-headline text-on-surface-variant">g</span>
</div>
<div className="mt-4 w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
<div className="w-[75%] h-full bg-primary-fixed animate-pulse"></div>
</div>
</div>
<div className="bg-surface-container-low rounded-lg p-6 border border-white/5 relative overflow-hidden group hover:border-tertiary-fixed/30 transition-colors">
<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
<span translate="no" className="material-symbols-outlined text-6xl text-tertiary-fixed">bakery_dining</span>
</div>
<span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{t("Carbs")}</span>
<div className="mt-4 flex items-baseline gap-2">
<span className="text-5xl font-black font-headline text-tertiary-fixed">240</span>
<span className="text-xl font-bold font-headline text-on-surface-variant">g</span>
</div>
<div className="mt-4 w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
<div className="w-[60%] h-full bg-tertiary-fixed animate-pulse"></div>
</div>
</div>
<div className="bg-surface-container-low rounded-lg p-6 border border-white/5 relative overflow-hidden group hover:border-secondary-fixed/30 transition-colors">
<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
<span translate="no" className="material-symbols-outlined text-6xl text-secondary-fixed">opacity</span>
</div>
<span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{t("Fats")}</span>
<div className="mt-4 flex items-baseline gap-2">
<span className="text-5xl font-black font-headline text-secondary-fixed">65</span>
<span className="text-xl font-bold font-headline text-on-surface-variant">g</span>
</div>
<div className="mt-4 w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
<div className="w-[45%] h-full bg-secondary-fixed animate-pulse"></div>
</div>
</div>
</div>
</section>

<section className="space-y-6 pt-12">
<h4 className="text-2xl font-black font-headline tracking-tight">{t("Today's Protocol")}</h4>
<div className="space-y-4">

<div onClick={() => alert(isArabic ? 'وصفة الشوفان متوفرة قريباً 🥣' : 'Oats Recipe available soon 🥣')} className="group flex items-center gap-6 p-4 glass-panel rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer border-l-4 border-primary-fixed active:scale-[0.99]">
<div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border border-outline-variant/10">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="vibrant healthy grain bowl with salmon avocado and fresh greens in a minimalist dark ceramic bowl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3q84L4UivX73AfDWJ2kEd4iovf2vL5PvOU-JG1AgR6DLfOA7Fv-HbSYx9vjRbfDzUYoQey75XZR9vGhY-erVF7vgXWMNw-CNB9o-UnAsmy49m2Zf5Wy7F3akIJHJqSr6x4h8Hl7xwAfSOzoHnEBvN-qbPBq9elfcUsBpHE_72XZEbUbF5i6HsbJlVLiWzU_9VH4ky2fmZogNyYRIxbICqCEp2QyuGplj1EprYhjRZSu9tNE_DHOOlD3hLs_3tqyL_ySumDJDT5-g4"/>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<div>
<span className="text-[10px] uppercase tracking-widest font-bold text-primary-fixed">Breakfast • 07:30 AM</span>
<h5 className="text-base md:text-lg font-bold font-headline">Steel-Cut Oats &amp; Whey</h5>
</div>
<span className="text-xs font-bold text-on-surface-variant/60">450 kcal</span>
</div>
<p className="text-sm text-on-surface-variant mt-1">{t("Topped with fresh blueberries and raw honey.")}</p>
</div>
<span translate="no" className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary-fixed transition-colors rtl:rotate-180">chevron_right</span>
</div>

<div onClick={() => alert(isArabic ? 'وصفة الدجاج المشوي متوفرة قريباً 🍗' : 'Grilled Chicken Recipe available soon 🍗')} className="group flex items-center gap-6 p-4 glass-panel rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer border-l-4 border-transparent hover:border-outline-variant/30 active:scale-[0.99]">
<div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border border-outline-variant/10">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="seared chicken breast with roasted asparagus and sweet potatoes presented on a dark slate background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnFMjXYZV7DSUGb3Ce2T9fMJf_c9MdrhR8DSPXoxjWQnbZQ_oIznKQ_tBZoXfvDn4W_TDN3GVJjA6GZxSfDqI5XWQQwWdbYlYLJ2nsDlLefJPSLuAOZInFfmTHVyHnA1HaS3BD6_HyqbTkoLcOwyaKknV8jQZGcEQhkS3_9ajv_ZkpWghFSU1XAmJPrpGbNRwbDrtMJ3unS1cnu3S45HyEbpe15j8K-ajteFDjr87o2qt9Wsq40K5ANMIqDiNOVuuAblkoKcjEy4NA"/>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<div>
<span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60">Lunch • 12:45 PM</span>
<h5 className="text-base md:text-lg font-bold font-headline">Grilled Poultry &amp; Roots</h5>
</div>
<span className="text-xs font-bold text-on-surface-variant/60">620 kcal</span>
</div>
<p className="text-sm text-on-surface-variant mt-1">{t("Lean chicken breast with honey-glazed carrots.")}</p>
</div>
<span translate="no" className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary-fixed transition-colors rtl:rotate-180">chevron_right</span>
</div>
</div>
</section>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/80 backdrop-blur-3xl rounded-t-[2rem] z-50 shadow-[0_-15px_40px_rgba(0,-0,0,0.6)] md:hidden border-t border-white/5 no-border glassmorphism-surface">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90" href="/ai-coach">
<span translate="no" className="material-symbols-outlined mb-1">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90" href="/shop">
<span translate="no" className="material-symbols-outlined mb-1">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90" href="/social">
<span translate="no" className="material-symbols-outlined mb-1">dynamic_feed</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90" href="/wallet">
<span translate="no" className="material-symbols-outlined mb-1">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform active:scale-90" href="/squads">
<span translate="no" className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold">{t("Squads")}</span>
</Link>
</nav>

<Link href="/nutrition" onClick={(e) => { e.preventDefault(); alert(isArabic ? 'تسجيل الوجبة قريباً 🧾' : 'Meal logger coming soon 🧾'); }} className="fixed bottom-32 right-6 md:right-12 md:bottom-12 z-[60] w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/80 backdrop-blur-xl border border-primary-fixed/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,123,0,0.3)] hover:shadow-[0_0_60px_rgba(255,123,0,0.6)] hover:scale-110 active:scale-95 transition-all duration-500 group">
<div className="absolute inset-0 rounded-full bg-primary-fixed/10 animate-pulse"></div>
<span translate="no" className="material-symbols-outlined text-primary-fixed text-3xl md:text-4xl group-hover:rotate-12 drop-shadow-[0_0_10px_rgba(255,123,0,0.8)] transition-transform duration-300">nutrition</span>
</Link>
    </div>
  );
}
