'use client';
import React, { useState, useEffect } from 'react';
import {
  Zap, Users, Building2, ShoppingBag, Brain, Activity, Shield,
  ArrowRight, CheckCircle, Star, Globe, Menu, X, ChevronDown, Monitor
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';
import GemZLogo from '../components/GemZLogo';

const t = {
  en: {
    nav: { features: 'Features', partners: 'Partners', pricing: 'Pricing', login: 'Login', getStarted: 'Get Started' },
    hero: {
      badge: 'The Future of Fitness is Here',
      title1: 'The Ultimate',
      title2: 'Fitness Ecosystem',
      subtitle: 'One platform connecting Trainees, Personal Trainers, Gyms, and Supplement Stores — powered by AI Nutrition and real-time financial settlements.',
      cta1: 'Start Free Today',
      cta2: 'Explore Platform',
    },
    stats: [
      { value: '50K+', label: 'Active Members' },
      { value: '1,200+', label: 'Partner Gyms' },
      { value: '4,500+', label: 'Expert Trainers' },
      { value: '98.5%', label: 'Satisfaction Rate' },
    ],
    ecosystem: {
      title: 'One Ecosystem. Every Role.',
      subtitle: 'GEM Z uniquely connects the entire fitness economy in one seamless platform.',
      roles: [
        { icon: 'users', title: 'Trainees', color: '#00FFA3', desc: 'AI-powered diet plans from your medical reports, QR gym check-in, workout tracking, and a social fitness community.' },
        { icon: 'dumbbell', title: 'Trainers', color: '#00B8FF', desc: 'Manage your client roster, assign programs, receive automatic earnings splits, and grow your reputation globally.' },
        { icon: 'building', title: 'Gyms', color: '#A78BFA', desc: 'B2B dashboard for member management, off-peak pricing, real-time settlement, and branch performance analytics.' },
        { icon: 'shopping', title: 'Stores', color: '#F59E0B', desc: 'Sell supplements and equipment to a targeted fitness audience. Automatic order processing and platform-split revenue.' },
      ]
    },
    features: {
      title: 'Powered by Intelligence',
      items: [
        { title: 'AI Nutritionist', desc: 'Upload your blood work or medical report. Our AI constructs a precision meal plan calibrated to your exact biology.', badge: 'AI' },
        { title: 'Smart QR Check-In', desc: 'No more lost gym cards. Trainees check-in with a rotating QR code on their phone, tracked in real-time.', badge: 'Live' },
        { title: 'Financial Ledger Engine', desc: 'Every transaction is auto-split between the trainer, gym, and platform. Full double-entry accounting transparency.', badge: 'FinTech' },
        { title: 'AI Form Correction', desc: 'Computer vision technology analyzes your movement during exercises and flags errors in real time.', badge: 'AI Vision' },
        { title: 'Referral Rewards', desc: 'Refer a friend. When they complete their first subscription, 50 EGP is automatically credited to both wallets.', badge: 'Rewards' },
        { title: 'Social & Leaderboards', desc: 'Share progress photos, earn badges for streaks. Compete on weekly leaderboards with your gym community.', badge: 'Social' },
      ]
    },
    partners: {
      title: 'Why Partner with GEM Z?',
      subtitle: 'Join a growing ecosystem generating real revenue for fitness businesses across Egypt and the MENA region.',
      cards: [
        { title: 'For Gyms', desc: 'Instant member onboarding, subscription billing, and automatic revenue settlement via GEM Z Wallet.', cta: 'Register Your Gym', href: '/gym' },
        { title: 'For Trainers', desc: 'Build your online brand, manage clients digitally, and get paid automatically with our 80/20 split model.', cta: 'Apply as a Trainer', href: '/trainer' },
        { title: 'For Brands & Stores', desc: 'Reach thousands of active gym-goers. Set up your store and start selling with our powerful e-commerce tools.', cta: 'Open a Store', href: '/store' },
      ]
    },
    cta: {
      title: 'The Ecosystem is Ready. Are You?',
      subtitle: 'Join GEM Z and start training, earning, and growing today. No setup fees.',
      btn: 'Get Started Free'
    }
  },
  ar: {
    nav: { features: 'المميزات', partners: 'الشراكات', pricing: 'الأسعار', login: 'تسجيل الدخول', getStarted: 'ابدأ الآن' },
    hero: {
      badge: 'مستقبل اللياقة البدنية وصل',
      title1: 'المنظومة الكاملة',
      title2: 'للياقة البدنية',
      subtitle: 'منصة واحدة تجمع المتدربين، المدربين الشخصيين، الصالات الرياضية، ومتاجر المكملات — مدعومة بالذكاء الاصطناعي وتسوية مالية فورية.',
      cta1: 'ابدأ مجاناً',
      cta2: 'استكشف المنصة',
    },
    stats: [
      { value: '+50K', label: 'عضو نشط' },
      { value: '+1,200', label: 'صالة رياضية شريكة' },
      { value: '+4,500', label: 'مدرب متخصص' },
      { value: '98.5%', label: 'نسبة رضا المستخدمين' },
    ],
    ecosystem: {
      title: 'منظومة واحدة. لكل الأدوار.',
      subtitle: 'GEM Z تجمع اقتصاد اللياقة بالكامل في منصة واحدة سلسة.',
      roles: [
        { icon: 'users', title: 'المتدربون', color: '#00FFA3', desc: 'خطط غذائية مدعومة بالذكاء الاصطناعي من تقاريرك الطبية، دخول QR للجيم، متابعة التمارين، ومجتمع لياقة اجتماعي.' },
        { icon: 'dumbbell', title: 'المدربون', color: '#00B8FF', desc: 'أدر قائمة عملائك، خصص البرامج، استلم أرباحك التلقائية، واقوِ سمعتك عالمياً.' },
        { icon: 'building', title: 'الصالات الرياضية', color: '#A78BFA', desc: 'لوحة B2B لإدارة الأعضاء، تسعير ساعات الهدوء، التسوية الفورية، وتحليلات الأداء.' },
        { icon: 'shopping', title: 'المتاجر', color: '#F59E0B', desc: 'بع المكملات والمعدات لجمهور لياقة مستهدف. معالجة تلقائية للطلبات وإيرادات مقسمة.' },
      ]
    },
    features: {
      title: 'مدعوم بالذكاء',
      items: [
        { title: 'خبير التغذية AI', desc: 'ارفع تحليلك الطبي أو فحص الدم. يقوم الذكاء الاصطناعي بإنشاء خطة وجبات دقيقة لبيولوجيتك.', badge: 'AI' },
        { title: 'الحضور الذكي QR', desc: 'لا بطاقات ضائعة. يسجل المتدرب حضوره برمز QR متجدد على هاتفه وتتبع لحظي.', badge: 'مباشر' },
        { title: 'محرك الأستاذ المالي', desc: 'كل معاملة تُقسّم تلقائياً بين المدرب، الجيم، والمنصة. شفافية محاسبية مزدوجة كاملة.', badge: 'FinTech' },
        { title: 'تصحيح الأداء AI', desc: 'تقنية رؤية حاسوبية تحلل حركتك أثناء التمارين وتنبهك على الأخطاء فوراً.', badge: 'AI رؤية' },
        { title: 'مكافآت الإحالة', desc: 'أحِل صديقاً. عند إتمام اشتراكه الأول، يُودَع 50 ج.م تلقائياً في محفظتيكما.', badge: 'مكافآت' },
        { title: 'التواصل الاجتماعي', desc: 'شارك صور تقدمك، اكسب شارات للإنجازات. تنافس في لوحات الصدارة الأسبوعية.', badge: 'اجتماعي' },
      ]
    },
    partners: {
      title: 'لماذا الشراكة مع GEM Z؟',
      subtitle: 'انضم إلى منظومة متنامية تحقق إيرادات حقيقية لشركات اللياقة في مصر ومنطقة الشرق الأوسط.',
      cards: [
        { title: 'للصالات الرياضية', desc: 'تأهيل فوري للأعضاء، فوترة الاشتراكات، وتسوية إيرادات تلقائية عبر محفظة GEM Z.', cta: 'سجّل صالتك', href: '/gym' },
        { title: 'للمدربين', desc: 'ابنِ علامتك التجارية الرقمية، أدر عملاءك، واستلم دفعاتك تلقائياً بنظام 80/20.', cta: 'سجّل كمدرب', href: '/trainer' },
        { title: 'للعلامات والمتاجر', desc: 'تواصل مع آلاف محبي الجيم. أنشئ متجرك وابدأ البيع بأدوات التجارة الإلكترونية لدينا.', cta: 'افتح متجرك', href: '/store' },
      ]
    },
    cta: {
      title: 'المنظومة جاهزة. أنت؟',
      subtitle: 'انضم إلى GEM Z وابدأ التدريب، الربح، والنمو اليوم. بدون رسوم تسجيل.',
      btn: 'ابدأ مجاناً'
    }
  }
};

export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const T = t[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const iconMap: Record<string, React.ReactNode> = {
    users: <Users size={28} />, dumbbell: <Activity size={28} />, building: <Building2 size={28} />, shopping: <ShoppingBag size={28} />
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen font-sans overflow-x-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ---------- NAVBAR ---------- */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b py-3' : 'py-5'}`}
        style={{ backgroundColor: scrolled ? 'var(--bg-card)' : 'transparent', borderColor: scrolled ? 'var(--border-subtle)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none' }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity">
            <GemZLogo size={36} variant="full" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <a href="#ecosystem" className="hover:text-[#00FFA3] transition-colors">{T.nav.features}</a>
            <a href="#partners" className="hover:text-[#00FFA3] transition-colors">{T.nav.partners}</a>
            <Link href="/pricing" className="hover:text-[#00FFA3] transition-colors">{T.nav.pricing}</Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="hidden sm:flex items-center justify-center p-2 rounded-xl transition-colors shrink-0" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition-colors font-medium" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
              <Globe size={14} /> {lang === 'en' ? 'العربية' : 'EN'}
            </button>
            <Link href="/login" className="hidden md:block text-sm font-bold transition-colors px-4 py-2 border rounded-xl" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              {T.nav.login}
            </Link>
            <Link href="/register" className="text-black font-bold text-sm px-5 py-2 rounded-xl hover:opacity-90 transition-opacity neon-glow font-heading shrink-0" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
              {T.nav.getStarted}
            </Link>
            <button className="md:hidden text-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#141414] border-t border-white/5 px-6 py-4 flex flex-col gap-4 text-sm text-gray-300">
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">{T.nav.features}</a>
            <a href="#partners" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">{T.nav.partners}</a>
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="text-left hover:text-white flex items-center gap-2"><Globe size={14} /> {lang === 'en' ? 'العربية' : 'EN'}</button>
          </div>
        )}
      </nav>

      {/* ---------- HERO ---------- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-[#00FFA3]/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-[#00B8FF]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-[#00FFA3]/10 border border-[#00FFA3]/20 text-[#00FFA3] text-sm font-medium px-5 py-2 rounded-full mb-8">
          <Zap size={14} className="shrink-0" /> {T.hero.badge}
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold font-heading tracking-tight mb-6 max-w-5xl leading-tight">
          {T.hero.title1}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#00B8FF]">
            {T.hero.title2}
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          {T.hero.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center z-10">
          <Link href="/register" className="text-black font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity neon-glow flex items-center gap-2 text-lg" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
            {T.hero.cta1} <ArrowRight size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
          </Link>
          <a href="#ecosystem" className="px-8 py-4 rounded-2xl transition-all text-lg font-medium flex items-center gap-2 hover:opacity-80" style={{ border: '1px solid var(--border-medium)', background: 'var(--bg-input)' }}>
            {T.hero.cta2} <ChevronDown size={18} />
          </a>
        </div>

        {/* Stats Bar */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-3xl">
          {T.stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#00B8FF]">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Floating Preview Card */}
        <div className="hidden lg:block mt-20 relative w-full max-w-4xl z-10">
          <div className="rounded-3xl p-6 shadow-2xl transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs ml-4 font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>admin.gemz.io</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Platform Revenue', value: '$1.2M', color: '#00FFA3' },
                { label: 'Active Gyms', value: '1,204', color: '#A78BFA' },
                { label: 'System Health', value: '99.9% ✓', color: '#00B8FF' },
              ].map((card, i) => (
                <div key={i} className="rounded-2xl p-4 transition-colors" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs mb-2 font-bold" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- BRAND VISION IMAGE ---------- */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-[#00FFA3]/20 shadow-[0_0_80px_rgba(0,255,163,0.08)]">
            {/* Glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 via-transparent to-[#0A0A0A]/30 z-10 pointer-events-none" />
            <img
              src="/brand-hero.png"
              alt="GEM Z — The Ultimate Fitness Ecosystem"
              className="w-full object-cover"
            />
            {/* Text overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-8 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-[#00FFA3] mb-2 font-mono">
                {lang === 'ar' ? '• الرؤية •' : '• THE VISION •'}
              </p>
              <h2 className="text-2xl md:text-4xl font-bold font-heading">
                {lang === 'ar'
                  ? 'كل تمرين. كل وجبة. كل ربح — في مكان واحد.'
                  : 'Every Rep. Every Meal. Every Earning — One Platform.'}
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ECOSYSTEM ---------- */}
      <section id="ecosystem" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4">{T.ecosystem.title}</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">{T.ecosystem.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {T.ecosystem.roles.map((role, i) => (
              <div key={i} className="rounded-3xl p-6 transition-all group relative overflow-hidden glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl transition-all group-hover:scale-150" style={{ background: `${role.color}15` }} />
                <div className="p-3 rounded-2xl w-fit mb-5 relative z-10" style={{ background: `${role.color}15`, color: role.color }}>
                  {iconMap[role.icon]}
                </div>
                <h3 className="text-xl font-bold mb-3 relative z-10 font-heading">{role.title}</h3>
                <p className="text-sm leading-relaxed relative z-10 font-medium" style={{ color: 'var(--text-secondary)' }}>{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="py-28 px-6 bg-[#141414]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4">{T.features.title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {T.features.items.map((feat, i) => (
              <div key={i} className="relative rounded-3xl p-7 transition-all glass-panel-hover overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="absolute inset-0 opacity-0 transition-opacity pointer-events-none" style={{ background: 'linear-gradient(to bottom right, rgba(0,255,163,0.03), rgba(0,184,255,0.03))', mixBlendMode: 'overlay' }} />
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <h3 className="text-lg font-bold">{feat.title}</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-2" style={{ background: 'rgba(0,255,163,0.1)', color: '#00FFA3', border: '1px solid rgba(0,255,163,0.2)' }}>{feat.badge}</span>
                </div>
                <p className="text-sm leading-relaxed relative z-10 font-medium" style={{ color: 'var(--text-secondary)' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PARTNERS ---------- */}
      <section id="partners" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4">{T.partners.title}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{T.partners.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {T.partners.cards.map((card, i) => {
              const colors = ['#00FFA3', '#00B8FF', '#F59E0B'];
              const c = colors[i];
              return (
                <div key={i} className="rounded-3xl p-8 flex flex-col gap-5 transition-all relative overflow-hidden group glass-panel-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: c }} />
                  <div className="p-3 rounded-2xl w-fit" style={{ background: `${c}15`, color: c }}>
                    <Building2 size={24} />
                  </div>
                  <h3 className="text-2xl font-bold font-heading">{card.title}</h3>
                  <p className="leading-relaxed flex-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
                  <Link href="/register" className="flex items-center gap-2 font-bold transition-transform group-hover:translate-x-1" style={{ color: c }}>
                    {card.cta} <ArrowRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} size={20} className="text-[#00FFA3] fill-[#00FFA3]" />)}
          </div>
          <h2 className="text-4xl md:text-6xl font-bold font-heading mb-6 leading-tight">{T.cta.title}</h2>
          <p className="text-xl mb-10 font-medium" style={{ color: 'var(--text-secondary)' }}>{T.cta.subtitle}</p>
          <Link href="/register" className="inline-flex items-center gap-3 text-black font-bold text-lg px-10 py-5 rounded-2xl hover:opacity-90 neon-glow transition-all hover:scale-105" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
            <CheckCircle size={22} /> {T.cta.btn}
          </Link>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="py-10 px-6 text-center text-sm border-t font-medium" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
        <img src="/gem-z-logo.png" alt="GEM Z" className="h-8 mx-auto mb-4 object-contain opacity-80" />
        <p>© 2026 GEM Z Fitness Ecosystem. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href="/pricing" className="hover:text-[#00FFA3] transition-colors">{T.nav.pricing}</Link>
          <Link href="/admin" className="hover:text-[#00B8FF] transition-colors">{lang === 'ar' ? 'الإدارة' : 'Admin'}</Link>
          <Link href="/social" className="hover:text-[#A78BFA] transition-colors">{lang === 'ar' ? 'المجتمع' : 'Community'}</Link>
        </div>
      </footer>
    </div>
  );
}
