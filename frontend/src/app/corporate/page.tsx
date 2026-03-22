'use client';
import React, { useState } from 'react';
import {
    Building2, Users, TrendingUp, CheckCircle, Zap, Globe,
    ArrowRight, BarChart3, Shield, HeartPulse, Star, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const PLANS = [
    {
        name: 'Starter', nameAr: 'ستارتر', color: '#00B8FF',
        pricePerEmployee: 80, minEmployees: 10, maxEmployees: 50,
        features: [
            { en: 'Full gym network access', ar: 'وصول لشبكة الجيم الكاملة' },
            { en: 'AI diet plans per employee', ar: 'خطط غذائية AI لكل موظف' },
            { en: 'Progress tracking dashboard', ar: 'داشبورد تتبع التقدم' },
            { en: 'Monthly health reports', ar: 'تقارير صحية شهرية' },
        ],
        emoji: '🚀'
    },
    {
        name: 'Business', nameAr: 'بيزنس', color: '#A78BFA', best: true,
        pricePerEmployee: 65, minEmployees: 51, maxEmployees: 200,
        features: [
            { en: 'Everything in Starter', ar: 'كل مميزات ستارتر' },
            { en: 'Dedicated account manager', ar: 'مدير حساب مخصص' },
            { en: 'Team challenges & competitions', ar: 'تحديات فرق ومنافسات' },
            { en: 'On-site trainer sessions (4/mo)', ar: 'جلسات مدرب داخلي (4/شهر)' },
            { en: 'Custom challenges & leaderboards', ar: 'تحديات مخصصة ولوحات صدارة' },
        ],
        emoji: '⭐'
    },
    {
        name: 'Enterprise', nameAr: 'إنتربرايز', color: '#FFCC00',
        pricePerEmployee: 50, minEmployees: 201, maxEmployees: null,
        features: [
            { en: 'Everything in Business', ar: 'كل مميزات بيزنس' },
            { en: 'White-label mobile app', ar: 'تطبيق موبايل باسم شركتك' },
            { en: 'Full HR wellness integration', ar: 'تكامل كامل مع HR' },
            { en: 'Quarterly health analytics', ar: 'تحليلات صحية ربع سنوية' },
            { en: 'SLA & dedicated support line', ar: 'SLA وخط دعم مخصص' },
            { en: 'Custom billing & invoicing', ar: 'فوترة وفواتير مخصصة' },
        ],
        emoji: '🏆'
    },
];

const STATS = [
    { valueEn: '200+', valueAr: '+200', labelEn: 'Partner Gyms', labelAr: 'جيم شريك', icon: '🏋️' },
    { valueEn: '40%', valueAr: '40٪', labelEn: 'Avg. Productivity Boost', labelAr: 'زيادة إنتاجية', icon: '📈' },
    { valueEn: '85%', valueAr: '85٪', labelEn: 'Employee Retention Rate', labelAr: 'معدل الاحتفاظ بالموظفين', icon: '❤️' },
    { valueEn: '24h', valueAr: '24 ساعة', labelEn: 'Onboarding Time', labelAr: 'وقت التأهيل', icon: '⚡' },
];

const TESTIMONIALS = [
    { name: 'Sara EL-Sayed', role: 'HR Director — Telecom Egypt', roleAr: 'مدير HR — تليكوم مصر', text: 'GEM Z transformed our employee wellness program. 92% of our team is now actively using it.', textAr: 'GEM Z حوّل برنامج رفاهية موظفينا. 92٪ من فريقنا يستخدمه الآن بنشاط.', rating: 5, emoji: '👩‍💼' },
    { name: 'Ahmed Mostafa', role: 'CEO — FinEdge Capital', roleAr: 'CEO — فين إيدج كابيتال', text: 'Sick days dropped by 35% in the first 6 months. The ROI is remarkable.', textAr: 'انخفضت أيام الغياب بسبب المرض بنسبة 35٪ في الأشهر الستة الأولى. العائد مذهل.', rating: 5, emoji: '👨‍💼' },
];

const FAQS = [
    { q: 'How does billing work?', qAr: 'كيف تعمل الفوترة؟', a: 'Monthly invoices per active employee. No hidden fees. Cancel anytime.', aAr: 'فواتير شهرية لكل موظف نشط. لا رسوم خفية. إلغاء في أي وقت.' },
    { q: 'Can employees use any gym?', qAr: 'هل يمكن للموظف استخدام أي جيم؟', a: 'Yes — access to our entire partner gym network (200+ locations).', aAr: 'نعم — وصول لشبكة الجيم الشريكة كاملة (+200 فرع).' },
    { q: 'Is employee data private?', qAr: 'هل بيانات الموظفين خاصة؟', a: 'Absolutely. HR sees only anonymized aggregate health metrics. Individual data is protected.', aAr: 'تماماً. HR ترى فقط مؤشرات مجمعة مجهولة الهوية. البيانات الفردية محمية.' },
    { q: 'How fast is onboarding?', qAr: 'ما سرعة التأهيل؟', a: 'We onboard your entire team in under 24 hours with bulk invite links.', aAr: 'نؤهل فريقك بالكامل في أقل من 24 ساعة باستخدام روابط الدعوة الجماعية.' },
];

export default function CorporatePage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [employees, setEmployees] = useState(100);

    const selectedPlan = PLANS.find(p =>
        employees >= p.minEmployees && (p.maxEmployees === null || employees <= p.maxEmployees)
    ) || PLANS[2];
    const monthlyTotal = employees * selectedPlan.pricePerEmployee;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-8 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <Link href="/"><GemZLogo size={36} variant="full" /></Link>
                <div className="flex items-center gap-3">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                    <a href="mailto:corporate@gemz.app" className="px-5 py-2.5 rounded-xl font-bold text-sm text-black" style={{ background: '#00FFA3' }}>
                        {isArabic ? '📞 تواصل معنا' : '📞 Contact Sales'}
                    </a>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative overflow-hidden py-28 px-8" style={{ background: 'linear-gradient(135deg, #0A1A0A 0%, #0A0A1A 50%, #1A0A0A 100%)' }}>
                <div className="absolute inset-0 bg-gradient-radial from-[#00FFA3]/5 to-transparent" />
                <div className="max-w-5xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-bold" style={{ background: 'rgba(0,255,163,0.1)', border: '1px solid rgba(0,255,163,0.2)', color: '#00FFA3' }}>
                        <Building2 size={14} /> {isArabic ? 'GEM Z للشركات' : 'GEM Z for Corporates'}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold font-heading text-white mb-6 leading-tight">
                        {isArabic ? (
                            <><span className="text-[#00FFA3]">موظفون أصحاء.</span><br />شركة أقوى.</>
                        ) : (
                            <><span className="text-[#00FFA3]">Healthier Teams.</span><br />Stronger Business.</>
                        )}
                    </h1>
                    <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
                        {isArabic
                            ? 'برامج رفاهية متكاملة لموظفيك — جيم، تغذية، AI، وتحليلات صحية — كل ذلك في منصة واحدة.'
                            : 'End-to-end employee wellness — gym access, AI nutrition, form correction, and health analytics — all in one platform.'}
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button className="px-8 py-4 rounded-2xl font-bold text-black text-lg flex items-center gap-2" style={{ background: '#00FFA3' }}>
                            {isArabic ? 'ابدأ تجربة مجانية' : 'Start Free Trial'} <ArrowRight size={18} />
                        </button>
                        <button className="px-8 py-4 rounded-2xl font-bold text-white text-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            {isArabic ? 'شاهد العرض' : 'Watch Demo'} ▶️
                        </button>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-16 px-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {STATS.map((s, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl mb-2">{s.icon}</div>
                            <p className="text-4xl font-bold font-mono text-[#00FFA3] mb-1">{isArabic ? s.valueAr : s.valueEn}</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? s.labelAr : s.labelEn}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ROI Calculator */}
            <section className="py-20 px-8">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold font-heading mb-3">{isArabic ? '🧮 احسب عائد استثمارك' : '🧮 Calculate Your ROI'}</h2>
                    <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'حرّك شريط عدد الموظفين' : 'Drag the slider to see your pricing'}</p>
                    <div className="rounded-3xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="font-bold">{isArabic ? 'عدد الموظفين:' : 'Employees:'}</span>
                            <span className="text-2xl font-bold text-[#00FFA3] font-mono">{employees}</span>
                        </div>
                        <input type="range" min={10} max={500} step={10} value={employees} onChange={e => setEmployees(+e.target.value)}
                            className="w-full mb-8 accent-[#00FFA3]" />
                        <div className="flex items-end justify-center gap-6 mb-4">
                            <div className="text-center">
                                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الخطة المثالية' : 'Best Plan'}</p>
                                <div className="text-2xl font-bold" style={{ color: selectedPlan.color }}>{selectedPlan.emoji} {isArabic ? selectedPlan.nameAr : selectedPlan.name}</div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'لكل موظف شهرياً' : 'Per employee/mo'}</p>
                                <p className="text-2xl font-bold text-[#00FFA3]" dir="ltr">EGP {selectedPlan.pricePerEmployee}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الإجمالي الشهري' : 'Monthly total'}</p>
                                <p className="text-3xl font-bold font-mono text-white" dir="ltr">EGP {monthlyTotal.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Plans */}
            <section className="py-16 px-8" style={{ background: 'var(--bg-card)' }}>
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold font-heading text-center mb-12">{isArabic ? 'خطط بسيطة وشفافة' : 'Simple, Transparent Pricing'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS.map(plan => (
                            <div key={plan.name} className="rounded-3xl p-6 relative" style={{ background: 'var(--bg-primary)', border: `1px solid ${plan.best ? plan.color : 'var(--border-subtle)'}` }}>
                                {plan.best && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold text-black" style={{ background: plan.color }}>
                                        {isArabic ? '⭐ الأشهر' : '⭐ Most Popular'}
                                    </div>
                                )}
                                <div className="text-4xl mb-4">{plan.emoji}</div>
                                <h3 className="font-bold text-xl mb-1">{isArabic ? plan.nameAr : plan.name}</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    {plan.minEmployees}–{plan.maxEmployees ?? '∞'} {isArabic ? 'موظف' : 'employees'}
                                </p>
                                <div className="flex items-end gap-1 mb-6">
                                    <span className="text-4xl font-bold font-mono" style={{ color: plan.color }} dir="ltr">EGP {plan.pricePerEmployee}</span>
                                    <span className="text-sm pb-1" style={{ color: 'var(--text-secondary)' }}>/{isArabic ? 'موظف/شهر' : 'emp/mo'}</span>
                                </div>
                                <ul className="space-y-2.5 mb-6">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle size={14} className="text-[#00FFA3] mt-0.5 shrink-0" />
                                            <span style={{ color: 'var(--text-secondary)' }}>{isArabic ? f.ar : f.en}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90" style={{ background: plan.best ? plan.color : 'var(--bg-input)', color: plan.best ? '#000' : 'var(--text-primary)', border: `1px solid ${plan.best ? plan.color : 'var(--border-medium)'}` }}>
                                    {isArabic ? 'ابدأ الآن' : 'Get Started'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-16 px-8">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold font-heading text-center mb-10">{isArabic ? 'ماذا يقول عملاؤنا' : 'What Our Clients Say'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex mb-3">{[...Array(t.rating)].map((_, j) => <Star key={j} size={16} className="fill-[#FFCC00] text-[#FFCC00]" />)}</div>
                                <p className="text-sm mb-4 italic" style={{ color: 'var(--text-secondary)' }}>"{isArabic ? t.textAr : t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{t.emoji}</div>
                                    <div>
                                        <p className="font-bold text-sm">{t.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? t.roleAr : t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 px-8" style={{ background: 'var(--bg-card)' }}>
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold font-heading text-center mb-10">{isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h2>
                    {FAQS.map((faq, i) => (
                        <div key={i} className="mb-3 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-5 text-left font-bold" style={{ background: 'var(--bg-primary)' }}>
                                {isArabic ? faq.qAr : faq.q}
                                <ChevronDown size={18} className="transition-transform" style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', color: 'var(--text-muted)' }} />
                            </button>
                            {openFaq === i && (
                                <div className="px-5 pb-5 text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
                                    {isArabic ? faq.aAr : faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A0A, #0A0A1A)' }}>
                <div className="max-w-3xl mx-auto text-center relative">
                    <h2 className="text-4xl font-bold font-heading text-white mb-4">{isArabic ? 'جاهز لتحويل شركتك؟' : 'Ready to transform your company?'}</h2>
                    <p className="text-white/50 mb-8">{isArabic ? 'انضم لأكثر من 50 شركة مصرية تستخدم GEM Z لموظفيها' : 'Join 50+ Egyptian companies using GEM Z for their teams'}</p>
                    <a href="mailto:corporate@gemz.app" className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-black text-lg" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
                        {isArabic ? 'تواصل مع فريق المبيعات' : 'Contact Our Sales Team'} <ArrowRight size={20} />
                    </a>
                </div>
            </section>

            <footer className="py-8 px-8 text-center text-sm border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                © 2026 GEM Z Fitness Ecosystem — {isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
            </footer>
        </div>
    );
}
