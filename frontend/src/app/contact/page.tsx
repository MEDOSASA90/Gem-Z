'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Globe, MapPin, Phone, ChevronRight, PhoneCall } from 'lucide-react';

const T = {
    en: {
        title: 'Contact Us',
        subtitle: 'Reach out to the GEM Z global network',
        back: '← Back to Home',
        sections: {
            hq: 'Headquarters',
            press: 'Press & Media',
            partnerships: 'B2B Partnerships',
            inquiries: 'General Inquiries'
        },
        content: {
            hq: [
                'GEM Z Global Hub',
                'Dubai Silicon Oasis, Innovation Center, Floor 42.',
                'Available Mon-Fri, 9:00 AM - 6:00 PM GST.'
            ],
            press: [
                'For all press inquiries, feature requests, and media resource packages.',
                'Email: help@gem-z.shop'
            ],
            partnerships: [
                'Looking to integrate your gym chain or corporate wellness program?',
                'Email: help@gem-z.shop'
            ],
            inquiries: [
                'For user support, please use the Support portal or Live Chat.',
                'For general business queries: help@gem-z.shop'
            ]
        }
    },
    ar: {
        title: 'اتصل بنا',
        subtitle: 'تواصل مع الشبكة العالمية لمنصة GEM Z',
        back: '→ العودة للرئيسية',
        sections: {
            hq: 'المقر الرئيسي',
            press: 'الصحافة والإعلام',
            partnerships: 'شراكات الأعمال B2B',
            inquiries: 'الاستفسارات العامة'
        },
        content: {
            hq: [
                'المركز الإقليمي الرئيسي لـ GEM Z',
                'واحة دبي للسيليكون، مركز الابتكار، الطابق 42.',
                'متاح من الاثنين للجمعة، 9:00 صباحاً - 6:00 مساءً بتوقيت الخليج.'
            ],
            press: [
                'لجميع الاستفسارات الصحفية وطلبات التغطية وحزم الموارد الإعلامية.',
                'البريد الإلكتروني: help@gem-z.shop'
            ],
            partnerships: [
                'هل تتطلع إلى دمج سلسلة الصالات الرياضية الخاصة بك أو برامج صحة الشركات؟',
                'البريد الإلكتروني: help@gem-z.shop'
            ],
            inquiries: [
                'لدعم المستخدمين، يرجى استخدام بوابة الدعم أو المحادثة المباشرة.',
                'للاستفسارات التجارية العامة: help@gem-z.shop'
            ]
        }
    }
};

const ICONS: Record<string, React.ReactNode> = {
    hq: <MapPin size={20} />,
    press: <Globe size={20} />,
    partnerships: <Phone size={20} />,
    inquiries: <Mail size={20} />
};

export default function ContactPage() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    
    const [activeSection, setActiveSection] = useState<keyof typeof t.sections>('hq');
    const sectionKeys = Object.keys(t.sections) as Array<keyof typeof t.sections>;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <header className="relative py-16 px-6 overflow-hidden flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#ff7b00]/5 to-transparent z-0 pointer-events-none" />
                <div className="relative z-10 w-full max-w-5xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                        {t.back}
                    </Link>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-[#ff7b00]/20 shadow-[0_0_30px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                            <PhoneCall size={32} color="#ff7b00" />
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
                                        color: isActive ? '#ff7b00' : 'var(--text-secondary)',
                                        border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent'
                                    }}
                                >
                                    <span style={{ color: isActive ? '#ff7b00' : 'var(--text-muted)' }}>{ICONS[key]}</span>
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
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#ff7b0020', color: '#ff7b00' }}>
                                {ICONS[activeSection]}
                            </div>
                            <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.sections[activeSection]}</h2>
                        </div>
                        <div className="space-y-6">
                            {t.content[activeSection].map((paragraph: string, idx: number) => (
                                <div key={idx} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                                    <div className="mt-1">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-input)', color: '#ff7b00', border: '1px solid var(--border-medium)' }}>
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
