'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle, Zap, Shield, ArrowRight, Home } from 'lucide-react';

const T = {
    en: {
        nav: { back: 'Back to Home', login: 'Sign In' },
        title: 'Simple, Transparent Pricing', subtitle: 'Choose the plan that fits your role in the GEM Z ecosystem. No hidden fees.',
        billingOps: [{ id: 'monthly', label: 'Monthly billing' }, { id: 'annual', label: 'Annual billing (Save 20%)' }],
        roles: [
            {
                id: 'trainee', name: 'Trainee', color: '#00FFA3', price: 'Free', unit: 'forever',
                desc: 'Everything you need to crush your fitness goals.',
                features: ['AI-powered Diet Plans', 'Smart QR Check-in', 'Basic Workout Tracking', 'Social Timeline Access']
            },
            {
                id: 'trainer', name: 'Trainer Pro', color: '#00B8FF', price: 'EGP 499', unit: '/mo',
                desc: 'Advanced tools to manage and grow your client base.',
                features: ['Unlimited Clients', 'Custom Workout Protocols', 'Automated Revenue Splits (80/20)', 'In-app Client Messaging']
            },
            {
                id: 'gym', name: 'Gym Elite', color: '#A78BFA', price: 'EGP 1,999', unit: '/mo',
                desc: 'Complete B2B facility management solution.',
                features: ['QR Access Control System', 'Automated Billing & Renewals', 'Dynamic Off-peak Pricing', 'Multi-branch Analytics']
            },
            {
                id: 'store', name: 'Store Partner', color: '#F59E0B', price: '12%', unit: 'per sale',
                desc: 'Zero upfront cost. Only pay when you sell.',
                features: ['Digital Storefront', 'Inventory Management', 'Targeted Ad Placements', 'Instant Payouts to Wallet']
            }
        ]
    },
    ar: {
        nav: { back: 'العودة للرئيسية', login: 'تسجيل الدخول' },
        title: 'أسعار بسيطة وشفافة', subtitle: 'اختر الباقة التي تناسب دورك في منظومة GEM Z. بدون رسوم خفية.',
        billingOps: [{ id: 'monthly', label: 'دفع شهري' }, { id: 'annual', label: 'دفع سنوي (وفر ٢٠٪)' }],
        roles: [
            {
                id: 'trainee', name: 'المتدرب', color: '#00FFA3', price: 'مجاناً', unit: 'دائماً',
                desc: 'كل ما تحتاجه لسحق أهدافك الرياضية.',
                features: ['خطط غذائية بالذكاء الاصطناعي', 'دخول ذكي برمز QR', 'تتبع أساسي للتمارين', 'وصول للمجتمع الاجتماعي']
            },
            {
                id: 'trainer', name: 'المدرب المحترف', color: '#00B8FF', price: '٤٩٩ ج.م', unit: '/شهرياً',
                desc: 'أدوات متقدمة لإدارة وتنمية قائمة عملائك.',
                features: ['عدد عملاء غير محدود', 'بروتوكولات تدريب مخصصة', 'تقسيم إيرادات تلقائي (80/20)', 'مراسلة العملاء داخل التطبيق']
            },
            {
                id: 'gym', name: 'نخبة الصالات', color: '#A78BFA', price: '١,٩٩٩ ج.م', unit: '/شهرياً',
                desc: 'حل شامل لإدارة المنشآت الرياضية B2B.',
                features: ['نظام تحكم بالدخول عبر QR', 'فوترة وتجديد تلقائي', 'تسعير ديناميكي لأوقات الهدوء', 'تحليلات متعددة الفروع']
            },
            {
                id: 'store', name: 'شريك المتجر', color: '#F59E0B', price: '١٢٪', unit: 'لكل مبيعة',
                desc: 'بدون تكلفة مبدئية. ادفع فقط عند البيع.',
                features: ['واجهة متجر رقمية', 'إدارة المخزون', 'مساحات إعلانية مستهدفة', 'دفعات فورية للمحفظة']
            }
        ]
    }
};

export default function PricingPage() {
    const { isArabic } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const isDark = theme === 'dark';
    const [billing, setBilling] = useState('monthly');

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen relative overflow-hidden font-sans pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #00B8FF, transparent)' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #00FFA3, transparent)' }} />

            {/* Navbar */}
            <nav className="border-b transition-colors relative z-10" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                        <img src="/gem-z-logo.png" alt="GEM Z" className="h-8 object-contain" />
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hidden sm:flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: 'var(--text-secondary)' }}>
                            <Home size={16} /> {t.nav.back}
                        </Link>
                        <button onClick={toggleTheme} className="p-2 rounded-lg transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        <Link href="/login" className="px-5 py-2 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
                            {t.nav.login}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: 'rgba(0,184,255,0.1)', color: '#00B8FF', border: '1px solid rgba(0,184,255,0.2)' }}>
                    <Zap size={14} /> GEM Z SUBSCRIPTIONS
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-4 font-heading" style={{ color: 'var(--text-primary)' }}>{t.title}</h1>
                <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>{t.subtitle}</p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center p-1.5 rounded-2xl mx-auto" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                    {t.billingOps.map(op => (
                        <button
                            key={op.id}
                            onClick={() => setBilling(op.id)}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                                background: billing === op.id ? 'var(--bg-card)' : 'transparent',
                                color: billing === op.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: billing === op.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            {op.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {t.roles.map((role) => (
                    <div key={role.id} className="rounded-3xl p-8 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-2" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-subtle)` }}>
                        {/* Top Glow Indicator */}
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: role.color }} />
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none" style={{ background: role.color }} />

                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            {role.name}
                        </h3>
                        <p className="text-sm min-h-[40px] mb-6" style={{ color: 'var(--text-secondary)' }}>{role.desc}</p>

                        <div className="mb-8 flex items-end gap-1">
                            <span className="text-4xl font-extrabold font-mono" style={{ color: 'var(--text-primary)' }}>{role.price}</span>
                            <span className="text-sm font-medium pb-1" style={{ color: 'var(--text-muted)' }}>{role.unit}</span>
                        </div>

                        <Link href={`/register/${role.id}`} className="w-full py-3.5 rounded-xl font-bold text-center text-black mb-8 transition-opacity hover:opacity-90 flex items-center justify-center gap-2 outline-none" style={{ background: role.color, boxShadow: `0 4px 20px ${role.color}40` }}>
                            {isArabic ? 'اختر الخطة' : 'Select Plan'} <ArrowRight size={18} className={isArabic ? 'rotate-180' : ''} />
                        </Link>

                        <div className="space-y-4 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{isArabic ? 'المميزات المتضمنة:' : 'What\'s included:'}</p>
                            {role.features.map((feat, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: role.color }} />
                                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Trust Badges */}
            <div className="max-w-4xl mx-auto px-6 mt-20 text-center relative z-10">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-8 border-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-3">
                        <Shield className="text-[#00FFA3]" size={28} />
                        <div className="text-start">
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isArabic ? 'مدفوعات آمنة' : 'Secure Payments'}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'تشفير ૨٥٦ بت' : '256-bit encryption'}</p>
                        </div>
                    </div>
                    <div className="hidden sm:block w-px h-10" style={{ background: 'var(--border-subtle)' }} />
                    <div className="flex items-center gap-3">
                        <Zap className="text-[#00B8FF]" size={28} />
                        <div className="text-start">
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isArabic ? 'إعداد فوري' : 'Instant Setup'}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'بدون رسوم أولية' : 'Zero onboarding fees'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
