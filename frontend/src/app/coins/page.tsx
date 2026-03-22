'use client';
import React, { useState } from 'react';
import {
    Star, Zap, Gift, ShoppingBag, Trophy, ChevronRight,
    Globe, TrendingUp, Lock, CheckCircle, ArrowRight, Coins
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const EARN_ACTIVITIES = [
    { icon: '🏋️', titleEn: 'Complete a Workout', titleAr: 'أكمل تمريناً', coinsEn: '+15 Coins', coinsAr: '+15 كوين', daily: true },
    { icon: '🥗', titleEn: 'Log All Meals', titleAr: 'سجّل كل وجباتك', coinsEn: '+10 Coins', coinsAr: '+10 كوين', daily: true },
    { icon: '💧', titleEn: 'Hit Water Goal', titleAr: 'حقق هدف الماء', coinsEn: '+5 Coins', coinsAr: '+5 كوين', daily: true },
    { icon: '🔥', titleEn: '7-Day Streak Bonus', titleAr: 'مكافأة 7 أيام متتالية', coinsEn: '+50 Coins', coinsAr: '+50 كوين', daily: false },
    { icon: '👥', titleEn: 'Refer a Friend', titleAr: 'أحلت صديقاً', coinsEn: '+100 Coins', coinsAr: '+100 كوين', daily: false },
    { icon: '🏆', titleEn: 'Win a Challenge', titleAr: 'فز في تحدي', coinsEn: '+200 Coins', coinsAr: '+200 كوين', daily: false },
];

const REWARDS = [
    { id: 1, emoji: '💰', titleEn: 'EGP 50 Wallet Credit', titleAr: '50 ج.م رصيد محفظة', cost: 500, type: 'wallet', color: '#00FFA3', stock: null, popular: true },
    { id: 2, emoji: '🏋️', titleEn: '1 Free Gym Day Pass', titleAr: 'دخول مجاني للجيم يوم', cost: 800, type: 'gym', color: '#A78BFA', stock: 20, popular: false },
    { id: 3, emoji: '🥤', titleEn: '10% Off Supplements', titleAr: 'خصم 10٪ مكملات', cost: 300, type: 'discount', color: '#00B8FF', stock: null, popular: true },
    { id: 4, emoji: '💊', titleEn: 'Free Creatine Sample', titleAr: 'عينة كرياتين مجانية', cost: 600, type: 'merchandise', color: '#FF6B35', stock: 50, popular: false },
    { id: 5, emoji: '🎽', titleEn: 'GEM Z T-Shirt', titleAr: 'تيشيرت GEM Z', cost: 1200, type: 'merchandise', color: '#FFCC00', stock: 30, popular: false },
    { id: 6, emoji: '⭐', titleEn: 'Premium Trainer Session', titleAr: 'جلسة مدرب بريميوم', cost: 2000, type: 'session', color: '#FF3B30', stock: null, popular: false },
];

const LEDGER = [
    { icon: '🏋️', descEn: 'Workout completed', descAr: 'تمرين مكتمل', amount: +15, date: 'Today', dateAr: 'اليوم', type: 'in' },
    { icon: '🥗', descEn: 'All meals logged', descAr: 'كل الوجبات مسجلة', amount: +10, date: 'Today', dateAr: 'اليوم', type: 'in' },
    { icon: '💰', descEn: 'Redeemed: EGP 50 credit', descAr: 'استبدال: رصيد 50 ج.م', amount: -500, date: 'Yesterday', dateAr: 'أمس', type: 'out' },
    { icon: '🔥', descEn: '7-Day Streak Bonus', descAr: 'مكافأة 7 أيام', amount: +50, date: '2 days ago', dateAr: 'منذ يومين', type: 'in' },
    { icon: '👥', descEn: 'Referral reward — Omar', descAr: 'مكافأة إحالة — عمر', amount: +100, date: 'Last week', dateAr: 'الأسبوع الماضي', type: 'in' },
];

const MY_COINS = 1840;
const LEVEL_THRESHOLD = 2500;
const LEVEL_NAME = { en: 'Gold Warrior', ar: 'المحارب الذهبي' };
const NEXT_LEVEL = { en: 'Platinum Champion', ar: 'البطل البلاتيني' };

export default function CoinsPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<'store' | 'earn' | 'history'>('store');
    const [redeemModal, setRedeemModal] = useState<typeof REWARDS[0] | null>(null);
    const [redeemed, setRedeemed] = useState<number[]>([]);

    const currentCoins = 1840 - redeemed.reduce((sum, id) => sum + (REWARDS.find(r => r.id === id)?.cost || 0), 0);
    const fmtCoins = (n: number) => n.toLocaleString('en-US');

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-28" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2">
                            <Star size={18} className="text-[#FFCC00]" /> {isArabic ? 'GEM Z Coins 🪙' : 'GEM Z Coins 🪙'}
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'اكسب واستبدل نقاطك' : 'Earn & redeem your points'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-6">
                {/* Balance Hero Card */}
                <div className="rounded-3xl p-7 mb-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1200, #0a0a1a)', border: '1px solid rgba(255,204,0,0.3)' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFCC00]/8 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#FF6B35]/8 rounded-full blur-2xl" />
                    <div className="relative">
                        <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{isArabic ? 'رصيد الكوينز' : 'Coin Balance'}</p>
                        <div className="flex items-end gap-3 mb-1">
                            <span className="text-6xl font-bold font-mono text-[#FFCC00]">{fmtCoins(currentCoins)}</span>
                            <span className="text-[#FFCC00] text-xl mb-2">🪙</span>
                        </div>
                        {/* Level bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-[#FFCC00] font-bold">{isArabic ? LEVEL_NAME.ar : LEVEL_NAME.en}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtCoins(currentCoins)} / {fmtCoins(LEVEL_THRESHOLD)} {isArabic ? 'للمستوى التالي' : 'to next level'}</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <div className="h-2 rounded-full" style={{ width: `${(currentCoins / LEVEL_THRESHOLD) * 100}%`, background: 'linear-gradient(to right, #FFCC00, #FF6B35)' }} />
                            </div>
                            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {isArabic ? `المستوى القادم: ${NEXT_LEVEL.ar}` : `Next: ${NEXT_LEVEL.en}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: 'store', en: '🎁 Store', ar: '🎁 المتجر' },
                        { id: 'earn', en: '⚡ How to Earn', ar: '⚡ كيف تكسب' },
                        { id: 'history', en: '📋 History', ar: '📋 السجل' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={{ background: activeTab === tab.id ? '#FFCC00' : 'var(--bg-card)', color: activeTab === tab.id ? '#000' : 'var(--text-secondary)', border: `1px solid ${activeTab === tab.id ? '#FFCC00' : 'var(--border-subtle)'}` }}>
                            {isArabic ? tab.ar : tab.en}
                        </button>
                    ))}
                </div>

                {/* STORE TAB */}
                {activeTab === 'store' && (
                    <div>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                            {isArabic ? 'استبدل كوينزك بجوائز حقيقية 🎁' : 'Redeem your coins for real rewards 🎁'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {REWARDS.map(reward => {
                                const canAfford = currentCoins >= reward.cost;
                                const done = redeemed.includes(reward.id);
                                return (
                                    <div key={reward.id} className="rounded-2xl p-5 relative overflow-hidden transition-all hover:scale-[1.02]"
                                        style={{ background: 'var(--bg-card)', border: `1px solid ${done ? 'rgba(52,199,89,0.4)' : canAfford ? `${reward.color}30` : 'var(--border-subtle)'}`, opacity: done ? 0.7 : 1 }}>
                                        {reward.popular && !done && (
                                            <span className="absolute top-3 end-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-black" style={{ background: '#FFCC00' }}>🔥 POPULAR</span>
                                        )}
                                        {done && <span className="absolute top-3 end-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-[#34C759]">✓ Redeemed</span>}
                                        <div className="text-4xl mb-3">{reward.emoji}</div>
                                        <h3 className="font-bold mb-1">{isArabic ? reward.titleAr : reward.titleEn}</h3>
                                        {reward.stock && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{reward.stock} {isArabic ? 'متبقية' : 'left in stock'}</p>}
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="font-bold font-mono text-lg" style={{ color: reward.color }}>{fmtCoins(reward.cost)} 🪙</span>
                                            <button
                                                disabled={!canAfford || done}
                                                onClick={() => setRedeemModal(reward)}
                                                className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                                                style={{ background: done ? '#34C759' : canAfford ? reward.color : 'var(--bg-input)', color: done || canAfford ? '#000' : 'var(--text-muted)', border: `1px solid ${done ? '#34C759' : canAfford ? reward.color : 'var(--border-subtle)'}` }}>
                                                {done ? '✓' : canAfford ? (isArabic ? 'استبدل' : 'Redeem') : <Lock size={14} />}
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
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl mb-2" style={{ background: 'rgba(255,204,0,0.07)', border: '1px solid rgba(255,204,0,0.2)' }}>
                            <p className="text-sm font-bold text-[#FFCC00]">{isArabic ? '💡 كل نشاط يومي = كوينز مجانية!' : '💡 Every daily activity = free coins!'}</p>
                        </div>
                        <div>
                            <h3 className="font-bold mb-3 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'أنشطة يومية' : 'Daily Activities'}</h3>
                            {EARN_ACTIVITIES.filter(a => a.daily).map((act, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl mb-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                    <span className="text-3xl">{act.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-bold">{isArabic ? act.titleAr : act.titleEn}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'يومياً' : 'Daily reward'}</p>
                                    </div>
                                    <span className="font-bold font-mono text-[#FFCC00]">{isArabic ? act.coinsAr : act.coinsEn}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="font-bold mb-3 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'أنشطة مميزة' : 'Special Activities'}</h3>
                            {EARN_ACTIVITIES.filter(a => !a.daily).map((act, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl mb-3" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,204,0,0.2)' }}>
                                    <span className="text-3xl">{act.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-bold">{isArabic ? act.titleAr : act.titleEn}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'مرة واحدة / كل حدث' : 'One-time / per event'}</p>
                                    </div>
                                    <span className="font-bold font-mono text-[#FFCC00]">{isArabic ? act.coinsAr : act.coinsEn}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        {LEDGER.map((entry, i) => (
                            <div key={i} className="flex items-center gap-4 p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="text-2xl">{entry.icon}</span>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{isArabic ? entry.descAr : entry.descEn}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? entry.dateAr : entry.date}</p>
                                </div>
                                <span className="font-bold font-mono text-lg" style={{ color: entry.type === 'in' ? '#00FFA3' : '#FF3B30' }}>
                                    {entry.type === 'in' ? '+' : ''}{entry.amount} 🪙
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Redeem Modal */}
            {redeemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setRedeemModal(null)}>
                    <div className="rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                        <div className="text-6xl">{redeemModal.emoji}</div>
                        <div className="text-center">
                            <h3 className="font-bold text-xl font-heading mb-1">{isArabic ? redeemModal.titleAr : redeemModal.titleEn}</h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'هل أنت متأكد من الاستبدال؟' : 'Confirm redemption?'}</p>
                        </div>
                        <div className="w-full p-4 rounded-2xl text-center" style={{ background: 'var(--bg-input)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'رصيدك الحالي' : 'Current balance'}</p>
                            <p className="text-2xl font-bold font-mono text-[#FFCC00]">{fmtCoins(currentCoins)} 🪙</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>→ {fmtCoins(currentCoins - redeemModal.cost)} 🪙 {isArabic ? 'بعد الاستبدال' : 'after redemption'}</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => { setRedeemed(p => [...p, redeemModal.id]); setRedeemModal(null); }}
                                className="flex-1 py-3 rounded-xl font-bold text-black" style={{ background: '#FFCC00' }}>
                                {isArabic ? '✅ تأكيد' : '✅ Confirm'}
                            </button>
                            <button onClick={() => setRedeemModal(null)} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
