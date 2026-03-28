'use client';
import GemZLogo from '../../../components/GemZLogo';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight, UploadCloud, Loader2 } from 'lucide-react';
import { GemZApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Open Your Store', subtitle: 'Sell supplements and gear to targeted athletes',
        step1: 'Admin Info', step2: 'Store Profile', step3: 'Products & Payouts',
        name: 'Full Name', email: 'Business Email', phone: 'Business Phone', password: 'Password', confirm: 'Confirm Password',
        storeName: 'Store Name', category: 'Primary Category', catOps: ['Supplements', 'Apparel', 'Equipment', 'Meal Prep', 'Accessories'],
        website: 'Website / Instagram (Optional)',
        tax: 'Tax ID Number', cr: 'Commercial Register No.', bank: 'Bank IBAN',
        logo: 'Upload Store Logo (Required)',
        next: 'Next', back2: 'Back', finish: 'Open Store',
        loginLink: 'Already have a store?', login: 'Sign In',
        agree: 'I allow GEM Z to process payments and deduct the standard platform fee per sale',
        errRequired: 'Please fill all required fields.',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'افتح متجرك', subtitle: 'بع المكملات والمعدات للرياضيين المستهدفين',
        step1: 'المدير', step2: 'ملف المتجر', step3: 'المنتجات والمدفوعات',
        name: 'الاسم الكامل', email: 'البريد الإلكتروني للعمل', phone: 'رقم هاتف العمل', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        storeName: 'اسم المتجر', category: 'التصنيف الأساسي', catOps: ['مكملات غذائية', 'ملابس رياضية', 'معدات رياضية', 'وجبات صحية', 'إكسسوارات'],
        website: 'الموقع أو الانستجرام (اختياري)',
        tax: 'البطاقة الضريبية', cr: 'السجل التجاري', bank: 'الآيبان البنكي (IBAN)',
        logo: 'رفع شعار المتجر (مطلوب)',
        next: 'التالي', back2: 'السابق', finish: 'فتح المتجر',
        loginLink: 'تمتلك متجراً بالفعل؟', login: 'تسجيل الدخول',
        agree: 'أوافق على قيام منصة GEM Z بمعالجة المدفوعات وخصم رسوم المنصة الأساسية لكل مبيعة',
        errRequired: 'يرجى ملء كافة الحقول المطلوبة.',
    }
};

const ACCENT = '#F59E0B';

export default function StoreRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);
    const [logoBase64, setLogoBase64] = useState('');
    
    const [formData, setFormData] = useState({
        adminName: '', email: '', phone: '', password: '', confirm: '',
        storeName: '', category: t.catOps[0], website: '',
        cr: '', tax: '', bank: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(file);
    };

    const validateStep = (currentStep: number) => {
        setError('');
        if (currentStep === 0) {
            if (!formData.adminName || !formData.email || !formData.phone || !formData.password || !formData.confirm) {
                setError(t.errRequired);
                return false;
            }
            if (formData.password !== formData.confirm) {
                setError(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
                return false;
            }
        }
        if (currentStep === 1) {
            if (!formData.storeName || !logoBase64) {
                setError(t.errRequired);
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) setStep(s => s + 1);
    };

    const handleRegister = async () => {
        if (!validateStep(2)) return;
        setLoading(true);
        setError('');

        try {
            const payload = {
                email: formData.email,
                password: formData.password,
                fullName: formData.adminName,
                phone: formData.phone,
                role: 'store_admin',
                logoBase64,
                storeData: {
                    name: formData.storeName,
                    category: formData.category,
                    website: formData.website
                }
            };
            
            const res: any = await GemZApi.Auth.register(payload);
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/store');
        } catch (err: any) {
            setError(err.message || (isArabic ? 'فشل إنشاء الحساب' : 'Registration failed'));
        } finally {
            setLoading(false);
        }
    };

    const steps = [t.step1, t.step2, t.step3];

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="w-full max-w-lg">
                <Link href="/register" className="text-sm mb-6 block hover:underline" style={{ color: ACCENT }}>{t.back}</Link>
                <div className="text-center mb-8">
                    <div className="flex justify-center w-full"><GemZLogo size={60} variant="full" /></div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.title}</h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t.subtitle}</p>
                </div>

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
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}
                    
                    {step === 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            {[{ name: 'adminName', label: t.name, type: 'text' },
                            { name: 'email', label: t.email, type: 'email' },
                            { name: 'phone', label: t.phone, type: 'tel' },
                            { name: 'password', label: t.password, type: 'password' },
                            { name: 'confirm', label: t.confirm, type: 'password' }].map((f, i) => (
                                <div key={i}>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                                    <input name={f.name} value={(formData as any)[f.name]} onChange={handleChange} type={f.type} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.storeName}</label>
                                <input name="storeName" value={formData.storeName} onChange={handleChange} type="text" placeholder="e.g. Muscle Pharm Egypt" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.category}</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B] appearance-none" style={{ background: 'var(--bg-input)' }}>
                                    {t.catOps.map((op, i) => <option key={i} value={op}>{op}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.website}</label>
                                <input name="website" value={formData.website} onChange={handleChange} type="text" placeholder="https://..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.logo}</label>
                                <label className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 relative h-32 overflow-hidden" style={{ borderColor: logoBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                    {logoBase64 ? <img src={logoBase64} className="absolute inset-0 w-full h-full object-cover opacity-60" /> : <UploadCloud size={24} style={{ color: 'var(--text-muted)' }} />}
                                    <span className="text-xs relative z-10 font-bold" style={{ color: logoBase64 ? '#fff' : 'var(--text-muted)' }}>{logoBase64 ? (isArabic ? 'تم الرفع' : 'Uploaded') : 'Browse or drag image (PNG, JPG)'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.cr}</label>
                                <input name="cr" value={formData.cr} onChange={handleChange} type="text" placeholder="XXXX-XXXX" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.tax}</label>
                                <input name="tax" value={formData.tax} onChange={handleChange} type="text" placeholder="XXX-XXX-XXX" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.bank}</label>
                                <input name="bank" value={formData.bank} onChange={handleChange} type="text" placeholder="EG1200..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#F59E0B]" />
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
                            <button onClick={() => { setError(''); setStep(s => s - 1); }} className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                {t.back2}
                            </button>
                        )}
                        {step < 2 ? (
                            <button onClick={nextStep} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                {t.next} <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />
                            </button>
                        ) : (
                            <button onClick={handleRegister} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-white text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> {t.finish}</>}
                            </button>
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
