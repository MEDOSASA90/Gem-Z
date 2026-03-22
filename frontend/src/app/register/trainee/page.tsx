'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { CheckCircle, ChevronRight, Loader2 } from 'lucide-react';
import { GemZApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

const T = {
    en: {
        back: '← Back to role selection',
        title: 'Create Trainee Account', subtitle: 'Start your fitness journey today',
        step1: 'Personal Info', step2: 'Goals & Level', step3: 'Medical',
        name: 'Full Name', email: 'Email', phone: 'Phone Number', password: 'Password', confirm: 'Confirm Password',
        gender: 'Gender', male: 'Male', female: 'Female', dob: 'Date of Birth',
        level: 'Fitness Level', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
        goals: 'My Goals', weightLoss: 'Weight Loss', muscle: 'Muscle Gain', endurance: 'Endurance', wellness: 'General Wellness',
        medical: 'Medical Conditions (Optional)', medicalPlaceholder: 'e.g. Diabetes, Knee injury...',
        next: 'Next', back2: 'Back', finish: 'Create Account',
        loginLink: 'Already have an account?', login: 'Sign In',
        agree: 'I agree to the Terms & Privacy Policy',
    },
    ar: {
        back: '→ العودة لاختيار الدور',
        title: 'إنشاء حساب متدرب', subtitle: 'ابدأ رحلتك في اللياقة البدنية اليوم',
        step1: 'البيانات الشخصية', step2: 'الأهداف والمستوى', step3: 'المعلومات الطبية',
        name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
        gender: 'الجنس', male: 'ذكر', female: 'أنثى', dob: 'تاريخ الميلاد',
        level: 'مستوى اللياقة', beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم',
        goals: 'أهدافي', weightLoss: 'إنقاص الوزن', muscle: 'بناء العضلات', endurance: 'تحسين التحمل', wellness: 'صحة عامة',
        medical: 'الحالات الطبية (اختياري)', medicalPlaceholder: 'مثال: سكري، إصابة في الركبة...',
        next: 'التالي', back2: 'السابق', finish: 'إنشاء الحساب',
        loginLink: 'لديك حساب؟', login: 'تسجيل الدخول',
        agree: 'أوافق على الشروط وسياسة الخصوصية',
    }
};

const ACCENT = '#00FFA3';

export default function TraineeRegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const t = isArabic ? T.ar : T.en;
    const [step, setStep] = useState(0);
    const [goals, setGoals] = useState<string[]>([]);
    
    // Auth State
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async () => {
        if (formData.password !== formData.confirm) {
            setError(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const res = await GemZApi.Auth.register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                phone: formData.phone,
                role: 'trainee'
            });
            
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
                        <div className="space-y-4">
                            {[{ name: 'fullName', label: t.name, type: 'text', ph: isArabic ? 'محمد أحمد' : 'John Doe' },
                            { name: 'email', label: t.email, type: 'email', ph: 'you@example.com' },
                            { name: 'phone', label: t.phone, type: 'tel', ph: isArabic ? '+20 1XX XXX XXXX' : '+1 XXX XXX XXXX' },
                            { name: 'password', label: t.password, type: 'password', ph: '••••••••' },
                            { name: 'confirm', label: t.confirm, type: 'password', ph: '••••••••' }].map((f, i) => (
                                <div key={i}>
                                    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                                    <input name={f.name} value={(formData as any)[f.name]} onChange={handleChange} type={f.type} placeholder={f.ph} className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                                </div>
                            ))}
                            <div>
                                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{t.gender}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[t.male, t.female].map((g, i) => (
                                        <button key={i} className="py-3 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>{g}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.dob}</label>
                                <input type="date" className="w-full px-4 py-3 rounded-xl text-sm input-base bg-[var(--bg-input)] border border-[var(--border-subtle)]" />
                            </div>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium block mb-3" style={{ color: 'var(--text-secondary)' }}>{t.level}</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[t.beginner, t.intermediate, t.advanced].map((l, i) => (
                                        <button key={i} className="py-3 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>{l}</button>
                                    ))}
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
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.medical}</label>
                                <textarea className="w-full px-4 py-3 rounded-xl text-sm input-base resize-none h-32" placeholder={t.medicalPlaceholder} />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic ? 'رفع التقرير الطبي (اختياري)' : 'Upload Medical Report (Optional)'}
                                </label>
                                <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors" style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-input)' }}>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'اسحب ملفك هنا أو انقر للاختيار' : 'Drag file here or click to upload'}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PDF, JPG, PNG — Max 5MB</p>
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer mt-2">
                                <input type="checkbox" className="w-4 h-4 accent-[#00FFA3]" />
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.agree}</span>
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
                            <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8FF)`, boxShadow: `0 0 20px ${ACCENT}40` }}>
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
