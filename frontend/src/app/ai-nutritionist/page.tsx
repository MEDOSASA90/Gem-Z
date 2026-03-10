'use client';
import React, { useState } from 'react';
import {
    Upload, Brain, CheckCircle, AlertCircle, Zap, Apple, ChevronRight,
    Loader2, Globe, ArrowLeft, RotateCcw, Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const SAMPLE_DIET_PLAN = {
    summary: { calories: 2240, protein: 178, carbs: 224, fat: 62 },
    findings: [
        { type: 'warning', label: 'Vitamin D', labelAr: 'فيتامين د', value: '18 ng/mL', note: 'Deficient — below optimal 30 ng/mL', noteAr: 'نقص — أقل من المستوى المثالي 30' },
        { type: 'warning', label: 'Iron', labelAr: 'حديد', value: '60 µg/dL', note: 'Low — risk of anemia', noteAr: 'منخفض — خطر فقر الدم' },
        { type: 'ok', label: 'Vitamin B12', labelAr: 'B12', value: '420 pg/mL', note: 'Normal range', noteAr: 'مستوى طبيعي' },
        { type: 'ok', label: 'Hemoglobin', labelAr: 'هيموغلوبين', value: '13.8 g/dL', note: 'Acceptable', noteAr: 'مقبول' },
    ],
    days: [
        {
            day: 1, dayAr: 'اليوم ١',
            meals: [
                { type: 'Breakfast', typeAr: 'إفطار', name: 'Oats + 3 Eggs + Orange Juice', nameAr: 'شوفان + ٣ بيض + عصير برتقال', kcal: 580, p: 42, c: 68, f: 14, time: '07:00', color: '#FFCC00', emoji: '🌅', vit: 'Vit D boost' },
                { type: 'Snack', typeAr: 'سناك', name: 'Tuna + Spinach Salad', nameAr: 'تونة + سلطة سبانخ', kcal: 280, p: 32, c: 10, f: 8, time: '10:30', color: '#00B8FF', emoji: '🐟', vit: 'Iron rich' },
                { type: 'Lunch', typeAr: 'غداء', name: 'Grilled Chicken + Lentil Soup + Brown Rice', nameAr: 'دجاج مشوي + عدس + أرز بني', kcal: 720, p: 58, c: 80, f: 16, time: '13:30', color: '#00FFA3', emoji: '🍗', vit: 'Iron rich' },
                { type: 'Dinner', typeAr: 'عشاء', name: 'Salmon + Broccoli + Sweet Potato', nameAr: 'سمك سلمون + بروكلي + بطاطا حلوة', kcal: 660, p: 46, c: 66, f: 24, time: '19:00', color: '#A78BFA', emoji: '🐟', vit: 'Vit D + Iron' },
            ]
        },
        {
            day: 2, dayAr: 'اليوم ٢',
            meals: [
                { type: 'Breakfast', typeAr: 'إفطار', name: 'Greek Yogurt + Berries + Flaxseed', nameAr: 'يوغرت يوناني + توت + بذر كتان', kcal: 420, p: 30, c: 45, f: 14, time: '07:00', color: '#FFCC00', emoji: '🫐', vit: 'Calcium' },
                { type: 'Snack', typeAr: 'سناك', name: '2 Hard Boiled Eggs + Handful Almonds', nameAr: 'بيضتان مسلوقتان + لوز', kcal: 320, p: 24, c: 8, f: 22, time: '10:30', color: '#00B8FF', emoji: '🥚', vit: 'Vit D' },
                { type: 'Lunch', typeAr: 'غداء', name: 'Beef Steak + Mixed Greens + Quinoa', nameAr: 'استيك لحم + خضروات + كينوا', kcal: 740, p: 60, c: 58, f: 22, time: '13:30', color: '#00FFA3', emoji: '🥩', vit: 'Iron max' },
                { type: 'Dinner', typeAr: 'عشاء', name: 'Tuna Pasta + Side Salad', nameAr: 'باستا تونة + سلطة', kcal: 560, p: 42, c: 58, f: 14, time: '19:00', color: '#A78BFA', emoji: '🍝', vit: 'Iron' },
            ]
        },
    ]
};

export default function AINutritionistPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [stage, setStage] = useState<'upload' | 'analyzing' | 'result'>('upload');
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const [activeDay, setActiveDay] = useState(0);
    const [selectedMeal, setSelectedMeal] = useState<typeof SAMPLE_DIET_PLAN.days[0]['meals'][0] | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setStage('analyzing');
        setTimeout(() => setStage('result'), 3000);
    };

    const plan = SAMPLE_DIET_PLAN;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-20" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2">
                            <Brain size={18} className="text-[#A78BFA]" />
                            {isArabic ? 'خبير التغذية AI' : 'AI Nutritionist'}
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'ارفع تحاليلك واحصل على خطتك' : 'Upload labs & get your custom plan'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {stage === 'result' && <button onClick={() => { setStage('upload'); setFileName(''); }} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl font-bold" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><RotateCcw size={14} />{isArabic ? 'رفع جديد' : 'New Upload'}</button>}
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-6">

                {/* STAGE: UPLOAD */}
                {stage === 'upload' && (
                    <div className="flex flex-col items-center py-10">
                        <div className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)' }}>
                            <Brain size={40} className="text-[#A78BFA]" />
                        </div>
                        <h2 className="text-3xl font-bold font-heading text-center mb-3">{isArabic ? 'اعرف جسمك من الداخل' : 'Know Your Body from Within'}</h2>
                        <p className="text-center max-w-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
                            {isArabic ? 'ارفع صورة تحاليلك الطبية وسيقوم الذكاء الاصطناعي بتحليلها وتصميم خطة غذائية مخصصة بالكامل لجسمك.' : 'Upload your medical blood test results. Our AI analyzes deficiencies and builds a 100% customized diet plan.'}
                        </p>

                        {/* How it works */}
                        <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-2xl">
                            {[
                                { step: '1', icon: '📄', titleEn: 'Upload Labs', titleAr: 'ارفع التحاليل', descEn: 'PDF or image of your blood work', descAr: 'PDF أو صورة التحاليل' },
                                { step: '2', icon: '🤖', titleEn: 'AI Analyzes', titleAr: 'AI يحلل', descEn: 'OCR reads and identifies markers', descAr: 'OCR يقرأ المؤشرات' },
                                { step: '3', icon: '🥗', titleEn: 'Get Your Plan', titleAr: 'احصل على خطتك', descEn: 'Custom 7-day meal plan', descAr: 'خطة وجبات مخصصة ٧ أيام' },
                            ].map(s => (
                                <div key={s.step} className="text-center p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                    <div className="text-3xl mb-2">{s.icon}</div>
                                    <div className="text-xs font-mono text-[#A78BFA] mb-1">STEP {s.step}</div>
                                    <p className="font-bold text-sm mb-1">{isArabic ? s.titleAr : s.titleEn}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? s.descAr : s.descEn}</p>
                                </div>
                            ))}
                        </div>

                        {/* Drop Zone */}
                        <label className={`w-full max-w-xl flex flex-col items-center gap-4 p-12 rounded-3xl cursor-pointer transition-all ${dragOver ? 'scale-105' : ''}`}
                            style={{ border: `2px dashed ${dragOver ? '#A78BFA' : 'var(--border-medium)'}`, background: dragOver ? 'rgba(167,139,250,0.05)' : 'var(--bg-card)' }}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)' }}>
                                <Upload size={28} className="text-[#A78BFA]" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold mb-1">{isArabic ? 'اسحب وأفلت ملف التحاليل' : 'Drag & drop your lab results'}</p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'أو اضغط للاختيار • PDF, JPG, PNG' : 'or click to browse • PDF, JPG, PNG'}</p>
                            </div>
                            <button className="px-8 py-3 rounded-xl font-bold text-white" style={{ background: '#A78BFA' }}>
                                {isArabic ? 'اختر ملفاً' : 'Choose File'}
                            </button>
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />
                        </label>

                        <p className="mt-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                            🔒 {isArabic ? 'بياناتك مشفرة بالكامل ولا تُشارك مع أي طرف ثالث' : 'Your data is fully encrypted and never shared with third parties'}
                        </p>
                    </div>
                )}

                {/* STAGE: ANALYZING */}
                {stage === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center py-20 gap-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full" style={{ border: '2px solid var(--border-subtle)' }}>
                                <div className="absolute inset-2 rounded-full animate-pulse" style={{ background: 'rgba(167,139,250,0.1)' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Brain size={48} className="text-[#A78BFA]" />
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#00FFA3] flex items-center justify-center animate-bounce">
                                <Sparkles size={16} className="text-black" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold font-heading mb-2">{isArabic ? 'الذكاء الاصطناعي يحلل تحاليلك...' : 'AI is analyzing your results...'}</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fileName}</p>
                        </div>
                        <div className="w-full max-w-sm space-y-3">
                            {[
                                { label: isArabic ? 'قراءة الملف OCR' : 'Reading file with OCR', done: true },
                                { label: isArabic ? 'تحليل المؤشرات الحيوية' : 'Analyzing biomarkers', done: true },
                                { label: isArabic ? 'حساب الاحتياجات الغذائية' : 'Calculating nutritional needs', done: false },
                                { label: isArabic ? 'توليد خطة الوجبات' : 'Generating meal plan', done: false },
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                    {step.done ? <CheckCircle size={18} className="text-[#00FFA3] shrink-0" /> : <Loader2 size={18} className="text-[#A78BFA] animate-spin shrink-0" />}
                                    <span className="text-sm">{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STAGE: RESULT */}
                {stage === 'result' && (
                    <div className="space-y-6">
                        {/* Success Banner */}
                        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'rgba(0,255,163,0.05)', border: '1px solid rgba(0,255,163,0.3)' }}>
                            <div className="w-12 h-12 rounded-2xl bg-[#00FFA3] flex items-center justify-center text-black shrink-0">✓</div>
                            <div>
                                <h3 className="font-bold text-[#00FFA3]">{isArabic ? '✅ التحليل مكتمل!' : '✅ Analysis Complete!'}</h3>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تم توليد خطتك الغذائية المخصصة بنجاح بناءً على تحاليلك.' : 'Your custom meal plan has been generated based on your lab results.'}</p>
                            </div>
                        </div>

                        {/* Macro Goals */}
                        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Zap size={16} className="text-[#FFCC00]" />{isArabic ? 'أهدافك الغذائية اليومية' : 'Your Daily Macro Targets'}</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: isArabic ? 'سعرات' : 'Calories', value: plan.summary.calories, unit: 'kcal', color: '#FF6B35' },
                                    { label: isArabic ? 'بروتين' : 'Protein', value: plan.summary.protein, unit: 'g', color: '#00FFA3' },
                                    { label: isArabic ? 'كارب' : 'Carbs', value: plan.summary.carbs, unit: 'g', color: '#00B8FF' },
                                    { label: isArabic ? 'دهون' : 'Fat', value: plan.summary.fat, unit: 'g', color: '#A78BFA' },
                                ].map((m, i) => (
                                    <div key={i} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                        <p className="text-2xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.unit}</p>
                                        <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Lab Findings */}
                        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <h3 className="font-bold mb-4">{isArabic ? 'ما كشفه التحليل' : 'Lab Findings'}</h3>
                            <div className="space-y-3">
                                {plan.findings.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                        {f.type === 'warning' ? <AlertCircle size={18} className="text-[#FFCC00] shrink-0" /> : <CheckCircle size={18} className="text-[#34C759] shrink-0" />}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">{isArabic ? f.labelAr : f.label}</span>
                                                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: f.type === 'warning' ? 'rgba(255,204,0,0.1)' : 'rgba(52,199,89,0.1)', color: f.type === 'warning' ? '#FFCC00' : '#34C759' }}>{f.value}</span>
                                            </div>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? f.noteAr : f.note}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Day Tabs */}
                        <div>
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                                {plan.days.map((d, i) => (
                                    <button key={i} onClick={() => setActiveDay(i)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-all"
                                        style={{ background: activeDay === i ? '#00FFA3' : 'var(--bg-card)', color: activeDay === i ? '#000' : 'var(--text-secondary)', border: `1px solid ${activeDay === i ? '#00FFA3' : 'var(--border-subtle)'}` }}>
                                        {isArabic ? d.dayAr : `Day ${d.day}`}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                {plan.days[activeDay].meals.map((meal, i) => (
                                    <div key={i} className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01]"
                                        style={{ background: 'var(--bg-card)', border: `1px solid ${meal.color}30` }}
                                        onClick={() => setSelectedMeal(selectedMeal?.type === meal.type ? null : meal)}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{meal.emoji}</span>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-sm">{isArabic ? meal.typeAr : meal.type}</h4>
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `rgba(167,139,250,0.1)`, color: '#A78BFA' }}>{meal.vit}</span>
                                                    </div>
                                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? meal.nameAr : meal.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold" style={{ color: meal.color }}>{meal.kcal} kcal</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{meal.time}</p>
                                            </div>
                                        </div>
                                        {selectedMeal?.type === meal.type && (
                                            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                                                {[{ l: 'Protein', v: `${meal.p}g`, c: '#00FFA3' }, { l: 'Carbs', v: `${meal.c}g`, c: '#00B8FF' }, { l: 'Fat', v: `${meal.f}g`, c: '#A78BFA' }].map((m, j) => (
                                                    <div key={j} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                                        <p className="font-bold" style={{ color: m.c }}>{m.v}</p>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.l}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
