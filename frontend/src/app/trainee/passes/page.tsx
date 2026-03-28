'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { GemZApi } from '../../../lib/api';
import { QrCode, Ticket, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PassesPage() {
    const { t } = useLanguage();
    const { isArabic } = useLanguage();
    const [passes, setPasses] = useState<any[]>([]);
    const [gyms, setGyms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyLoading, setBuyLoading] = useState(false);
    const [selectedGym, setSelectedGym] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [passesRes, gymsRes] = await Promise.all([
                GemZApi.Gym.getTraineePasses(),
                GemZApi.request('/search?query=gym') // Quick way to get gyms list
            ]);
            if (passesRes.success) setPasses(passesRes.passes);
            
            // Extract gyms from search results
            if (gymsRes.success && gymsRes.results?.users) {
                setGyms(gymsRes.results.users.filter((u: any) => u.role === 'gym'));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyPass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGym) return;
        setBuyLoading(true);
        try {
            // Hardcode price to 150 EGP for demo purposes
            await GemZApi.Gym.buyPass(selectedGym, 150);
            await fetchData();
            setSelectedGym('');
        } catch (error) {
            console.error(error);
        } finally {
            setBuyLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" size={48} /></div>;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <header className="py-12 text-center" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                <Ticket size={48} className="mx-auto text-[var(--color-primary)] mb-4" />
                <h1 className="text-4xl font-black mb-2">{isArabic ? 'تذاكر الدخول اليومية' : 'Daily Gym Passes'}</h1>
                <p className="text-gray-400">{isArabic ? 'اشترِ تذكرة يومية لأي صالة وادخل باستخدام الـ QR الخاص بك' : 'Buy a daily pass to any gym and enter using your unique QR'}</p>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Buy Pass Form */}
                <div className="md:col-span-1 p-6 rounded-3xl shadow-xl glass-panel h-fit sticky top-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Ticket className="text-[var(--color-secondary)]" /> {isArabic ? 'شراء تذكرة جديدة' : 'Buy New Pass'}
                    </h2>

                    <form onSubmit={handleBuyPass} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'اختر الصالة الرياضية' : 'Select Gym'}</label>
                            <select required value={selectedGym} onChange={(e) => setSelectedGym(e.target.value)} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)] appearance-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }}>
                                <option value="" disabled>{isArabic ? '-- اختر --' : '-- Select --'}</option>
                                {gyms.map(g => (
                                    <option key={g.id} value={g.id}>{g.full_name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5 flex justify-between items-center">
                            <span className="text-gray-400">{isArabic ? 'سعر التذكرة الموحد' : 'Standard Pass Price'}</span>
                            <span className="font-black text-[var(--color-primary)] text-xl">150 EGP</span>
                        </div>

                        <button disabled={buyLoading || !selectedGym} type="submit" className="w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-105" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                            {buyLoading ? <Loader2 className="animate-spin" /> : <Ticket />} {isArabic ? 'تأكيد الشراء' : 'Confirm Purchase'}
                        </button>
                    </form>
                </div>

                {/* My Passes */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <QrCode className="text-[var(--color-purple)]" /> {isArabic ? 'تذاكري النشطة' : 'My Active Passes'}
                    </h2>

                    {passes.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 rounded-3xl" style={{ border: '1px dashed var(--border-medium)' }}>
                            {isArabic ? 'ليس لديك أي تذاكر نشطة.' : 'You have no active passes.'}
                        </div>
                    ) : (
                        passes.map((p, i) => {
                            const isExpired = new Date(p.expires_at) < new Date();
                            const isValid = !p.is_used && !isExpired;
                            
                            return (
                                <div key={i} className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-3xl shadow-lg border relative overflow-hidden ${isValid ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5' : 'border-gray-800 bg-gray-900/50 opacity-60'}`}>
                                    {/* Virtual Ticket Stub */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-black rounded-r-full"></div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-black rounded-l-full"></div>

                                    <div className="flex-1 text-center md:text-left md:ml-4">
                                        <h3 className="text-2xl font-black mb-1">{p.gym_name}</h3>
                                        <p className="text-gray-400 text-sm mb-3">
                                            {isArabic ? 'رقم التذكرة:' : 'Pass ID:'} <span className="font-mono text-white">{p.qr_code.substring(0, 15)}...</span>
                                        </p>
                                        <div className="text-xs font-bold px-3 py-1 rounded-full inline-block bg-white/10">
                                            {isArabic ? 'تاريخ الشراء:' : 'Purchased:'} {format(new Date(p.created_at), 'PPP')}
                                        </div>
                                    </div>

                                    <div className="mt-6 md:mt-0 flex flex-col items-center">
                                        {isValid ? (
                                            <div className="p-3 rounded-2xl bg-white flex flex-col items-center">
                                                <QrCode size={80} className="text-black mb-2" />
                                                <span className="text-black font-black text-xs font-mono">{p.qr_code}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-4">
                                                <CheckCircle2 size={48} className={p.is_used ? "text-green-500" : "text-red-500"} />
                                                <span className={`font-bold mt-2 ${p.is_used ? "text-green-500" : "text-red-500"}`}>
                                                    {p.is_used ? (isArabic ? 'مُستخدمة' : 'Used') : (isArabic ? 'منتهية' : 'Expired')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
