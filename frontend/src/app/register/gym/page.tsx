'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight, Loader2, MapPin, Clock } from 'lucide-react';
import { GemZApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Register Your Gym', subtitle: 'Modernize your facility management',
        step1: 'Account Admin', step2: 'Facility Details', step3: 'Business Info',
        name: 'Admin Name', email: 'Admin Email', phone: 'Admin Phone', password: 'Password', confirm: 'Confirm Password',
        gymName: 'Gym/Brand Name', location: 'Main Location (City, Area)', branches: 'Number of Branches',
        googleMaps: 'Google Maps Link', femaleHours: 'Dedicated Female Hours',
        amenities: 'Key Amenities', amOps: ['Pool', 'Sauna', 'Jacuzzi', 'CrossFit Rig', 'Cardio Zone', 'Women Only Area', 'Drinks Bar'],
        tax: 'Tax ID Number', cr: 'Commercial Register No.', dropin: 'Standard Drop-in Price (EGP)',
        next: 'Next', back2: 'Back', finish: 'Create Gym Account',
        loginLink: 'Already managing a gym?', login: 'Sign In',
        agree: 'I confirm authorization to create this business account',
        errRequired: 'Please fill all required fields.',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'سجل صالتك الرياضية', subtitle: 'حوّل إدارة منشأتك للنظام الرقمي الحديث',
        step1: 'مدير الحساب', step2: 'تفاصيل المنشأة', step3: 'معلومات التجارة',
        name: 'اسم المدير', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        gymName: 'اسم الجيم / العلامة', location: 'الموقع الرئيسي (المدينة، المنطقة)', branches: 'عدد الفروع',
        googleMaps: 'رابط خرائط جوجل', femaleHours: 'مواعيد خاصة للسيدات',
        amenities: 'المرافق الأساسية', amOps: ['مسبح', 'ساونا', 'جاكوزي', 'تجهيزات كروس فيت', 'منطقة كارديو', 'قسم خاص للسيدات', 'بار مشروبات'],
        tax: 'رقم البطاقة الضريبية', cr: 'رقم السجل التجاري', dropin: 'سعر الزيارة الواحدة (ج.م)',
        next: 'التالي', back2: 'السابق', finish: 'إنشاء حساب الصالة',
        loginLink: 'تُدير صالة بالفعل؟', login: 'تسجيل الدخول',
        agree: 'أؤكد امتلاكي التفويض لإنشاء حساب الأعمال هذا بمنصة GEM Z',
        errRequired: 'يرجى ملء كافة الحقول المطلوبة.',
    }
};

const ACCENT = '#A78BFA';

export default function GymRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);
    const [amens, setAmens] = useState<string[]>([]);
    const [logoBase64, setLogoBase64] = useState('');
    
    const [formData, setFormData] = useState({
        adminName: '', email: '', phone: '', password: '', confirm: '',
        gymName: '', mainLocation: '', branches: '1', locationUrl: '', femaleHours: '',
        cr: '', tax: '', dropinPrice: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            if (!formData.gymName || !formData.locationUrl || !logoBase64) {
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
                role: 'gym_admin',
                logoBase64,
                gymData: {
                    name: formData.gymName,
                    locationUrl: formData.locationUrl,
                    femaleHours: formData.femaleHours,
                    amenities: amens
                }
            };
            
            const res: any = await GemZApi.Auth.register(payload);
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/gym');
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
                                    <input name={f.name} value={(formData as any)[f.name]} onChange={handleChange} type={f.type} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.gymName}</label>
                                <input name="gymName" value={formData.gymName} onChange={handleChange} type="text" placeholder="Gold's Gym Elite" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><MapPin size={16} /> {t.googleMaps}</label>
                                <input name="locationUrl" value={formData.locationUrl} onChange={handleChange} type="url" placeholder="https://maps.app.goo.gl/..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.location}</label>
                                    <input name="mainLocation" value={formData.mainLocation} onChange={handleChange} type="text" placeholder="Cairo, Nasr City" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.branches}</label>
                                    <input name="branches" value={formData.branches} onChange={handleChange} type="number" min="1" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Clock size={16} /> {t.femaleHours}</label>
                                <input name="femaleHours" value={formData.femaleHours} onChange={handleChange} type="text" placeholder={isArabic ? 'مثال: 08:00 ص - 12:00 م' : 'e.g. 08:00 AM - 12:00 PM'} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>

                            <div>
                                <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>Gym Logo (Required)</label>
                                <label className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 relative h-32 overflow-hidden" style={{ borderColor: logoBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                    {logoBase64 ? <img src={logoBase64} className="absolute inset-0 w-full h-full object-cover opacity-60" /> : <div className="text-gray-400 mb-2">☁️</div>}
                                    <span className="text-xs relative z-10 font-bold" style={{ color: logoBase64 ? '#fff' : 'var(--text-muted)' }}>{logoBase64 ? (isArabic ? 'تم الرفع' : 'Uploaded') : 'Browse or drag image (PNG, JPG)'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
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
                                                {active && '✓ '} {am}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.cr}</label>
                                <input name="cr" value={formData.cr} onChange={handleChange} type="text" placeholder="12345-67" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.tax}</label>
                                <input name="tax" value={formData.tax} onChange={handleChange} type="text" placeholder="XXX-XXX-XXX" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.dropin}</label>
                                <input name="dropinPrice" value={formData.dropinPrice} onChange={handleChange} type="number" placeholder="250" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#A78BFA]" />
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
