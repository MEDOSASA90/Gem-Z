'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../core/store/use-store';
import { useRouter, usePathname } from 'next/navigation';
import { GemZLogo } from '../../core/theme/design-tokens';
import {
  Dumbbell,
  Users,
  Award,
  Sparkles,
  ShoppingBag,
  LogOut,
  Languages,
  Menu,
  X,
  Wallet,
  Tv,
  Sun,
  Moon,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, user, wallet, lang, theme, toggleLang, toggleTheme, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAr = lang === 'ar';

  // Session Route Protection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  // Bilingual translation dictionary for layout shell
  const shellDict = {
    ar: {
      gym: 'صالات الفرنشايز (Gym SaaS)',
      social: 'بوابة السوشيال واللايف (Social Hub)',
      hr: 'تحليلات الشركات (HR B2B)',
      economy: 'الضرائب والاقتصاد (Economy & Tax)',
      creator: 'تسويات صناع المحتوى (Creators)',
      marketplace: 'سوق المنتجات المستعملة (Marketplace)',
      portals: 'بوابات النظام البيئي',
      navTitle: 'لوحات تحكم الإدارة الشاملة',
      activeWallet: 'محفظة الجنيه المصري',
      logout: 'تسجيل الخروج',
      enterpriseTitle: 'نظام التشغيل الرياضي',
    },
    en: {
      gym: 'Gym SaaS Manager',
      social: 'Social & Live Hub',
      hr: 'Corporate HR B2B',
      economy: 'Economy & Tax Ledger',
      creator: 'Creator Payouts',
      marketplace: 'Used Marketplace',
      portals: 'Ecosystem Portals',
      navTitle: 'Ecosystem Navigation',
      activeWallet: 'Egyptian Wallet',
      logout: 'Log Out',
      enterpriseTitle: 'ENTERPRISE OS',
    }
  } as const;

  const t = shellDict[lang];

  const navItems = [
    {
      label: t.gym,
      path: '/dashboard/gym',
      icon: Dumbbell,
      color: 'text-neon-cyan',
    },
    {
      label: t.social,
      path: '/dashboard/social',
      icon: Tv,
      color: 'text-red-400',
    },
    {
      label: t.hr,
      path: '/dashboard/hr',
      icon: Users,
      color: 'text-volt-green',
    },
    {
      label: t.economy,
      path: '/dashboard/economy',
      icon: Award,
      color: 'text-premium-gold',
    },
    {
      label: t.creator,
      path: '/dashboard/creator',
      icon: Sparkles,
      color: 'text-purple-400',
    },
    {
      label: t.marketplace,
      path: '/dashboard/marketplace',
      icon: ShoppingBag,
      color: 'text-red-400',
    },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-cyber-dark text-text-primary flex flex-col font-sans transition-all duration-300"
    >
      {/* 1. الترويسة العلوية للمنصة (Top Header) */}
      <header className="border-b border-border-custom bg-card-dark/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* زر القائمة للهواتف */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl glass-panel hover:text-neon-cyan transition-colors text-text-primary"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* الشعار المبتكر الجديد الفاخر */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              <GemZLogo size={36} glow={theme === 'dark'} />
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="text-sm font-black tracking-wider text-text-primary block">
                  GEM <span className="text-neon-cyan">Z</span>
                </span>
                <span className="text-[7px] text-text-muted font-mono tracking-widest block">{t.enterpriseTitle}</span>
              </div>
            </div>
          </div>

          {/* محتويات الملف والمحفظة بالجنيه المصري */}
          <div className="flex items-center gap-2 sm:gap-6">
            {/* المحفظة الرقمية المتوهجة بالجنيه المصري EGP */}
            <div className="glass-panel px-3 sm:px-4 py-2 rounded-2xl border-neon-cyan/25 flex items-center gap-2 sm:gap-3 shadow-[0_0_15px_rgba(0,240,255,0.04)]">
              <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/25 flex items-center justify-center text-neon-cyan">
                <Wallet className="w-4 h-4" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <p className="text-[8px] sm:text-[9px] text-text-muted font-bold">{t.activeWallet}</p>
                <p className="text-xs sm:text-sm font-extrabold text-text-primary tracking-wider">
                  {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-[10px]">{wallet.currency}</span>
                </p>
              </div>
            </div>

            {/* تفاصيل الحساب */}
            <div className={`hidden sm:flex flex-col ${isAr ? 'text-right' : 'text-left'}`}>
              <span className="text-xs font-bold text-text-primary">{user.name}</span>
              <span className="text-[9px] text-premium-gold font-bold">{user.role}</span>
            </div>

            {/* زر تبديل اللغة */}
            <button
              onClick={toggleLang}
              className="p-2 rounded-xl glass-panel hover:border-neon-cyan/40 text-neon-cyan transition-all cursor-pointer"
            >
              <Languages className="w-4 h-4" />
            </button>

            {/* زر تبديل السيم */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl glass-panel hover:border-neon-cyan/40 transition-all cursor-pointer text-text-primary"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-premium-gold" /> : <Moon className="w-4 h-4 text-purple-600" />}
            </button>

            {/* زر تسجيل الخروج */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl glass-panel border-red-500/10 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* 2. شريط التنقل الجانبي لسطح المكتب */}
        <aside className={`hidden lg:block w-72 bg-cyber-dark/60 backdrop-blur-md p-6 space-y-6 transition-colors duration-300 ${isAr ? 'border-l border-border-custom' : 'border-r border-border-custom'}`}>
          <div className={`${isAr ? 'text-right' : 'text-left'} px-2 space-y-1`}>
            <p className="text-[10px] text-text-muted font-bold tracking-wider">{t.portals}</p>
            <p className="text-xs text-text-secondary font-semibold">{t.navTitle}</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => router.push(item.path)}
                  className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer border ${
                    active
                      ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
                      : 'text-text-secondary hover:bg-card-dark hover:text-text-primary border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className={`flex-1 ${isAr ? 'text-right' : 'text-left'}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 3. شريط التنقل الجانبي للهواتف */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-30 flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            
            <aside className={`relative w-72 max-w-xs bg-cyber-dark p-6 flex flex-col justify-between z-40 transition-colors duration-300 ${isAr ? 'border-l border-border-custom' : 'border-r border-border-custom'}`}>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-border-custom">
                  <span className="text-xs font-bold text-text-secondary">{t.portals}</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg glass-panel text-text-primary">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const active = pathname === item.path;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          router.push(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer border ${
                          active
                            ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20'
                            : 'text-text-secondary hover:bg-card-dark hover:text-text-primary border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className={`flex-1 ${isAr ? 'text-right' : 'text-left'}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-border-custom space-y-2">
                <p className="text-[10px] text-text-secondary font-bold">{user.name}</p>
                <p className="text-[8px] text-premium-gold font-bold">{user.role}</p>
              </div>
            </aside>
          </div>
        )}

        {/* 4. لوحة عرض الصفحات الداخلية */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
