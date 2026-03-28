'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Dumbbell, MapPin, Trophy, Bot, Zap, Apple, Activity, Star, TrendingUp, ChefHat, MessageCircle, Wallet } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const NAV_ITEMS = [
    { href: '/trainee', icon: BarChart3, labelEn: 'Dashboard', labelAr: 'لوحة التحكم', color: 'var(--color-primary)' },
    { href: '/exercises', icon: Dumbbell, labelEn: 'Exercises', labelAr: 'تمارين', color: 'var(--color-secondary)' },
    { href: '/ai-nutritionist', icon: Apple, labelEn: 'Diet AI', labelAr: 'تغذية', color: 'var(--color-purple)' },
    { href: '/ai-form', icon: Activity, labelEn: 'Form AI', labelAr: 'أداء', color: 'var(--color-primary)' },
    { href: '/gym-map', icon: MapPin, labelEn: 'Map', labelAr: 'خريطة', color: 'var(--color-warning)' },
    { href: '/challenges', icon: Trophy, labelEn: 'Challenges', labelAr: 'تحديات', color: 'var(--color-orange)' },
    { href: '/ai-coach', icon: Bot, labelEn: 'Coach', labelAr: 'مساعد', color: 'var(--color-purple)' },
    { href: '/flash-deals', icon: Zap, labelEn: 'Deals', labelAr: 'عروض', color: 'var(--color-danger)' },
    { href: '/coins', icon: Star, labelEn: 'Coins', labelAr: 'كوينز', color: 'var(--color-warning)' },
    { href: '/progress', icon: TrendingUp, labelEn: 'Progress', labelAr: 'تقدم', color: 'var(--color-primary)' },
    { href: '/recipes', icon: ChefHat, labelEn: 'Recipes', labelAr: 'وصفات', color: 'var(--color-orange)' },
    { href: '/chat', icon: MessageCircle, labelEn: 'Chat', labelAr: 'المحادثات', color: 'var(--color-secondary)' },
    { href: '/wallet', icon: Wallet, labelEn: 'Wallet', labelAr: 'المحفظة', color: '#22C55E' },
];

export default function SideNav() {
    const pathname = usePathname();
    const { isArabic } = useLanguage();
    const [expanded, setExpanded] = useState(false);

    // Don't show on public or full-screen dashboard pages that don't need it
    const hiddenPages = ['/', '/login', '/register', '/pricing', '/admin', '/gym', '/trainer', '/store'];
    const isHidden = hiddenPages.some(page => pathname === page || pathname.startsWith(page + '/'));
    if (isHidden && pathname !== '/trainer/ai-generator') return null;

    return (
        <aside 
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            className={`fixed top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-4 py-6 px-3 rounded-2xl transition-all duration-300 shadow-2xl ${
                isArabic ? 'right-4' : 'left-4'
            } ${expanded ? 'w-48' : 'w-16'}`}
            style={{ 
                background: 'rgba(15, 23, 42, 0.85)', 
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-subtle)' 
            }}
        >
            <div className="flex flex-col gap-5 overflow-y-auto max-h-[85vh] scrollbar-none pb-4">
                {NAV_ITEMS.map(item => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-4 px-2 py-1 rounded-xl transition-all relative group"
                            style={{ color: isActive ? item.color : '#94A3B8' }}
                            title={isArabic ? item.labelAr : item.labelEn}
                        >
                            {isActive && (
                                <div className={`absolute top-0 bottom-0 w-1 rounded-full ${isArabic ? '-right-2' : '-left-2'}`} style={{ background: item.color }} />
                            )}
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} className="shrink-0 group-hover:scale-110 transition-transform" />
                            <span className={`font-bold whitespace-nowrap transition-all duration-300 text-sm ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                                {isArabic ? item.labelAr : item.labelEn}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
