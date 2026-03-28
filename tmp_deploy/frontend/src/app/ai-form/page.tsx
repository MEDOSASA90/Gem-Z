'use client';
import React, { useState, useRef } from 'react';
import {
    Camera, CameraOff, AlertTriangle, CheckCircle, Zap,
    Globe, RotateCcw, Play, Pause, Activity
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const EXERCISES = [
    { id: 'squat', nameEn: 'Squat', nameAr: 'سكوات', emoji: '🦵', joints: ['Knee', 'Hip', 'Ankle'], commonErrors: ['Knees caving in', 'Chest dropping', 'Heels rising'] },
    { id: 'pushup', nameEn: 'Push-Up', nameAr: 'ضغط', emoji: '💪', joints: ['Elbow', 'Shoulder', 'Wrist'], commonErrors: ['Hips sagging', 'Elbows flaring', 'Neck dropping'] },
    { id: 'deadlift', nameEn: 'Deadlift', nameAr: 'ديدليفت', emoji: '⚡', joints: ['Hip', 'Spine', 'Knee'], commonErrors: ['Back rounding', 'Bar too far', 'Hyperextension at top'] },
    { id: 'lunge', nameEn: 'Lunge', nameAr: 'لانج', emoji: '🏃', joints: ['Knee', 'Hip', 'Ankle'], commonErrors: ['Front knee over toe', 'Trunk leaning', 'Back knee not lowering'] },
];

const MOCK_ANALYSIS = {
    score: 87,
    reps: 8,
    issues: [
        { joint: 'Right Knee', jointAr: 'الركبة اليمنى', angle: '162°', optimal: '90°', severity: 'warning', tip: 'Go deeper — aim for 90° knee bend', tipAr: 'انزل أعمق — استهدف 90 درجة للركبة' },
        { joint: 'Hip', jointAr: 'الحوض', angle: '85°', optimal: '85°', severity: 'ok', tip: 'Perfect hip hinge angle!', tipAr: 'زاوية الحوض مثالية!' },
        { joint: 'Spine', jointAr: 'العمود الفقري', angle: '175°', optimal: '180°', severity: 'ok', tip: 'Good neutral spine position', tipAr: 'وضعية العمود الفقري ممتازة' },
    ]
};

export default function AIFormCorrectionPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
    const [cameraActive, setCameraActive] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const startCamera = async () => {
        setCameraActive(true);
        setShowResults(false);
        setRepCount(0);
        // In production: access getUserMedia + MediaPipe pose detection
        // Simulate analysis after 4 seconds
        setAnalyzing(true);
        setTimeout(() => {
            setAnalyzing(false);
            setShowResults(true);
        }, 4000);
        // Simulate rep counting
        let count = 0;
        const interval = setInterval(() => {
            count++;
            setRepCount(count);
            if (count >= MOCK_ANALYSIS.reps) clearInterval(interval);
        }, 500);
    };

    const stopCamera = () => {
        setCameraActive(false);
        setAnalyzing(false);
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-20" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2">
                            <Activity size={18} className="text-[var(--color-primary)]" />
                            {isArabic ? 'مصحح الأداء AI' : 'AI Form Correction'}
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تحليل حركي فوري عبر الكاميرا' : 'Real-time movement analysis'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Exercise Selector */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-bold">{isArabic ? 'اختر التمرين' : 'Select Exercise'}</h3>
                    {EXERCISES.map(ex => (
                        <button key={ex.id} onClick={() => { setSelectedExercise(ex); setShowResults(false); setCameraActive(false); }}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                            style={{ background: selectedExercise.id === ex.id ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--bg-card)', border: `1px solid ${selectedExercise.id === ex.id ? 'var(--color-primary)' : 'var(--border-subtle)'}` }}>
                            <span className="text-3xl">{ex.emoji}</span>
                            <div>
                                <p className="font-bold">{isArabic ? ex.nameAr : ex.nameEn}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {ex.joints.map(j => (
                                        <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{j}</span>
                                    ))}
                                </div>
                            </div>
                            {selectedExercise.id === ex.id && <CheckCircle size={16} className="text-[var(--color-primary)] ms-auto shrink-0" />}
                        </button>
                    ))}

                    {/* Common Errors */}
                    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h4 className="font-bold text-sm mb-3">{isArabic ? 'أخطاء شائعة:' : 'Common Errors:'}</h4>
                        {selectedExercise.commonErrors.map((err, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm mb-2">
                                <AlertTriangle size={12} className="text-[var(--color-warning)] shrink-0" />
                                <span style={{ color: 'var(--text-secondary)' }}>{err}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Camera Feed */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Camera viewport */}
                    <div className="relative rounded-3xl overflow-hidden bg-black" style={{ aspectRatio: '4/3', border: '1px solid var(--border-subtle)' }}>
                        {!cameraActive ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg-card)' }}>
                                <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)', border: '1px solid rgba(var(--color-primary-rgb), 0.25)' }}>
                                    <Camera size={40} className="text-[var(--color-primary)]" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-xl mb-2">{isArabic ? 'ابدأ تحليل الحركة' : 'Start Movement Analysis'}</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {isArabic ? 'سيتم استخدام كاميرا الهاتف لتحليل حركتك وتصحيحها' : 'Your camera will be used to analyze and correct your form'}
                                    </p>
                                </div>
                                <button onClick={startCamera} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-black text-lg neon-glow" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                                    <Play size={20} /> {isArabic ? 'تشغيل الكاميرا' : 'Start Camera'}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Simulated camera feed with skeleton overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
                                    {/* Skeleton body visualization */}
                                    <svg viewBox="0 0 200 350" className="h-4/5 opacity-60">
                                        {/* Head */}
                                        <circle cx="100" cy="40" r="22" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Neck */}
                                        <line x1="100" y1="62" x2="100" y2="80" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Shoulders */}
                                        <line x1="60" y1="80" x2="140" y2="80" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Torso */}
                                        <line x1="100" y1="80" x2="100" y2="175" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Left arm */}
                                        <line x1="60" y1="80" x2="40" y2="135" stroke="var(--color-primary)" strokeWidth="2" />
                                        <line x1="40" y1="135" x2="30" y2="185" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Right arm */}
                                        <line x1="140" y1="80" x2="160" y2="135" stroke="var(--color-primary)" strokeWidth="2" />
                                        <line x1="160" y1="135" x2="170" y2="185" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Hips */}
                                        <line x1="75" y1="175" x2="125" y2="175" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Left leg */}
                                        <line x1="75" y1="175" x2="65" y2="265" stroke="var(--color-primary)" strokeWidth="2" />
                                        <line x1="65" y1="265" x2="60" y2="330" stroke={MOCK_ANALYSIS.issues[0].severity === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'} strokeWidth="2" />
                                        {/* Right leg */}
                                        <line x1="125" y1="175" x2="135" y2="265" stroke="var(--color-primary)" strokeWidth="2" />
                                        <line x1="135" y1="265" x2="140" y2="330" stroke="var(--color-primary)" strokeWidth="2" />
                                        {/* Joint dots */}
                                        {[[100, 40], [60, 80], [140, 80], [40, 135], [160, 135], [30, 185], [170, 185], [75, 175], [125, 175], [65, 265], [135, 265], [60, 330], [140, 330]].map(([x, y], i) => (
                                            <circle key={i} cx={x} cy={y} r="4" fill="var(--color-primary)" />
                                        ))}
                                        {/* Warning joint */}
                                        <circle cx="60" cy="330" r="6" fill="var(--color-warning)" className="animate-pulse" />
                                        <circle cx="140" cy="330" r="6" fill="var(--color-warning)" className="animate-pulse" />
                                        {/* Angle indicator */}
                                        <text x="75" y="280" fill="var(--color-warning)" fontSize="11" fontFamily="monospace">162°</text>
                                        <text x="130" y="280" fill="var(--color-primary)" fontSize="11" fontFamily="monospace">160°</text>
                                    </svg>
                                </div>

                                {/* Overlay UI */}
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-white text-xs font-bold">REC</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.7)' }}>
                                        <span className="text-white text-xs">{isArabic ? 'تكرارات:' : 'Reps:'}</span>
                                        <span className="text-[var(--color-primary)] font-bold font-mono text-lg">{repCount}</span>
                                    </div>
                                </div>

                                {analyzing && (
                                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.8)' }}>
                                        <div className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                                        <span className="text-white text-sm">{isArabic ? 'تحليل الحركة...' : 'Analyzing movement...'}</span>
                                    </div>
                                )}

                                {showResults && !analyzing && (
                                    <div className="absolute bottom-4 left-4 right-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(var(--color-primary-rgb), 0.25)' }}>
                                        <p className="text-[var(--color-warning)] text-sm font-bold">⚠️ {isArabic ? 'الركبة اليمنى: انزل أعمق!' : 'Right Knee: Go deeper!'}</p>
                                        <p className="text-xs text-gray-300 mt-1">{isArabic ? 'الزاوية الحالية 162° — يجب أن تكون 90°' : 'Current angle 162° — target is 90°'}</p>
                                    </div>
                                )}

                                <button onClick={stopCamera} className="absolute top-4 end-4 p-2 rounded-xl bg-red-500/80 text-white">
                                    <CameraOff size={18} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Form Score */}
                    {showResults && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="relative w-20 h-20">
                                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-input)" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke={MOCK_ANALYSIS.score >= 80 ? 'var(--color-primary)' : 'var(--color-warning)'} strokeWidth="3"
                                            strokeDasharray={`${MOCK_ANALYSIS.score} 100`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="font-bold text-xl" style={{ color: MOCK_ANALYSIS.score >= 80 ? 'var(--color-primary)' : 'var(--color-warning)' }}>{MOCK_ANALYSIS.score}</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{isArabic ? 'نتيجة الأداء' : 'Form Score'}</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{MOCK_ANALYSIS.reps} {isArabic ? 'تكرارات محللة' : 'reps analyzed'}</p>
                                    <p className="text-sm font-bold" style={{ color: MOCK_ANALYSIS.score >= 80 ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                                        {MOCK_ANALYSIS.score >= 80 ? (isArabic ? '✅ أداء جيد جداً!' : '✅ Very Good Form!') : (isArabic ? '⚠️ يحتاج تحسين' : '⚠️ Needs Improvement')}
                                    </p>
                                </div>
                            </div>

                            {/* Joint Analysis */}
                            <div className="space-y-3">
                                {MOCK_ANALYSIS.issues.map((issue, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1px solid ${issue.severity === 'warning' ? 'rgba(255,204,0,0.3)' : 'rgba(52,199,89,0.3)'}` }}>
                                        {issue.severity === 'warning' ? <AlertTriangle size={20} className="text-[var(--color-warning)] shrink-0" /> : <CheckCircle size={20} className="text-[#34C759] shrink-0" />}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-sm">{isArabic ? issue.jointAr : issue.joint}</span>
                                                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: issue.severity === 'warning' ? 'rgba(255,204,0,0.1)' : 'rgba(52,199,89,0.1)', color: issue.severity === 'warning' ? 'var(--color-warning)' : '#34C759' }}>{issue.angle}</span>
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {isArabic ? 'المثالي' : 'target'}: {issue.optimal}</span>
                                            </div>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? issue.tipAr : issue.tip}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
