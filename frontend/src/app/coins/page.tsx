'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Link from 'next/link';
import { GemZApi } from '../../lib/api';
import { Brain, Utensils, Footprints, ShoppingBag, LayoutList, Users, Wallet } from "lucide-react";

const EARN_ACTIVITIES = [
    { icon: '🏋️', titleEn: 'Complete a Workout', titleAr: 'أكمل تمريناً', coinsEn: '+15 Coins', coinsAr: '+15 كوين', daily: true },
    { icon: '🥗', titleEn: 'Log All Meals', titleAr: 'سجّل كل وجباتك', coinsEn: '+10 Coins', coinsAr: '+10 كوين', daily: true },
    { icon: '💧', titleEn: 'Hit Water Goal', titleAr: 'حقق هدف الماء', coinsEn: '+5 Coins', coinsAr: '+5 كوين', daily: true },
    { icon: '🔥', titleEn: '7-Day Streak Bonus', titleAr: 'مكافأة 7 أيام متتالية', coinsEn: '+50 Coins', coinsAr: '+50 كوين', daily: false },
    { icon: '👥', titleEn: 'Refer a Friend', titleAr: 'أحلت صديقاً', coinsEn: '+100 Coins', coinsAr: '+100 كوين', daily: false },
    { icon: '🏆', titleEn: 'Win a Challenge', titleAr: 'فز في تحدي', coinsEn: '+200 Coins', coinsAr: '+200 كوين', daily: false },
];

const REWARDS = [
    { id: 1, emoji: '💰', titleEn: 'EGP 50 Wallet Credit', titleAr: '50 ج.م رصيد محفظة', cost: 500, type: 'wallet', color: '#ff7b00', stock: null, popular: true },
    { id: 2, emoji: '🏋️', titleEn: '1 Free Gym Day Pass', titleAr: 'دخول مجاني للجيم يوم', cost: 800, type: 'gym', color: '#ff7b00', stock: 20, popular: false },
    { id: 3, emoji: '🥤', titleEn: '10% Off Supplements', titleAr: 'خصم 10٪ مكملات', cost: 300, type: 'discount', color: '#ff7b00', stock: null, popular: true },
    { id: 4, emoji: '💊', titleEn: 'Free Creatine Sample', titleAr: 'عينة كرياتين مجانية', cost: 600, type: 'merchandise', color: '#ff7b00', stock: 50, popular: false },
    { id: 5, emoji: '🎽', titleEn: 'GEM Z T-Shirt', titleAr: 'تيشيرت GEM Z', cost: 1200, type: 'merchandise', color: '#ff7b00', stock: 30, popular: false },
    { id: 6, emoji: '⭐', titleEn: 'Premium Trainer Session', titleAr: 'جلسة مدرب نخبوي', cost: 2000, type: 'session', color: '#ff7b00', stock: null, popular: false },
];

const LEDGER = [
    { icon: '🏋️', descEn: 'Workout completed', descAr: 'تمرين مكتمل', amount: +15, date: 'Today', dateAr: 'اليوم', type: 'in' },
    { icon: '🥗', descEn: 'All meals logged', descAr: 'كل الوجبات مسجلة', amount: +10, date: 'Today', dateAr: 'اليوم', type: 'in' },
    { icon: '💰', descEn: 'Redeemed: EGP 50 credit', descAr: 'استبدال: رصيد 50 ج.م', amount: -500, date: 'Yesterday', dateAr: 'أمس', type: 'out' },
    { icon: '🔥', descEn: '7-Day Streak Bonus', descAr: 'مكافأة 7 أيام', amount: +50, date: '2 days ago', dateAr: 'منذ يومين', type: 'in' },
    { icon: '👥', descEn: 'Referral reward — Omar', descAr: 'مكافأة إحالة — عمر', amount: +100, date: 'Last week', dateAr: 'الأسبوع الماضي', type: 'in' },
];

const LEVEL_THRESHOLD = 2500;
const LEVEL_NAME = { en: 'Gold Warrior', ar: 'المحارب الذهبي' };
const NEXT_LEVEL = { en: 'Platinum Champion', ar: 'البطل البلاتيني' };


export default function CoinsPage() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState<'store' | 'earn' | 'history'>('store');
    const [redeemModal, setRedeemModal] = useState<typeof REWARDS[0] | null>(null);
    const [redeemed, setRedeemed] = useState<number[]>([]);
    
    const [currentCoins, setCurrentCoins] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res: any = await GemZApi.Trainee.getDashboard();
            if (res.success && res.data?.profile) {
                setCurrentCoins(res.data.profile.total_points || 0);
            }
        } catch (error) {
            console.error('Failed to load coins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!redeemModal) return;
        setRedeeming(true);
        try {
            const res: any = await GemZApi.Coins.redeem(redeemModal.id.toString());
            if (res.success) {
                setCurrentCoins(res.newBalance);
                setRedeemed(p => [...p, redeemModal.id]);
                setRedeemModal(null);
            } else {
                alert(res.message);
            }
        } catch (error: any) {
            alert(error.message || 'Redemption failed');
        } finally {
            setRedeeming(false);
        }
    };

    const fmtCoins = (n: number) => n.toLocaleString('en-US');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
                <Loader2 className="w-10 h-10 animate-spin text-primary-fixed" />
            </div>
        );
    }

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body overflow-hidden">
            {/* Nav Header Standard */}
            <header className="bg-black/60 backdrop-blur-xl docked full-width top-0 sticky z-50 no-border tonal-transition-bg shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20">
                        <a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsuBDlyIQql2GU1sPbbChgTAckM3f3hWGChb2siCoOW-3GDywlUjMy59EQWJUPQCGUl4h4DWEEW6Ubssu2PyaGyJW9nhTICQcO5NZLb46sKSxZkQjEd9TNguOSlbUSG7fbCJvZLdv6CjCxBGk7lUnyk7rnq5m38siAhRFa7nfcj0FVStRTAscZlX8zavzIXTOBzwFDgLpug2qiH6D-YxbPj-DWvYrU2piWbguFrCfG86QEY4JM-3kLhiSUOyBRacd-AopwocledZl-"/></a>
                    </div>
                    <a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter uppercase">{t("GEM Z")}</span></a>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleLanguage} className="bg-surface-container-highest/60 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
                        {isArabic ? 'EN' : 'عربي'}
                    </button>
                    <button className="material-symbols-outlined text-2xl scale-95 active:duration-150 text-gray-400 hover:text-[#ff7b00] transition-colors">notifications</button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 pt-10 pb-32 relative z-10">
                {/* Balance Hero Card */}
                <div className="relative glass-card rounded-[2.5rem] p-8 mb-10 border border-primary-fixed/30 shadow-[0_0_50px_rgba(255,123,0,0.15)] overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-tertiary-fixed/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
                        <div>
                            <p className="text-sm font-bold tracking-widest uppercase text-on-surface-variant mb-2">{isArabic ? 'رصيد الجواهر (كوينز)' : 'GemZ Balance'}</p>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-6xl md:text-8xl font-black font-headline text-transparent bg-clip-text bg-gradient-to-r from-[#ff7b00] to-[#ffb300] drop-shadow-[0_0_15px_rgba(255,123,0,0.4)]">{fmtCoins(currentCoins)}</span>
                                <span className="text-[#ff7b00] text-3xl font-bold">🪙</span>
                            </div>
                        </div>
                        
                        {/* Level bar */}
                        <div className="w-full md:max-w-xs mt-4">
                            <div className="flex justify-between items-center text-xs mb-2">
                                <span className="text-primary-fixed font-black uppercase tracking-widest">{isArabic ? LEVEL_NAME.ar : LEVEL_NAME.en}</span>
                                <span className="font-bold text-on-surface-variant">{fmtCoins(currentCoins)} / {fmtCoins(LEVEL_THRESHOLD)}</span>
                            </div>
                            <div className="h-3 rounded-full bg-surface-container-highest/50 border border-white/5 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#ff7b00] to-[#ffb300] relative" style={{ width: `${(currentCoins / LEVEL_THRESHOLD) * 100}%` }}>
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold mt-2 text-on-surface-variant uppercase tracking-widest text-right">
                                {isArabic ? `التالي: ${NEXT_LEVEL.ar} 🏆` : `Next: ${NEXT_LEVEL.en} 🏆`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
                    {[
                        { id: 'store', en: '🎁 Store', ar: '🎁 المتجر' },
                        { id: 'earn', en: '⚡ How to Earn', ar: '⚡ كيف تكسب' },
                        { id: 'history', en: '📋 History', ar: '📋 السجل' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gradient-to-r from-[#ff7b00] to-[#ffb300] text-black shadow-[0_0_20px_rgba(255,123,0,0.4)] scale-105' : 'glass-panel bg-surface-container-high/50 border border-white/5 text-on-surface-variant hover:text-white hover:bg-white/10'}`}>
                            {isArabic ? tab.ar : tab.en}
                        </button>
                    ))}
                </div>

                {/* STORE TAB */}
                {activeTab === 'store' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6 px-2">
                            {isArabic ? 'استبدل كوينزك بجوائز حقيقية 🎁' : 'Redeem your coins for real rewards 🎁'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {REWARDS.map(reward => {
                                const canAfford = currentCoins >= reward.cost;
                                const done = redeemed.includes(reward.id);
                                return (
                                    <div key={reward.id} className={`glass-card rounded-[2rem] p-6 relative flex flex-col justify-between transition-all duration-300 ${done ? 'opacity-60 grayscale-[50%]' : 'hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(255,123,0,0.15)] group'} ${canAfford && !done ? 'border-[#ff7b00]/30' : 'border-white/5'}`}>
                                        
                                        {/* Badges */}
                                        {reward.popular && !done && (
                                            <span className="absolute top-4 right-4 bg-gradient-to-r from-[#ff7b00] to-[#ffb300] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,123,0,0.4)]">🔥 {isArabic ? 'شائع' : 'POPULAR'}</span>
                                        )}
                                        {done && <span className="absolute top-4 right-4 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">✓ {isArabic ? 'تم الاستبدال' : 'REDEEMED'}</span>}
                                        
                                        <div className="text-5xl mb-4 group-hover:scale-110 transition-transform origin-left">{reward.emoji}</div>
                                        <h3 className="font-black font-headline text-lg text-on-surface mb-2 leading-tight">{isArabic ? reward.titleAr : reward.titleEn}</h3>
                                        {reward.stock && <p className="text-xs font-bold text-on-surface-variant mb-4 uppercase tracking-widest">{reward.stock} {isArabic ? 'متبقية' : 'left in stock'}</p>}
                                        
                                        <div className="flex items-center justify-between mt-6 bg-surface-container-highest/40 p-2 pl-4 pr-2 rounded-2xl border border-white/5">
                                            <span className="font-black font-headline text-[#ff7b00] text-xl">{fmtCoins(reward.cost)} <span className="text-sm">🪙</span></span>
                                            <button
                                                disabled={!canAfford || done}
                                                onClick={() => setRedeemModal(reward)}
                                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${done ? 'bg-green-500 text-black' : canAfford ? 'bg-[#ff7b00] hover:bg-[#ffb300] text-black shadow-[0_0_15px_rgba(255,123,0,0.4)] hover:shadow-[0_0_20px_rgba(255,123,0,0.6)]' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                                                {done ? '✓' : canAfford ? (isArabic ? 'استبدال' : 'REDEEM') : <Lock size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* EARN TAB */}
                {activeTab === 'earn' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="p-4 rounded-xl border border-[#ff7b00]/30 bg-[#ff7b00]/5 text-[#ff7b00] font-bold text-sm text-center uppercase tracking-widest backdrop-blur-sm">
                            {isArabic ? '💡 كل نشاط يومي يمنحك كوينز مجانية لدعم تطورك!' : '💡 Every daily activity grants free coins to fuel your growth!'}
                        </div>
                        
                        <div>
                            <h3 className="font-black font-headline text-lg mb-4 text-on-surface uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ff7b00]"></div> {isArabic ? 'أنشطة يومية' : 'Daily Quests'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {EARN_ACTIVITIES.filter(a => a.daily).map((act, i) => (
                                    <div key={i} className="flex items-center gap-5 p-5 glass-card rounded-2xl border border-white/5 hover:border-[#ff7b00]/20 transition-colors group">
                                        <div className="w-14 h-14 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                            {act.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-on-surface">{isArabic ? act.titleAr : act.titleEn}</p>
                                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{isArabic ? 'تحدي يومي' : 'Daily reward'}</p>
                                        </div>
                                        <span className="font-black font-headline text-[#ff7b00] text-xl">{isArabic ? act.coinsAr : act.coinsEn}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-black font-headline text-lg mb-4 text-on-surface uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full text-primary-fixed"></div> {isArabic ? 'أنشطة التميز الميدانية' : 'Special Operations'}</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {EARN_ACTIVITIES.filter(a => !a.daily).map((act, i) => (
                                    <div key={i} className="flex items-center gap-5 p-5 glass-card rounded-2xl border border-white/5 hover:border-[#ff7b00]/20 transition-colors group">
                                        <div className="w-14 h-14 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                            {act.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-on-surface">{isArabic ? act.titleAr : act.titleEn}</p>
                                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{isArabic ? 'مكافأة مميزة' : 'One-time reward / event'}</p>
                                        </div>
                                        <span className="font-black font-headline text-[#ff7b00] text-xl">{isArabic ? act.coinsAr : act.coinsEn}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 glass-card rounded-[2rem] overflow-hidden border border-white/5 flex flex-col">
                        <div className="p-6 border-b border-white/5 bg-surface-container-highest/30">
                            <h3 className="font-black font-headline text-lg text-on-surface uppercase tracking-widest">{isArabic ? 'سجل العمليات (Ledger)' : 'Transaction Ledger'}</h3>
                        </div>
                        <div className="divide-y divide-white/5">
                            {LEDGER.map((entry, i) => (
                                <div key={i} className="flex items-center gap-5 p-5 hover:bg-white/5 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-2xl border border-white/5">
                                        {entry.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-on-surface">{isArabic ? entry.descAr : entry.descEn}</p>
                                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-1">{isArabic ? entry.dateAr : entry.date}</p>
                                    </div>
                                    <div className={`font-black font-headline text-xl ${entry.type === 'in' ? 'text-primary-fixed' : 'text-red-400'}`}>
                                        {entry.type === 'in' ? '+' : ''}{entry.amount} 🪙
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Redeem Modal */}
            {redeemModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setRedeemModal(null)}>
                    <div className="rounded-[2.5rem] p-8 max-w-sm w-full flex flex-col items-center gap-6 glass-card border border-primary-fixed/30 shadow-[0_0_50px_rgba(255,123,0,0.3)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-7xl drop-shadow-[0_0_25px_rgba(255,123,0,0.4)]">{redeemModal.emoji}</div>
                        <div className="text-center">
                            <h3 className="font-black font-headline text-2xl text-on-surface mb-2 tracking-tight">{isArabic ? redeemModal.titleAr : redeemModal.titleEn}</h3>
                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{isArabic ? 'تأكيد عملية الاستبدال؟' : 'Confirm redemption process?'}</p>
                        </div>
                        
                        <div className="w-full p-5 rounded-2xl text-center bg-surface-container-highest/60 border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#ff7b00]/5 to-transparent"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff7b00] mb-2">{isArabic ? 'الرصيد الجاري' : 'Current ledger balance'}</p>
                                <p className="text-3xl font-black font-headline text-on-surface mb-1">{fmtCoins(currentCoins)} 🪙</p>
                                <div className="h-px w-1/2 mx-auto bg-white/10 my-3"></div>
                                <p className="text-sm font-bold text-on-surface font-mono">→ {fmtCoins(currentCoins - redeemModal.cost)} 🪙 <span className="opacity-70 font-sans text-[10px] uppercase tracking-widest">{isArabic ? 'صافي الحساب' : 'NET'}</span></p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <button onClick={handleRedeem}
                                disabled={redeeming}
                                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-black flex items-center justify-center gap-2 disabled:opacity-50 bg-gradient-to-r from-[#ff7b00] to-[#ffb300] shadow-[0_0_20px_rgba(255,123,0,0.4)] hover:shadow-[0_0_30px_rgba(255,123,0,0.6)] transition-all hover:scale-[1.02] active:scale-95 border-none">
                                {redeeming ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{isArabic ? '✅ استبدل وأكد' : '✅ EXECUTE REDEMPTION'}</>}
                            </button>
                            <button onClick={() => setRedeemModal(null)} 
                                disabled={redeeming}
                                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-on-surface-variant disabled:opacity-50 glass-panel border border-white/10 hover:text-white hover:bg-white/5 transition-all active:scale-95">
                                {isArabic ? 'إلغاء العملية' : 'ABORT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BottomNavBar */}
            <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-40 glass-card shadow-[0_-10px_30px_rgba(0,0,0,0.5)] md:hidden border-t border-white/5">
                <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
                  <Brain className="w-6 h-6" />
                  <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/shop">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
                  <LayoutList className="w-6 h-6" />
                  <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-[#ff7b00] drop-shadow-[0_0_8px_rgba(255,123,0,0.6)] hover:scale-110 transition-transform" href="/wallet">
                  <Wallet className="w-6 h-6" />
                  <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/squads">
                  <Users className="w-6 h-6" />
                  <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
                </Link>
            </nav>
        </div>
    );
}
