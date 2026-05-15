'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Upload,
    Scan,
    Loader2,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Ruler,
    Activity,
    User,
    ArrowRight,
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    X,
    Camera,
    RotateCcw,
    Info,
} from 'lucide-react';
import { ApiButton, ApiCard } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface BodyMeasurements {
    chestCm: number;
    waistCm: number;
    hipsCm: number;
    leftArmCm: number;
    rightArmCm: number;
    leftThighCm: number;
    rightThighCm: number;
    leftCalfCm: number;
    rightCalfCm: number;
    shouldersCm: number;
    neckCm: number;
}

interface BodyComposition {
    bodyFatPercent: number;
    muscleMassKg: number;
    boneMassKg: number;
    waterPercent: number;
    bmi: number;
}

interface BodyScan {
    id: string;
    frontPhotoUrl: string;
    sidePhotoUrl?: string;
    backPhotoUrl?: string;
    scanStatus: string;
    composition?: BodyComposition;
    measurements?: BodyMeasurements;
    aiAnalysisJson?: {
        bodyType?: string;
        postureNotes?: string;
        recommendations?: string[];
        confidence?: number;
    };
    createdAt: string;
    updatedAt: string;
}

interface MeasurementTrend {
    date: string;
    chestCm: number;
    waistCm: number;
    hipsCm: number;
    leftArmCm: number;
    rightArmCm: number;
    leftThighCm: number;
    rightThighCm: number;
    bodyFatPercent?: number;
}

interface ProgressData {
    trends: MeasurementTrend[];
    latestScan: BodyScan | null;
    firstScan: BodyScan | null;
    changes: Record<string, number>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── 3D Body Visualization Component ──────────────────────────────

function Body3DVisualization({ measurements, composition }: { measurements?: BodyMeasurements; composition?: BodyComposition }) {
    if (!measurements) return null;

    // Calculate relative proportions for SVG body outline
    const scale = Math.min(280 / measurements.shouldersCm, 1.5);
    const shoulderW = (measurements.shouldersCm || 40) * scale;
    const chestW = (measurements.chestCm || 90) * scale;
    const waistW = (measurements.waistCm || 75) * scale;
    const hipsW = (measurements.hipsCm || 90) * scale;
    const armW = (Math.max(measurements.leftArmCm || 0, measurements.rightArmCm || 0)) * scale * 0.45;
    const thighW = (Math.max(measurements.leftThighCm || 0, measurements.rightThighCm || 0)) * scale * 0.5;
    const calfW = (Math.max(measurements.leftCalfCm || 0, measurements.rightCalfCm || 0)) * scale * 0.4;

    const cx = 200;
    const topY = 30;

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <svg width="400" height="480" viewBox="0 0 400 480" className="drop-shadow-lg">
                    {/* Grid background */}
                    <defs>
                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(var(--color-primary-rgb, 255,193,7), 0.3)" />
                            <stop offset="100%" stopColor="rgba(var(--color-primary-rgb, 255,193,7), 0.05)" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Measurement grid lines */}
                    {[80, 160, 240, 320, 400].map((y) => (
                        <line key={y} x1="40" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                    ))}

                    {/* Body wireframe */}
                    <g filter="url(#glow)">
                        {/* Head */}
                        <ellipse cx={cx} cy={topY + 20} rx="22" ry="25" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        {/* Neck */}
                        <line x1={cx - 10} y1={topY + 45} x2={cx - shoulderW / 6} y2={topY + 60} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        <line x1={cx + 10} y1={topY + 45} x2={cx + shoulderW / 6} y2={topY + 60} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

                        {/* Shoulders */}
                        <line x1={cx - shoulderW / 2} y1={topY + 60} x2={cx - chestW / 2} y2={topY + 85} stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                        <line x1={cx + shoulderW / 2} y1={topY + 60} x2={cx + chestW / 2} y2={topY + 85} stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />

                        {/* Arms */}
                        <line x1={cx - shoulderW / 2} y1={topY + 65} x2={cx - shoulderW / 2 - armW} y2={topY + 150} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                        <line x1={cx + shoulderW / 2} y1={topY + 65} x2={cx + shoulderW / 2 + armW} y2={topY + 150} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                        <line x1={cx - shoulderW / 2 - armW} y1={topY + 150} x2={cx - shoulderW / 2 - armW * 0.8} y2={topY + 220} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                        <line x1={cx + shoulderW / 2 + armW} y1={topY + 150} x2={cx + shoulderW / 2 + armW * 0.8} y2={topY + 220} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

                        {/* Chest */}
                        <path d={`M ${cx - chestW / 2} ${topY + 85} Q ${cx} ${topY + 95} ${cx + chestW / 2} ${topY + 85} L ${cx + waistW / 2} ${topY + 135} Q ${cx} ${topY + 145} ${cx - waistW / 2} ${topY + 135} Z`}
                            fill="url(#bodyGrad)" stroke="rgba(var(--color-primary-rgb, 255,193,7), 0.5)" strokeWidth="2" />

                        {/* Waist */}
                        <path d={`M ${cx - waistW / 2} ${topY + 135} Q ${cx} ${topY + 145} ${cx + waistW / 2} ${topY + 135} L ${cx + hipsW / 2} ${topY + 175} Q ${cx} ${topY + 185} ${cx - hipsW / 2} ${topY + 175} Z`}
                            fill="url(#bodyGrad)" stroke="rgba(var(--color-primary-rgb, 255,193,7), 0.4)" strokeWidth="2" />

                        {/* Hips */}
                        <path d={`M ${cx - hipsW / 2} ${topY + 175} Q ${cx} ${topY + 185} ${cx + hipsW / 2} ${topY + 175} L ${cx + hipsW / 2.5} ${topY + 230} Q ${cx} ${topY + 240} ${cx - hipsW / 2.5} ${topY + 230} Z`}
                            fill="url(#bodyGrad)" stroke="rgba(var(--color-primary-rgb, 255,193,7), 0.35)" strokeWidth="2" />

                        {/* Thighs */}
                        <path d={`M ${cx - hipsW / 3} ${topY + 230} L ${cx - thighW} ${topY + 320} Q ${cx - thighW * 0.7} ${topY + 330} ${cx - thighW * 0.5} ${topY + 340}`}
                            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                        <path d={`M ${cx + hipsW / 3} ${topY + 230} L ${cx + thighW} ${topY + 320} Q ${cx + thighW * 0.7} ${topY + 330} ${cx + thighW * 0.5} ${topY + 340}`}
                            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

                        {/* Calves */}
                        <path d={`M ${cx - thighW * 0.5} ${topY + 340} L ${cx - calfW} ${topY + 430} Q ${cx - calfW * 0.3} ${topY + 445} ${cx - calfW * 0.1} ${topY + 450}`}
                            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                        <path d={`M ${cx + thighW * 0.5} ${topY + 340} L ${cx + calfW} ${topY + 430} Q ${cx + calfW * 0.3} ${topY + 445} ${cx + calfW * 0.1} ${topY + 450}`}
                            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                    </g>

                    {/* Measurement labels */}
                    <text x={cx + chestW / 2 + 10} y={topY + 95} fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="monospace">{measurements.chestCm}cm</text>
                    <text x={cx + waistW / 2 + 10} y={topY + 145} fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="monospace">{measurements.waistCm}cm</text>
                    <text x={cx + hipsW / 2 + 10} y={topY + 185} fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="monospace">{measurements.hipsCm}cm</text>
                    <text x={cx - shoulderW / 2 - 45} y={topY + 150} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace" textAnchor="end">L:{measurements.leftArmCm}</text>
                    <text x={cx + shoulderW / 2 + 50} y={topY + 150} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace">R:{measurements.rightArmCm}</text>
                    <text x={cx - thighW - 30} y={topY + 330} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace" textAnchor="end">{measurements.leftThighCm}</text>
                    <text x={cx + thighW + 30} y={topY + 330} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace">{measurements.rightThighCm}</text>
                </svg>
            </div>

            {/* Composition Stats */}
            {composition && (
                <div className="grid grid-cols-5 gap-3 w-full">
                    <StatPill label="Body Fat" value={`${composition.bodyFatPercent}%`} color="text-yellow-400" />
                    <StatPill label="Muscle" value={`${composition.muscleMassKg}kg`} color="text-blue-400" />
                    <StatPill label="Water" value={`${composition.waterPercent}%`} color="text-cyan-400" />
                    <StatPill label="BMI" value={`${composition.bmi}`} color="text-green-400" />
                    <StatPill label="Bone" value={`${composition.boneMassKg}kg`} color="text-purple-400" />
                </div>
            )}
        </div>
    );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="text-center p-2 bg-white/[0.03] rounded-xl border border-white/5">
            <p className={`text-sm font-bold ${color}`}>{value}</p>
            <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
        </div>
    );
}

// ─── Measurement Chart ────────────────────────────────────────────

function MeasurementsChart({ trends }: { trends: MeasurementTrend[] }) {
    if (!trends || trends.length < 2) return null;

    const reversed = [...trends].reverse();
    const width = 500;
    const height = 200;
    const pad = { top: 20, right: 40, bottom: 30, left: 40 };

    const maxVal = Math.max(
        ...reversed.flatMap((t) => [t.chestCm, t.waistCm, t.hipsCm, t.leftArmCm, t.leftThighCm].filter(Boolean))
    );
    const minVal = Math.min(
        ...reversed.flatMap((t) => [t.chestCm, t.waistCm, t.hipsCm, t.leftArmCm, t.leftThighCm].filter(Boolean))
    ) * 0.8;

    const xStep = (width - pad.left - pad.right) / (reversed.length - 1 || 1);
    const yScale = (val: number) => height - pad.bottom - ((val - minVal) / (maxVal - minVal)) * (height - pad.top - pad.bottom);

    const buildPath = (key: keyof MeasurementTrend) =>
        reversed.map((t, i) => `${i === 0 ? 'M' : 'L'} ${pad.left + i * xStep} ${yScale(t[key] as number)}`).join(' ');

    const colors: Record<string, string> = {
        chestCm: '#fbbf24',
        waistCm: '#f87171',
        hipsCm: '#a78bfa',
        leftArmCm: '#60a5fa',
        leftThighCm: '#34d399',
    };

    const labels: Record<string, string> = {
        chestCm: 'Chest',
        waistCm: 'Waist',
        hipsCm: 'Hips',
        leftArmCm: 'Arm',
        leftThighCm: 'Thigh',
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                {Object.entries(labels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[key] }} />
                        <span className="text-white/40 text-[10px]">{label}</span>
                    </div>
                ))}
            </div>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                {/* Y-axis grid */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <g key={pct}>
                        <line x1={pad.left} y1={height - pad.bottom - pct * (height - pad.top - pad.bottom)}
                            x2={width - pad.right} y2={height - pad.bottom - pct * (height - pad.top - pad.bottom)}
                            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <text x={pad.left - 5} y={height - pad.bottom - pct * (height - pad.top - pad.bottom) + 4}
                            fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">
                            {Math.round(minVal + pct * (maxVal - minVal))}cm
                        </text>
                    </g>
                ))}

                {/* X-axis labels */}
                {reversed.map((t, i) => (
                    <text key={i} x={pad.left + i * xStep} y={height - 8}
                        fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">
                        {t.date.slice(5)}
                    </text>
                ))}

                {/* Lines */}
                {Object.keys(colors).map((key) => (
                    <path key={key} d={buildPath(key as keyof MeasurementTrend)}
                        fill="none" stroke={colors[key]} strokeWidth="2" opacity="0.8" strokeLinecap="round" />
                ))}
            </svg>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export default function BodyScanUploader() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [photos, setPhotos] = useState<{ front?: string; side?: string; back?: string }>({});
    const [photoFiles, setPhotoFiles] = useState<{ front?: File; side?: File; back?: File }>({});
    const [scanResult, setScanResult] = useState<BodyScan | null>(null);
    const [scanHistory, setScanHistory] = useState<BodyScan[]>([]);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upload' | 'progress'>('upload');
    const [expandedSection, setExpandedSection] = useState<string | null>('composition');

    const frontRef = useRef<HTMLInputElement>(null);
    const sideRef = useRef<HTMLInputElement>(null);
    const backRef = useRef<HTMLInputElement>(null);

    // ─── Fetch Data ─────────────────────────────────────────────────

    const fetchProgress = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/bodyscan/progress`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setProgress(data.data);
                if (data.data.latestScan) {
                    setScanResult(data.data.latestScan);
                }
            }
        } catch {
            // silently fail
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/bodyscan/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setScanHistory(data.data);
            }
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProgress();
        fetchHistory();
    }, [fetchProgress, fetchHistory]);

    // ─── Photo Handling ─────────────────────────────────────────────

    const handlePhotoSelect = useCallback((angle: 'front' | 'side' | 'back', file: File) => {
        if (!file.type.startsWith('image/')) {
            setError(t('Please select an image file', 'يرجى اختيار ملف صورة'));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError(t('Image must be under 10MB', 'يجب أن تكون الصورة أقل من 10 ميجا'));
            return;
        }

        setError(null);
        setPhotoFiles((prev) => ({ ...prev, [angle]: file }));

        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotos((prev) => ({ ...prev, [angle]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }, [t]);

    // ─── Upload & Scan ──────────────────────────────────────────────

    const handleScan = async () => {
        if (!photos.front) {
            setError(t('Front photo is required', 'الصورة الأمامية مطلوبة'));
            return;
        }

        setIsScanning(true);
        setError(null);

        try {
            const token = localStorage.getItem('gemz_access_token');

            // Upload photos
            const uploadedUrls: Record<string, string> = {};
            for (const angle of ['front', 'side', 'back'] as const) {
                const photoFile = photoFiles[angle];
                if (photoFile) {
                    const formData = new FormData();
                    formData.append('file', photoFile);

                    const uploadRes = await fetch(`${API_BASE}/upload`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                    });

                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        uploadedUrls[angle] = uploadData.url;
                    }
                }
            }

            // Call body scan API
            const response = await fetch(`${API_BASE}/bodyscan/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    frontPhotoUrl: uploadedUrls.front || photos.front,
                    sidePhotoUrl: uploadedUrls.side || photos.side,
                    backPhotoUrl: uploadedUrls.back || photos.back,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setScanResult(data.scan);
                await fetchProgress();
                await fetchHistory();
            } else {
                setError(data.message || 'Scan failed');
            }
        } catch {
            setError(t('Failed to analyze body photos', 'فشل تحليل صور الجسم'));
        } finally {
            setIsScanning(false);
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setPhotos({});
        setPhotoFiles({});
        setError(null);
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    // ─── Photo Upload Box ───────────────────────────────────────────

    const PhotoBox = ({ angle, label, labelAr, required }: { angle: 'front' | 'side' | 'back'; label: string; labelAr: string; required?: boolean }) => (
        <div
            onClick={() => {
                if (angle === 'front') frontRef.current?.click();
                if (angle === 'side') sideRef.current?.click();
                if (angle === 'back') backRef.current?.click();
            }}
            className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all overflow-hidden cursor-pointer ${
                photos[angle] ? 'border-[var(--color-primary)]/50' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
            }`}
        >
            <input
                ref={angle === 'front' ? frontRef : angle === 'side' ? sideRef : backRef}
                type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoSelect(angle, e.target.files[0])}
            />
            {photos[angle] ? (
                <div className="relative w-full h-full">
                    <img src={photos[angle]} alt={label} className="w-full h-full object-cover" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPhotos((p) => ({ ...p, [angle]: undefined }));
                            setPhotoFiles((p) => ({ ...p, [angle]: undefined }));
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                        <Camera size={22} className="text-white/30" />
                    </div>
                    <p className="text-white/50 text-xs font-semibold text-center">
                        {isArabic ? labelAr : label}
                    </p>
                    {required && <span className="text-[10px] text-red-400/60">{t('Required', 'مطلوب')}</span>}
                </div>
            )}
        </div>
    );

    // ─── Measurement Row ────────────────────────────────────────────

    const MeasurementRow = ({ label, labelAr, value, change }: { label: string; labelAr: string; value: number; change?: number }) => (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-white/60 text-sm">{isArabic ? labelAr : label}</span>
            <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">{value.toFixed(1)} cm</span>
                {change !== undefined && change !== 0 && (
                    <span className={`text-xs font-medium ${change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                    </span>
                )}
            </div>
        </div>
    );

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <Scan className="text-[var(--color-primary)]" size={28} />
                        {t('Body Scan 3D', 'مسح الجسم ثلاثي الأبعاد')}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                        {t('Upload body photos for AI-powered measurements & 3D visualization', 'ارفع صور الجسم للحصول على قياسات مدعومة بالذكاء الاصطناعي وتصور ثلاثي الأبعاد')}
                    </p>
                </div>
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upload' ? 'bg-[var(--color-primary)] text-black' : 'text-white/50 hover:text-white'}`}>
                        {t('Scan', 'مسح')}
                    </button>
                    <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'progress' ? 'bg-[var(--color-primary)] text-black' : 'text-white/50 hover:text-white'}`}>
                        {t('Progress', 'تقدم')}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">&times;</button>
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="space-y-6">
                    {!scanResult ? (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <PhotoBox angle="front" label="Front View" labelAr="الصورة الأمامية" required />
                                <PhotoBox angle="side" label="Side View" labelAr="الصورة الجانبية" />
                                <PhotoBox angle="back" label="Back View" labelAr="الصورة الخلفية" />
                            </div>
                            <p className="text-white/30 text-xs text-center flex items-center justify-center gap-1">
                                <Info size={12} />
                                {t('For best results, wear fitted clothing and ensure good lighting', 'لأفضل النتائج، ارتدِ ملابس ضيقة وتأكد من الإضاءة الجيدة')}
                            </p>
                            <ApiButton onClick={handleScan} loading={isScanning} icon={<Scan size={18} />} variant="primary" fullWidth disabled={!photos.front}>
                                {isScanning ? t('Analyzing...', 'جاري التحليل...') : t('Analyze Body', 'حلل الجسم')}
                            </ApiButton>
                        </>
                    ) : (
                        <div className="space-y-6">
                            {/* 3D Visualization */}
                            <ApiCard>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Activity size={18} className="text-[var(--color-primary)]" />
                                        {t('3D Body Visualization', 'التصور ثلاثي الأبعاد')}
                                    </h3>
                                    {scanResult.aiAnalysisJson?.confidence && (
                                        <span className="text-white/40 text-xs">
                                            {Math.round(scanResult.aiAnalysisJson.confidence * 100)}% {t('confidence', 'ثقة')}
                                        </span>
                                    )}
                                </div>
                                <Body3DVisualization measurements={scanResult.measurements} composition={scanResult.composition} />
                            </ApiCard>

                            {/* Measurements */}
                            <ApiCard>
                                <button onClick={() => toggleSection('measurements')} className="w-full flex items-center justify-between">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Ruler size={18} className="text-[var(--color-primary)]" />
                                        {t('Measurements', 'القياسات')}
                                    </h3>
                                    {expandedSection === 'measurements' ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                                </button>
                                {expandedSection === 'measurements' && scanResult.measurements && (
                                    <div className="mt-4 space-y-1">
                                        <MeasurementRow label="Chest" labelAr="الصدر" value={scanResult.measurements.chestCm} change={progress?.changes?.chestCm} />
                                        <MeasurementRow label="Waist" labelAr="الخصر" value={scanResult.measurements.waistCm} change={progress?.changes?.waistCm} />
                                        <MeasurementRow label="Hips" labelAr="الورك" value={scanResult.measurements.hipsCm} change={progress?.changes?.hipsCm} />
                                        <MeasurementRow label="Left Arm" labelAr="الذراع الأيسر" value={scanResult.measurements.leftArmCm} change={progress?.changes?.leftArmCm} />
                                        <MeasurementRow label="Right Arm" labelAr="الذراع الأيمن" value={scanResult.measurements.rightArmCm} change={progress?.changes?.rightArmCm} />
                                        <MeasurementRow label="Left Thigh" labelAr="الفخذ الأيسر" value={scanResult.measurements.leftThighCm} change={progress?.changes?.leftThighCm} />
                                        <MeasurementRow label="Right Thigh" labelAr="الفخذ الأيمن" value={scanResult.measurements.rightThighCm} change={progress?.changes?.rightThighCm} />
                                        <MeasurementRow label="Left Calf" labelAr="الساق الأيسر" value={scanResult.measurements.leftCalfCm} />
                                        <MeasurementRow label="Right Calf" labelAr="الساق الأيمن" value={scanResult.measurements.rightCalfCm} />
                                        <MeasurementRow label="Shoulders" labelAr="الأكتاف" value={scanResult.measurements.shouldersCm} />
                                        <MeasurementRow label="Neck" labelAr="الرقبة" value={scanResult.measurements.neckCm} />
                                    </div>
                                )}
                            </ApiCard>

                            {/* AI Analysis */}
                            {scanResult.aiAnalysisJson && (
                                <ApiCard>
                                    <button onClick={() => toggleSection('analysis')} className="w-full flex items-center justify-between">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <User size={18} className="text-[var(--color-primary)]" />
                                            {t('AI Analysis', 'تحليل الذكاء الاصطناعي')}
                                        </h3>
                                        {expandedSection === 'analysis' ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                                    </button>
                                    {expandedSection === 'analysis' && (
                                        <div className="mt-4 space-y-3">
                                            {scanResult.aiAnalysisJson.bodyType && (
                                                <div className="p-3 bg-white/5 rounded-xl">
                                                    <span className="text-white/40 text-xs">{t('Body Type', 'نوع الجسم')}</span>
                                                    <p className="text-white text-sm font-semibold">{scanResult.aiAnalysisJson.bodyType}</p>
                                                </div>
                                            )}
                                            {scanResult.aiAnalysisJson.postureNotes && (
                                                <div className="p-3 bg-white/5 rounded-xl">
                                                    <span className="text-white/40 text-xs">{t('Posture Notes', 'ملاحظات الوضعية')}</span>
                                                    <p className="text-white/70 text-sm">{scanResult.aiAnalysisJson.postureNotes}</p>
                                                </div>
                                            )}
                                            {scanResult.aiAnalysisJson.recommendations && scanResult.aiAnalysisJson.recommendations.length > 0 && (
                                                <div>
                                                    <span className="text-white/40 text-xs">{t('Recommendations', 'التوصيات')}</span>
                                                    <ul className="mt-2 space-y-1.5">
                                                        {scanResult.aiAnalysisJson.recommendations.map((rec, i) => (
                                                            <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                                                                <ArrowRight size={14} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </ApiCard>
                            )}

                            <ApiButton onClick={resetScan} icon={<RefreshCw size={18} />} variant="primary" fullWidth>
                                {t('New Scan', 'مسح جديد')}
                            </ApiButton>
                        </div>
                    )}
                </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
                <div className="space-y-6">
                    {progress?.trends && progress.trends.length >= 2 ? (
                        <>
                            <ApiCard>
                                <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                                    <TrendingUp size={18} className="text-[var(--color-primary)]" />
                                    {t('Measurement Trends', 'اتجاهات القياسات')}
                                </h3>
                                <MeasurementsChart trends={progress.trends} />
                            </ApiCard>

                            {Object.keys(progress.changes).length > 0 && (
                                <ApiCard>
                                    <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                                        <Activity size={18} className="text-[var(--color-primary)]" />
                                        {t('Changes Since First Scan', 'التغييرات منذ أول مسح')}
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {Object.entries(progress.changes).map(([key, val]) => {
                                            const isPositive = key === 'bodyFatPercent' ? val < 0 : val > 0;
                                            const labels: Record<string, { en: string; ar: string }> = {
                                                chestCm: { en: 'Chest', ar: 'الصدر' },
                                                waistCm: { en: 'Waist', ar: 'الخصر' },
                                                hipsCm: { en: 'Hips', ar: 'الورك' },
                                                leftArmCm: { en: 'Left Arm', ar: 'الذراع الأيسر' },
                                                rightArmCm: { en: 'Right Arm', ar: 'الذراع الأيمن' },
                                                leftThighCm: { en: 'Left Thigh', ar: 'الفخذ الأيسر' },
                                                rightThighCm: { en: 'Right Thigh', ar: 'الفخذ الأيمن' },
                                                bodyFatPercent: { en: 'Body Fat', ar: 'دهون الجسم' },
                                            };
                                            const label = labels[key] || { en: key, ar: key };
                                            return (
                                                <div key={key} className="text-center p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                                    <p className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                        {val > 0 ? '+' : ''}{val.toFixed(1)}cm
                                                    </p>
                                                    <p className="text-white/30 text-[10px] mt-0.5">{isArabic ? label.ar : label.en}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ApiCard>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <TrendingUp size={48} className="text-white/10 mx-auto mb-4" />
                            <p className="text-white/30 text-sm">{t('Complete at least 2 body scans to see progress', 'أكمل مسحين على الأقل لرؤية التقدم')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
