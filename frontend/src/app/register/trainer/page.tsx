'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight } from 'lucide-react';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Trainer Application', subtitle: 'Join the GEM Z elite coaching network',
        step1: 'Account Details', step2: 'Professional Info', step3: 'Profile & Rates',
        name: 'Full Name', email: 'Email', phone: 'Phone Number', password: 'Password', confirm: 'Confirm Password',
        specialization: 'Core Specialization', specOps: ['Bodybuilding', 'Powerlifting', 'CrossFit', 'Weight Loss', 'Rehabilitation'],
        experience: 'Years of Experience', certs: 'Certifications (comma separated)',
        bio: 'Short Bio', bioPh: 'Tell clients about your coaching style...',
        rate: 'Monthly Online Plan Rate (EGP)', social: 'Instagram Handle (Optional)',
        next: 'Next', back2: 'Back', finish: 'Submit Application',
        loginLink: 'Already have an account?', login: 'Sign In',
        agree: 'I agree to the 80/20 revenue split Terms & Privacy Policy',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'طلب انضمام كمدرب', subtitle: 'انضم لشبكة GEM Z لنخبة المدربين',
        step1: 'بيانات الحساب', step2: 'المعلومات المهنية', step3: 'الملف والأسعار',
        name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        specialization: 'التخصص الأساسي', specOps: ['كمال الأجسام', 'رفع الأثقال', 'كروس فيت', 'إنقاص الوزن', 'تأهيل إصابات'],
        experience: 'سنوات الخبرة', certs: 'الشهادات المعتمدة (مفصولة بفاصلة)',
        bio: 'نبذة شخصية', bioPh: 'أخبر العملاء عن أسلوبك في التدريب...',
        rate: 'سعر الخطة الشهرية أونلاين (ج.م)', social: 'حساب انستجرام (اختياري)',
        next: 'التالي', back2: 'السابق', finish: 'تقديم الطلب',
        loginLink: 'لديك حساب أونلاين؟', login: 'تسجيل الدخول',
        agree: 'أوافق على الشروط (نسبة 80/20) وسياسة الخصوصية',
    }
};

const ACCENT = '#00B8FF';

export default function TrainerRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);

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
                                    style={{ background: i <= step ? ACCENT : 'var(--bg-card)', color: i <= step ? '#000' : 'var(--text-muted)', border: `1px solid ${i <= step ? ACCENT : 'var(--border-subtle)'}` }}>
                                    {i < step ? <CheckCircle size={14} /> : i + 1}
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
                            {[{ label: t.name, type: 'text', ph: isArabic ? 'كابتن محمد' : 'Coach John' },
                            { label: t.email, type: 'email', ph: 'coach@example.com' },
                            { label: t.phone, type: 'tel', ph: isArabic ? '+20 1XX XXX XXXX' : '+1 XXX XXX XXXX' },
                            { label: t.password, type: 'password', ph: '••••••••' },
                            { label: t.confirm, type: 'password', ph: '••••••••' }].map((f, i) => (
                                <div key={i}>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                                    <input type={f.type} placeholder={f.ph} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.specialization}</label>
                                <select className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF] appearance-none" style={{ background: 'var(--bg-input)' }}>
                                    {t.specOps.map((op, i) => <option key={i} value={op}>{op}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.experience}</label>
                                <input type="number" min="0" placeholder="e.g. 5" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.certs}</label>
                                <input type="text" placeholder="ISSA, NASM, ACE..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.bio}</label>
                                <textarea className="w-full px-4 py-3 rounded-xl text-sm input-base resize-none h-24 focus:border-[#00B8FF]" placeholder={t.bioPh} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.rate}</label>
                                    <input type="number" placeholder="1500" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.social}</label>
                                    <input type="text" placeholder="@username" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                                </div>
                            </div>
                            <div className="mt-4 border border-dashed border-[#00B8FF]/30 bg-[#00B8FF]/5 rounded-xl p-4 text-center">
                                <p className="text-sm font-medium mb-1" style={{ color: ACCENT }}>Identity Verification Required</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You will be prompted to upload your ID and Certifications from your dashboard after registration.</p>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer mt-4">
                                <input type="checkbox" className="w-4 h-4 mt-1 accent-[#00B8FF]" />
                                <span className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>{t.agree}</span>
                            </label>
                        </div>
                    )}

                    <div className={`flex justify-between mt-8 gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                {t.back2}
                            </button>
                        )}
                        {step < 2 ? (
                            <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                {t.next} <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />
                            </button>
                        ) : (
                            <Link href="/trainer" className="flex-1 py-3 rounded-xl text-sm font-bold text-black text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
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
