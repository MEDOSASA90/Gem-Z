'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Camera,
    CameraOff,
    Play,
    Square,
    Activity,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    BarChart3,
    Zap,
    Loader2,
} from 'lucide-react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
}

interface JointAngle {
    joint: string;
    angle: number;
    targetMin: number;
    targetMax: number;
    deviation: number;
    status: 'good' | 'warning' | 'poor';
}

interface FormIssue {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
}

interface FormAnalysis {
    id: string;
    exerciseType: string;
    overallScore: number;
    repCount: number;
    jointAngles: JointAngle[];
    issues: FormIssue[];
    strengths: string[];
    processingTimeMs: number;
    createdAt: string;
}

const EXERCISE_TYPES = [
    { value: 'squat', label: 'Squat', labelAr: 'سكوات' },
    { value: 'deadlift', label: 'Deadlift', labelAr: 'ديدليفت' },
    { value: 'bench_press', label: 'Bench Press', labelAr: 'بنش بريس' },
    { value: 'overhead_press', label: 'Overhead Press', labelAr: 'أوفرهيد بريس' },
    { value: 'pull_up', label: 'Pull Up', labelAr: 'بول أب' },
    { value: 'push_up', label: 'Push Up', labelAr: 'بوش أب' },
    { value: 'lunge', label: 'Lunge', labelAr: 'لانج' },
    { value: 'plank', label: 'Plank', labelAr: 'بلانك' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Component ────────────────────────────────────────────────────

export default function PoseAnalyzer() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState('squat');
    const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scoreHistory, setScoreHistory] = useState<{ date: string; score: number }[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameCaptureRef = useRef<NodeJS.Timeout | null>(null);
    const poseFramesRef = useRef<{ timestamp: number; landmarks: PoseLandmark[] }[]>([]);

    // ─── Camera ─────────────────────────────────────────────────────

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraActive(true);
            setError(null);
        } catch {
            setError(t('Camera access denied. Please allow camera permissions.', 'تم رفض الوصول للكاميرا. يرجى السماح بالأذونات.'));
        }
    }, [t]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (frameCaptureRef.current) {
            clearInterval(frameCaptureRef.current);
            frameCaptureRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    }, []);

    // ─── Pose Detection ─────────────────────────────────────────────

    const simulatePoseDetection = useCallback(() => {
        // Generate realistic pose landmarks (33 landmarks for MediaPipe Pose)
        const landmarks: PoseLandmark[] = Array.from({ length: 33 }, (_, i) => ({
            x: 0.3 + Math.random() * 0.4,
            y: 0.2 + Math.random() * 0.6,
            z: Math.random() * 0.2 - 0.1,
            visibility: Math.random() > 0.1 ? 0.8 + Math.random() * 0.2 : 0.3,
        }));

        // Key landmarks should be more stable
        const keyIndices = [11, 12, 23, 24, 25, 26, 27, 28];
        keyIndices.forEach((idx) => {
            landmarks[idx].visibility = 0.95;
            landmarks[idx].x = 0.4 + Math.random() * 0.2;
            landmarks[idx].y = 0.3 + Math.random() * 0.3;
        });

        return {
            timestamp: Date.now(),
            landmarks,
        };
    }, []);

    const startAnalysis = useCallback(() => {
        setIsAnalyzing(true);
        setError(null);
        poseFramesRef.current = [];

        // Capture frames every 33ms (~30fps) for 5 seconds
        frameCaptureRef.current = setInterval(() => {
            const frame = simulatePoseDetection();
            poseFramesRef.current.push(frame);
        }, 33);

        // Stop after 5 seconds
        setTimeout(() => {
            if (frameCaptureRef.current) {
                clearInterval(frameCaptureRef.current);
                frameCaptureRef.current = null;
            }
            submitAnalysis();
        }, 5000);
    }, [simulatePoseDetection]);

    const submitAnalysis = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const frames = poseFramesRef.current;

            if (frames.length === 0) {
                setError(t('No pose data captured', 'لم يتم التقاط بيانات الوضعية'));
                setIsAnalyzing(false);
                return;
            }

            const response = await fetch(`${API_BASE}/mediapipe/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    exerciseType: selectedExercise,
                    poseFrames: frames,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setAnalysis(data.analysis);
                setScoreHistory((prev) => [
                    ...prev,
                    { date: new Date().toLocaleTimeString(), score: data.analysis.overallScore },
                ].slice(-20));
            } else {
                setError(data.message || 'Analysis failed');
            }
        } catch {
            setError(t('Network error. Please try again.', 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'));
        } finally {
            setIsAnalyzing(false);
        }
    }, [selectedExercise, t]);

    // ─── Overlay Drawing ────────────────────────────────────────────

    useEffect(() => {
        if (!isCameraActive || !canvasRef.current || !videoRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const drawOverlay = () => {
            if (!videoRef.current || !canvas) return;
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw pose skeleton (simulated)
            if (isAnalyzing) {
                ctx.strokeStyle = '#ff7b00';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ff7b00';
                ctx.shadowBlur = 10;

                // Draw simplified skeleton
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                // Torso
                ctx.beginPath();
                ctx.moveTo(cx - 30, cy - 60);
                ctx.lineTo(cx + 30, cy - 60);
                ctx.lineTo(cx + 25, cy + 20);
                ctx.lineTo(cx - 25, cy + 20);
                ctx.closePath();
                ctx.stroke();

                // Arms
                ctx.beginPath();
                ctx.moveTo(cx - 30, cy - 55);
                ctx.lineTo(cx - 80, cy - 20);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx + 30, cy - 55);
                ctx.lineTo(cx + 80, cy - 20);
                ctx.stroke();

                // Legs
                ctx.beginPath();
                ctx.moveTo(cx - 20, cy + 20);
                ctx.lineTo(cx - 40, cy + 120);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx + 20, cy + 20);
                ctx.lineTo(cx + 40, cy + 120);
                ctx.stroke();

                // Head
                ctx.fillStyle = 'rgba(255, 123, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(cx, cy - 85, 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Status indicator
                ctx.fillStyle = '#00ff88';
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(30, 30, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff';
                ctx.font = '14px sans-serif';
                ctx.fillText(t('Analyzing...', 'جاري التحليل...'), 50, 35);
            }

            animationId = requestAnimationFrame(drawOverlay);
        };

        drawOverlay();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [isCameraActive, isAnalyzing, t]);

    // ─── Score Color ────────────────────────────────────────────────

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-green-400';
        if (score >= 70) return 'text-yellow-400';
        if (score >= 50) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 85) return 'bg-green-500/20 border-green-500/30';
        if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30';
        if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
        return 'bg-red-500/20 border-red-500/30';
    };

    const getScoreRing = (score: number) => {
        if (score >= 85) return 'stroke-green-400';
        if (score >= 70) return 'stroke-yellow-400';
        if (score >= 50) return 'stroke-orange-400';
        return 'stroke-red-400';
    };

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <Activity className="text-[var(--color-primary)]" size={28} />
                        {t('AI Form Analyzer', 'محلل الوضعية AI')}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                        {t('Real-time exercise form analysis using MediaPipe', 'تحليل وضعية التمارين في الوقت الفعلي باستخدام MediaPipe')}
                    </p>
                </div>
            </div>

            {/* Exercise Selector */}
            <div className="flex flex-wrap gap-2">
                {EXERCISE_TYPES.map((ex) => (
                    <button
                        key={ex.value}
                        onClick={() => setSelectedExercise(ex.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            selectedExercise === ex.value
                                ? 'bg-[var(--color-primary)] text-black'
                                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        {isArabic ? ex.labelAr : ex.label}
                    </button>
                ))}
            </div>

            {/* Camera View */}
            <div className="relative aspect-video bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
                {isCameraActive ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                        />
                        {/* Controls Overlay */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            {!isAnalyzing ? (
                                <ApiButton
                                    onClick={startAnalysis}
                                    icon={<Play size={18} />}
                                    variant="primary"
                                >
                                    {t('Start Analysis', 'بدء التحليل')}
                                </ApiButton>
                            ) : (
                                <div className="flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] text-black rounded-xl font-bold">
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('Analyzing... (5s)', 'جاري التحليل... (5 ثواني)')}
                                </div>
                            )}
                            <ApiButton
                                onClick={stopCamera}
                                icon={<CameraOff size={18} />}
                                variant="danger"
                            >
                                {t('Stop', 'إيقاف')}
                            </ApiButton>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <Camera size={36} className="text-white/30" />
                        </div>
                        <p className="text-white/40 text-sm">
                            {t('Camera is off. Start camera to begin analysis.', 'الكاميرا متوقفة. شغل الكاميرا للبدء.')}
                        </p>
                        <ApiButton onClick={startCamera} icon={<Camera size={18} />}>
                            {t('Start Camera', 'تشغيل الكاميرا')}
                        </ApiButton>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="space-y-4">
                    {/* Score Card */}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${getScoreBg(analysis.overallScore)} border rounded-2xl p-6`}>
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="45" fill="none"
                                        className={getScoreRing(analysis.overallScore)}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(analysis.overallScore / 100) * 283} 283`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                                        {analysis.overallScore}
                                    </span>
                                    <span className="text-white/40 text-xs">{t('SCORE', 'النتيجة')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                <Zap size={16} className="text-[var(--color-primary)]" />
                                <span>{t('Exercise:', 'التمرين:')}</span>
                                <span className="text-white font-semibold capitalize">{analysis.exerciseType.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                <Activity size={16} className="text-[var(--color-primary)]" />
                                <span>{t('Reps Detected:', 'العدد:')}</span>
                                <span className="text-white font-semibold">{analysis.repCount}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                <BarChart3 size={16} className="text-[var(--color-primary)]" />
                                <span>{t('Processing:', 'السرعة:')}</span>
                                <span className="text-white font-semibold">{analysis.processingTimeMs}ms</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                            {analysis.strengths.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-green-400 text-sm">
                                    <CheckCircle size={14} />
                                    <span>{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Joint Angles */}
                    {analysis.jointAngles.length > 0 && (
                        <ApiCard>
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-[var(--color-primary)]" />
                                {t('Joint Angles', 'زوايا المفاصل')}
                            </h3>
                            <div className="space-y-3">
                                {analysis.jointAngles.map((angle) => (
                                    <div key={angle.joint} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/70 capitalize">{angle.joint}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/40 text-xs">
                                                    Target: {angle.targetMin}-{angle.targetMax}deg
                                                </span>
                                                <span className={`font-bold ${getScoreColor(angle.status === 'good' ? 90 : angle.status === 'warning' ? 75 : 40)}`}>
                                                    {angle.angle}deg
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    angle.status === 'good'
                                                        ? 'bg-green-400'
                                                        : angle.status === 'warning'
                                                        ? 'bg-yellow-400'
                                                        : 'bg-red-400'
                                                }`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(10, (angle.angle / angle.targetMax) * 100))}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ApiCard>
                    )}

                    {/* Issues */}
                    {analysis.issues.length > 0 && (
                        <ApiCard>
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-orange-400" />
                                {t('Form Corrections', 'تصحيحات الوضعية')}
                            </h3>
                            <div className="space-y-3">
                                {analysis.issues.map((issue, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                issue.severity === 'high'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : issue.severity === 'medium'
                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                    : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {issue.severity.toUpperCase()}
                                            </span>
                                            <span className="text-white/50 text-xs capitalize">{issue.type}</span>
                                        </div>
                                        <p className="text-white/80 text-sm">{issue.description}</p>
                                        <p className="text-[var(--color-primary)] text-sm mt-1">{issue.suggestion}</p>
                                    </div>
                                ))}
                            </div>
                        </ApiCard>
                    )}
                </div>
            )}

            {/* Score History */}
            {scoreHistory.length > 0 && (
                <ApiCard>
                    <h3 className="font-bold text-white mb-4">{t('Score Trend', 'تطور النتيجة')}</h3>
                    <div className="flex items-end gap-1 h-24">
                        {scoreHistory.map((item, i) => (
                            <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-1"
                                title={`${item.date}: ${item.score}`}
                            >
                                <div
                                    className={`w-full rounded-t-sm ${
                                        item.score >= 85
                                            ? 'bg-green-400'
                                            : item.score >= 70
                                            ? 'bg-yellow-400'
                                            : 'bg-orange-400'
                                    }`}
                                    style={{ height: `${item.score}%` }}
                                />
                            </div>
                        ))}
                    </div>
                </ApiCard>
            )}
        </div>
    );
}
