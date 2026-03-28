'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { ArrowRight, ArrowLeft, Users, Shield, Zap, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateSquadPage() {
    const { t, isArabic } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            router.push('/squads');
        }, 1500);
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-fixed/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-tertiary-fixed/10 blur-[200px] rounded-full pointer-events-none" />
            
            <header className="px-6 py-6 sticky top-0 z-50 flex items-center justify-between">
                <button onClick={() => router.back()} className="w-12 h-12 rounded-full border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-colors">
                    {isArabic ? <ArrowRight className="w-6 h-6 text-primary-fixed" /> : <ArrowLeft className="w-6 h-6 text-primary-fixed" />}
                </button>
            </header>

            <main className="max-w-3xl mx-auto px-6 pt-4 pb-20 relative z-10">
                <div className="mb-10 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary-fixed/10 border-2 border-primary-fixed/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,123,0,0.2)]">
                        <Users className="w-10 h-10 text-primary-fixed" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-headline text-on-surface tracking-tighter mb-4 uppercase">{t("Forge Your")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7b00] to-[#ffb300] italic">{t("Squad")}</span></h1>
                    <p className="text-on-surface-variant max-w-lg mx-auto leading-relaxed">{t("Build an elite community, invite your allies, and dominate the global leaderboards together.")}</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-8 glass-card p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="space-y-2 relative z-10">
                        <label className="text-xs font-bold uppercase tracking-widest text-primary-fixed">{t("Squad Name")}</label>
                        <input required type="text" placeholder={t("e.g. Iron Titans, Neon Runners")} className="w-full bg-surface-container-high/50 border border-white/10 rounded-xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all" />
                    </div>

                    <div className="space-y-2 relative z-10">
                        <label className="text-xs font-bold uppercase tracking-widest text-primary-fixed">{t("Description")}</label>
                        <textarea rows={3} placeholder={t("What's your squad's mission?")} className="w-full bg-surface-container-high/50 border border-white/10 rounded-xl px-5 py-4 text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all resize-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-primary-fixed">{t("Squad Shield (Logo)")}</label>
                            <label className="flex items-center gap-4 w-full bg-surface-container-high/50 border border-white/10 border-dashed rounded-xl px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors">
                                <ImageIcon className="w-6 h-6 text-on-surface-variant" />
                                <span className="text-sm font-medium text-on-surface-variant">{t("Upload Image (Max 5MB)")}</span>
                                <input type="file" className="hidden" accept="image/*" />
                            </label>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-primary-fixed">{t("Privacy")}</label>
                            <div className="flex bg-surface-container-high/50 border border-white/10 rounded-xl p-1 gap-1">
                                <button type="button" className="flex-1 py-3 text-sm font-bold bg-primary-fixed text-on-primary-fixed rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,123,0,0.3)]"><Users className="w-4 h-4"/> {t("Public")}</button>
                                <button type="button" className="flex-1 py-3 text-sm font-medium text-on-surface-variant flex items-center justify-center gap-2 hover:text-on-surface transition-colors hover:bg-white/5 rounded-lg"><Shield className="w-4 h-4"/> {t("Private")}</button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 relative z-10">
                        <button disabled={loading} type="submit" className="w-full py-5 rounded-xl bg-gradient-to-r from-[#ff7b00] to-[#ffb300] text-black font-black uppercase tracking-widest text-lg shadow-[0_0_30px_rgba(255,123,0,0.4)] hover:shadow-[0_0_40px_rgba(255,123,0,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none">
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <><Zap className="w-6 h-6 fill-black" /> {t("Establish Squad")}</>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

