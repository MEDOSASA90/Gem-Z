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

    const [gymName, setGymName] = useState('');
    const [crNumber, setCrNumber] = useState('');
    const [equipment, setEquipment] = useState('Free Weights');

    const handleRegister = async () => {
        if (!email || !password || !fullName || !gymName) {
            setError(t('Please complete your core admin details and Gym Name.'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res: any = await GemZApi.Auth.register({ 
                email, 
                password, 
                fullName, 
                role: 'gym_admin', 
                gymData: { 
                    name: gymName,
                    amenities: [equipment],
                } 
            });
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/gym'); 
        } catch (err: any) {
            setError(err.message || t('Registration failed'));
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body pb-32">
      
<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
<span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">Gem Z</span>
</Link>
</header>

<main className="pt-24 pb-32 px-6 max-w-5xl mx-auto">
<div className="mb-12 flex flex-col gap-1">
<span className="text-[#ff7b00] font-headline font-bold tracking-[0.2em] text-xs uppercase">{t("Step 02 / 04")}</span>
<h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter mt-2 text-white">{t("GYM IDENTITY")}</h2>
<p className="text-on-surface-variant max-w-md mt-4 text-lg">{t("Define your kinetic space. Pin your location and list your arsenal.")}</p>
</div>

{error && <div className="mb-8 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">{error}</div>}

<section className="mb-12">
    <h2 className="text-xl font-headline font-bold text-on-surface mb-4 uppercase tracking-widest">{t("Admin Credentials")}</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder={t("Manager Full Name")} className="bg-surface-container p-4 rounded-xl border border-white/5 focus:border-[#ff7b00] focus:ring-0 transition-all outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("Email Address")} className="bg-surface-container p-4 rounded-xl border border-white/5 focus:border-[#ff7b00] focus:ring-0 transition-all outline-none" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("Password (min 8 chars)")} className="bg-surface-container p-4 rounded-xl border border-white/5 focus:border-[#ff7b00] focus:ring-0 transition-all outline-none" />
    </div>
</section>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
<div className="lg:col-span-8 group">
    <div className="glass-card rounded-lg overflow-hidden border border-white/5 shadow-2xl relative mb-6">
        <label className="text-[10px] text-[#ff7b00] font-bold tracking-widest uppercase block p-4 bg-surface-container-high">{t("Official Gym Name")}</label>
        <input value={gymName} onChange={e => setGymName(e.target.value)} className="w-full bg-surface-container-highest border-0 p-6 text-2xl font-headline focus:ring-0 placeholder:text-surface-variant outline-none" placeholder="Iron Empire Gym" type="text"/>
    </div>
    
<div className="glass-card rounded-lg overflow-hidden border border-white/5 shadow-2xl relative">
<div className="absolute top-6 left-6 z-10 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#ff7b00]/20 flex items-center gap-2">
<span className="material-symbols-outlined text-[#ff7b00] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
<span className="text-xs font-bold tracking-widest uppercase">{t("Pin Location")}</span>
</div>
<div className="w-full h-[300px] bg-surface-container-high relative">
<img className="w-full h-full object-cover opacity-60 mix-blend-luminosity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyvcxrkkZGM550Uc9tMGWSEJCdodSdUlf2MuwX4MORGjKSJ2Kmos3_iMVPzvbiV2Fij_Wop6cC31rFgOyE61oqQfXji9g6Zyejynwvix-bHkJMFiCGARv-TGK2zvIhGhjN3a3P746fwvXoZhu0QCpOVPHOC9cOcqj2DUt5d5nqlm8OPIXGSYrR7gIBQAxWJwd3NrSlJGa-I0hS9Py-tJx-OiX5pi7yAAOJUe5_V0vPc7UWMbUILHrbhlrXL8VL5vP8Y7uwLdkh3qxW"/>
<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
</div>
</div>
</div>

<div className="lg:col-span-4">
<div className="glass-card h-full rounded-lg p-8 border border-white/5 flex flex-col justify-between">
<div>
<div className="w-12 h-12 rounded-full bg-[#ff7b00]/10 flex items-center justify-center mb-6">
<span className="material-symbols-outlined text-[#ff7b00]">verified_user</span>
</div>
<h3 className="font-headline font-bold text-2xl text-white mb-2">{t("Legal Verification")}</h3>
<div className="space-y-6">
<div className="kinetic-border pb-2">
<label className="text-[10px] uppercase tracking-[0.2em] text-[#ff7b00] font-bold">{t("CR Number")}</label>
<input value={crNumber} onChange={e => setCrNumber(e.target.value)} className="w-full bg-transparent border-none p-0 text-xl font-headline focus:ring-0 placeholder:text-surface-variant outline-none" placeholder="1010XXXXXX" type="text"/>
</div>
<div className="border-2 border-dashed border-outline-variant/30 rounded-lg p-6 text-center hover:border-[#ff7b00]/50 transition-colors cursor-pointer group">
<span className="material-symbols-outlined text-4xl text-surface-variant group-hover:text-[#ff7b00] transition-colors">cloud_upload</span>
<p className="mt-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t("Drop PDF/JPG here")}</p>
</div>
</div>
</div>
</div>
</div>

<div className="lg:col-span-12 mt-12 w-full">
<h3 className="text-3xl font-black font-headline italic tracking-tight text-white mb-6 uppercase">{t("Equipment Arsenal")}</h3>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<div onClick={() => setEquipment('Free Weights')} className={`glass-card p-6 rounded-lg border cursor-pointer transition-all ${equipment === 'Free Weights' ? 'border-[#ff7b00]' : 'border-white/5'}`}>
<span className="material-symbols-outlined text-[#ff7b00] mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
<h4 className="font-headline font-bold text-white text-lg">{t("Free Weights")}</h4>
</div>

<div onClick={() => setEquipment('Cardio Zone')} className={`glass-card p-6 rounded-lg border cursor-pointer transition-all ${equipment === 'Cardio Zone' ? 'border-[#ff7b00]' : 'border-white/5'}`}>
<span className="material-symbols-outlined text-[#ff7b00] mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
<h4 className="font-headline font-bold text-white text-lg">{t("Cardio Zone")}</h4>
</div>

<div onClick={() => setEquipment('Crossfit Platforms')} className={`glass-card p-6 rounded-lg border cursor-pointer transition-all ${equipment === 'Crossfit Platforms' ? 'border-[#ff7b00]' : 'border-white/5'}`}>
<span className="material-symbols-outlined text-[#ff7b00] mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>sports_gymnastics</span>
<h4 className="font-headline font-bold text-white text-lg">{t("Crossfit Platforms")}</h4>
</div>

<div onClick={() => setEquipment('Recovery Pools')} className={`glass-card p-6 rounded-lg border cursor-pointer transition-all ${equipment === 'Recovery Pools' ? 'border-[#ff7b00]' : 'border-white/5'}`}>
<span className="material-symbols-outlined text-[#ff7b00] mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>pool</span>
<h4 className="font-headline font-bold text-white text-lg">{t("Recovery Pools")}</h4>
</div>

</div>
</div>
</div>
</main>

<button onClick={handleRegister} disabled={loading} className="fixed bottom-12 right-8 z-[60] w-16 h-16 rounded-full bg-[#ff7b00] flex items-center justify-center text-white shadow-[0_10px_40px_rgba(var(--color-purple-rgb),0.5)] active:scale-90 transition-transform group disabled:opacity-50 outline-none">
{loading ? <Loader2 className="animate-spin" /> : <span className="material-symbols-outlined text-3xl font-bold group-hover:translate-x-1 transition-transform">arrow_forward</span>}
</button>

<div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
<div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ff7b00]/10 rounded-full blur-[120px]"></div>
<div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]"></div>
</div>

    </div>
  );
}
