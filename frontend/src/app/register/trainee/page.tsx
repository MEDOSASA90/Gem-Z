'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight, Loader2, UploadCloud } from 'lucide-react';
import { GemZApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Create Trainee Account', subtitle: 'Start your fitness journey today',
        step1: 'Personal Info', step2: 'Goals & Level', step3: 'Identity & Medical',
        name: 'Full Name', email: 'Email', phone: 'Phone Number', password: 'Password', confirm: 'Confirm Password',
        countryCode: 'Code',
        gender: 'Gender', male: 'Male', female: 'Female', dob: 'Date of Birth',
        level: 'Fitness Level', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
        goals: 'My Goals', weightLoss: 'Weight Loss', muscle: 'Muscle Gain', endurance: 'Endurance', wellness: 'General Wellness',
        idFront: 'ID Card (Front)', idBack: 'ID Card (Back)', dropzone: 'Click or drag file here',
        referral: 'Invitation Code (Optional)',
        medical: 'Medical Conditions (Optional)', medicalPlaceholder: 'e.g. Diabetes, Knee injury...',
        next: 'Next', back2: 'Back', finish: 'Create Account',
        loginLink: 'Already have an account?', login: 'Sign In',
        agree: 'I agree to the Terms & Privacy Policy, and understand that my ID uploads will exclusively be securely analyzed by AI to extract identity data according to platform policies.',
        errRequired: 'Please fill all required fields before proceeding.',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'إنشاء حساب متدرب', subtitle: 'ابدأ رحلتك في اللياقة البدنية اليوم',
        step1: 'البيانات الشخصية', step2: 'الأهداف والمستوى', step3: 'الهوية والطبي',
        name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        countryCode: 'الكود',
        gender: 'الجنس', male: 'ذكر', female: 'أنثى', dob: 'تاريخ الميلاد',
        level: 'مستوى اللياقة', beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم',
        goals: 'أهدافي', weightLoss: 'إنقاص الوزن', muscle: 'بناء العضلات', endurance: 'تحسين التحمل', wellness: 'صحة عامة',
        idFront: 'صورة البطاقة (الوجه)', idBack: 'صورة البطاقة (الظهر)', dropzone: 'انقر أو اسحب الملف هنا',
        referral: 'كود الدعوة (اختياري)',
        medical: 'الحالات الطبية (اختياري)', medicalPlaceholder: 'مثال: سكري، إصابة في الركبة...',
        next: 'التالي', back2: 'السابق', finish: 'إنشاء الحساب',
        loginLink: 'لديك حساب؟', login: 'تسجيل الدخول',
        agree: 'أوافق على الشروط وسياسة الخصوصية، وأتفهم أنه سيتم تحليل صور الهوية بشكل آمن بواسطة الذكاء الاصطناعي لاستخراج البيانات وتخزينها حسب سياسات المنصة.',
        errRequired: 'يرجى ملء جميع الحقول المطلوبة قبل الاستمرار.',
    }
};

const ACCENT = '#00FFA3';

export default function TraineeRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);

    // Auth & Identity State
    const [formData, setFormData] = useState({
        fullName: '', email: '', countryCode: '+20', phone: '', password: '', confirm: '', dob: '', referralCode: ''
    });
    const [gender, setGender] = useState<'male'|'female'|''>('');
    const [fitnessLevel, setFitnessLevel] = useState('');
    const [goals, setGoals] = useState<string[]>([]);
    
    // Base64 Images
    const [idFrontBase64, setIdFrontBase64] = useState('');
    const [idBackBase64, setIdBackBase64] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (side === 'front') setIdFrontBase64(reader.result as string);
            else setIdBackBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const validateStep = (currentStep: number) => {
        setError('');
        if (currentStep === 0) {
            if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirm || !gender || !formData.dob) {
                setError(t.errRequired);
                return false;
            }
            if (formData.password !== formData.confirm) {
                setError(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
                return false;
            }
        }
        if (currentStep === 1) {
            if (!fitnessLevel) {
                setError(t.errRequired);
                return false;
            }
        }
        if (currentStep === 2) {
            if (!idFrontBase64 || !idBackBase64) {
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
                countryCode: formData.countryCode,
                role: 'trainee',
                gender,
                dob: formData.dob,
                referralCode: formData.referralCode,
                fitnessLevel,
                idFrontBase64,
                idBackBase64
            };

            const res: any = await GemZApi.Auth.register(payload);
            
            // Persist Session
            localStorage.setItem('gemz_access_token', res.accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(res.user));
            
            router.push('/trainee');
            
        } catch (err: any) {
            setError(err.message || (isArabic ? 'حدث خطأ أثناء التسجيل' : 'Registration failed'));
        } finally {
            setLoading(false);
        }
    };

    const steps = [t.step1, t.step2, t.step3];
    const goalList = [t.weightLoss, t.muscle, t.endurance, t.wellness];
    const levelList = [{k: 'beginner', v: t.beginner}, {k: 'intermediate', v: t.intermediate}, {k: 'advanced', v: t.advanced}];
    const genderList = [{k: 'male', v: t.male}, {k: 'female', v: t.female}];

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
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}
                    
                    {step === 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.name}</label>
                                <input name="fullName" value={formData.fullName} onChange={handleChange} type="text" placeholder={isArabic ? 'محمد أحمد' : 'John Doe'} className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.email}</label>
                                <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                            </div>
                            
                            {/* Phone with Country Code */}
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.phone}</label>
                                <div className="flex gap-2 w-full">
                                    <select name="countryCode" value={formData.countryCode} onChange={handleChange} className="px-3 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" dir="ltr">
                                        <option value="+20">+20</option>
                                        <option value="+966">+966</option>
                                        <option value="+971">+971</option>
                                        <option value="+1">+1</option>
                                    </select>
                                    <input name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder={isArabic ? '100 000 0000' : '555 555 5555'} className="flex-1 px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" dir="ltr" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.password}</label>
                                    <input name="password" value={formData.password} onChange={handleChange} type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.confirm}</label>
                                    <input name="confirm" value={formData.confirm} onChange={handleChange} type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{t.gender}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {genderList.map((g) => {
                                        const active = gender === g.k;
                                        return (
                                        <button key={g.k} onClick={() => setGender(g.k as any)} 
                                            className="py-3 rounded-xl text-sm font-medium transition-all" 
                                            style={{ background: active ? `${ACCENT}15` : 'var(--bg-input)', border: `1px solid ${active ? ACCENT : 'var(--border-medium)'}`, color: active ? ACCENT : 'var(--text-primary)' }}>
                                            {g.v}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.dob}</label>
                                <input name="dob" value={formData.dob} onChange={handleChange} type="date" className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                            </div>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium block mb-3" style={{ color: 'var(--text-secondary)' }}>{t.level}</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {levelList.map((l) => {
                                        const active = fitnessLevel === l.k;
                                        return (
                                        <button key={l.k} onClick={() => setFitnessLevel(l.k)} className="py-3 rounded-xl text-sm font-medium transition-all" style={{ background: active ? `${ACCENT}15` : 'var(--bg-input)', border: `1px solid ${active ? ACCENT : 'var(--border-medium)'}`, color: active ? ACCENT : 'var(--text-primary)' }}>{l.v}</button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-3" style={{ color: 'var(--text-secondary)' }}>{t.goals}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {goalList.map((g, i) => {
                                        const active = goals.includes(g);
                                        return (
                                            <button key={i} onClick={() => setGoals(prev => active ? prev.filter(x => x !== g) : [...prev, g])}
                                                className="py-3 px-4 rounded-xl text-sm font-medium transition-all text-start"
                                                style={{ background: active ? `${ACCENT}15` : 'var(--bg-input)', border: `1px solid ${active ? `${ACCENT}50` : 'var(--border-medium)'}`, color: active ? ACCENT : 'var(--text-primary)' }}>
                                                {active ? '✓ ' : ''}{g}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.referral}</label>
                                <input name="referralCode" value={formData.referralCode} onChange={handleChange} type="text" placeholder="GEMZ-XXX" className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                                <p className="text-xs mt-2" style={{color: 'var(--text-muted)'}}>{isArabic ? 'اربح كوينز مجانية لك ولصديقك!' : 'Earn free coins for you and your friend!'}</p>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                            {/* ID Uploads */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{t.idFront}</label>
                                    <label className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative h-32 overflow-hidden" style={{ borderColor: idFrontBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                        {idFrontBase64 ? <img src={idFrontBase64} className="absolute inset-0 w-full h-full object-cover opacity-60" /> : <UploadCloud size={24} className="mb-2 text-gray-400" />}
                                        <span className="text-xs relative z-10 font-bold" style={{ color: idFrontBase64 ? '#fff' : 'var(--text-muted)' }}>{idFrontBase64 ? (isArabic ? 'تم الرفع' : 'Uploaded') : t.dropzone}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                                    </label>
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{t.idBack}</label>
                                    <label className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative h-32 overflow-hidden" style={{ borderColor: idBackBase64 ? ACCENT : 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                        {idBackBase64 ? <img src={idBackBase64} className="absolute inset-0 w-full h-full object-cover opacity-60" /> : <UploadCloud size={24} className="mb-2 text-gray-400" />}
                                        <span className="text-xs relative z-10 font-bold" style={{ color: idBackBase64 ? '#fff' : 'var(--text-muted)' }}>{idBackBase64 ? (isArabic ? 'تم الرفع' : 'Uploaded') : t.dropzone}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.medical}</label>
                                <textarea className="w-full px-4 py-3 rounded-xl text-sm input-base resize-none h-24" placeholder={t.medicalPlaceholder} />
                            </div>
                            
                            <label className="flex items-center gap-3 cursor-pointer pt-3">
                                <input type="checkbox" className="w-4 h-4 accent-[#00FFA3]" />
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.agree}</span>
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
                            <button onClick={nextStep} className="flex-1 py-3 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8FF)`, boxShadow: `0 0 20px ${ACCENT}40` }}>
                                {t.next} <ChevronRight size={16} className={isArabic ? 'rotate-180' : ''} />
                            </button>
                        ) : (
                            <button onClick={handleRegister} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-black text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8FF)`, boxShadow: `0 0 20px ${ACCENT}40` }}>
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
