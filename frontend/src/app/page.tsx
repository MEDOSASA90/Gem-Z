'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../core/store/use-store';
import { AuthBridge } from '../components/auth-bridge';
import { Heading1, Heading2, BodyText, NeonButton, GemZLogo } from '../core/theme/design-tokens';
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
  CheckCircle,
  Cpu,
  Lock,
  ShoppingBag,
  Info,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, user, wallet } = useAuthStore();
  const [isRtl, setIsRtl] = useState(true); // افتراضياً باللغة العربية RTL

  // عدادات حية من السوق المصري (EGP Core Live Telemetry)
  const stats = [
    { label: isRtl ? 'المتدربين النشطين بمصر' : 'Active Egyptian Trainees', value: '142,580+', icon: Users, color: 'text-neon-cyan' },
    { label: isRtl ? 'الصالات والأندية الرياضية' : 'Registered SaaS Gyms', value: '480+', icon: Dumbbell, color: 'text-volt-green' },
    { label: isRtl ? 'كباتن ومصممي التدريبات' : 'Certified AI Coaches', value: '1,250+', icon: Sparkles, color: 'text-premium-gold' },
    { label: isRtl ? 'المعاملات المالية والضمان' : 'Escrow Secured Trades', value: '89,450+', icon: Shield, color: 'text-red-400' },
  ];

  const toggleLanguage = () => {
    setIsRtl(!isRtl);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0B0B0F] bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.65)_0%,_rgba(11,11,15,1)_100%)] text-white overflow-hidden font-sans transition-all duration-500"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* 1. قائمة التصفح العلوية (App Shell Header) */}
      <header className="border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* الشعار الفني المبتكر الجديد (Deriving from dynamic GemZLogo SVG) */}
            <GemZLogo size={42} glow={true} />
            <div className="text-right">
              <span className="text-xl font-black tracking-wider text-white block">
                GEM <span className="text-neon-cyan">Z</span>
              </span>
              <span className="text-[8px] text-gray-500 font-mono tracking-widest block">EGYPT FISCAL OS</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* تبديل اللغة */}
            <button
              onClick={toggleLanguage}
              className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 hover:border-neon-cyan/50 text-xs font-bold transition-colors cursor-pointer"
            >
              <Languages className="w-4 h-4 text-neon-cyan" />
              <span>{isRtl ? 'English (LTR)' : 'العربية (RTL)'}</span>
            </button>

            <a
              href="/kitchen-sink"
              className="text-xs font-bold text-volt-green border border-volt-green/20 bg-volt-green/5 hover:bg-volt-green/10 px-4 py-2 rounded-xl transition-all duration-300 shadow-[0_0_10px_rgba(57,255,20,0.1)]"
            >
              {isRtl ? 'فحص الرموز والمستندات' : 'Document Engine'}
            </a>
          </div>
        </div>
      </header>

      {/* 2. القسم الرئيسي للواجهة الهيدر (Hero Section) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 space-y-24">
        {/* توهج نيون خلفي */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-neon-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-volt-green/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* العمود الأول: العناوين ونقاط التحويل الأساسية */}
          <div className="lg:col-span-7 space-y-8 text-right">
            <div className="inline-flex items-center gap-2 bg-neon-cyan/10 border border-neon-cyan/20 px-4 py-1.5 rounded-full text-xs font-bold text-neon-cyan">
              <Sparkles className="w-4 h-4" />
              <span>{isRtl ? 'أول نظام تشغيل رياضي متكامل بمصر وعربياً' : 'First Integrated Fitness OS in Egypt & Middle East'}</span>
            </div>

            <div className="space-y-4">
              <Heading1 className="tracking-tight leading-tight">
                {isRtl ? (
                  <>
                    مستقبل اللياقة البدنية والتشغيل الرياضي <br />
                    <span className="text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
                      بالجنيه المصري والسوق المحلي
                    </span>
                  </>
                ) : (
                  <>
                    The Future of Fitness Systems <br />
                    <span className="text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
                      Fully Tailored for the Egyptian Market
                    </span>
                  </>
                )}
              </Heading1>

              <BodyText className="text-base text-gray-400 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'منصة تكنولوجية موحدة للصالات الرياضية ومجموعات اللياقة البدنية بمصر. GEM Z يدمج إدارة صالات الفرنشايز وتقاسم إيرادات الفروع، تتبع زوايا التمارين بالذكاء الاصطناعي (AI Camera Form Tracking)، اقتصاد الحركة Move-to-Earn لمنع الخطوات الوهمية بالكامل، وسوق تداول المعدات والأجهزة الرياضية المستعملة الآمن (Escrow).'
                  : 'A revolutionary Web & Mobile OS bridging SaaS gym franchise splits, 33-point skeletal AI joint trackers, anti-fraud Move-to-Earn steps calibration, and secure used equipment marketplaces with multi-currency EGP structures.'}
              </BodyText>
            </div>

            {/* أزرار التحميل */}
            <div className="flex flex-wrap gap-4 justify-start">
              <a
                href="#download-ios"
                className="bg-black hover:bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-3 transition-all hover:scale-[1.02] shadow-lg group cursor-pointer"
              >
                <Apple className="w-7 h-7 text-white group-hover:text-neon-cyan transition-colors" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium">Download on the</p>
                  <p className="text-sm font-extrabold text-white">App Store</p>
                </div>
              </a>

              <a
                href="#download-android"
                className="bg-black hover:bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-3 transition-all hover:scale-[1.02] shadow-lg group group-hover:border-volt-green transition-colors cursor-pointer"
              >
                <Smartphone className="w-7 h-7 text-white group-hover:text-volt-green transition-colors" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium">Get it on</p>
                  <p className="text-sm font-extrabold text-white">Google Play</p>
                </div>
              </a>
            </div>
          </div>

          {/* العمود الثاني: محاكاة الهاتف الذكي المتجاوبة ومحسر الدخول العائم */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-8 relative">
            
            {/* المحاكاة التفاعلية للهاتف */}
            <div className="w-full max-w-[320px] aspect-[9/18] rounded-[42px] bg-[#0E0E14] border-4 border-white/10 relative overflow-hidden shadow-2xl flex flex-col">
              {/* كاميرا الهاتف */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800 absolute right-4" />
                <div className="w-10 h-1 bg-zinc-800 rounded absolute left-6" />
              </div>

              {/* شاشة الهاتف للتطبيق الموطن لمصر */}
              <div className="flex-1 bg-[#0B0B0F] p-4 pt-10 flex flex-col justify-between relative overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[8px] font-bold text-neon-cyan tracking-wider">GEM Z EGYPT NETWORK</span>
                    <span className="w-2 h-2 rounded-full bg-volt-green animate-ping" />
                  </div>

                  {/* عدادات الأرقام المحلية */}
                  <div className="grid grid-cols-2 gap-2">
                    {stats.map((s, index) => {
                      const Icon = s.icon;
                      return (
                        <div key={index} className="glass-panel p-2 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[7px] text-gray-500 font-bold leading-none">{s.label}</span>
                            <Icon className={`w-3 h-3 ${s.color}`} />
                          </div>
                          <p className="text-xs font-black text-white tracking-wider">{s.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* رصيد محفظة PWA بالجنيه المصري EGP */}
                  <div className="glass-panel-glow p-3 rounded-xl space-y-2 text-right">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-gray-400">
                        {isRtl ? 'محفظة المستخدم النشط (مصر)' : 'Egyptian User Wallet'}
                      </span>
                      <Shield className="w-3 h-3 text-volt-green" />
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-500">{isRtl ? 'الرصيد الكلي بالجنيه' : 'Total EGP Balance'}</p>
                      <p className="text-base font-extrabold text-white tracking-wider">
                        {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-xs">{wallet.currency}</span>
                      </p>
                    </div>
                    <div className="flex justify-between text-[7px] text-gray-400 border-t border-white/5 pt-1.5">
                      <span>{isRtl ? 'معلق: 2,500.00' : 'Held: 2,500.00'}</span>
                      <span>{isRtl ? 'متاح: 12,000.00' : 'Available: 12,000.00'}</span>
                    </div>
                  </div>

                  {/* معايرة خطوات Move-to-Earn لمنع الغش */}
                  <div className="glass-panel p-3 rounded-xl flex items-center justify-between text-right">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-white">{isRtl ? 'فحص وتصفية الخطوات الوهمية' : 'Anti-Fraud steps check'}</p>
                      <p className="text-[7px] text-gray-500">{isRtl ? 'مستشعرات GPS والـ Cadence نشطة' : 'Sensors & GPS calibrate'}</p>
                    </div>
                    <span className="bg-volt-green/10 border border-volt-green/20 px-2 py-0.5 rounded text-[7px] text-volt-green font-bold">
                      VERIFIED
                    </span>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-white/5">
                  <p className="text-[7px] text-gray-500 font-mono">GEM Z MOBILE CORE V5.0</p>
                </div>
              </div>
            </div>

            {/* معبر الدخول OTP */}
            <div className="w-full">
              <AuthBridge />
            </div>
          </div>
        </div>

        {/* 3. قسم تفصيلي مذهل لنقاط القوة والحلول التقنية التنافسية بمصر (Strength Highlights) */}
        <section className="space-y-12 pt-12 border-t border-white/5 text-right">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl md:text-3xl font-black tracking-wide text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
              {isRtl ? 'لماذا GEM Z هو النظام الأقوى بمصر والشرق الأوسط؟' : 'Why GEM Z is the Ultimate Fitness Ecosystem?'}
            </h2>
            <BodyText className="text-sm">
              {isRtl
                ? 'حلول برمجية وعلمية فريدة تعالج كافة المشاكل الهيكلية والمالية التي تعاني منها الأندية والأنظمة الرياضية الحالية.'
                : 'Advanced algorithmic solutions solving crucial security, coordination, and validation bottlenecks in modern fitness environments.'}
            </BodyText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* القوة 1: منع تلاعب تتبع الخطوات Move-to-Earn */}
            <div className="glass-panel p-8 rounded-3xl space-y-4 hover:border-neon-cyan/40 transition-all text-right">
              <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.15)] ml-auto">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{isRtl ? 'حظر تلاعب واختراق الخطوات (Anti-Fraud M2E)' : 'Advanced Anti-Fraud Move-to-Earn'}</h3>
              <BodyText className="text-xs text-gray-400 leading-relaxed">
                {isRtl
                  ? 'بينما تكتفي التطبيقات الأخرى بقراءة عداد خطوات الموبايل التلقائي مما يتيح التلاعب بها، ينفرد GEM Z بخوارزمية مطابقة سرعة خطوات اللاعب (Cadence Check) مع الإشارات الجغرافية (GPS Velocity). يمنع هذا النظام بالكامل احتساب خطوات وهمية أثناء ركوب السيارات أو المواصلات، لحماية الأصول المالية.'
                  : 'Unlike simple step counters easily cheated, GEM Z integrates dynamic geolocation speed (GPS Velocity) matched with stepper frequency (Cadence Check) to fully eliminate step spoofing inside moving vehicles.'}
              </BodyText>
            </div>

            {/* القوة 2: صالات الفرنشايز وربط الأندية الرياضية */}
            <div className="glass-panel p-8 rounded-3xl space-y-4 hover:border-volt-green/40 transition-all text-right">
              <div className="w-12 h-12 rounded-2xl bg-volt-green/10 border border-volt-green/20 flex items-center justify-center text-volt-green shadow-[0_0_10px_rgba(57,255,20,0.15)] ml-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{isRtl ? 'تقاسم إيرادات صالات الفرنشايز ذرياً تحت قفل Redis' : 'SaaS Gym Franchise Splits under Redis Lock'}</h3>
              <BodyText className="text-xs text-gray-400 leading-relaxed">
                {isRtl
                  ? 'نموذج ريادي يدير الصالات وفروعها المتعددة ذرياً. عند قيام لاعب بشراء اشتراك أو حجز جلسة في أي فرع، يتم إقفال العملية بقفل Redis الموزع `lock:franchise` وتوزيع النسب (20% للمقر الرئيسي و 80% للفرع) وتسييل الأرصدة وإدراج قيود الدفتر المزدوج فوراً دون أي احتمالية لحدوث تكرار خصم.'
                  : 'A robust multi-branch SaaS system routing membership checkout splits atomically (20% Master HQ / 80% Operator balance) under dynamic Redis Distributed locks, preventing checkout concurrency double-spikes.'}
              </BodyText>
            </div>

            {/* القوة 3: التتبع بالذكاء الاصطناعي وزوايا المفاصل الهيكلية */}
            <div className="glass-panel p-8 rounded-3xl space-y-4 hover:border-premium-gold/40 transition-all text-right">
              <div className="w-12 h-12 rounded-2xl bg-premium-gold/10 border border-premium-gold/20 flex items-center justify-center text-premium-gold shadow-[0_0_10px_rgba(255,215,0,0.15)] ml-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{isRtl ? 'تتبع 33 مفصلاً بشرياً وكاميرا الذكاء الاصطناعي (AI Form Tracking)' : '33-Point Skeletal Joint AI Tracker'}</h3>
              <BodyText className="text-xs text-gray-400 leading-relaxed">
                {isRtl
                  ? 'يتكامل التطبيق مع كاميرا الهاتف والكمبيوتر لتعقب 33 نقطة هيكلية للمفاصل أثناء أداء التمارين (كالسكوات أو الرفعة الميتة)، وحساب زوايا الركبة والفخذ، مع معالج ذكي للعد وتصحيح انحناء الظهر لتفادي الإصابات وضمان الاستغلال الكامل للأجهزة.'
                  : 'Server-side lightweight validation models mapping 33 skeletal joint landmarks on trainee poses, measuring squat flexion angles and spine curves to ensure flawless posture alignment.'}
              </BodyText>
            </div>

            {/* القوة 4: سوق التداول وسوق الأجهزة الرياضية والضمان المالي */}
            <div className="glass-panel p-8 rounded-3xl space-y-4 hover:border-red-500/40 transition-all text-right">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)] ml-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{isRtl ? 'سوق المعدات والضمان المالي المدار بآلة الحالة (Escrow)' : 'Escrow Secured Sports Trading OMS'}</h3>
              <BodyText className="text-xs text-gray-400 leading-relaxed">
                {isRtl
                  ? 'تداول الأجهزة الرياضية المستعملة بأمان مطلق. يتم حجز قيمة السلعة بالكامل في محفظة ضمان المنصة (Escrow Wallet) ولا يتم الإفراج عنها وصرفها للبائع إلا بعد تأكيد الشحن ووصول السلعة للعميل والتحقق التام من سلامتها ومطابقتها للمواصفات.'
                  : 'Safeguarding transactions with a strict 5-stage Escrow state machine. Payments are held securely in platform vault assets, releasing funds only upon verified shipping and buyer confirmation.'}
              </BodyText>
            </div>
          </div>
        </section>
      </main>

      {/* 4. تذييل الصفحة */}
      <footer className="border-t border-white/5 bg-[#0B0B0F] py-8 text-center mt-12">
        <p className="text-xs text-gray-500 font-mono">
          &copy; {new Date().getFullYear()} GEM Z Inc. All rights reserved. Locally Secured for the Egyptian Market (EGP).
        </p>
      </footer>
    </div>
  );
}
