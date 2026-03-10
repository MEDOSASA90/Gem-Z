'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight } from 'lucide-react';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Register Your Gym', subtitle: 'Modernize your facility management',
        step1: 'Account Admin', step2: 'Facility Details', step3: 'Business Info',
        name: 'Admin Name', email: 'Admin Email', phone: 'Admin Phone', password: 'Password', confirm: 'Confirm Password',
        gymName: 'Gym/Brand Name', location: 'Main Location (City, Area)', branches: 'Number of Branches',
        amenities: 'Key Amenities', amOps: ['Pool', 'Sauna', 'CrossFit Rig', 'Cardio Zone', 'Women Only Area'],
        tax: 'Tax ID Number', cr: 'Commercial Register No.', dropin: 'Standard Drop-in Price (EGP)',
        next: 'Next', back2: 'Back', finish: 'Create Gym Account',
        loginLink: 'Already managing a gym?', login: 'Sign In',
        agree: 'I confirm authorization to create this business account',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'سجل صالتك الرياضية', subtitle: 'حوّل إدارة منشأتك للنظام الرقمي الحديث',
        step1: 'مدير الحساب', step2: 'تفاصيل المنشأة', step3: 'معلومات التجارة',
        name: 'اسم المدير', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        gymName: 'اسم الجيم / العلامة', location: 'الموقع الرئيسي (المدينة، المنطقة)', branches: 'عدد الفروع',
        amenities: 'المرافق الأساسية', amOps: ['مسبح', 'ساونا', 'تجهيزات كروس فيت', 'منطقة كارديو', 'قسم خاص للسيدات'],
        tax: 'رقم البطاقة الضريبية', cr: 'رقم السجل التجاري', dropin: 'سعر الزيارة الواحدة (ج.م)',
        next: 'التالي', back2: 'السابق', finish: 'إنشاء حساب الصالة',
        loginLink: 'تُدير صالة بالفعل؟', login: 'تسجيل الدخول',
        agree: 'أؤكد امتلاكي التفويض لإنشاء حساب الأعمال هذا بمنصة GEM Z',
    }
};

const ACCENT = '#A78BFA';

export default function GymRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);
    const [amens, setAmens] = useState<string[]>([]);

    const steps = [t.step1, t.step2, t.step3];

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="w-full max-w-lg">
                <Link href="/register" className="text-sm mb-6 block hover:underline" style={{ color: ACCENT }}>{t.back}</Link>
                <div className="text-center mb-8">
                    <img src="/gem-z-logo.png" alt="GEM Z" className="h-10 mx-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.title}</h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t.subtitle}</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-8">
                    {steps.map((s, i) => (
                        <React.Fragment key={i}>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                    style={{ background: i <= step ? ACCENT : 'var(--bg-card)', color: i <= step ? '#fff' : 'var(--text-muted)', border: `1px solid ${i <= step ? ACCENT : 'var(--border-subtle)'}` }}>
                                    {i < step ? <CheckCircle size={14} color="#fff" /> : <span style={{ color: i <= step ? '#fff' : '' }}>{i + 1}</span>}
                                </div>
                                <span className="text-xs hidden sm:block" style={{ color: i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
                            </div>
                            {i < 2 && <div className="flex-1 h-px" style={{ background: i < step ? ACCENT : 'var(--border-subtle)' }} />}
                        </React.Fragment>
                    ))}
                </div>

                <div className="p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    {step === 0 && (
                        <div className="space-y-4">
                            {[{ label: t.name, type: 'text' },
                            { label: t.email, type: 'email' },
                            { label: t.phone, type: 'tel' },
                            { label: t.password, type: 'password' },
                            { label: t.confirm, type: 'password' }].map((f, i) => (
                                <div key={i}>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                                    <input type={f.type} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.gymName}</label>
                                <input type="text" placeholder="Gold's Gym Elite" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.location}</label>
                                    <input type="text" placeholder="Cairo, Nasr City" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.branches}</label>
                                    <input type="number" min="1" defaultValue="1" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{t.amenities}</label>
                                <div className="flex flex-wrap gap-2">
                                    {t.amOps.map((am, i) => {
                                        const active = amens.includes(am);
                                        return (
                                            <button key={i} onClick={() => setAmens(prev => active ? prev.filter(x => x !== am) : [...prev, am])}
                                                className="py-1.5 px-3 rounded-lg text-xs font-medium transition-all"
                                                style={{ background: active ? `${ACCENT}20` : 'var(--bg-input)', border: `1px solid ${active ? ACCENT : 'var(--border-medium)'}`, color: active ? ACCENT : 'var(--text-primary)' }}>
                                                {am}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.cr}</label>
                                <input type="text" placeholder="12345-67" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.tax}</label>
                                <input type="text" placeholder="XXX-XXX-XXX" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.dropin}</label>
                                <input type="number" placeholder="250" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>

                            <div className="mt-6">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 mt-1 accent-[#A78BFA]" />
                                    <span className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>{t.agree}</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className={`flex justify-between mt-8 gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                {t.back2}
                            </button>
                        )}
                        {step < 2 ? (
                            <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                {t.next} <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />
                            </button>
                        ) : (
                            <Link href="/gym" className="flex-1 py-3 rounded-xl text-sm font-bold text-white text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                <CheckCircle size={16} /> {t.finish}
                            </Link>
                        )}
                    </div>
                </div>
                <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t.loginLink} <Link href="/login" className="font-bold hover:underline" style={{ color: ACCENT }}>{t.login}</Link>
                </p>
            </div>
        </div>
    );
}
