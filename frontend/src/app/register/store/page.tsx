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
    
    const [storeName, setStoreName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Premium Gear');

    const handleRegister = async () => {
        if (!email || !password || !fullName || !storeName) {
            setError(t('Please complete your merchant account details and store name.'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res: any = await GemZApi.Auth.register({ 
                email, 
                password, 
                fullName, 
                role: 'store_owner', 
                storeData: { 
                    name: storeName,
                    description: description,
                    category: category
                } 
            });
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/store'); 
        } catch (err: any) {
            setError(err.message || t('Registration failed'));
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      
<header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 h-16">
<Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
<span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">Gem Z</span>
</Link>
<button className="text-[#ff7b00] font-headline font-bold tracking-tight active:scale-95 duration-200 transition-colors hover:text-[#ff7b00]/80">
            العربية
        </button>
</header>
<main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">

<div className="mb-12 flex justify-between items-center gap-4">
<div className="flex-1 flex flex-col gap-2">
<div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full w-1/3 bg-gradient-to-r from-primary-fixed to-secondary rounded-full"></div>
</div>
<div className="flex justify-between text-[10px] uppercase tracking-widest text-on-surface-variant font-label font-semibold">
<span className="text-primary-fixed">{t("Identity")}</span>
<span>{t("Inventory")}</span>
<span>{t("Payouts")}</span>
</div>
</div>
</div>

<section className="mb-16">
<h1 className="text-6xl md:text-8xl font-black font-headline tracking-tighter leading-[0.9] text-primary-fixed mb-4">{t("LAUNCH")}<br/>{t("YOUR")}<br/>{t("SPACE.")}</h1>
<p className="text-on-surface-variant max-w-xs text-sm leading-relaxed border-l-2 border-primary-fixed pl-4 ml-2">{t("Join the high-performance ecosystem. Define your brand identity in the Kinetic Void.")}</p>
</section>

{error && <div className="mb-8 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">{error}</div>}

<form className="space-y-12" onSubmit={(e) => e.preventDefault()}>

<div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
<div className="md:col-span-4">
<h2 className="text-xl font-headline font-bold text-on-surface mb-2">{t("STORE IDENTITY")}</h2>
<p className="text-xs text-on-surface-variant/60 uppercase tracking-widest">Brand name &amp; bio</p>
</div>
<div className="md:col-span-8 space-y-8">
    
    <div className="space-y-4 mb-4">
        <label className="block text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-2">{t("Merchant Credentials")}</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder={t("Manager Full Name")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("Business Email")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("Password (min 8 chars)")} className="w-full bg-surface-container p-4 rounded-xl border border-white/5 focus:border-primary-fixed focus:ring-0 transition-all outline-none" />
    </div>

<div className="relative group">
<label className="block text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-2 group-focus-within:text-primary-fixed transition-colors">{t("Digital Storefront Name")}</label>
<input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 py-4 text-2xl font-headline font-bold text-on-surface focus:border-primary-fixed transition-all duration-300 placeholder:text-surface-variant outline-none" placeholder="e.g. NEON VELOCITY" type="text"/>
</div>
<div className="relative group">
<label className="block text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-2 group-focus-within:text-primary-fixed transition-colors">{t("Brand Mission")}</label>
<textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-outline-variant/40 py-4 text-lg font-body text-on-surface focus:border-primary-fixed transition-all duration-300 placeholder:text-surface-variant resize-none outline-none" placeholder="Describe the energy of your products..." rows={2}></textarea>
</div>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-12 border-t border-white/5">
<div className="md:col-span-4">
<h2 className="text-xl font-headline font-bold text-on-surface mb-2">{t("CATEGORIES")}</h2>
<p className="text-xs text-on-surface-variant/60 uppercase tracking-widest">{t("Select your niche")}</p>
</div>
<div className="md:col-span-8">
<div className="grid grid-cols-2 gap-4">

<div onClick={() => setCategory('Digital Assets')} className={`glass-panel p-6 rounded-lg border cursor-pointer transition-all group relative overflow-hidden ${category === 'Digital Assets' ? 'border-primary-fixed/80 bg-primary-fixed/10 ring-2 ring-primary-fixed' : 'border-white/5 hover:border-primary-fixed/50'}`}>
<span className="material-symbols-outlined text-primary-fixed mb-4 block" data-icon="smart_toy">smart_toy</span>
<h3 className="font-headline font-bold text-on-surface">{t("Digital Assets")}</h3>
<p className="text-xs text-on-surface-variant">Software &amp; AI tools</p>
</div>

<div onClick={() => setCategory('Premium Gear')} className={`p-6 rounded-lg cursor-pointer transition-all group relative overflow-hidden ${category === 'Premium Gear' ? 'bg-primary-fixed shadow-[0_0_30px_rgba(255,123,0,0.3)]' : 'glass-panel border border-white/5 hover:border-primary-fixed/50'}`}>
<span className={`material-symbols-outlined mb-4 block ${category === 'Premium Gear' ? 'text-on-primary-fixed' : 'text-primary-fixed'}`} style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
<h3 className={`font-headline font-bold ${category === 'Premium Gear' ? 'text-on-primary-fixed' : 'text-on-surface'}`}>{t("Premium Gear")}</h3>
<p className={`text-xs ${category === 'Premium Gear' ? 'text-on-primary-fixed/70' : 'text-on-surface-variant'}`}>Hardware &amp; Equipment</p>
</div>

<div onClick={() => setCategory('Apparel')} className={`glass-panel p-6 rounded-lg border cursor-pointer transition-all group relative overflow-hidden ${category === 'Apparel' ? 'border-primary-fixed/80 bg-primary-fixed/10 ring-2 ring-primary-fixed' : 'border-white/5 hover:border-primary-fixed/50'}`}>
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-fixed mb-4 block transition-colors" data-icon="apparel">{t("apparel")}</span>
<h3 className="font-headline font-bold text-on-surface">{t("Apparel")}</h3>
<p className="text-xs text-on-surface-variant">{t("Performance wear")}</p>
</div>

<div onClick={() => setCategory('Supplements')} className={`glass-panel p-6 rounded-lg border cursor-pointer transition-all group relative overflow-hidden ${category === 'Supplements' ? 'border-primary-fixed/80 bg-primary-fixed/10 ring-2 ring-primary-fixed' : 'border-white/5 hover:border-primary-fixed/50'}`}>
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-fixed mb-4 block transition-colors" data-icon="bolt">bolt</span>
<h3 className="font-headline font-bold text-on-surface">{t("Supplements")}</h3>
<p className="text-xs text-on-surface-variant">Energy &amp; Health</p>
</div>

</div>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-12 border-t border-white/5">
<div className="md:col-span-4">
<h2 className="text-xl font-headline font-bold text-on-surface mb-2">{t("BANKING")}</h2>
<p className="text-xs text-on-surface-variant/60 uppercase tracking-widest">{t("Payout configuration")}</p>
</div>
<div className="md:col-span-8 glass-panel p-8 rounded-lg border border-white/5">
<div className="space-y-6">
<div className="relative">
<label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{t("IBAN / Account Number")}</label>
<div className="flex items-center gap-3 border-b border-outline-variant/40 py-2 focus-within:border-primary-fixed transition-colors">
<span className="material-symbols-outlined text-on-surface-variant" data-icon="account_balance">account_balance</span>
<input className="w-full bg-transparent border-none p-0 text-on-surface font-body outline-none focus:ring-0" placeholder="SA 0000 0000 0000 0000 0000" type="text"/>
</div>
</div>
<div className="grid grid-cols-2 gap-6">
<div className="relative">
<label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{t("Swift Code")}</label>
<input className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-2 text-on-surface font-body outline-none focus:border-primary-fixed focus:ring-0 transition-colors" placeholder="ABCD US XX" type="text"/>
</div>
<div className="relative">
<label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{t("Currency")}</label>
<select className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-2 outline-none text-on-surface font-body focus:border-primary-fixed focus:ring-0 transition-colors">
<option className="bg-surface-container">{t("USD - Dollar")}</option>
<option className="bg-surface-container">{t("SAR - Riyal")}</option>
<option className="bg-surface-container">{t("EUR - Euro")}</option>
</select>
</div>
</div>
</div>
</div>
</div>
</form>
</main>

<div className="fixed bottom-24 right-6 z-50">
<button onClick={handleRegister} disabled={loading} type="button" className="bg-primary-fixed text-on-primary-fixed p-5 rounded-full shadow-[0_15px_35px_rgba(255,123,0,0.4)] flex items-center gap-3 active:scale-95 duration-200 group disabled:opacity-50 outline-none">
{loading ? <Loader2 className="animate-spin" /> : <><span className="font-headline font-black tracking-widest text-[10px] uppercase hidden group-hover:block transition-all">{t("Launch Now")}</span><span className="material-symbols-outlined font-bold" data-icon="arrow_forward">{t("arrow_forward")}</span></>}
</button>
</div>

<div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
<div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-primary-fixed/5 rounded-full blur-[120px]"></div>
<div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]"></div>
</div>

    </div>
  );
}
