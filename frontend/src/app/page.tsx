'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../core/store/use-store';
import { AuthBridge } from '../components/auth-bridge';
import { Heading1, Heading2, BodyText, NeonButton, GemZLogo } from '../core/theme/design-tokens';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  Apple,
  Users,
  Award,
  Dumbbell,
  Shield,
  Sparkles,
  ChevronLeft,
  Languages,
  Sun,
  Moon,
  Cpu,
  Lock,
  ShoppingBag,
} from 'lucide-react';

export default function LandingPage() {
  const { wallet, lang, theme, toggleLang, toggleTheme, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const isAr = lang === 'ar';

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard/gym');
    }
  }, [isAuthenticated, router]);

  // Bilingual translation dictionary
  const dict = {
    ar: {
      metaBadge: 'أول نظام تشغيل رياضي متكامل بمصر وعربياً',
      titleStart: 'مستقبل اللياقة البدنية والتشغيل الرياضي ',
      titleGlow: 'بالجنيه المصري والسوق المحلي',
      subTitle: 'منصة تكنولوجية موحدة للصالات الرياضية ومجموعات اللياقة البدنية بمصر. GEM Z يدمج إدارة صالات الفرنشايز وتقاسم إيرادات الفروع، تتبع زوايا التمارين بالذكاء الاصطناعي (AI Camera Form Tracking)، اقتصاد الحركة Move-to-Earn لمنع الخطوات الوهمية بالكامل، وسوق تداول المعدات والأجهزة الرياضية المستعملة الآمن (Escrow).',
      btnDocument: 'فحص الرموز والمستندات',
      downloadIos: 'تحميل التطبيق لـ iOS',
      downloadAndroid: 'تحميل التطبيق لـ Android',
      phoneNetwork: 'شبكة جيم زد مصر الحية',
      activeTrainees: 'المتدربين النشطين بمصر',
      registeredGyms: 'الصالات والأندية الرياضية',
      certifiedCoaches: 'كباتن ومصممي التدريبات',
      escrowSecured: 'المعاملات المالية والضمان',
      userWallet: 'محفظة المستخدم النشط (مصر)',
      totalBalance: 'الرصيد الكلي بالجنيه',
      heldBalance: 'معلق: 2,500.00',
      availBalance: 'متاح: 12,000.00',
      antiFraudTitle: 'فحص وتصفية الخطوات الوهمية',
      antiFraudDesc: 'مستشعرات GPS والـ Cadence نشطة',
      whyTitle: 'لماذا GEM Z هو النظام الأقوى بمصر والشرق الأوسط؟',
      whyDesc: 'حلول برمجية وعلمية فريدة تعالج كافة المشاكل الهيكلية والمالية التي تعاني منها الأندية والأنظمة الرياضية الحالية.',
      strength1Title: 'حظر تلاعب واختراق الخطوات (Anti-Fraud M2E)',
      strength1Desc: 'بينما تكتفي التطبيقات الأخرى بقراءة عداد خطوات الموبايل التلقائي مما يتيح التلاعب بها، ينفرد GEM Z بخوارزمية مطابقة سرعة خطوات اللاعب (Cadence Check) مع الإشارات الجغرافية (GPS Velocity). يمنع هذا النظام بالكامل احتساب خطوات وهمية أثناء ركوب السيارات أو المواصلات، لحماية الأصول المالية.',
      strength2Title: 'تقاسم إيرادات صالات الفرنشايز ذرياً تحت قفل Redis',
      strength2Desc: 'نموذج ريادي يدير الصالات وفروعها المتعددة ذرياً. عند قيام لاعب بشراء اشتراك أو حجز جلسة في أي فرع، يتم إقفال العملية بقفل Redis الموزع `lock:franchise` وتوزيع النسب (20% للمقر الرئيسي و 80% للفرع) وتسييل الأرصدة وإدراج قيود الدفتر المزدوج فوراً دون أي احتمالية لحدوث تكرار خصم.',
      strength3Title: 'تتبع 33 مفصلاً بشرياً وكاميرا الذكاء الاصطناعي (AI Form Tracking)',
      strength3Desc: 'يتكامل التطبيق مع كاميرا الهاتف والكمبيوتر لتعقب 33 نقطة هيكلية للمفاصل أثناء أداء التمارين (كالسكوات أو الرفعة الميتة)، وحساب زوايا الركبة والفخذ، مع معالج ذكي للعد وتصحيح انحناء الظهر لتفادي الإصابات وضمان الاستغلال الكامل للأجهزة.',
      strength4Title: 'سوق المعدات والضمان المالي المدار بآلة الحالة (Escrow)',
      strength4Desc: 'تداول الأجهزة الرياضية المستعملة بأمان مطلق. يتم حجز قيمة السلعة بالكامل في محفظة ضمان المنصة (Escrow Wallet) ولا يتم الإفراج عنها وصرفها للبائع إلا بعد تأكيد الشحن ووصول السلعة للعميل والتحقق التام من سلامتها ومطابقتها للمواصفات.',
      footer: 'جميع الحقوق محفوظة. مؤمن محلياً للسوق المصري بالجنيه المصري (EGP).',
      feat1Title: 'صالات SaaS المتطورة',
      feat1Desc: 'تقاسم إيرادات الفروع تحت قفل Redis',
      feat2Title: 'لوحة تحكم الشركات B2B',
      feat2Desc: 'تجميع مؤشرات أداء موظفي الشركات بدقة',
      feat3Title: 'الامتثال الضريبي الإقليمي',
      feat3Desc: 'فواتير مشفرة متوافقة مع ZATCA و ETA',
      feat4Title: 'تحليلات المروحة والـ M2E',
      feat4Desc: 'حساب خطوات الهاتف ومعايرة الـ GPS',
    },
    en: {
      metaBadge: 'First Integrated Fitness OS in Egypt & Middle East',
      titleStart: 'The Future of Fitness Systems ',
      titleGlow: 'Fully Tailored for the Egyptian Market',
      subTitle: 'A revolutionary Web & Mobile OS bridging SaaS gym franchise splits, 33-point skeletal AI joint trackers, anti-fraud Move-to-Earn steps calibration, and secure used equipment marketplaces with multi-currency EGP structures.',
      btnDocument: 'Document Engine & System Verification',
      downloadIos: 'Download on the App Store',
      downloadAndroid: 'Get it on Google Play',
      phoneNetwork: 'GEM Z EGYPT LIVE TELEMETRY',
      activeTrainees: 'Active Egyptian Trainees',
      registeredGyms: 'Registered SaaS Gyms',
      certifiedCoaches: 'Certified AI Coaches',
      escrowSecured: 'Escrow Secured Trades',
      userWallet: 'Egyptian Trainee Wallet (Cairo)',
      totalBalance: 'Total EGP Balance',
      heldBalance: 'Held: 2,500.00',
      availBalance: 'Available: 12,000.00',
      antiFraudTitle: 'Anti-Fraud Steps Calibration',
      antiFraudDesc: 'GPS Velocity & Cadence Sensors Active',
      whyTitle: 'Why GEM Z is the Ultimate Fitness Operating System?',
      whyDesc: 'Advanced cryptographic and machine learning architectures designed to resolve crucial validation, operations, and cashflow failures.',
      strength1Title: 'Advanced Anti-Fraud Move-to-Earn',
      strength1Desc: 'Unlike simple step trackers easily spoofed, GEM Z integrates real-time GPS speed analytics (GPS Velocity) matched with hardware steps frequencies (Cadence Check). This strictly filters steps made in cars or transit to protect the economy assets.',
      strength2Title: 'SaaS Gym Franchise Splits under Redis Locks',
      strength2Desc: 'Empowering multi-branch gym networks to perform atomic checkouts. Purchases instantly execute under a distributed Redis lock (`lock:franchise`), automatically routing splits (20% HQ / 80% Operator) with balanced double-entry ledger entries.',
      strength3Title: '33-Point Skeletal Joint AI Tracker',
      strength3Desc: 'Seamless integration with phone and web cameras to trace 33 skeletal joint landmarks on trainee poses. Computes precise knee flexion angles and spine lines to correct trainee forms in real-time, preventing training injuries.',
      strength4Title: 'Escrow Secured Sports Used Marketplace',
      strength4Desc: 'Buy and trade premium used sports gear with complete trust. Full funds are locked in the platform secure Escrow vaults, and are only disbursed to the seller upon verified shipment delivery and buyer functional confirmation.',
      footer: 'All rights reserved. Locally Secured for the Egyptian Market (EGP).',
      feat1Title: 'SaaS Gym Topology',
      feat1Desc: 'Multi-branch split-payments with Redis lock',
      feat2Title: 'B2B Wellness Dashboard',
      feat2Desc: 'ClickHouse enterprise telemetry & Fallback',
      feat3Title: 'Cross-Border VAT & E-Invoicing',
      feat3Desc: 'SHA-256 digital footprints & async sync',
      feat4Title: 'Move-to-Earn Gaming',
      feat4Desc: 'Cadence and GPS sensor checkouts',
    }
  } as const;

  const t = dict[lang];

  // Stats definition
  const stats = [
    { label: t.activeTrainees, value: '142,580+', icon: Users, color: 'text-neon-cyan' },
    { label: t.registeredGyms, value: '480+', icon: Dumbbell, color: 'text-volt-green' },
    { label: t.certifiedCoaches, value: '1,250+', icon: Sparkles, color: 'text-premium-gold' },
    { label: t.escrowSecured, value: '89,450+', icon: Shield, color: 'text-red-400' },
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50 text-text-primary dark:bg-[#0B0B0F] dark:bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.65)_0%,_rgba(11,11,15,1)_100%)] overflow-hidden transition-all duration-500"
    >
      {/* 1. قائمة التصفح العلوية (App Shell Header) */}
      <header className="border-b border-border-custom bg-card-dark/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GemZLogo size={42} glow={theme === 'dark'} />
            <div className="text-right">
              <span className="text-xl font-black tracking-wider text-text-primary block">
                GEM <span className="text-neon-cyan">Z</span>
              </span>
              <span className="text-[8px] text-text-muted font-mono tracking-widest block">EGYPT FISCAL OS</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* تبديل اللغة */}
            <button
              onClick={toggleLang}
              className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 hover:border-neon-cyan/50 text-xs font-bold transition-colors cursor-pointer text-text-primary"
            >
              <Languages className="w-4 h-4 text-neon-cyan" />
              <span className="hidden sm:inline">{isAr ? 'English (LTR)' : 'العربية (RTL)'}</span>
            </button>

            {/* تبديل السيم المظلم والمضيء */}
            <button
              onClick={toggleTheme}
              className="glass-panel p-2 rounded-xl flex items-center justify-center hover:border-neon-cyan/50 transition-colors cursor-pointer text-text-primary"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-premium-gold" /> : <Moon className="w-4 h-4 text-purple-600" />}
            </button>

            <a
              href="/kitchen-sink"
              className="text-xs font-bold text-volt-green border border-volt-green/20 bg-volt-green/5 hover:bg-volt-green/10 px-4 py-2 rounded-xl transition-all duration-300 shadow-[0_0_10px_rgba(57,255,20,0.1)]"
            >
              {t.btnDocument}
            </a>
          </div>
        </div>
      </header>

      {/* 2. القسم الرئيسي للواجهة الهيدر (Hero Section) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 space-y-24">
        {/* توهج نيون خلفي */}
        {theme === 'dark' && (
          <>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-neon-cyan/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-volt-green/5 blur-[120px] rounded-full pointer-events-none" />
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* العمود الأول: العناوين ونقاط التحويل الأساسية */}
          <div className={`lg:col-span-7 space-y-8 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="inline-flex items-center gap-2 bg-neon-cyan/10 border border-neon-cyan/20 px-4 py-1.5 rounded-full text-xs font-bold text-neon-cyan">
              <Sparkles className="w-4 h-4" />
              <span>{t.metaBadge}</span>
            </div>

            <div className="space-y-4">
              <Heading1 className="tracking-tight leading-tight">
                {t.titleStart} <br />
                <span className="text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
                  {t.titleGlow}
                </span>
              </Heading1>

              <BodyText className="text-base text-text-secondary max-w-2xl leading-relaxed">
                {t.subTitle}
              </BodyText>
            </div>

            {/* أزرار التحميل */}
            <div className={`flex flex-wrap gap-4 ${isAr ? 'justify-start' : 'justify-start'}`}>
              <a
                href="#download-ios"
                className="bg-black hover:bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-3 transition-all hover:scale-[1.02] shadow-lg group cursor-pointer"
              >
                <Apple className="w-7 h-7 text-white group-hover:text-neon-cyan transition-colors" />
                <div className={isAr ? 'text-right' : 'text-left'}>
                  <p className="text-[10px] text-gray-400 font-medium">Download on the</p>
                  <p className="text-sm font-extrabold text-white">App Store</p>
                </div>
              </a>

              <a
                href="#download-android"
                className="bg-black hover:bg-zinc-900 border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-3 transition-all hover:scale-[1.02] shadow-lg group group-hover:border-volt-green transition-colors cursor-pointer"
              >
                <Smartphone className="w-7 h-7 text-white group-hover:text-volt-green transition-colors" />
                <div className={isAr ? 'text-right' : 'text-left'}>
                  <p className="text-[10px] text-gray-400 font-medium">Get it on</p>
                  <p className="text-sm font-extrabold text-white">Google Play</p>
                </div>
              </a>
            </div>

            {/* بطاقات الميزات الصغيرة الأربعة */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 ${isAr ? 'text-right' : 'text-left'}`}>
              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-neon-cyan/35 transition-all text-text-primary">
                <Dumbbell className="w-5 h-5 text-neon-cyan" />
                <h3 className="text-xs font-bold text-text-primary">{t.feat1Title}</h3>
                <p className="text-[10px] text-text-secondary leading-snug">{t.feat1Desc}</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-volt-green/35 transition-all text-text-primary">
                <Users className="w-5 h-5 text-volt-green" />
                <h3 className="text-xs font-bold text-text-primary">{t.feat2Title}</h3>
                <p className="text-[10px] text-text-secondary leading-snug">{t.feat2Desc}</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-premium-gold/35 transition-all text-text-primary">
                <Award className="w-5 h-5 text-premium-gold" />
                <h3 className="text-xs font-bold text-text-primary">{t.feat3Title}</h3>
                <p className="text-[10px] text-text-secondary leading-snug">{t.feat3Desc}</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl space-y-2 hover:border-red-400/35 transition-all text-text-primary">
                <Shield className="w-5 h-5 text-red-400" />
                <h3 className="text-xs font-bold text-text-primary">{t.feat4Title}</h3>
                <p className="text-[10px] text-text-secondary leading-snug">{t.feat4Desc}</p>
              </div>
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
              <div className="flex-1 bg-[#0B0B0F] p-4 pt-10 flex flex-col justify-between relative overflow-y-auto text-white">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[8px] font-bold text-neon-cyan tracking-wider">{t.phoneNetwork}</span>
                    <span className="w-2 h-2 rounded-full bg-volt-green animate-ping" />
                  </div>

                  {/* عدادات الأرقام المحلية */}
                  <div className="grid grid-cols-2 gap-2">
                    {stats.map((s, index) => {
                      const Icon = s.icon;
                      return (
                        <div key={index} className="glass-panel p-2 rounded-xl space-y-1 border-white/5 bg-[#12121A]/60">
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
                  <div className="glass-panel-glow p-3 rounded-xl space-y-2 text-right bg-[#12121A]/80 border-neon-cyan/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-gray-400">
                        {t.userWallet}
                      </span>
                      <Shield className="w-3 h-3 text-volt-green" />
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-500">{t.totalBalance}</p>
                      <p className="text-base font-extrabold text-white tracking-wider">
                        {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-xs">{wallet.currency}</span>
                      </p>
                    </div>
                    <div className="flex justify-between text-[7px] text-gray-400 border-t border-white/5 pt-1.5">
                      <span>{t.heldBalance}</span>
                      <span>{t.availBalance}</span>
                    </div>
                  </div>

                  {/* معايرة خطوات Move-to-Earn لمنع الغش */}
                  <div className="glass-panel p-3 rounded-xl flex items-center justify-between text-right bg-[#12121A]/60 border-white/5">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-white">{t.antiFraudTitle}</p>
                      <p className="text-[7px] text-gray-500">{t.antiFraudDesc}</p>
                    </div>
                    <span className="bg-volt-green/10 border border-volt-green/20 px-2 py-0.5 rounded text-[7px] text-volt-green font-bold">
                      VERIFIED
                    </span>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-white/5">
                  <p className="text-[7px] text-gray-500 font-mono">GEM Z MOBILE CORE V6.0</p>
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
        <section className="space-y-12 pt-12 border-t border-border-custom">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl md:text-3xl font-black tracking-wide text-transparent bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan bg-clip-text text-glow-cyan">
              {t.whyTitle}
            </h2>
            <BodyText className="text-sm">
              {t.whyDesc}
            </BodyText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* القوة 1: منع تلاعب تتبع الخطوات Move-to-Earn */}
            <div className={`glass-panel p-8 rounded-3xl space-y-4 hover:border-neon-cyan/40 transition-all border-border-custom ${isAr ? 'text-right' : 'text-left'}`}>
              <div className={`w-12 h-12 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.15)] ${isAr ? 'ml-auto' : 'mr-auto'}`}>
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{t.strength1Title}</h3>
              <BodyText className="text-xs text-text-secondary leading-relaxed">
                {t.strength1Desc}
              </BodyText>
            </div>

            {/* القوة 2: صالات الفرنشايز وربط الأندية الرياضية */}
            <div className={`glass-panel p-8 rounded-3xl space-y-4 hover:border-volt-green/40 transition-all border-border-custom ${isAr ? 'text-right' : 'text-left'}`}>
              <div className={`w-12 h-12 rounded-2xl bg-volt-green/10 border border-volt-green/20 flex items-center justify-center text-volt-green shadow-[0_0_10px_rgba(57,255,20,0.15)] ${isAr ? 'ml-auto' : 'mr-auto'}`}>
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{t.strength2Title}</h3>
              <BodyText className="text-xs text-text-secondary leading-relaxed">
                {t.strength2Desc}
              </BodyText>
            </div>

            {/* القوة 3: التتبع بالذكاء الاصطناعي وزوايا المفاصل الهيكلية */}
            <div className={`glass-panel p-8 rounded-3xl space-y-4 hover:border-premium-gold/40 transition-all border-border-custom ${isAr ? 'text-right' : 'text-left'}`}>
              <div className={`w-12 h-12 rounded-2xl bg-premium-gold/10 border border-premium-gold/20 flex items-center justify-center text-premium-gold shadow-[0_0_10px_rgba(212,175,55,0.15)] ${isAr ? 'ml-auto' : 'mr-auto'}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{t.strength3Title}</h3>
              <BodyText className="text-xs text-text-secondary leading-relaxed">
                {t.strength3Desc}
              </BodyText>
            </div>

            {/* القوة 4: سوق التداول وسوق الأجهزة الرياضية والضمان المالي */}
            <div className={`glass-panel p-8 rounded-3xl space-y-4 hover:border-red-500/40 transition-all border-border-custom ${isAr ? 'text-right' : 'text-left'}`}>
              <div className={`w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)] ${isAr ? 'ml-auto' : 'mr-auto'}`}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{t.strength4Title}</h3>
              <BodyText className="text-xs text-text-secondary leading-relaxed">
                {t.strength4Desc}
              </BodyText>
            </div>
          </div>
        </section>
      </main>

      {/* 4. تذييل الصفحة */}
      <footer className="border-t border-border-custom bg-card-dark/20 py-8 text-center mt-12 transition-colors duration-300">
        <p className="text-xs text-text-muted font-mono">
          &copy; {new Date().getFullYear()} GEM Z Inc. {t.footer}
        </p>
      </footer>
    </div>
  );
}
