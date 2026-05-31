'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../core/store/use-store';
import { AuthBridge } from '../components/auth-bridge';
import { Heading1, Heading2, BodyText, NeonButton } from '../core/theme/design-tokens';
import {
  Smartphone,
  Apple,
  TrendingUp,
  Users,
  Award,
  Dumbbell,
  Shield,
  Sparkles,
  MapPin,
  Flame,
  ChevronLeft,
  Languages,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, user, wallet } = useAuthStore();
  const [isRtl, setIsRtl] = useState(true); // افتراضياً باللغة العربية RTL لتنفيذ شروط التوطين

  // إحصائيات عدادات الجيم النشطة (Simulated Live Telemetry)
  const stats = [
    { label: isRtl ? 'المستخدمون النشطون' : 'Active Users', value: '45,892+', icon: Users, color: 'text-neon-cyan' },
    { label: isRtl ? 'الفروع والأندية الرياضية' : 'Registered Gyms', value: '184+', icon: Dumbbell, color: 'text-volt-green' },
    { label: isRtl ? 'المدربون المحترفون' : 'Expert Trainers', value: '620+', icon: Sparkles, color: 'text-premium-gold' },
    { label: isRtl ? 'التحديات المكتملة' : 'Completed Challenges', value: '12,450+', icon: Flame, color: 'text-red-400' },
  ];

  const toggleLanguage = () => {
    setIsRtl(!isRtl);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0B0B0F] bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.65)_0%,_rgba(11,11,15,1)_100%)] text-white overflow-hidden font-sans transition-all duration-500"
    >
      {/* 1. قائمة التصفح العلوية (App Shell Header) */}
      <header className="border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* نيون لوجو دائري */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-volt-green p-[1px] shadow-glow-cyan">
              <div className="w-full h-full bg-[#0B0B0F] rounded-xl flex items-center justify-center font-black text-neon-cyan tracking-tighter text-lg">
                Z
              </div>
            </div>
            <span className="text-xl font-black tracking-wider text-white">
              GEM <span className="text-neon-cyan">Z</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* زر تبديل اللغة LTR/RTL للفحص والتحقق */}
            <button
              onClick={toggleLanguage}
              className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 hover:border-neon-cyan/50 text-xs font-semibold tracking-wider transition-colors cursor-pointer"
            >
              <Languages className="w-4 h-4 text-neon-cyan" />
              <span>{isRtl ? 'English (LTR)' : 'العربية (RTL)'}</span>
            </button>

            <a
              href="/kitchen-sink"
              className="text-xs font-bold text-volt-green border border-volt-green/20 bg-volt-green/5 hover:bg-volt-green/10 px-4 py-2 rounded-xl transition-all duration-300 shadow-[0_0_10px_rgba(57,255,20,0.1)]"
            >
              {isRtl ? 'لوحة فحص الرموز' : 'Kitchen Sink'}
            </a>
          </div>
        </div>
      </header>

      {/* 2. القسم الرئيسي التفاعلي (Interactive Hero Section) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
        {/* نيون خفي متوهج خلفي */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-neon-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-volt-green/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* العمود الأول: العناوين والوصف البرمجي وعناصر الـ CTA */}
          <div className="lg:col-span-7 space-y-8 text-right lg:text-right">
            <div className="inline-flex items-center gap-2 bg-neon-cyan/10 border border-neon-cyan/20 px-4 py-1.5 rounded-full text-xs font-semibold text-neon-cyan tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>{isRtl ? 'الجيل القادم من تقنيات اللياقة البدنية المتكاملة' : 'Next-Gen Unified Fitness Technology'}</span>
            </div>

            <div className="space-y-4">
              <Heading1 className="tracking-tight leading-tight">
                {isRtl ? (
                  <>
                    استعد لتفجير طاقتك مع <br />
                    <span className="text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
                      نظام GEM Z البيئي المتكامل
                    </span>
                  </>
                ) : (
                  <>
                    Unlock Peak Fitness with <br />
                    <span className="text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
                      GEM Z Unified Ecosystem
                    </span>
                  </>
                )}
              </Heading1>

              <BodyText className="text-base text-gray-400 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'منصة موحدة من الجيل الجديد تجمع بين حوكمة وإدارة الصالات الرياضية الذكية كخدمة (SaaS Gyms)، تدريب اللياقة المخصص بالذكاء الاصطناعي (AI Coach)، اقتصاد النشاط الحركي المربح (M2E Economy)، وسوق تداول المنتجات الرياضية المستعملة الآمن (Used Marketplace).'
                  : 'A unified Next-Gen web and mobile ecosystem bridging dynamic SaaS Gym management, personalized skeletal AI Coach tracking, highly rewarding Move-to-Earn (M2E) economy, and secure multi-vendor escrow marketplace settlements.'}
              </BodyText>
            </div>

            {/* أزرار CTA عالية الجاذبية والتجاوب */}
            <div className="flex flex-wrap gap-4 justify-start">
              {/* زر متجر آبل */}
              <a
                href="#download-ios"
                className="bg-black hover:bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-lg group cursor-pointer"
              >
                <Apple className="w-7 h-7 text-white group-hover:text-neon-cyan transition-colors" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium">Download on the</p>
                  <p className="text-sm font-extrabold text-white">App Store</p>
                </div>
              </a>

              {/* زر متجر جوجل بلاي */}
              <a
                href="#download-android"
                className="bg-black hover:bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-lg group cursor-pointer"
              >
                <Smartphone className="w-7 h-7 text-white group-hover:text-volt-green transition-colors" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium">Get it on</p>
                  <p className="text-sm font-extrabold text-white">Google Play</p>
                </div>
              </a>
            </div>

            {/* بطاقات الميزات الصغيرة الأربعة */}
            <div className="grid grid-cols-2 gap-4 pt-4 text-right">
              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-neon-cyan/35 transition-all">
                <Shield className="w-5 h-5 text-neon-cyan" />
                <h3 className="text-xs font-bold text-white">{isRtl ? 'صالات SaaS المتطورة' : 'SaaS Gym Topology'}</h3>
                <p className="text-[10px] text-gray-500">{isRtl ? 'تقاسم إيرادات الفروع تحت قفل Redis' : 'Multi-branch split-payments with Redis lock'}</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-volt-green/35 transition-all">
                <Users className="w-5 h-5 text-volt-green" />
                <h3 className="text-xs font-bold text-white">{isRtl ? 'لوحة تحكم الشركات B2B' : 'B2B Wellness Dashboard'}</h3>
                <p className="text-[10px] text-gray-500">{isRtl ? 'تجميع مؤشرات أداء موظفي الشركات بدقة' : 'ClickHouse enterprise telemetry & Fallback'}</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-premium-gold/35 transition-all">
                <Award className="w-5 h-5 text-premium-gold" />
                <h3 className="text-xs font-bold text-white">{isRtl ? 'الامتثال الضريبي الإقليمي' : 'Cross-Border VAT & E-Invoicing'}</h3>
                <p className="text-[10px] text-gray-500">{isRtl ? 'فواتير مشفرة متوافقة مع ZATCA و ETA' : 'SHA-256 digital footprints & async sync'}</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-red-400/35 transition-all">
                <Flame className="w-5 h-5 text-red-400" />
                <h3 className="text-xs font-bold text-white">{isRtl ? 'تحليلات المروحة والـ M2E' : 'Move-to-Earn Gaming'}</h3>
                <p className="text-[10px] text-gray-500">{isRtl ? 'حساب خطوات الهاتف ومعايرة الـ GPS' : 'Cadence and GPS sensor checkouts'}</p>
              </div>
            </div>
          </div>

          {/* العمود الثاني: محاكاة الهاتف الذكي المتجاوبة ومحسر الدخول العائم */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-8 relative">
            
            {/* المحاكاة التفاعلية للهاتف (Responsive Mock Device) */}
            <div className="w-full max-w-[320px] aspect-[9/18] rounded-[42px] bg-[#0E0E14] border-4 border-white/10 relative overflow-hidden shadow-2xl flex flex-col">
              
              {/* شق الكاميرا العلوي للنظام */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800 absolute right-4" />
                <div className="w-10 h-1 bg-zinc-800 rounded absolute left-6" />
              </div>

              {/* الشاشة الداخلية للتطبيق */}
              <div className="flex-1 bg-[#0B0B0F] p-4 pt-10 flex flex-col justify-between relative overflow-y-auto">
                <div className="space-y-4">
                  {/* رأس لوحة محاكاة الهاتف */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[9px] font-bold text-neon-cyan tracking-wider">LIVE TELEMETRY</span>
                    <span className="w-2 h-2 rounded-full bg-volt-green animate-ping" />
                  </div>

                  {/* عدادات حية من تحليلات الواجهة الخلفية */}
                  <div className="grid grid-cols-2 gap-2">
                    {stats.map((s, index) => {
                      const IconComponent = s.icon;
                      return (
                        <div key={index} className="glass-panel p-2.5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-gray-500 font-semibold">{s.label}</span>
                            <IconComponent className={`w-3.5 h-3.5 ${s.color}`} />
                          </div>
                          <p className="text-xs font-extrabold text-white tracking-wide">{s.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* لوحة تفاعلية حية للمحفظة */}
                  <div className="glass-panel-glow p-3 rounded-xl space-y-2 text-right">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-gray-400">
                        {isRtl ? 'محفظة المستخدم النشط' : 'Active Demo Wallet'}
                      </span>
                      <Shield className="w-3 h-3 text-volt-green" />
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-500">{isRtl ? 'رصيد محفظة PWA' : 'PWA Wallet Projection'}</p>
                      <p className="text-base font-extrabold text-white tracking-wider">
                        {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-xs">{wallet.currency}</span>
                      </p>
                    </div>
                    <div className="flex justify-between text-[7px] text-gray-400 border-t border-white/5 pt-1.5">
                      <span>{isRtl ? 'معلق: 250.00' : 'Held: 250.00'}</span>
                      <span>{isRtl ? 'متاح: 1200.00' : 'Available: 1200.00'}</span>
                    </div>
                  </div>

                  {/* حالة إتمام تتبع الخطوات الحيوية */}
                  <div className="glass-panel p-3 rounded-xl flex items-center justify-between text-right">
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold text-white">{isRtl ? 'مخطط الخطوات اليومي' : 'Daily Cadence Tracking'}</p>
                      <p className="text-[7px] text-gray-500">{isRtl ? 'مستشعرات GPS ومعايرة الخطوات نشطة' : 'Sensors & GPS calibrate Active'}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-volt-green/10 border border-volt-green/20 flex items-center justify-center text-volt-green font-bold text-[9px]">
                      80%
                    </div>
                  </div>
                </div>

                {/* تذييل شاشة الهاتف */}
                <div className="text-center pt-4 border-t border-white/5">
                  <p className="text-[7px] text-gray-500 font-mono">GEM Z APP FRAMEWORK V5.0</p>
                </div>
              </div>
            </div>

            {/* معبر دخول الـ PWA العائم (Slide-over / Floating Auth Card) */}
            <div className="w-full">
              <AuthBridge />
            </div>

          </div>
        </div>
      </main>

      {/* 3. تذييل الصفحة (Footer) */}
      <footer className="border-t border-white/5 bg-[#0B0B0F] py-8 text-center mt-12">
        <p className="text-xs text-gray-500 font-mono">
          &copy; {new Date().getFullYear()} GEM Z Inc. All rights reserved. Designed for Global Scaling.
        </p>
      </footer>
    </div>
  );
}
