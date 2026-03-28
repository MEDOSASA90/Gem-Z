'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Shield, User, Dumbbell, Store, ChevronRight, Scale, Briefcase, FileText } from 'lucide-react';

const T = {
    en: {
        title: 'Terms & Conditions',
        subtitle: 'Please read our platform policies carefully',
        back: '← Back to Home',
        sections: {
            platform: 'Platform Policies',
            trainees: 'Trainees Policy',
            trainers: 'Trainers Policy',
            gyms: 'Gyms Policy',
            stores: 'Stores Policy'
        },
        content: {
            platform: [
                'GEM Z ensures a secure, elite fitness ecosystem.',
                'Data Privacy: All uploaded identity documents (ID cards) are processed securely via AI solely for data extraction. Images are not permanently stored publically and data is restricted to platform admins and the user.',
                'Revenue Split: GEM Z takes a standard 20% platform fee on all trainer subscriptions and store merchandise sales unless an exclusive deal is signed.',
                'Zero Tolerance: Any harassment, inappropriate content, or violation of our elite standards will result in immediate account termination.'
            ],
            trainees: [
                'Trainees must provide valid identity verification during registration.',
                'Subscriptions made to trainers or gyms are non-refundable after the first 24 hours of purchase, subject to the service provider’s discretion.',
                'Trainees are expected to follow the instructions provided by their trainers carefully to avoid injury. GEM Z is not liable for physical injuries sustained.'
            ],
            trainers: [
                'Trainers must upload a valid personal photo and ID card. Identity must be verified before payouts are enabled.',
                'Professionalism: Trainers must maintain an elite level of service and respond to their trainees promptly.',
                'Payments: Payouts are gathered in the wallet and can be withdrawn bi-weekly. An 80/20 split applies to all online programs sold through the platform.'
            ],
            gyms: [
                'Gyms must upload a valid commercial register, tax ID, and facility logo.',
                'Facility Standards: Gyms must accurately represent their female-only hours and amenities. Drop-in rates must be honored for all GEM Z users.',
                'Liability: Gyms hold full responsibility for the safety of equipment and facilities on their premises.'
            ],
            stores: [
                'Stores must provide accurate descriptions of supplements and equipment. Selling banned substances will result in immediate termination.',
                'Fulfillment: Stores are responsible for adhering to shipping timelines. E-commerce payments are processed through GEM Z with standard transaction fees applied.'
            ]
        }
    },
    ar: {
        title: 'الشروط والأحكام',
        subtitle: 'يرجى قراءة سياسات المنصة بعناية',
        back: '→ العودة للرئيسية',
        sections: {
            platform: 'سياسات المنصة',
            trainees: 'سياسات المتدربين',
            trainers: 'سياسات المدربين',
            gyms: 'سياسات الصالات',
            stores: 'سياسات المتاجر'
        },
        content: {
            platform: [
                'تضمن منصة GEM Z بيئة رياضية آمنة ومتميزة لنخبة الرياضيين.',
                'خصوصية البيانات: تتم معالجة جميع وثائق الهوية المرفوعة (صور البطاقة) بشكل آمن عبر الذكاء الاصطناعي لاستخراج البيانات فقط. تتم حماية هذه البيانات ولا يراها سوى المستخدم نفسه وإدارة المنصة.',
                'تحصيل الإيرادات: تقوم منصة GEM Z باقتطاع نسبة 20% كرسوم خدمة على اشتراكات المدربين ومبيعات المتاجر ما لم يتم إبرام عقد حصري.',
                'سياسة الحزم: لن يتم التسامح مع أي مضايقات أو محتوى غير لائق أو انتهاك لمعايير المنصة، وسيؤدي ذلك إلى الإيقاف الفوري للحساب.'
            ],
            trainees: [
                'يجب على المتدرب تقديم إثبات هوية ساري المفعول عند التسجيل لدواعي الأمان.',
                'الاشتراكات المدفوعة للمدربين أو الصالات غير قابلة للاسترداد بعد مرور 24 ساعة من الشراء، وتخضع لتقدير مقدم الخدمة.',
                'يتعين على المتدربين اتباع تعليمات المدربين لتجنب الإصابات. منصة GEM Z غير مسؤولة عن أي إصابات جسدية ناتجة عن التمارين.'
            ],
            trainers: [
                'يجب على المدربين رفع صورة شخصية واضحة وبطاقة هوية سارية. يجب توثيق الحساب قبل تفعيل سحب الأرباح.',
                'الاحترافية: يُتوقع من المدربين الحفاظ على مستوى خدمة ممتاز والرد على المتدربين في الوقت المناسب.',
                'المدفوعات: يتم جمع الأرباح في المحفظة المالية ويمكن سحبها كل أسبوعين. تطبق نسبة 80/20 على كافة البرامج المباعة عبر المنصة.'
            ],
            gyms: [
                'يجب على الصالات المرفقة رفع السجل التجاري والبطاقة الضريبية وشعار المنشأة.',
                'معايير المنشأة: يجب على الصالات تحديد مواعيد السيدات والمرافق المتوفرة بدقة. يجب الالتزام بتسعيرة الزيارة الواحدة لمستخدمي GEM Z.',
                'المسؤولية: تتحمل الصالات المسؤولية الكاملة عن سلامة الأجهزة والمرافق داخل مقارها.'
            ],
            stores: [
                'يجب على المتاجر تقديم وصف دقيق للمكملات والمعدات. بيع أي مواد محظورة يؤدي إلى الإغلاق الفوري للحساب.',
                'الشحن والتسليم: المتاجر مسؤولة عن الالتزام بمواعيد الشحن المحددة. تتم معالجة عمليات الدفع عبر المنصة مع خصم رسوم المعاملات القياسية.'
            ]
        }
    }
};

const ICONS = {
    platform: <Shield size={20} />,
    trainees: <User size={20} />,
    trainers: <Briefcase size={20} />,
    gyms: <Dumbbell size={20} />,
    stores: <Store size={20} />
};

export default function TermsPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    
    // Default active section
    const [activeSection, setActiveSection] = useState<keyof typeof t.sections>('platform');

    const sectionKeys = Object.keys(t.sections) as Array<keyof typeof t.sections>;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="relative py-16 px-6 overflow-hidden flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#00E5FF]/5 to-transparent z-0 pointer-events-none" />
                <div className="relative z-10 w-full max-w-5xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                        {t.back}
                    </Link>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-[#00E5FF]/20 shadow-[0_0_30px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                            <Scale size={32} color="#00E5FF" />
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
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 shrink-0">
                    <div className="sticky top-6 flex flex-col gap-2">
                        {sectionKeys.map((key) => {
                            const isActive = activeSection === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveSection(key)}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all w-full text-start ${isActive ? 'shadow-lg' : 'hover:bg-white/5'}`}
                                    style={{ 
                                        backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                                        color: isActive ? '#00E5FF' : 'var(--text-secondary)',
                                        border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent'
                                    }}
                                >
                                    <span style={{ color: isActive ? '#00E5FF' : 'var(--text-muted)' }}>
                                        {ICONS[key]}
                                    </span>
                                    <span className="flex-1">{t.sections[key]}</span>
                                    {isActive && <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Content Area */}
                <section className="flex-1">
                    <div className="p-8 md:p-10 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.2)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-4 mb-8 pb-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#00E5FF20', color: '#00E5FF' }}>
                                {ICONS[activeSection]}
                            </div>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                {t.sections[activeSection]}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {t.content[activeSection].map((paragraph, idx) => (
                                <div key={idx} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                                    <div className="mt-1">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-input)', color: '#00E5FF', border: '1px solid var(--border-medium)' }}>
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <p className="flex-1 leading-relaxed text-base" style={{ color: 'var(--text-primary)' }}>
                                        {paragraph}
                                    </p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-12 p-5 rounded-2xl flex items-start gap-4" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                            <FileText size={24} color="#00E5FF" className="shrink-0 mt-1" />
                            <div>
                                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {isArabic ? 'تحديثات السياسة' : 'Policy Updates'}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic 
                                        ? 'تحتفظ منصة GEM Z بالحق في تعديل هذه الشروط في أي وقت. استمرارك في استخدام المنصة بعد التعديلات يُعد قبولاً منك بها.' 
                                        : 'GEM Z reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes your acceptance.'}
                                </p>
                            </div>
                        </div>

                    </div>
                </section>
            </main>
        </div>
    );
}
