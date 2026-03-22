'use client';
import React, { useState, useEffect } from 'react';
import {
    Tag, Clock, Zap, ShoppingBag, Star, Globe, Filter,
    Flame, ChevronRight, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

function useCountdown(endTime: number) {
    const [timeLeft, setTimeLeft] = useState(endTime - Date.now());
    useEffect(() => {
        const timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1000)), 1000);
        return () => clearInterval(timer);
    }, []);
    const h = Math.floor(timeLeft / 3600000);
    const m = Math.floor((timeLeft % 3600000) / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const now = Date.now();
const FLASH_DEALS = [
    { id: 1, type: 'supplement', emoji: '🥤', nameEn: 'Whey Protein 5LB — Gold Standard', nameAr: 'واي بروتين 5 باوند — الجولد ستاندرد', store: 'Muscle Pharm', storeAr: 'ماسل فارم', originalPrice: 1200, discountedPrice: 840, discount: 30, endTime: now + 3.5 * 3600 * 1000, sold: 47, total: 100, rating: 4.9, reviews: 328, color: '#00FFA3', tags: ['Beginner-friendly', 'Best Seller'], tagsAr: ['للمبتدئين', 'الأكثر مبيعاً'], badge: '🔥 HOT' },
    { id: 2, type: 'gym', emoji: '🏋️', nameEn: 'Gold Gym — 3-Month Subscription', nameAr: 'جولد جيم — اشتراك 3 شهور', store: 'Gold Gym Elite', storeAr: 'جولد جيم إيليت', originalPrice: 2550, discountedPrice: 1785, discount: 30, endTime: now + 1.2 * 3600 * 1000, sold: 82, total: 100, rating: 4.8, reviews: 1240, color: '#FFCC00', tags: ['Limited', 'All Branches'], tagsAr: ['محدود', 'جميع الفروع'], badge: '⚡ ENDING SOON' },
    { id: 3, type: 'supplement', emoji: '💊', nameEn: 'Creatine Monohydrate 500g', nameAr: 'كرياتين مونوهيدرات 500 جرام', store: 'NutriZone', storeAr: 'نيوتري زون', originalPrice: 380, discountedPrice: 228, discount: 40, endTime: now + 5.8 * 3600 * 1000, sold: 23, total: 50, rating: 4.7, reviews: 89, color: '#A78BFA', tags: ['Unflavored', 'Pure'], tagsAr: ['بدون نكهة', 'نقي 100%'], badge: null },
    { id: 4, type: 'gear', emoji: '🩱', nameEn: 'GEM Z Training Set (Top + Shorts)', nameAr: 'طقم تدريب GEM Z (تيشيرت + شورت)', store: 'GEM Z Official', storeAr: 'جيم زد الرسمي', originalPrice: 450, discountedPrice: 270, discount: 40, endTime: now + 8 * 3600 * 1000, sold: 65, total: 200, rating: 4.6, reviews: 55, color: '#00B8FF', tags: ['Exclusive', 'Breathable'], tagsAr: ['حصري', 'شبكي مريح'], badge: '✨ EXCLUSIVE' },
    { id: 5, type: 'supplement', emoji: '🧴', nameEn: 'BCAA 300g — Tropical Burst', nameAr: 'BCAA 300 جرام — فواكه استوائية', store: 'NutriZone', storeAr: 'نيوتري زون', originalPrice: 320, discountedPrice: 224, discount: 30, endTime: now + 11 * 3600 * 1000, sold: 18, total: 80, rating: 4.5, reviews: 42, color: '#FF6B35', tags: ['Tropical Flavor'], tagsAr: ['نكهة استوائية'], badge: null },
    { id: 6, type: 'gym', emoji: '🧘', nameEn: 'Yoga Flow Studio — Monthly Pass', nameAr: 'يوغا فلو ستوديو — اشتراك شهري', store: 'Yoga Flow', storeAr: 'يوغا فلو', originalPrice: 600, discountedPrice: 360, discount: 40, endTime: now + 6 * 3600 * 1000, sold: 34, total: 50, rating: 4.9, reviews: 178, color: '#34C759', tags: ['Online + In-Person'], tagsAr: ['أونلاين + حضوري'], badge: '🧘 WELLNESS' },
];

function DealCard({ deal, isArabic }: { deal: typeof FLASH_DEALS[0], isArabic: boolean }) {
    const countdown = useCountdown(deal.endTime);
    const progress = (deal.sold / deal.total) * 100;
    const isUrgent = deal.endTime - Date.now() < 2 * 3600 * 1000;

    return (
        <div className="rounded-3xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
            style={{ background: 'var(--bg-card)', border: `1px solid ${deal.color}40` }}>
            {/* Header */}
            <div className="p-5 relative overflow-hidden" style={{ background: `${deal.color}10` }}>
                <div className="absolute -top-6 -right-6 text-[100px] opacity-10">{deal.emoji}</div>
                <div className="relative">
                    {deal.badge && (
                        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 text-black"
                            style={{ background: deal.color }}>{deal.badge}</span>
                    )}
                    <div className="text-3xl mb-2">{deal.emoji}</div>
                    <h3 className="font-bold text-lg font-heading leading-tight">{isArabic ? deal.nameAr : deal.nameEn}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? deal.storeAr : deal.store}</p>
                </div>
            </div>

            <div className="p-5">
                {/* Price */}
                <div className="flex items-end gap-3 mb-4">
                    <span className="text-3xl font-bold font-mono" style={{ color: deal.color }} dir="ltr">EGP {deal.discountedPrice.toLocaleString('en-US')}</span>
                    <div>
                        <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }} dir="ltr">EGP {deal.originalPrice.toLocaleString('en-US')}</span>
                        <span className="block text-xs font-bold text-[#FF3B30]">-{deal.discount}% {isArabic ? 'خصم' : 'OFF'}</span>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {(isArabic ? deal.tagsAr : deal.tags).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${deal.color}15`, color: deal.color }}>{tag}</span>
                    ))}
                </div>

                {/* Countdown */}
                <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isUrgent ? 'animate-pulse' : ''}`}
                    style={{ background: isUrgent ? 'rgba(255,59,48,0.1)' : 'var(--bg-input)', border: `1px solid ${isUrgent ? 'rgba(255,59,48,0.3)' : 'var(--border-medium)'}` }}>
                    <Clock size={14} style={{ color: isUrgent ? '#FF3B30' : deal.color }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'ينتهي خلال:' : 'Ends in:'}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: isUrgent ? '#FF3B30' : deal.color }}>{countdown}</span>
                </div>

                {/* Stock Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        <span>{isArabic ? 'المباع:' : 'Sold:'} {deal.sold}/{deal.total}</span>
                        <span style={{ color: progress > 80 ? '#FF3B30' : deal.color }}>{Math.round(progress)}% {isArabic ? 'نفد' : 'gone'}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--bg-input)' }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: progress > 80 ? '#FF3B30' : deal.color }} />
                    </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex">
                        {[...Array(5)].map((_, i) => <Star key={i} size={11} className="fill-[#FFCC00] text-[#FFCC00]" />)}
                    </div>
                    <span className="font-bold">{deal.rating}</span>
                    <span>({deal.reviews} {isArabic ? 'تقييم' : 'reviews'})</span>
                </div>

                <button className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 text-black"
                    style={{ background: `linear-gradient(to right, ${deal.color}, ${deal.color}cc)` }}>
                    <ShoppingBag size={16} /> {isArabic ? '⚡ اشتري الآن' : '⚡ Buy Now'}
                </button>
            </div>
        </div>
    );
}

export default function FlashSalesPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [filter, setFilter] = useState('all');

    const filters = [
        { id: 'all', en: 'All Deals', ar: 'كل العروض', icon: '🔥' },
        { id: 'supplement', en: 'Supplements', ar: 'مكملات', icon: '🥤' },
        { id: 'gym', en: 'Gym Plans', ar: 'اشتراكات', icon: '🏋️' },
        { id: 'gear', en: 'Gear', ar: 'معدات', icon: '👕' },
    ];

    const displayed = filter === 'all' ? FLASH_DEALS : FLASH_DEALS.filter(d => d.type === filter);

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-20" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2"><Zap size={18} className="text-[#FF6B35]" />{isArabic ? 'عروض فلاش ⚡' : 'Flash Deals ⚡'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'عروض لفترة محدودة — اشتري قبل انتهاء الوقت!' : 'Limited-time deals — buy before time runs out!'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            {/* Hero Banner */}
            <div className="px-6 py-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A0A, #0A0A1A)' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#00FFA3]/5 to-[#FF6B35]/5" />
                <div className="max-w-4xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-bold" style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}>
                        <Flame size={14} className="animate-pulse" /> {isArabic ? 'عروض لفترة محدودة جداً' : 'Time-sensitive deals only on GEM Z'}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold font-heading text-white mb-2">
                        {isArabic ? 'عروض فلاش ⚡' : 'Flash Deals ⚡'}
                    </h2>
                    <p className="text-white/60 mb-4">{isArabic ? 'خصومات حتى 40% على مكملات، اشتراكات، ومعدات رياضية' : 'Up to 40% off supplements, gym plans, and gear'}</p>
                    <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                        <ShoppingBag size={14} />
                        <span>{isArabic ? `${FLASH_DEALS.length} عروض نشطة الآن` : `${FLASH_DEALS.length} active deals right now`}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Category Filters */}
                <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-none">
                    {filters.map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-all"
                            style={{ background: filter === f.id ? '#FF6B35' : 'var(--bg-card)', color: filter === f.id ? '#fff' : 'var(--text-secondary)', border: `1px solid ${filter === f.id ? '#FF6B35' : 'var(--border-subtle)'}` }}>
                            <span>{f.icon}</span> {isArabic ? f.ar : f.en}
                        </button>
                    ))}
                </div>

                {/* Deals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayed.map(deal => <DealCard key={deal.id} deal={deal} isArabic={isArabic} />)}
                </div>
            </div>
        </div>
    );
}
