'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3, Dumbbell, MapPin, Trophy, Bot, Zap, Apple, Activity, Star, TrendingUp, ChefHat
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const NAV_ITEMS = [
    { href: '/trainee', icon: BarChart3, labelEn: 'Home', labelAr: 'الرئيسية', color: '#00FFA3' },
    { href: '/exercises', icon: Dumbbell, labelEn: 'Exercises', labelAr: 'تمارين', color: '#00B8FF' },
    { href: '/ai-nutritionist', icon: Apple, labelEn: 'Diet AI', labelAr: 'تغذية', color: '#A78BFA' },
    { href: '/ai-form', icon: Activity, labelEn: 'Form AI', labelAr: 'أداء', color: '#00FFA3' },
    { href: '/gym-map', icon: MapPin, labelEn: 'Map', labelAr: 'خريطة', color: '#FFCC00' },
    { href: '/challenges', icon: Trophy, labelEn: 'Challenges', labelAr: 'تحديات', color: '#FF6B35' },
    { href: '/ai-coach', icon: Bot, labelEn: 'Coach', labelAr: 'مساعد', color: '#A78BFA' },
    { href: '/flash-deals', icon: Zap, labelEn: 'Deals', labelAr: 'عروض', color: '#FF3B30' },
    { href: '/coins', icon: Star, labelEn: 'Coins', labelAr: 'كوينز', color: '#FFCC00' },
    { href: '/progress', icon: TrendingUp, labelEn: 'Progress', labelAr: 'تقدم', color: '#00FFA3' },
    { href: '/recipes', icon: ChefHat, labelEn: 'Recipes', labelAr: 'وصفات', color: '#FF6B35' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { isArabic } = useLanguage();

    // Don't show on public pages
    const publicPages = ['/', '/login', '/register', '/pricing', '/social', '/admin', '/gym', '/trainer', '/store'];
    if (publicPages.includes(pathname)) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-stretch overflow-x-auto scrollbar-none" dir={isArabic ? 'rtl' : 'ltr'}>
                {NAV_ITEMS.map(item => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}
                            className="flex flex-col items-center justify-center gap-1 px-3 py-3 min-w-[64px] transition-all relative shrink-0"
                            style={{ color: isActive ? item.color : 'var(--text-muted)' }}>
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: item.color }} />
                            )}
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className="text-[10px] font-bold whitespace-nowrap">{isArabic ? item.labelAr : item.labelEn}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
