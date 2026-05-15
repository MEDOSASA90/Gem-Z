'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Camera,
    Upload,
    Scan,
    Loader2,
    ChevronDown,
    ChevronUp,
    Flame,
    Droplets,
    Wheat,
    Beef,
    Leaf,
    Pill,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Clock,
    Utensils,
    Apple,
    X,
    ImagePlus,
} from 'lucide-react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface NutritionBreakdown {
    foodName: string;
    confidence: number;
    portionSize: string;
    portionWeightGrams: number;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    vitamins: Array<{ name: string; amount: string; dailyPercent: number }>;
    minerals: Array<{ name: string; amount: string; dailyPercent: number }>;
    healthScore: number;
    tags: string[];
    alternatives: Array<{ name: string; calories: number; why: string }>;
}

interface NutritionScan {
    id: string;
    imageUrl: string;
    foodName: string;
    confidence: number;
    portionSize: string;
    portionWeightGrams: number;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    healthScore: number;
    fullBreakdown: NutritionBreakdown;
    createdAt: string;
}

interface DailyNutrition {
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
    scanCount: number;
    meals: Array<{ mealType: string; calories: number; foodName: string }>;
}

const MEAL_TYPES = [
    { value: 'breakfast', label: 'Breakfast', labelAr: 'الفطور', icon: 'wb_sunny' },
    { value: 'lunch', label: 'Lunch', labelAr: 'الغداء', icon: 'brightness_5' },
    { value: 'dinner', label: 'Dinner', labelAr: 'العشاء', icon: 'brightness_2' },
    { value: 'snack', label: 'Snack', labelAr: 'وجبة خفيفة', icon: 'cookie' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Component ────────────────────────────────────────────────────

export default function NutritionScanner() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [mealType, setMealType] = useState('breakfast');
    const [userNotes, setUserNotes] = useState('');
    const [scanResult, setScanResult] = useState<NutritionScan | null>(null);
    const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('macros');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    // ─── Fetch Daily Nutrition ──────────────────────────────────────

    const fetchDailyNutrition = useCallback(async () => {
        setIsLoadingDaily(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/nutrition/daily`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setDailyNutrition(data.data);
            }
        } catch {
            // silently fail
        } finally {
            setIsLoadingDaily(false);
        }
    }, []);

    useEffect(() => {
        fetchDailyNutrition();
    }, [fetchDailyNutrition]);

    // ─── File Handling ──────────────────────────────────────────────

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError(t('Please select an image file', 'يرجى اختيار ملف صورة'));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError(t('Image must be under 10MB', 'يجب أن تكون الصورة أقل من 10 ميجا'));
            return;
        }

        setImageFile(file);
        setError(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }, [t]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // ─── Upload & Scan ──────────────────────────────────────────────

    const handleScan = async () => {
        if (!imageFile && !imagePreview) {
            setError(t('Please select a food photo', 'يرجى اختيار صورة طعام'));
            return;
        }

        setIsScanning(true);
        setError(null);

        try {
            // Upload image first
            const token = localStorage.getItem('gemz_access_token');

            let imageUrl = imagePreview;

            // If it's a file, upload it first
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);

                const uploadRes = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrl = uploadData.url;
                }
            }

            if (!imageUrl) {
                throw new Error('Failed to upload image');
            }

            // Call nutrition scan API
            const response = await fetch(`${API_BASE}/nutrition/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    imageUrl,
                    mealType,
                    userNotes: userNotes.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setScanResult(data.scan);
                await fetchDailyNutrition();
            } else {
                setError(data.message || 'Scan failed');
            }
        } catch {
            setError(t('Failed to analyze food', 'فشل تحليل الطعام'));
        } finally {
            setIsScanning(false);
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setImageFile(null);
        setImagePreview(null);
        setUserNotes('');
        setError(null);
    };

    // ─── Score Colors ───────────────────────────────────────────────

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getHealthBg = (score: number) => {
        if (score >= 80) return 'bg-green-500/20 border-green-500/30';
        if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
        if (score >= 40) return 'bg-orange-500/20 border-orange-500/30';
        return 'bg-red-500/20 border-red-500/30';
    };

    // ─── Macro Ring Calculation ─────────────────────────────────────

    const getMacroPercentage = (grams: number, calories: number) => {
        if (calories === 0) return 0;
        return Math.min(100, Math.round((grams * 4 / calories) * 100));
    };

    const getFatPercentage = (grams: number, calories: number) => {
        if (calories === 0) return 0;
        return Math.min(100, Math.round((grams * 9 / calories) * 100));
    };

    // ─── Toggle Section ─────────────────────────────────────────────

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <Scan className="text-[var(--color-primary)]" size={28} />
                    {t('Nutrition Scanner', 'ماسح التغذية')}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                    {t('Take a photo of your food to get detailed nutrition analysis', 'التقط صورة لطعامك للحصول على تحليل تغذوي مفصل')}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">&times;</button>
                </div>
            )}

            {/* Upload Area */}
            {!scanResult && (
                <div className="space-y-4">
                    <div
                        ref={dropRef}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => !imagePreview && fileInputRef.current?.click()}
                        className={`relative aspect-[4/3] max-h-[320px] rounded-2xl border-2 border-dashed transition-all overflow-hidden cursor-pointer ${
                            imagePreview
                                ? 'border-[var(--color-primary)]/50'
                                : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            className="hidden"
                        />

                        {imagePreview ? (
                            <div className="relative w-full h-full">
                                <img src={imagePreview} alt="Food preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImagePreview(null);
                                        setImageFile(null);
                                    }}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <ImagePlus size={28} className="text-white/30" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white/50 text-sm font-semibold">
                                        {t('Tap or drop a food photo', 'انقر أو اسحب صورة طعام')}
                                    </p>
                                    <p className="text-white/30 text-xs mt-1">
                                        {t('JPG, PNG up to 10MB', 'JPG، PNG حتى 10 ميجا')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meal Type */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {MEAL_TYPES.map((meal) => (
                            <button
                                key={meal.value}
                                onClick={() => setMealType(meal.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    mealType === meal.value
                                        ? 'bg-[var(--color-primary)] text-black'
                                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {meal.icon}
                                </span>
                                {isArabic ? meal.labelAr : meal.label}
                            </button>
                        ))}
                    </div>

                    {/* Notes */}
                    <input
                        type="text"
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                        placeholder={t('Optional notes (e.g., homemade, restaurant)', 'ملاحظات اختيارية...')}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                    />

                    {/* Scan Button */}
                    <ApiButton
                        onClick={handleScan}
                        loading={isScanning}
                        icon={<Scan size={18} />}
                        variant="primary"
                        fullWidth
                    >
                        {isScanning ? t('Analyzing...', 'جاري التحليل...') : t('Analyze Food', 'حلل الطعام')}
                    </ApiButton>
                </div>
            )}

            {/* Scan Results */}
            {scanResult && (
                <div className="space-y-4">
                    {/* Food Name & Score */}
                    <div className={`p-5 rounded-2xl border ${getHealthBg(scanResult.healthScore)}`}>
                        <div className="flex items-center gap-4">
                            {/* Score Ring */}
                            <div className="relative w-20 h-20 shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none"
                                        className={
                                            scanResult.healthScore >= 80 ? 'stroke-green-400'
                                            : scanResult.healthScore >= 60 ? 'stroke-yellow-400'
                                            : scanResult.healthScore >= 40 ? 'stroke-orange-400'
                                            : 'stroke-red-400'
                                        }
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(scanResult.healthScore / 100) * 264} 264`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-lg font-bold ${getHealthColor(scanResult.healthScore)}`}>
                                        {scanResult.healthScore}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold text-white">{scanResult.foodName}</h3>
                                <div className="flex items-center gap-3 mt-1 text-white/50 text-sm">
                                    <span>{scanResult.portionSize}</span>
                                    <span>~{scanResult.portionWeightGrams}g</span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={12} />
                                        {Math.round(scanResult.confidence * 100)}% {t('confidence', 'ثقة')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    {scanResult.fullBreakdown.tags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-white/10 rounded-full text-white/40 text-xs">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-3xl font-bold text-white">{scanResult.calories}</p>
                                <p className="text-white/40 text-xs">{t('kcal', 'سعرة')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Macros */}
                    <ApiCard>
                        <button
                            onClick={() => toggleSection('macros')}
                            className="w-full flex items-center justify-between"
                        >
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Utensils size={18} className="text-[var(--color-primary)]" />
                                {t('Macronutrients', 'الماكروز')}
                            </h3>
                            {expandedSection === 'macros' ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                        </button>

                        {expandedSection === 'macros' && (
                            <div className="mt-4 space-y-4">
                                {/* Macro Bars */}
                                <div className="grid grid-cols-4 gap-3">
                                    <MacroRing
                                        label={t('Protein', 'بروتين')}
                                        value={`${scanResult.protein}g`}
                                        percentage={getMacroPercentage(scanResult.protein, scanResult.calories)}
                                        color="stroke-blue-400"
                                        bgColor="bg-blue-500/20"
                                    />
                                    <MacroRing
                                        label={t('Carbs', 'كارب')}
                                        value={`${scanResult.carbohydrates}g`}
                                        percentage={getMacroPercentage(scanResult.carbohydrates, scanResult.calories)}
                                        color="stroke-yellow-400"
                                        bgColor="bg-yellow-500/20"
                                    />
                                    <MacroRing
                                        label={t('Fat', 'دهون')}
                                        value={`${scanResult.fat}g`}
                                        percentage={getFatPercentage(scanResult.fat, scanResult.calories)}
                                        color="stroke-red-400"
                                        bgColor="bg-red-500/20"
                                    />
                                    <MacroRing
                                        label={t('Fiber', 'ألياف')}
                                        value={`${scanResult.fiber}g`}
                                        percentage={Math.min(100, Math.round((scanResult.fiber / 30) * 100))}
                                        color="stroke-green-400"
                                        bgColor="bg-green-500/20"
                                    />
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <MacroBar label={t('Protein', 'بروتين')} value={scanResult.protein} unit="g" max={50} color="bg-blue-400" icon={<Beef size={14} />} />
                                    <MacroBar label={t('Carbs', 'كارب')} value={scanResult.carbohydrates} unit="g" max={100} color="bg-yellow-400" icon={<Wheat size={14} />} />
                                    <MacroBar label={t('Fat', 'دهون')} value={scanResult.fat} unit="g" max={40} color="bg-red-400" icon={<Droplets size={14} />} />
                                    <MacroBar label={t('Fiber', 'ألياف')} value={scanResult.fiber} unit="g" max={30} color="bg-green-400" icon={<Leaf size={14} />} />
                                    <MacroBar label={t('Sugar', 'سكر')} value={scanResult.sugar} unit="g" max={50} color="bg-pink-400" icon={<Apple size={14} />} />
                                    <MacroBar label={t('Sodium', 'صوديوم')} value={scanResult.sodium} unit="mg" max={2300} color="bg-cyan-400" icon={<Pill size={14} />} />
                                    <MacroBar label={t('Cholesterol', 'كولسترول')} value={scanResult.cholesterol} unit="mg" max={300} color="bg-purple-400" icon={<AlertTriangle size={14} />} />
                                </div>
                            </div>
                        )}
                    </ApiCard>

                    {/* Vitamins & Minerals */}
                    {(scanResult.fullBreakdown.vitamins.length > 0 || scanResult.fullBreakdown.minerals.length > 0) && (
                        <ApiCard>
                            <button onClick={() => toggleSection('micros')} className="w-full flex items-center justify-between">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Pill size={18} className="text-[var(--color-primary)]" />
                                    {t('Vitamins & Minerals', 'الفيتامينات والمعادن')}
                                </h3>
                                {expandedSection === 'micros' ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                            </button>
                            {expandedSection === 'micros' && (
                                <div className="mt-4 space-y-3">
                                    {scanResult.fullBreakdown.vitamins.length > 0 && (
                                        <div>
                                            <h4 className="text-white/60 text-xs font-semibold uppercase mb-2">{t('Vitamins', 'فيتامينات')}</h4>
                                            <div className="space-y-2">
                                                {scanResult.fullBreakdown.vitamins.map((v, i) => (
                                                    <MicroBar key={`v-${i}`} name={v.name} amount={v.amount} dailyPercent={v.dailyPercent} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {scanResult.fullBreakdown.minerals.length > 0 && (
                                        <div>
                                            <h4 className="text-white/60 text-xs font-semibold uppercase mb-2">{t('Minerals', 'معادن')}</h4>
                                            <div className="space-y-2">
                                                {scanResult.fullBreakdown.minerals.map((m, i) => (
                                                    <MicroBar key={`m-${i}`} name={m.name} amount={m.amount} dailyPercent={m.dailyPercent} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ApiCard>
                    )}

                    {/* Alternatives */}
                    {scanResult.fullBreakdown.alternatives.length > 0 && (
                        <ApiCard>
                            <h3 className="font-bold text-white flex items-center gap-2 mb-3">
                                <TrendingUp size={18} className="text-[var(--color-primary)]" />
                                {t('Healthier Alternatives', 'بدائل أكثر صحة')}
                            </h3>
                            <div className="space-y-2">
                                {scanResult.fullBreakdown.alternatives.map((alt, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle size={14} className="text-green-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-semibold">{alt.name}</p>
                                            <p className="text-white/40 text-xs">{alt.why}</p>
                                        </div>
                                        <span className="text-green-400 text-sm font-bold shrink-0">{alt.calories} kcal</span>
                                    </div>
                                ))}
                            </div>
                        </ApiCard>
                    )}

                    {/* Scan Again */}
                    <ApiButton onClick={resetScan} icon={<RefreshCw size={18} />} variant="primary" fullWidth>
                        {t('Scan Another Food', 'مسح طعام آخر')}
                    </ApiButton>
                </div>
            )}

            {/* Daily Summary */}
            {dailyNutrition && dailyNutrition.scanCount > 0 && (
                <ApiCard>
                    <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                        <Flame size={18} className="text-[var(--color-primary)]" />
                        {t("Today's Nutrition", 'تغذية اليوم')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <DailyCard label={t('Calories', 'سعرات')} value={`${dailyNutrition.totalCalories}`} unit="kcal" color="text-orange-400" />
                        <DailyCard label={t('Protein', 'بروتين')} value={`${dailyNutrition.totalProtein}`} unit="g" color="text-blue-400" />
                        <DailyCard label={t('Carbs', 'كارب')} value={`${dailyNutrition.totalCarbs}`} unit="g" color="text-yellow-400" />
                        <DailyCard label={t('Fat', 'دهون')} value={`${dailyNutrition.totalFat}`} unit="g" color="text-red-400" />
                        <DailyCard label={t('Fiber', 'ألياف')} value={`${dailyNutrition.totalFiber}`} unit="g" color="text-green-400" />
                    </div>
                    {dailyNutrition.meals.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/5">
                            <p className="text-white/40 text-xs mb-2">{t('Meals logged:', 'الوجبات المسجلة:')}</p>
                            <div className="flex flex-wrap gap-2">
                                {dailyNutrition.meals.map((meal, i) => (
                                    <span key={i} className="px-2 py-1 bg-white/5 rounded-lg text-white/50 text-xs">
                                        {meal.foodName} ({meal.calories} kcal)
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </ApiCard>
            )}
        </div>
    );
}

// ─── Macro Ring ───────────────────────────────────────────────────

function MacroRing({ label, value, percentage, color, bgColor }: {
    label: string;
    value: string;
    percentage: number;
    color: string;
    bgColor: string;
}) {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative">
                <svg width="70" height="70" viewBox="0 0 70 70">
                    <circle cx="35" cy="35" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    <circle
                        cx="35" cy="35" r={radius} fill="none"
                        className={color}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 35 35)"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{value}</span>
                </div>
            </div>
            <span className="text-white/40 text-xs">{label}</span>
        </div>
    );
}

// ─── Macro Bar ────────────────────────────────────────────────────

function MacroBar({ label, value, unit, max, color, icon }: {
    label: string;
    value: number;
    unit: string;
    max: number;
    color: string;
    icon: React.ReactNode;
}) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-white/60">
                    <span className={color.replace('bg-', 'text-')}>{icon}</span>
                    {label}
                </span>
                <span className="text-white font-semibold">
                    {value}{unit} <span className="text-white/30">({pct}% DV)</span>
                </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// ─── Micro Bar ────────────────────────────────────────────────────

function MicroBar({ name, amount, dailyPercent }: {
    name: string;
    amount: string;
    dailyPercent: number;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm w-24 shrink-0">{name}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)]/50 rounded-full" style={{ width: `${Math.min(100, dailyPercent)}%` }} />
            </div>
            <span className="text-white/40 text-xs w-16 text-right shrink-0">{amount}</span>
            <span className="text-white/30 text-xs w-10 text-right shrink-0">{dailyPercent}%</span>
        </div>
    );
}

// ─── Daily Card ───────────────────────────────────────────────────

function DailyCard({ label, value, unit, color }: {
    label: string;
    value: string;
    unit: string;
    color: string;
}) {
    return (
        <div className="text-center p-3 bg-white/[0.03] rounded-xl border border-white/5">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-white/40 text-xs">{unit}</p>
            <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
        </div>
    );
}
