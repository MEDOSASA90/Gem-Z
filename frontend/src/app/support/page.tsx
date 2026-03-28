'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { HelpCircle, Briefcase, CreditCard, Monitor, ChevronRight, MessageSquare } from 'lucide-react';

const T = {
    en: {
        title: 'Help & Support',
        subtitle: 'We are here to help you dominate your goals',
        back: '← Back to Home',
        sections: {
            faqs: 'General FAQs',
            billing: 'Billing & Payments',
            technical: 'Technical Issues',
            guides: 'Platform Guides'
        },
        content: {
            faqs: [
                'How do I verify my identity? Navigate to your profile settings and upload a clear photo of your ID.',
                'Can I change my gym? Yes, trainees can upgrade or switch gym memberships from the Wallet tab.'
            ],
            billing: [
                'All transactions are processed securely. You can view your invoice history in the Wallet.',
                'If you experience a failed transaction, please ensure your card has sufficient funds or try an alternative payment method.'
            ],
            technical: [
                'Experiencing app crashes? Ensure you are using the latest version of your browser or clear the app cache.',
                'If you encounter a bug, use the Live Chat widget in the bottom corner to reach our tech team directly.'
            ],
            guides: [
                'Trainers: Check the "AI Coach" tab for tutorials on building automated workout routines.',
                'Stores: Visit the Admin panel documentation for bulk-uploading inventory CSV files.'
            ]
        }
    },
    ar: {
        title: 'المساعدة والدعم',
        subtitle: 'نحن هنا لمساعدتك في تحقيق أهدافك القتالية',
        back: '→ العودة للرئيسية',
        sections: {
            faqs: 'الأسئلة الشائعة',
            billing: 'الفواتير والدفع',
            technical: 'المشاكل التقنية',
            guides: 'أدلة الاستخدام'
        },
        content: {
            faqs: [
                'كيف أوثق هويتي؟ توجه إلى إعدادات حسابك وقم برفع صورة واضحة لهويتك الوطنية.',
                'هل يمكنني تغيير الصالة الرياضية؟ نعم، يمكن للمتدربين ترقية أو تبديل اشتراكات الصالات من تبويب المحفظة.'
            ],
            billing: [
                'تتم معالجة جميع المعاملات بأمان. يمكنك عرض تاريخ الفواتير الخاص بك في المحفظة.',
                'إذا واجهت معاملة فاشلة، يرجى التأكد من توفر رصيد كافٍ ببطاقتك أو جرب طريقة دفع بديلة.'
            ],
            technical: [
                'هل تواجه أعطال في التطبيق؟ تأكد من استخدام أحدث إصدار من متصفحك أو قم بمسح ذاكرة التخزين المؤقت.',
                'إذا واجهت مشكلة برمجية، استخدم أداة الدردشة المباشرة في الزاوية السفلية للتواصل المباشر مع فريقنا التقني.'
            ],
            guides: [
                'المدربون: تحقق من تبويب "المدرب الذكي" للاطلاع على شروحات بناء جداول التدريب المؤتمتة.',
                'المتاجر: قم بزيارة وثائق لوحة التحكم لمعرفة كيفية الرفع المجمع لملفات المخزون.'
            ]
        }
    }
};

const ICONS: Record<string, React.ReactNode> = {
    faqs: <HelpCircle size={20} />,
    billing: <CreditCard size={20} />,
    technical: <Monitor size={20} />,
    guides: <Briefcase size={20} />
};

export default function SupportPage() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    
    const [activeSection, setActiveSection] = useState<keyof typeof t.sections>('faqs');
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
                            <MessageSquare size={32} color="#00E5FF" />
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
