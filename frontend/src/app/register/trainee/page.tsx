'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { GemZApi } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const router = useRouter();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    
    const [fitnessLevel, setFitnessLevel] = useState('Build Muscle');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    const handleRegister = async () => {
        if (!email || !password || !fullName) {
            setError(t('Please complete your core account details.'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res: any = await GemZApi.Auth.register({ email, password, fullName, phone, role: 'trainee', fitnessLevel });
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/trainee');
        } catch (err: any) {
            setError(err.message || t('Registration failed'));
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      
<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
<span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">Gem Z</span>
</Link>
<button onClick={toggleLanguage} className="text-[#ff7b00] font-headline font-bold tracking-tight hover:text-white transition-colors active:scale-95 duration-200 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            {isArabic ? 'EN' : 'عربي'}
        </button>
</header>
<main className="pt-24 pb-32 px-6 max-w-2xl mx-auto min-h-screen">

<div className="mb-12 flex items-center justify-between">
<div className="flex flex-col">
<span className="text-[10px] uppercase tracking-[0.3em] text-primary-fixed font-bold mb-1">{t("Onboarding")}</span>
<h1 className="text-4xl font-black text-on-surface font-headline leading-none tracking-tighter">{t("PHASE 02")}</h1>
</div>
<div className="flex gap-2">
<div className="h-1 w-8 bg-primary-fixed rounded-full shadow-[0_0_10px_rgba(255,123,0,0.5)]"></div>
<div className="h-1 w-8 bg-surface-container-highest rounded-full"></div>
<div className="h-1 w-8 bg-surface-container-highest rounded-full"></div>
</div>
</div>

{error && <div className="mb-8 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">{error}</div>}

<section className="space-y-4 mb-12">
    <h2 className="text-xl font-headline font-bold text-on-surface">{t("Account Credentials")}</h2>
    <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder={t("Full Name")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("Email Address")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder={t("Phone Number (e.g. +201001234567)")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("Password (min 8 chars)")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
</section>

<section className="space-y-8 mb-16">
<div className="space-y-2">
<h2 className="text-display-sm font-headline font-bold text-on-surface">{t("What's your primary goal?")}</h2>
<p className="text-sm text-on-surface-variant max-w-sm">{t("Select the objective that matches your vision for the next 90 days.")}</p>
</div>
<div className="grid grid-cols-2 gap-4">
<div onClick={() => setFitnessLevel('Build Muscle')} className={`glass-panel p-6 rounded-lg border cursor-pointer group active:scale-95 transition-all ${fitnessLevel === 'Build Muscle' ? 'border-primary-fixed shadow-[0_0_20px_rgba(255,123,0,0.1)]' : 'border-white/5 hover:border-primary-fixed/30'}`}>
<span className="material-symbols-outlined text-primary-fixed text-4xl mb-4 group-hover:scale-110 transition-transform" data-icon="fitness_center">fitness_center</span>
<h3 className="text-on-surface font-bold font-headline mb-1">{t("Build Muscle")}</h3>
<p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{t("Hypertrophy focus")}</p>
</div>
<div onClick={() => setFitnessLevel('Fat Loss')} className={`glass-panel p-6 rounded-lg border cursor-pointer active:scale-95 transition-all ${fitnessLevel === 'Fat Loss' ? 'border-secondary shadow-[0_0_20px_rgba(0,255,163,0.1)]' : 'border-white/5 hover:border-primary-fixed/30'}`}>
<span className="material-symbols-outlined text-on-surface-variant text-4xl mb-4" data-icon="bolt">bolt</span>
<h3 className="text-on-surface font-bold font-headline mb-1">{t("Fat Loss")}</h3>
<p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{t("Caloric deficit")}</p>
</div>
<div onClick={() => setFitnessLevel('Athletic Performance')} className={`glass-panel p-6 rounded-lg border cursor-pointer active:scale-95 transition-all col-span-2 flex items-center justify-between ${fitnessLevel === 'Athletic Performance' ? 'border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.1)]' : 'border-white/5 hover:border-primary-fixed/30'}`}>
<div>
<h3 className="text-on-surface font-bold font-headline mb-1">{t("Athletic Performance")}</h3>
<p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Speed, Agility &amp; Strength</p>
</div>
<span className="material-symbols-outlined text-[#00E5FF] text-4xl" data-icon="speed">{t("speed")}</span>
</div>
</div>
</section>

<section className="space-y-8 mb-16">
<div className="space-y-2">
<h2 className="text-display-sm font-headline font-bold text-on-surface">{t("Workout Frequency")}</h2>
<p className="text-sm text-on-surface-variant">{t("How many days per week can you commit?")}</p>
</div>
<div className="bg-surface-container-low p-8 rounded-xl border border-white/5">
<div className="flex justify-between items-end mb-8">
<span className="text-6xl font-black text-primary-fixed font-headline leading-none">04</span>
<span className="text-lg font-bold text-on-surface font-headline uppercase tracking-widest">{t("Days / Week")}</span>
</div>
<div className="relative h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
<div className="absolute top-0 left-0 h-full w-[60%] bg-gradient-to-r from-primary-fixed to-secondary shadow-[0_0_15px_rgba(255,123,0,0.4)]"></div>
</div>
<div className="flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
<span>1 Day</span>
<span>7 Days</span>
</div>
</div>
</section>

<section className="space-y-8">
<div className="space-y-2">
<h2 className="text-display-sm font-headline font-bold text-on-surface">{t("Vital Statistics")}</h2>
<p className="text-sm text-on-surface-variant">{t("We use these to calculate your metabolic baseline.")}</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="space-y-2 group">
<label className="text-[10px] font-bold text-primary-fixed uppercase tracking-[0.2em] ml-1">{t("Current Weight (kg)")}</label>
<div className="relative">
<input value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:border-primary-fixed focus:ring-0 text-3xl font-black font-headline text-on-surface transition-all outline-none px-0 pb-4" placeholder="00.0" type="number"/>
<div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary-fixed group-focus-within:w-full transition-all duration-500"></div>
</div>
</div>
<div className="space-y-2 group">
<label className="text-[10px] font-bold text-primary-fixed uppercase tracking-[0.2em] ml-1">{t("Height (cm)")}</label>
<div className="relative">
<input value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:border-primary-fixed focus:ring-0 text-3xl font-black font-headline text-on-surface transition-all outline-none px-0 pb-4" placeholder="000" type="number"/>
<div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary-fixed group-focus-within:w-full transition-all duration-500"></div>
</div>
</div>
</div>
<div className="glass-panel p-6 rounded-lg border border-white/5 mt-8 flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-primary-fixed/10 flex items-center justify-center">
<span className="material-symbols-outlined text-primary-fixed" data-icon="info">{t("info")}</span>
</div>
<p className="text-xs text-on-surface-variant leading-relaxed">{t("Your BMI will be calculated automatically. Providing accurate data helps GEM Z tailor your intensity ramps.")}</p>
</div>
</section>
</main>

<div className="fixed bottom-12 right-8 z-50">
<button onClick={handleRegister} disabled={loading} className="flex items-center gap-3 bg-primary-fixed text-on-primary-fixed px-8 py-4 rounded-full font-headline font-black uppercase tracking-widest shadow-[0_15px_35px_rgba(255,123,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 outline-none">
{loading ? <Loader2 className="animate-spin" /> : <>{t("Start Journey")}<span className="material-symbols-outlined" data-icon="arrow_forward">{t("arrow_forward")}</span></>}
</button>
</div>


<div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-fixed/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
<div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

    </div>
  );
}
