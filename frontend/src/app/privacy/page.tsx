'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, Lock, Eye, CheckCircle, ChevronRight, Scale, Database, Server } from 'lucide-react';

const T = {
    en: {
        title: 'Privacy Policy',
        subtitle: 'How we handle and protect your data',
        back: '← Back to Home',
        sections: {
            collection: 'Data Collection',
            usage: 'Data Usage',
            security: 'Security Measures',
            rights: 'User Rights'
        },
        content: {
            collection: [
                'We collect fundamental information required to provide our elite fitness ecosystem.',
                'This includes identity verification documents, workout analytics, and payment information processed through secure third-party vendors.'
            ],
            usage: [
                'Your data is exclusively used to enhance your experience within GEM Z.',
                'We do not sell your personal data to any external advertising agencies.'
            ],
            security: [
                'All user data is encrypted at rest and in transit utilizing industry-standard AES-256 protocols.',
                'Identity documents are processed exclusively through our automated AI and are kept strictly confidential.'
            ],
            rights: [
                'You retain the right to request a full export of your fitness and analytical data at any time.',
                'You may request account deletion, which will permanently purge all associated personal records.'
            ]
        }
    },
    ar: {
        title: 'سياسة الخصوصية',
        subtitle: 'كيف نتعامل مع بياناتك ونحميها',
        back: '→ العودة للرئيسية',
        sections: {
            collection: 'جمع البيانات',
            usage: 'استخدام البيانات',
            security: 'التدابير الأمنية',
            rights: 'حقوق المستخدم'
        },
        content: {
            collection: [
                'نقوم بجمع المعلومات الأساسية المطلوبة لتقديم خدماتنا الرياضية المتميزة.',
                'يشمل ذلك وثائق إثبات الهوية، وتحليلات التمارين، ومعلومات الدفع التي يتم معالجتها عبر أطراف ثالثة آمنة.'
            ],
            usage: [
                'تُستخدم بياناتك حصرياً لتحسين تجربتك داخل منصة GEM Z.',
                'نحن لا نبيع بياناتك الشخصية لأي وكالات إعلانية خارجية.'
            ],
            security: [
                'يتم تشفير جميع بيانات المستخدم أثناء النقل والحفظ باستخدام بروتوكولات التشفير العالمية.',
                'تتم معالجة وثائق الهوية حصرياً عبر أنظمة الذكاء الاصطناعي وتبقى سرية تماماً.'
            ],
            rights: [
                'تحتفظ بالحق في طلب تصدير كامل لبياناتك الرياضية والتحليلية في أي وقت.',
                'يمكنك طلب حذف الحساب، مما سيؤدي إلى محو جميع السجلات الشخصية المرتبطة به نهائياً.'
            ]
        }
    }
};

const ICONS: Record<string, React.ReactNode> = {
    collection: <Database size={20} />,
    usage: <Eye size={20} />,
    security: <Lock size={20} />,
    rights: <CheckCircle size={20} />
};

export default function PrivacyPage() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    
    const [activeSection, setActiveSection] = useState<keyof typeof t.sections>('collection');
    const sectionKeys = Object.keys(t.sections) as Array<keyof typeof t.sections>;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <header className="relative py-16 px-6 overflow-hidden flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#00E5FF]/5 to-transparent z-0 pointer-events-none" />
                <div className="relative z-10 w-full max-w-5xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                        {t.back}
                    </Link>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-[#00E5FF]/20 shadow-[0_0_30px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                            <Shield size={32} color="#00E5FF" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>
                            {t.title}
                        </h1>
                        <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            {t.subtitle}
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 shrink-0">
                    <div className="sticky top-6 flex flex-col gap-2">
                        {sectionKeys.map((key) => {
                            const isActive = activeSection === key;
                            return (
                                <button
                                    key={key as string}
                                    onClick={() => setActiveSection(key)}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all w-full text-start ${isActive ? 'shadow-lg' : 'hover:bg-white/5'}`}
                                    style={{ 
                                        backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                                        color: isActive ? '#00E5FF' : 'var(--text-secondary)',
                                        border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent'
                                    }}
                                >
                                    <span style={{ color: isActive ? '#00E5FF' : 'var(--text-muted)' }}>{ICONS[key]}</span>
                                    <span className="flex-1">{t.sections[key]}</span>
                                    {isActive && <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <section className="flex-1">
                    <div className="p-8 md:p-10 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.2)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-4 mb-8 pb-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#00E5FF20', color: '#00E5FF' }}>
                                {ICONS[activeSection]}
                            </div>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.sections[activeSection]}</h2>
                        </div>
                        <div className="space-y-6">
                            {t.content[activeSection].map((paragraph: string, idx: number) => (
                                <div key={idx} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                                    <div className="mt-1">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-input)', color: '#00E5FF', border: '1px solid var(--border-medium)' }}>
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <p className="flex-1 leading-relaxed text-base" style={{ color: 'var(--text-primary)' }}>{paragraph}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
