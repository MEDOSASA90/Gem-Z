'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../core/store/use-store';
import { useRouter, usePathname } from 'next/navigation';
import {
  Dumbbell,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  ShoppingBag,
  LogOut,
  Languages,
  Menu,
  X,
  Wallet,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, user, wallet, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isRtl, setIsRtl] = useState(true); // افتراضياً باللغة العربية RTL
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // حماية المسار: إعادة التوجيه للرئيسية إذا لم يكن مسجلاً للدخول
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

  // روابط التصفح الجانبية
  const navItems = [
    {
      label: isRtl ? 'صالات الفرنشايز (Gym SaaS)' : 'Gym SaaS Manager',
      path: '/dashboard/gym',
      icon: Dumbbell,
      color: 'text-neon-cyan',
    },
    {
      label: isRtl ? 'تحليلات الشركات (HR B2B)' : 'Corporate HR B2B',
      path: '/dashboard/hr',
      icon: Users,
      color: 'text-volt-green',
    },
    {
      label: isRtl ? 'الضرائب والاقتصاد (Economy & Tax)' : 'Economy & Tax Ledger',
      path: '/dashboard/economy',
      icon: Award,
      color: 'text-premium-gold',
    },
    {
      label: isRtl ? 'تسويات صناع المحتوى (Creators)' : 'Creator Payouts',
      path: '/dashboard/creator',
      icon: Sparkles,
      color: 'text-purple-400',
    },
    {
      label: isRtl ? 'سوق المنتجات المستعملة (Marketplace)' : 'Used Marketplace',
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
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0B0B0F] bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.65)_0%,_rgba(11,11,15,1)_100%)] text-white flex flex-col font-sans transition-all duration-300"
    >
      {/* 1. الترويسة العلوية للمنصة (Top Header) */}
      <header className="border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* زر القائمة للهواتف */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl glass-panel hover:text-neon-cyan transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* الشعار */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan to-volt-green p-[1px] shadow-glow-cyan">
                <div className="w-full h-full bg-[#0B0B0F] rounded-xl flex items-center justify-center font-black text-neon-cyan tracking-tighter text-base">
                  Z
                </div>
              </div>
              <span className="text-lg font-black tracking-wider text-white">
                GEM <span className="text-neon-cyan">Z</span> <span className="text-xs text-gray-500 font-mono">DASHBOARD</span>
              </span>
            </div>
          </div>

          {/* محتويات الملف والمحفظة */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* المحفظة الرقمية المتوهجة الموحدة */}
            <div className="glass-panel px-3 sm:px-4 py-2 rounded-2xl border-neon-cyan/20 flex items-center gap-2 sm:gap-3 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
              <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-right">
                <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold">{isRtl ? 'محفظة PWA النشطة' : 'Active Wallet'}</p>
                <p className="text-xs sm:text-sm font-extrabold text-white tracking-wider">
                  {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-[10px]">{wallet.currency}</span>
                </p>
              </div>
            </div>

            {/* تفاصيل الحساب */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white">{user.name}</span>
              <span className="text-[9px] text-premium-gold font-bold">{user.role}</span>
            </div>

            {/* زر تبديل اللغة LTR/RTL */}
            <button
              onClick={() => setIsRtl(!isRtl)}
              className="p-2 rounded-xl glass-panel hover:border-neon-cyan/40 text-neon-cyan transition-all cursor-pointer"
              title={isRtl ? 'English Layout' : 'التخطيط العربي'}
            >
              <Languages className="w-4 h-4" />
            </button>

            {/* زر تسجيل الخروج */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl glass-panel border-red-500/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
              title={isRtl ? 'تسجيل الخروج' : 'Log Out'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* 2. شريط التنقل الجانبي لسطح المكتب (Desktop Sidebar) */}
        <aside className="hidden lg:block w-72 border-l border-white/5 bg-[#0B0B0F]/60 backdrop-blur-md p-6 space-y-6">
          <div className="text-right px-2 space-y-1">
            <p className="text-[10px] text-gray-500 font-bold tracking-wider">ENTERPRISE PORTALS</p>
            <p className="text-xs text-gray-400 font-semibold">{isRtl ? 'لوحات تحكم الإدارة الشاملة' : 'Ecosystem Navigation'}</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => router.push(item.path)}
                  className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                    active
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="flex-1 text-right">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 3. شريط التنقل الجانبي للهواتف (Mobile Drawer) */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-30 flex">
            {/* غطاء خلفي معتم */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            
            {/* القائمة الجانبية */}
            <aside className="relative w-72 max-w-xs bg-[#0B0B0F] border-l border-white/5 p-6 flex flex-col justify-between z-40 animate-fade-in-right">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-xs font-bold text-gray-400">{isRtl ? 'بوابات النظام البيئي' : 'Navigation'}</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg glass-panel">
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
                        className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                          active
                            ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="flex-1 text-right">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* تذييل الموبايل */}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <p className="text-[10px] text-gray-500 font-bold">{user.name}</p>
                <p className="text-[8px] text-premium-gold font-bold">{user.role}</p>
              </div>
            </aside>
          </div>
        )}

        {/* 4. لوحة عرض الصفحات الداخلية المتغيرة (Main Dynamic Content Pane) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
