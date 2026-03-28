'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { GemZApi } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t } = useLanguage();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [cert, setCert] = useState('');
    const [rate, setRate] = useState<number>(85);
    const [specialty, setSpecialty] = useState('Weightloss');

    const handleRegister = async () => {
        if (!email || !password || !fullName) {
            setError(t('Please complete your core account details.'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res: any = await GemZApi.Auth.register({ 
                email, 
                password, 
                fullName, 
                role: 'trainer', 
                trainerData: { 
                    certs: [cert], 
                    rate: Number(rate), 
                    specialization: specialty 
                } 
            });
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/trainer');  // Or wherever the trainer dashboard is
        } catch (err: any) {
            setError(err.message || t('Registration failed'));
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body pb-32">
      
<header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 w-full bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
<span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">Gem Z</span>
</Link>
<button className="text-[#ff7b00] font-headline font-bold tracking-tight hover:text-white transition-colors active:scale-95 duration-200">
            العربية
        </button>
</header>

<main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">
<div className="mb-12 flex items-center justify-between">
<div className="flex flex-col gap-1">
<span className="text-primary-fixed text-xs font-bold tracking-[0.2em] uppercase">{t("Step 02 / 04")}</span>
<h1 className="text-4xl md:text-6xl font-black italic font-headline tracking-tighter text-white">{t("ELITE STATUS")}</h1>
</div>
<div className="hidden md:flex gap-2">
<div className="h-1 w-12 bg-primary-fixed rounded-full shadow-[0_0_10px_rgba(255,123,0,0.5)]"></div>
<div className="h-1 w-12 bg-primary-fixed rounded-full shadow-[0_0_15px_rgba(255,123,0,0.6)]"></div>
<div className="h-1 w-12 bg-surface-container-highest rounded-full"></div>
<div className="h-1 w-12 bg-surface-container-highest rounded-full"></div>
</div>
</div>

{error && <div className="mb-8 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">{error}</div>}

<section className="mb-12">
    <h2 className="text-xl font-headline font-bold text-on-surface mb-4 uppercase tracking-widest">{t("Account Credentials")}</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder={t("Full Name")} className="bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("Email Address")} className="bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("Password (min 8 chars)")} className="bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
    </div>
</section>

<div className="grid grid-cols-1 md:grid-cols-12 gap-8">
<div className="md:col-span-7 space-y-10">

<section>
<div className="flex items-center gap-2 mb-6">
<span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
<h2 className="text-xl font-bold font-headline uppercase tracking-widest text-on-surface">{t("Certifications")}</h2>
</div>
<div className="grid grid-cols-1 gap-4">
<div className="glass-panel p-6 rounded-lg border-l-4 border-primary-fixed transition-all hover:translate-x-1">
<label className="text-[10px] text-primary-fixed font-bold tracking-widest uppercase block mb-2">{t("Certification Name")}</label>
<input value={cert} onChange={e => setCert(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-outline-variant focus:ring-0 focus:border-primary-fixed text-white placeholder:text-surface-container-highest font-medium py-2 transition-all outline-none" placeholder="NASM Certified Personal Trainer" type="text"/>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="glass-panel p-6 rounded-lg border-l-4 border-secondary transition-all hover:translate-x-1">
<label className="text-[10px] text-secondary font-bold tracking-widest uppercase block mb-2">{t("Issue Date")}</label>
<input className="w-full bg-transparent border-0 border-b-2 border-outline-variant focus:ring-0 focus:border-secondary text-white py-2 transition-all outline-none" type="month"/>
</div>
<div className="glass-panel p-6 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-outline-variant hover:border-primary-fixed hover:bg-primary-fixed/5 transition-all group cursor-pointer">
<span className="material-symbols-outlined text-outline-variant group-hover:text-primary-fixed text-3xl mb-2">add_a_photo</span>
<span className="text-[10px] font-bold uppercase tracking-widest text-outline-variant group-hover:text-primary-fixed">{t("Upload PDF")}</span>
</div>
</div>
</div>
</section>

<section>
<div className="flex items-center gap-2 mb-6">
<span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
<h2 className="text-xl font-bold font-headline uppercase tracking-widest text-on-surface">{t("Pricing Strategy")}</h2>
</div>
<div className="bg-surface-container-low p-8 rounded-lg relative overflow-hidden group">
<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span className="material-symbols-outlined text-9xl">monitoring</span>
</div>
<div className="relative z-10 flex flex-col md:flex-row items-end gap-6">
<div className="flex-1">
<label className="text-[10px] text-primary-fixed font-bold tracking-widest uppercase block mb-4">{t("Base Hourly Rate")}</label>
<div className="flex items-baseline gap-2">
<span className="text-4xl font-black italic text-white">$</span>
<input value={rate} onChange={e => setRate(Number(e.target.value))} className="text-6xl md:text-8xl w-full bg-transparent border-0 focus:ring-0 text-white font-black italic p-0 placeholder:text-surface-container-highest outline-none" placeholder="85" type="number"/>
</div>
</div>
<div className="bg-primary-fixed text-black px-4 py-2 rounded-full font-bold text-xs uppercase tracking-tighter">{t("Market High")}</div>
</div>
</div>
</section>
</div>

<div className="md:col-span-5">
<div className="flex items-center gap-2 mb-6">
<span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<h2 className="text-xl font-bold font-headline uppercase tracking-widest text-on-surface">{t("Specialties")}</h2>
</div>
<div className="space-y-4">

<div onClick={() => setSpecialty('Weightloss')} className={`group relative rounded-lg overflow-hidden bg-surface-container cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(255,123,0,0.2)] ${specialty === 'Weightloss' ? 'ring-2 ring-primary-fixed' : ''}`}>
<div className="h-32 w-full relative">
<img alt="Weightloss" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 opacity-40 group-hover:opacity-100" data-alt="close-up of focused athlete mid-workout with sweat beads and dark moody lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOD-8k1r8JGoaxDxQCWswGll2gVa-sVIuRbKWJcPqXqwndzz9XWsehUiu8sCfEzH3NZsctaN-YCXDw50VebdwRMhQaP7kJpQ4KdQ_gYE_OlEqkukiAbLnVwqLDeO6-e9oOKYtmfpYxLPC8eSznQzFoZtF9ZLEvsDJZAXk1XtwzwI9ZeNTjYnZ9GXJrHfG7wLh04hVaebKxuZePJte62lazX4FKSp9BV7apN6gnUeryQ2itsGQv1Ax9KHLdJsaZ7qYhEEhduZqxFpju"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent"></div>
</div>
<div className="p-6 absolute bottom-0 w-full flex justify-between items-center">
<div><h3 className="font-headline font-black italic text-xl tracking-tighter text-white uppercase">{t("Weightloss")}</h3></div>
<div className={`w-8 h-8 rounded-full border border-primary-fixed flex items-center justify-center transition-colors ${specialty === 'Weightloss' ? 'bg-primary-fixed' : ''}`}>
<span className="material-symbols-outlined text-primary-fixed group-hover:text-black text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></div>
</div>
</div>

<div onClick={() => setSpecialty('Strength')} className={`group relative rounded-lg overflow-hidden bg-surface-container cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(255,123,0,0.2)] ${specialty === 'Strength' ? 'ring-2 ring-primary-fixed' : ''}`}>
<div className="h-32 w-full relative">
<img alt="Strength" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 opacity-40 group-hover:opacity-100" data-alt="extreme close up of heavy barbell iron plates in a dark gym with harsh rim lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAR_QpShry91-ZFaCT4unPrgsT1dBsftPIkPSqSkxMI93Bmz58OKIEvIq-Ctsux97jmXSLL6imdlBF-_efy-K04YK_fT9oVfdkIGZ88RK3peUGMk89wls5iJNEj7HV3hWfP0H9NAIJhxhhPQESx2DAqq4OHuBEosu-qgr2_2fyhzjt7UcMRcsTDw2vc5t6TLfJpLkfAQW4lZTf5M5HiunG1Xe5uvTiZC5t_8rNoOqMOBM8ahKIKB6W8aaZEsElwv8u8p-jLpE4ev9vS"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent"></div>
</div>
<div className="p-6 absolute bottom-0 w-full flex justify-between items-center">
<div><h3 className="font-headline font-black italic text-xl tracking-tighter text-white uppercase">{t("Strength")}</h3></div>
<div className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-colors ${specialty === 'Strength' ? 'bg-primary-fixed' : ''}`}>
<span className="material-symbols-outlined text-white/20 text-sm">add</span></div>
</div>
</div>

</div>
</div>
</div>
</main>

<button onClick={handleRegister} disabled={loading} className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-primary-fixed text-black shadow-[0_0_25px_rgba(255,123,0,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group disabled:opacity-50 outline-none">
{loading ? <Loader2 className="animate-spin" /> : <span className="material-symbols-outlined text-3xl transition-transform group-hover:translate-x-1" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>}
</button>

<div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
<div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]"></div>
<div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]"></div>
</div>

    </div>
  );
}
