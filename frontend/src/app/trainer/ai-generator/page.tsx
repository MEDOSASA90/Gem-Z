'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { GemZApi } from '../../../lib/api';
import { BrainCircuit, Loader2, Save, FileText, Dumbbell, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AIGeneratorPage() {
    const { t } = useLanguage();
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const router = useRouter();

    const [form, setForm] = useState({
        traineeName: '',
        age: '',
        weight: '',
        height: '',
        goal: 'Weight Loss',
        fitnessLevel: 'Beginner',
        allergies: '',
        limitations: ''
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Validate required
            if (!form.traineeName || !form.age || !form.weight) {
                throw new Error(isArabic ? 'يرجى إدخال اسم المتدرب وعمره ووزنه كحد أدنى.' : 'Please enter Trainee Name, Age, and Weight at minimum.');
            }

            const res = await GemZApi.AI.generatePlan({
                ...form,
                age: Number(form.age),
                weight: Number(form.weight),
                height: form.height ? Number(form.height) : undefined
            });

            if (res.success) {
                setResult(res.planData);
            } else {
                throw new Error(res.message || 'Generation failed.');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            
            {/* Header */}
            <header className="relative py-12 px-6 overflow-hidden flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-purple)]/5 to-transparent z-0 pointer-events-none" />
                <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-[var(--color-purple)]/20 shadow-[0_0_40px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                        <BrainCircuit size={32} className="text-[var(--color-purple)]" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-purple)]">
                        {isArabic ? 'مُولّد الخطط الذكي' : 'AI Plan Generator'}
                    </h1>
                    <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic 
                            ? 'أدخل بيانات المتدرب وسيقوم الذكاء الاصطناعي ببناء جدول غذائي وتدريبي احترافي في ثوانٍ.' 
                            : 'Enter your trainee stats and let AI build a professional, highly-customized diet and workout routine in seconds.'}
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Inputs Section */}
                <div className="lg:col-span-5">
                    <div className="p-8 rounded-3xl shadow-xl sticky top-6 glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Activity className="text-[var(--color-secondary)]" size={20} />
                            {isArabic ? 'بيانات المتدرب' : 'Trainee Profile'}
                        </h2>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-500/10 text-red-500 border border-red-500/20">
                                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleGenerate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'اسم المتدرب' : 'Trainee Name'} *</label>
                                <input name="traineeName" value={form.traineeName} onChange={handleChange} required className="w-full p-4 rounded-xl outline-none transition-colors border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'العمر' : 'Age'} *</label>
                                    <input type="number" name="age" value={form.age} onChange={handleChange} required className="w-full p-4 rounded-xl outline-none focus:border-[var(--color-secondary)] border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'الوزن (kg)' : 'Weight (kg)'} *</label>
                                    <input type="number" name="weight" value={form.weight} onChange={handleChange} required className="w-full p-4 rounded-xl outline-none focus:border-[var(--color-secondary)] border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'الطول (cm)' : 'Height (cm)'}</label>
                                    <input type="number" name="height" value={form.height} onChange={handleChange} className="w-full p-4 rounded-xl outline-none focus:border-[var(--color-secondary)] border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'الهدف' : 'Main Goal'}</label>
                                    <select name="goal" value={form.goal} onChange={handleChange} className="w-full p-4 rounded-xl outline-none focus:border-[var(--color-secondary)] border appearance-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }}>
                                        <option value="Weight Loss">{isArabic ? 'خسارة الوزن' : 'Weight Loss'}</option>
                                        <option value="Muscle Gain">{isArabic ? 'بناء العضلات' : 'Muscle Gain'}</option>
                                        <option value="Recomposition">{isArabic ? 'إعادة تشكيل الجسم' : 'Recomposition'}</option>
                                        <option value="Endurance">{isArabic ? 'رفع اللياقة' : 'Endurance'}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'مستوى اللياقة' : 'Fitness Level'}</label>
                                <select name="fitnessLevel" value={form.fitnessLevel} onChange={handleChange} className="w-full p-4 rounded-xl outline-none focus:border-[var(--color-secondary)] border appearance-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }}>
                                    <option value="Beginner">{isArabic ? 'مبتدئ' : 'Beginner'}</option>
                                    <option value="Intermediate">{isArabic ? 'متوسط' : 'Intermediate'}</option>
                                    <option value="Advanced">{isArabic ? 'متقدم' : 'Advanced'}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'الإصابات / القيود' : 'Medical / Limitations'}</label>
                                <input name="limitations" value={form.limitations} onChange={handleChange} placeholder={isArabic ? 'مثال: إصابة في الركبة' : 'e.g. Bad knee'} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'الحساسية من الأطعمة' : 'Food Allergies'}</label>
                                <input name="allergies" value={form.allergies} onChange={handleChange} placeholder={isArabic ? 'مثال: حساسية ألبان' : 'e.g. Lactose intolerant'} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 px-6 rounded-2xl font-black text-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                                style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
                            >
                                {loading ? <Loader2 size={24} className="animate-spin" /> : <BrainCircuit size={24} />}
                                <span>{isArabic ? 'توليد الخطة بالذكاء الاصطناعي' : 'Generate AI Plan'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-7">
                    {!result && !loading ? (
                        <div className="h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-10" style={{ borderColor: 'var(--border-medium)' }}>
                            <div className="w-24 h-24 rounded-full bg-[var(--color-purple)]/10 flex items-center justify-center mb-6">
                                <BrainCircuit size={48} className="text-[var(--color-purple)] opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-500">{isArabic ? 'في انتظار البيانات' : 'Awaiting Profile Data'}</h3>
                            <p className="text-gray-500 max-w-sm">
                                {isArabic 
                                    ? 'قم بتعبئة النموذج وسأقوم بتجهيز جدول غذائي وتدريبي متكامل لـ 7 أيام بناءً على أحدث الدراسات الرياضية.' 
                                    : 'Fill out the form and I will construct a fully integrated 7-day diet and workout plan based on the latest sports science.'}
                            </p>
                        </div>
                    ) : loading ? (
                        <div className="h-full min-h-[400px] border rounded-3xl flex flex-col items-center justify-center text-center p-10 glass-panel" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                                <div className="absolute inset-0 border-4 border-[var(--color-purple)]/20 rounded-full animate-ping" />
                                <div className="absolute inset-4 border-4 border-[var(--color-secondary)]/40 rounded-full animate-pulse" />
                                <Loader2 size={48} className="text-[var(--color-primary)] animate-spin" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
                                {isArabic ? 'جاري التحليل المعقد...' : 'Running Complex Analysis...'}
                            </h3>
                            <p className="text-gray-400">
                                {isArabic ? 'أقوم بحساب الماكروز واختيار التمارين المناسبة وتجنب الإصابات.' : 'Calculating strict macros, selecting optimal exercises, and parsing limitations.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            
                            {/* Success Banner */}
                            <div className="p-4 rounded-2xl flex items-center justify-between shadow-lg" style={{ background: 'linear-gradient(45deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-secondary-rgb), 0.1))', border: '1px solid rgba(var(--color-primary-rgb), 0.25)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--color-primary)]">{isArabic ? 'تم بناء الخطة بنجاح!' : 'Plan Generated Successfully!'}</h3>
                                        <p className="text-xs text-gray-400">{isArabic ? 'تم حفظها تلقائياً في قاعدة البيانات وتوثيقها باسم المتدرب.' : 'Automatically saved to the database under the trainee name.'}</p>
                                    </div>
                                </div>
                                <button className="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--color-secondary)] text-black hover:bg-[var(--color-secondary)]/90 transition-colors flex items-center gap-2">
                                    <Save size={16} /> {isArabic ? 'مراجعة' : 'Review'}
                                </button>
                            </div>

                            {/* Diet Plan Card */}
                            <div className="p-6 rounded-3xl shadow-xl glass-panel relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl -mr-10 -mt-10" />
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 relative z-10">
                                    <FileText className="text-[var(--color-primary)]" size={28} /> {isArabic ? 'الخطة الغذائية (الماكروز)' : 'Diet Plan (Macros)'}
                                </h3>
                                
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <div className="p-4 rounded-2xl text-center bg-black/40 border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1 font-bold">{isArabic ? 'السعرات' : 'Calories'}</p>
                                        <p className="text-xl font-black text-white">{result.diet_plan?.daily_calories || 0}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl text-center bg-black/40 border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1 font-bold">{isArabic ? 'البروتين' : 'Protein'}</p>
                                        <p className="text-xl font-black text-[var(--color-primary)]">{result.diet_plan?.macros?.protein || 0}g</p>
                                    </div>
                                    <div className="p-4 rounded-2xl text-center bg-black/40 border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1 font-bold">{isArabic ? 'الكارب' : 'Carbs'}</p>
                                        <p className="text-xl font-black text-[var(--color-secondary)]">{result.diet_plan?.macros?.carbs || 0}g</p>
                                    </div>
                                    <div className="p-4 rounded-2xl text-center bg-black/40 border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1 font-bold">{isArabic ? 'الدهون' : 'Fats'}</p>
                                        <p className="text-xl font-black text-[var(--color-purple)]">{result.diet_plan?.macros?.fats || 0}g</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {result.diet_plan?.days?.slice(0, 3).map((day: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/5">
                                            <h4 className="font-bold mb-3 text-[var(--color-primary)]">{isArabic ? 'يوم' : 'Day'} {day.day}</h4>
                                            <div className="space-y-2">
                                                {day.meals?.map((meal: any, j: number) => (
                                                    <div key={j} className="flex justify-between items-center text-sm p-3 rounded-xl bg-black/30">
                                                        <div>
                                                            <span className="font-bold text-gray-300 mr-2">{meal.type}:</span>
                                                            <span className="text-gray-400">{meal.food}</span>
                                                        </div>
                                                        <span className="font-mono text-[var(--color-primary)] font-bold">{meal.calories} kcal</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-center p-2 text-sm text-gray-500 font-bold tracking-widest">+ {result.diet_plan?.days?.length - 3} {isArabic ? 'أيام أخرى' : 'More Days'}</div>
                                </div>
                            </div>

                            {/* Workout Plan Card */}
                            <div className="p-6 rounded-3xl shadow-xl glass-panel relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-purple)]/10 rounded-full blur-3xl -mr-10 -mt-10" />
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 relative z-10">
                                    <Dumbbell className="text-[var(--color-purple)]" size={28} /> {isArabic ? 'الجدول التدريبي' : 'Workout Routine'}
                                </h3>
                                
                                <p className="text-sm text-gray-400 mb-6 px-4 py-3 rounded-xl bg-black/40 border border-white/5">
                                    <span className="font-bold text-white mr-2">{isArabic ? 'التركيز:' : 'Focus:'}</span> 
                                    {result.workout_plan?.goal}
                                </p>

                                <div className="space-y-4">
                                    {result.workout_plan?.days?.slice(0, 3).map((day: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/5">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-bold text-[var(--color-purple)]">{isArabic ? 'يوم' : 'Day'} {day.day}</h4>
                                                <span className="text-xs px-2 py-1 rounded bg-black/50 text-gray-300">{day.focus}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {day.exercises?.map((ex: any, j: number) => (
                                                    <div key={j} className="flex justify-between items-center text-sm p-3 rounded-xl bg-black/30">
                                                        <span className="font-bold text-gray-300">{ex.name}</span>
                                                        <div className="flex gap-4">
                                                            <span className="text-gray-500">{isArabic ? 'مجموعات:' : 'Sets:'} <span className="text-white">{ex.sets}</span></span>
                                                            <span className="text-gray-500">{isArabic ? 'تكرار:' : 'Reps:'} <span className="text-white">{ex.reps}</span></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-center p-2 text-sm text-gray-500 font-bold tracking-widest">+ {result.workout_plan?.days?.length - 3} {isArabic ? 'أيام أخرى' : 'More Days'}</div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
