'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight, UploadCloud } from 'lucide-react';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Open Your Store', subtitle: 'Sell supplements and gear to targeted athletes',
        step1: 'Admin Info', step2: 'Store Profile', step3: 'Products & Payouts',
        name: 'Full Name', email: 'Business Email', phone: 'Business Phone', password: 'Password', confirm: 'Confirm Password',
        storeName: 'Store Name', category: 'Primary Category', catOps: ['Supplements', 'Apparel', 'Equipment', 'Meal Prep', 'Accessories'],
        website: 'Website / Instagram (Optional)',
        tax: 'Tax ID Number', cr: 'Commercial Register No.', bank: 'Bank IBAN',
        logo: 'Upload Store Logo',
        next: 'Next', back2: 'Back', finish: 'Open Store',
        loginLink: 'Already have a store?', login: 'Sign In',
        agree: 'I allow GEM Z to process payments and deduct the standard platform fee per sale',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'افتح متجرك', subtitle: 'بع المكملات والمعدات للرياضيين المستهدفين',
        step1: 'المدير', step2: 'ملف المتجر', step3: 'المنتجات والمدفوعات',
        name: 'الاسم الكامل', email: 'البريد الإلكتروني للعمل', phone: 'رقم هاتف العمل', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        storeName: 'اسم المتجر', category: 'التصنيف الأساسي', catOps: ['مكملات غذائية', 'ملابس رياضية', 'معدات رياضية', 'وجبات صحية', 'إكسسوارات'],
        website: 'الموقع أو الانستجرام (اختياري)',
        tax: 'البطاقة الضريبية', cr: 'السجل التجاري', bank: 'الآيبان البنكي (IBAN)',
        logo: 'رفع شعار المتجر',
        next: 'التالي', back2: 'السابق', finish: 'فتح المتجر',
        loginLink: 'تمتلك متجراً بالفعل؟', login: 'تسجيل الدخول',
        agree: 'أوافق على قيام منصة GEM Z بمعالجة المدفوعات وخصم رسوم المنصة الأساسية لكل مبيعة',
    }
};

const ACCENT = '#F59E0B'; // Amber color for Store

export default function StoreRegisterPage() {
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
                                    <input type={f.type} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.storeName}</label>
                                <input type="text" placeholder="e.g. Muscle Pharm Egypt" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.category}</label>
                                <select className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B] appearance-none" style={{ background: 'var(--bg-input)' }}>
                                    {t.catOps.map((op, i) => <option key={i} value={op}>{op}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.website}</label>
                                <input type="text" placeholder="https://..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.logo}</label>
                                <div className="border border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2" style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                    <UploadCloud size={24} style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Browse or drag image (PNG, JPG)</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.cr}</label>
                                <input type="text" placeholder="XXXX-XXXX" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.tax}</label>
                                <input type="text" placeholder="XXX-XXX-XXX" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.bank}</label>
                                <input type="text" placeholder="EG1200..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>

                            <div className="mt-6 border border-[#F59E0B]/30 bg-[#F59E0B]/5 rounded-xl p-4">
                                <p className="text-sm font-medium mb-1" style={{ color: ACCENT }}>E-Commerce Features Unlocked</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Upon approval, you gain access to the fulfillment dashboard, automated inventory tracking, and API integrations.</p>
                            </div>

                            <div className="mt-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 mt-1 accent-[#F59E0B]" />
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
                            <Link href="/store" className="flex-1 py-3 rounded-xl text-sm font-bold text-white text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
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
