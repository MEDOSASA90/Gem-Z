'use client';
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
        title: 'Trainer Application', subtitle: 'Join the GEM Z elite coaching network',
        step1: 'Account Details', step2: 'Professional Info', step3: 'Profile & Uploads',
        name: 'Full Name', email: 'Email', phone: 'Phone Number', password: 'Password', confirm: 'Confirm Password',
        specialization: 'Core Specialization', specOps: ['Bodybuilding', 'Powerlifting', 'CrossFit', 'Weight Loss', 'Rehabilitation'],
        experience: 'Years of Experience', certs: 'Certifications (comma separated)',
        bio: 'Short Bio', bioPh: 'Tell clients about your coaching style...',
        rate: 'Monthly Online Plan Rate (EGP)', social: 'Instagram Handle (Optional)',
        idFront: 'ID Card (Front)', idBack: 'ID Card (Back)', personalPhoto: 'Personal Photo (Mandatory)', dropzone: 'Upload',
        next: 'Next', back2: 'Back', finish: 'Submit Application',
        loginLink: 'Already have an account?', login: 'Sign In',
        agree: 'I agree to the Terms & Privacy Policy, and understand that my ID uploads will be securely analyzed by AI to extract identity data according to platform policies.',
        errRequired: 'Please fill all required fields.',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'طلب انضمام كمدرب', subtitle: 'انضم لشبكة GEM Z لنخبة المدربين',
        step1: 'بيانات الحساب', step2: 'المعلومات المهنية', step3: 'الملف والرفع',
        name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        specialization: 'التخصص الأساسي', specOps: ['كمال الأجسام', 'رفع الأثقال', 'كروس فيت', 'إنقاص الوزن', 'تأهيل إصابات'],
        experience: 'سنوات الخبرة', certs: 'الشهادات المعتمدة (مفصولة بفاصلة)',
        bio: 'نبذة شخصية', bioPh: 'أخبر العملاء عن أسلوبك في التدريب...',
        rate: 'سعر الخطة الشهرية أونلاين (ج.م)', social: 'حساب انستجرام (اختياري)',
        idFront: 'صورة البطاقة (الوجه)', idBack: 'صورة البطاقة (الظهر)', personalPhoto: 'صورة شخصية (إلزامية)', dropzone: 'رفع',
        next: 'التالي', back2: 'السابق', finish: 'تقديم الطلب',
        loginLink: 'لديك حساب أونلاين؟', login: 'تسجيل الدخول',
        agree: 'أوافق على الشروط وسياسة الخصوصية، وأتفهم أنه سيتم تحليل صور الهوية بشكل آمن بواسطة الذكاء الاصطناعي لاستخراج البيانات وتخزينها حسب سياسات المنصة.',
        errRequired: 'يرجى ملء كافة الحقول المطلوبة.',
    }
};

const ACCENT = '#00B8FF';

export default function TrainerRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);

    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', password: '', confirm: '',
        specialization: t.specOps[0], experience: '', certs: '',
        bio: '', rate: '', social: ''
    });

    const [idFrontBase64, setIdFrontBase64] = useState('');
    const [idBackBase64, setIdBackBase64] = useState('');
    const [avatarBase64, setAvatarBase64] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'avatar') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'front') setIdFrontBase64(reader.result as string);
            else if (type === 'back') setIdBackBase64(reader.result as string);
            else setAvatarBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const validateStep = (currentStep: number) => {
        setError('');
        if (currentStep === 0) {
            if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirm) {
                setError(t.errRequired);
                return false;
            }
            if (formData.password !== formData.confirm) {
                setError(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
                return false;
            }
        }
        if (currentStep === 1) {
            if (!formData.specialization || !formData.experience) {
                setError(t.errRequired);
                return false;
            }
        }
        if (currentStep === 2) {
            if (!formData.bio || !formData.rate || !idFrontBase64 || !idBackBase64 || !avatarBase64) {
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
                fullName: formData.fullName,
                phone: formData.phone,
                role: 'trainer',
                idFrontBase64,
                idBackBase64,
                avatarBase64,
                trainerData: {
                    specialization: formData.specialization,
                    experience: Number(formData.experience) || 0,
                    certs: formData.certs.split(',').map(c => c.trim()).filter(Boolean),
                    bio: formData.bio,
                    rate: Number(formData.rate) || 0,
                    social: formData.social
                }
            };
            
            const res: any = await GemZApi.Auth.register(payload);
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            router.push('/trainer');
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
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}
                    
                    {step === 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            {[{ name: 'fullName', label: t.name, type: 'text', ph: isArabic ? 'كابتن محمد' : 'Coach John' },
                            { name: 'email', label: t.email, type: 'email', ph: 'coach@example.com' },
                            { name: 'phone', label: t.phone, type: 'tel', ph: isArabic ? '+20 1XX XXX XXXX' : '+1 XXX XXX XXXX' },
                            { name: 'password', label: t.password, type: 'password', ph: '••••••••' },
                            { name: 'confirm', label: t.confirm, type: 'password', ph: '••••••••' }].map((f, i) => (
                                <div key={i}>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                                    <input name={f.name} value={(formData as any)[f.name]} onChange={handleChange} type={f.type} placeholder={f.ph} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.specialization}</label>
                                <select name="specialization" value={formData.specialization} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF] appearance-none" style={{ background: 'var(--bg-input)' }}>
                                    {t.specOps.map((op, i) => <option key={i} value={op}>{op}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.experience}</label>
                                <input name="experience" value={formData.experience} onChange={handleChange} type="number" min="0" placeholder="e.g. 5" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.certs}</label>
                                <input name="certs" value={formData.certs} onChange={handleChange} type="text" placeholder="ISSA, NASM, ACE..." className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.bio}</label>
                                <textarea name="bio" value={formData.bio} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-sm input-base resize-none h-24 focus:border-[#00B8FF]" placeholder={t.bioPh} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.rate}</label>
                                    <input name="rate" value={formData.rate} onChange={handleChange} type="number" placeholder="1500" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.social}</label>
                                    <input name="social" value={formData.social} onChange={handleChange} type="text" placeholder="@username" className="w-full px-4 py-3 rounded-xl text-sm input-base focus:border-[#00B8FF]" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-center" style={{ color: 'var(--text-secondary)' }}>{t.idFront}</label>
                                    <label className="border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center text-center cursor-pointer relative h-24 overflow-hidden" style={{ borderColor: idFrontBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                        {idFrontBase64 ? <img src={idFrontBase64} className="absolute inset-0 w-full h-full object-cover" /> : <UploadCloud size={20} className="mb-1 text-gray-400" />}
                                        <span className="text-[10px] relative z-10 font-bold" style={{ color: idFrontBase64 ? 'transparent' : 'var(--text-muted)' }}>{t.dropzone}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                                    </label>
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-center" style={{ color: 'var(--text-secondary)' }}>{t.idBack}</label>
                                    <label className="border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center text-center cursor-pointer relative h-24 overflow-hidden" style={{ borderColor: idBackBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                        {idBackBase64 ? <img src={idBackBase64} className="absolute inset-0 w-full h-full object-cover" /> : <UploadCloud size={20} className="mb-1 text-gray-400" />}
                                        <span className="text-[10px] relative z-10 font-bold" style={{ color: idBackBase64 ? 'transparent' : 'var(--text-muted)' }}>{t.dropzone}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                                    </label>
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-center" style={{ color: 'var(--text-secondary)' }}>{t.personalPhoto}</label>
                                    <label className="border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center text-center cursor-pointer relative h-24 overflow-hidden" style={{ borderColor: avatarBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                        {avatarBase64 ? <img src={avatarBase64} className="absolute inset-0 w-full h-full object-cover" /> : <UploadCloud size={20} className="mb-1 text-gray-400" />}
                                        <span className="text-[10px] relative z-10 font-bold" style={{ color: avatarBase64 ? 'transparent' : 'var(--text-muted)' }}>{t.dropzone}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar')} />
                                    </label>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer mt-4">
                                <input type="checkbox" className="w-4 h-4 mt-1 accent-[#00B8FF]" />
                                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.agree}</span>
                            </label>
                        </div>
                    )}

                    <div className={`flex justify-between mt-8 gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        {step > 0 && (
                            <button onClick={() => { setError(''); setStep(s => s - 1); }} className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                                {t.back2}
                            </button>
                        )}
                        {step < 2 ? (
                            <button onClick={nextStep} className="flex-1 py-3 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                {t.next} <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />
                            </button>
                        ) : (
                            <button onClick={handleRegister} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-black text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}40` }}>
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
