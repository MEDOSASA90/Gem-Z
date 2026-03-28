'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Network, Laptop, Megaphone, Settings, ChevronRight, Activity } from 'lucide-react';

const T = {
    en: {
        title: 'Careers at GEM Z',
        subtitle: 'Build the future of digital fitness with us',
        back: '← Back to Home',
        sections: {
            engineering: 'Engineering',
            design: 'Product Design',
            marketing: 'Marketing',
            operations: 'Operations'
        },
        content: {
            engineering: [
                'Full Stack Developer (Next.js/Node): Build scalable backend architectures and interactive frontend dashboards.',
                'AI/ML Engineer: Train models for real-time fitness pose detection and automated workout generation.',
                'Send your resume to: help@gem-z.shop'
            ],
            design: [
                'Senior UI/UX Designer: Define the aesthetic identity of our elite applications.',
                '3D Artist / Motion Designer: Create stunning visual loops for gym displays and digital assets.',
                'Send your portfolio to: help@gem-z.shop'
            ],
            marketing: [
                'Growth Hacker: Devise strategies to capture modern fitness demographics globally.',
                'Community Manager: Lead the engagement loops for trainers and trainees in the social feed.',
                'Send your resume to: help@gem-z.shop'
            ],
            operations: [
                'Regional B2B Sales Manager: Onboard premium gym chains and supplement stores into the ecosystem.',
                'Customer Success Specialist: Ensure our VIP trainers and corporate partners have seamless experiences.',
                'Send your resume to: help@gem-z.shop'
            ]
        }
    },
    ar: {
        title: 'الوظائف في GEM Z',
        subtitle: 'شاركنا في بناء مستقبل اللياقة البدنية الرقمية',
        back: '→ العودة للرئيسية',
        sections: {
            engineering: 'الهندسة البرمجية',
            design: 'تصميم المنتجات',
            marketing: 'التسويق',
            operations: 'العمليات'
        },
        content: {
            engineering: [
                'مطور Full Stack (Next.js/Node): بناء معماريات خلفية قابلة للتطوير ولوحات بيانات أمامية تفاعلية.',
                'مهندس ذكاء اصطناعي: تدريب نماذج لاكتشاف وضعية الجسم في الوقت الفعلي وإنشاء التمارين المؤتمتة.',
                'أرسل سيرتك الذاتية إلى: help@gem-z.shop'
            ],
            design: [
                'مصمم UI/UX أول: تحديد الهوية الجمالية لتطبيقاتنا النخبوية.',
                'فنان ثلاثي الأبعاد / مصمم موشن: إنشاء مقاطع مرئية مذهلة لشاشات الصالات الرياضية.',
                'أرسل نموذج أعمالك إلى: help@gem-z.shop'
            ],
            marketing: [
                'خبير نمو (Growth Hacker): ابتكار استراتيجيات لجذب الديموغرافيا الرياضية الحديثة عالمياً.',
                'مدير المجتمعات: قيادة التفاعل بين المدربين والمتدربين في الشبكة الاجتماعية.',
                'أرسل سيرتك الذاتية إلى: help@gem-z.shop'
            ],
            operations: [
                'مدير مبيعات إقليمي (B2B): دمج سلاسل الصالات الرياضية الكبرى ومتاجر المكملات الغذائية في النظام.',
                'أخصائي نجاح العملاء: ضمان حصول المدربين وكبار شركائنا على تجربة سلسة.',
                'أرسل سيرتك الذاتية إلى: help@gem-z.shop'
            ]
        }
    }
};

const ICONS: Record<string, React.ReactNode> = {
    engineering: <Laptop size={20} />,
    design: <Network size={20} />,
    marketing: <Megaphone size={20} />,
    operations: <Settings size={20} />
};

export default function CareersPage() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    
    const [activeSection, setActiveSection] = useState<keyof typeof t.sections>('engineering');
    const sectionKeys = Object.keys(t.sections) as Array<keyof typeof t.sections>;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <header className="relative py-16 px-6 overflow-hidden flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/5 to-transparent z-0 pointer-events-none" />
                <div className="relative z-10 w-full max-w-5xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                        {t.back}
                    </Link>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-[#8B5CF6]/20 shadow-[0_0_30px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                            <Activity size={32} color="#8B5CF6" />
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
                                        color: isActive ? '#8B5CF6' : 'var(--text-secondary)',
                                        border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent'
                                    }}
                                >
                                    <span style={{ color: isActive ? '#8B5CF6' : 'var(--text-muted)' }}>{ICONS[key]}</span>
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
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
                                {ICONS[activeSection]}
                            </div>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.sections[activeSection]}</h2>
                        </div>
                        <div className="space-y-6">
                            {t.content[activeSection].map((paragraph: string, idx: number) => (
                                <div key={idx} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                                    <div className="mt-1">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-input)', color: '#8B5CF6', border: '1px solid var(--border-medium)' }}>
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
