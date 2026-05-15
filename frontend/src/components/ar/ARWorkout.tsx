'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Play,
    Pause,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flame,
    Check,
    Loader2,
    AlertCircle,
    Camera,
    Layers,
    Maximize2,
    X,
    Info,
    Zap,
    Dumbbell,
    Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface ARModel {
    id: string;
    name: string;
    description: string;
    modelUrl: string;
    thumbnailUrl?: string;
    format: string;
    fileSizeBytes: number;
    polygonCount?: number;
    animationCount?: number;
    exerciseId?: string;
    exerciseName?: string;
    bodyPart?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    isActive: boolean;
}

interface ARExerciseData {
    model: ARModel;
    instructions: string[];
    tips: string[];
    duration: number;
    repetitions?: number;
    sets?: number;
}

interface ARSession {
    id: string;
    modelId: string;
    status: string;
    startedAt: string;
}

interface ARWorkoutProps {
    modelId?: string;
    onSessionComplete?: (session: ARSession) => void;
}

// ─── Constants ────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const DIFFICULTY_LABELS: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const BODY_PART_LABELS: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    legs: 'Legs',
    arms: 'Arms',
    shoulders: 'Shoulders',
    abs: 'Abs',
    core: 'Core',
    full_body: 'Full Body',
    cardio: 'Cardio',
    flexibility: 'Flexibility',
};

// ─── Component ────────────────────────────────────────────────────

export default function ARWorkout({ modelId: initialModelId, onSessionComplete }: ARWorkoutProps) {
    const [models, setModels] = useState<ARModel[]>([]);
    const [bodyParts, setBodyParts] = useState<{ name: string; count: number }[]>([]);
    const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<ARModel | null>(null);
    const [exerciseData, setExerciseData] = useState<ARExerciseData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isARActive, setIsARActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [timer, setTimer] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [currentRep, setCurrentRep] = useState(0);
    const [showInstructions, setShowInstructions] = useState(false);
    const [session, setSession] = useState<ARSession | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [xrSupported, setXrSupported] = useState<boolean | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ─── Data Fetching ────────────────────────────────────────────

    const fetchModels = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (selectedBodyPart) params.set('bodyPart', selectedBodyPart);
            params.set('page', String(page));
            params.set('limit', '12');

            const response = await fetch(`${API_BASE}/ar/models?${params}`);
            const data = await response.json();

            if (data.success) {
                setModels(data.data.models);
                setBodyParts(data.data.bodyParts);
                setTotalPages(data.data.totalPages);
            } else {
                setError(data.message || 'Failed to load AR models');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedBodyPart, page]);

    const fetchExerciseData = useCallback(async (modelId: string) => {
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/ar/models/${modelId}/exercise`);
            const data = await response.json();

            if (data.success) {
                setExerciseData(data.data);
                setSelectedModel(data.data.model);
            } else {
                setError('Failed to load exercise data');
            }
        } catch {
            setError('Failed to load exercise data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const startSession = async (modelId: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setError('Please log in to start an AR workout');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE}/ar/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ modelId }),
            });

            const data = await response.json();

            if (data.success) {
                setSession(data.data);
                return data.data;
            }
        } catch {
            // Silently fail - session tracking is non-critical
        }
        return null;
    };

    const completeSession = async (durationSeconds: number) => {
        if (!session) return;

        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            await fetch(`${API_BASE}/ar/sessions/${session.id}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    durationSeconds,
                    caloriesBurned: Math.round(durationSeconds * 0.15),
                }),
            });

            onSessionComplete?.(session);
        } catch {
            // Silently fail
        }
    };

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    useEffect(() => {
        if (initialModelId) {
            fetchExerciseData(initialModelId);
        }
    }, [initialModelId, fetchExerciseData]);

    // ─── AR / WebXR Support Check ─────────────────────────────────

    useEffect(() => {
        const checkXRSupport = async () => {
            if (typeof navigator !== 'undefined' && 'xr' in navigator) {
                try {
                    const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
                    setXrSupported(supported);
                } catch {
                    setXrSupported(false);
                }
            } else {
                setXrSupported(false);
            }
        };

        checkXRSupport();
    }, []);

    // ─── Timer Management ─────────────────────────────────────────

    useEffect(() => {
        if (isARActive && !isPaused) {
            timerRef.current = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isARActive, isPaused]);

    // ─── AR Simulation (Fallback when WebXR not available) ────────

    useEffect(() => {
        if (!isARActive || xrSupported) return;

        // Fallback: Render a simple 3D-like visualization on canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let angle = 0;

        const draw = () => {
            if (!ctx || !canvas) return;

            const w = canvas.width;
            const h = canvas.height;

            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, w, h);

            // Draw grid
            ctx.strokeStyle = 'rgba(192, 255, 0, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i < w; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, h);
                ctx.stroke();
            }
            for (let i = 0; i < h; i += 40) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(w, i);
                ctx.stroke();
            }

            // Draw 3D-like figure
            const cx = w / 2;
            const cy = h / 2;
            const scale = Math.min(w, h) / 400;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.rotate(angle);

            // Draw body outline
            ctx.strokeStyle = '#C0FF00';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#C0FF00';
            ctx.shadowBlur = 20;

            // Head
            ctx.beginPath();
            ctx.arc(0, -120, 30, 0, Math.PI * 2);
            ctx.stroke();

            // Body
            ctx.beginPath();
            ctx.moveTo(0, -90);
            ctx.lineTo(0, 20);
            ctx.stroke();

            // Arms
            ctx.beginPath();
            ctx.moveTo(-50, -60 + Math.sin(angle * 2) * 20);
            ctx.lineTo(0, -70);
            ctx.lineTo(50, -60 + Math.cos(angle * 2) * 20);
            ctx.stroke();

            // Legs
            ctx.beginPath();
            ctx.moveTo(-30, 80 + Math.sin(angle * 2) * 15);
            ctx.lineTo(0, 20);
            ctx.lineTo(30, 80 + Math.cos(angle * 2) * 15);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.restore();

            // Draw HUD
            ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
            ctx.fillRect(10, 10, 200, 80);
            ctx.strokeStyle = '#C0FF00';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 10, 200, 80);

            ctx.fillStyle = '#C0FF00';
            ctx.font = '14px monospace';
            ctx.fillText(`TIME: ${formatTime(timer)}`, 20, 35);
            ctx.fillText(`SET: ${currentSet}/${exerciseData?.sets || 3}`, 20, 55);
            ctx.fillText(`REP: ${currentRep}/${exerciseData?.repetitions || 12}`, 20, 75);

            angle += 0.02;
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isARActive, xrSupported, timer, currentSet, currentRep, exerciseData]);

    // ─── Handlers ─────────────────────────────────────────────────

    const handleStartAR = useCallback(async () => {
        if (!selectedModel) return;

        const newSession = await startSession(selectedModel.id);
        if (newSession || true) {
            // Always allow starting even if session tracking fails
            setIsARActive(true);
            setIsPaused(false);
            setTimer(0);
            setCurrentSet(1);
            setCurrentRep(0);
            setShowSummary(false);
        }
    }, [selectedModel]);

    const handleStopAR = useCallback(async () => {
        setIsARActive(false);
        setIsPaused(false);

        await completeSession(timer);

        setShowSummary(true);
    }, [timer, session]);

    const handlePauseResume = useCallback(() => {
        setIsPaused((prev) => !prev);
    }, []);

    const handleIncrementRep = useCallback(() => {
        setCurrentRep((prev) => {
            const maxReps = exerciseData?.repetitions || 12;
            if (prev + 1 >= maxReps) {
                setCurrentSet((s) => {
                    const maxSets = exerciseData?.sets || 3;
                    if (s >= maxSets) {
                        handleStopAR();
                        return s;
                    }
                    return s + 1;
                });
                return 0;
            }
            return prev + 1;
        });
    }, [exerciseData, handleStopAR]);

    // ─── Helpers ──────────────────────────────────────────────────

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ─── Render ───────────────────────────────────────────────────

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Box className="text-[var(--color-primary)]" size={28} />
                    <div>
                        <h2 className="text-2xl font-bold text-white">AR Workouts</h2>
                        <p className="text-xs text-white/40">
                            {xrSupported === null
                                ? 'Checking AR support...'
                                : xrSupported
                                ? 'WebXR AR is supported on your device'
                                : 'Using AR simulation mode (WebXR not available)'}
                        </p>
                    </div>
                </div>
                {xrSupported === false && (
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-lg border border-yellow-500/20">
                        Simulation Mode
                    </span>
                )}
            </div>

            {/* AR Active View */}
            {isARActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10">
                    {/* AR Viewport */}
                    {xrSupported ? (
                        <div className="aspect-video bg-black flex items-center justify-center">
                            <div className="text-center">
                                <Camera size={48} className="mx-auto mb-3 text-[var(--color-primary)]" />
                                <p className="text-white/60 text-sm">AR Camera Active</p>
                                <p className="text-white/30 text-xs mt-1">Point your camera at a flat surface</p>
                            </div>
                        </div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            width={800}
                            height={450}
                            className="w-full aspect-video bg-black"
                        />
                    )}

                    {/* AR Controls Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Top HUD */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                            <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                                    <Clock size={14} />
                                    <span className="text-sm font-mono font-bold">{formatTime(timer)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                                    <span className="text-xs text-white/60">Set {currentSet}/{exerciseData?.sets || 3}</span>
                                </div>
                                <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                                    <span className="text-xs text-white/60">Rep {currentRep}/{exerciseData?.repetitions || 12}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleStopAR}
                                className="bg-red-500/80 backdrop-blur-md rounded-xl px-3 py-2 text-white text-xs font-medium hover:bg-red-500 transition-colors"
                            >
                                <X size={14} className="inline mr-1" />
                                End
                            </button>
                        </div>

                        {/* Bottom Controls */}
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-3 pointer-events-auto">
                            <button
                                onClick={handlePauseResume}
                                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/20"
                            >
                                {isPaused ? <Play size={24} className="ml-1" /> : <Pause size={24} />}
                            </button>

                            <button
                                onClick={handleIncrementRep}
                                className="px-6 py-3 rounded-full bg-[var(--color-primary)] flex items-center gap-2 text-black font-semibold hover:scale-105 transition-transform"
                            >
                                <Check size={18} />
                                Complete Rep
                            </button>

                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/20"
                            >
                                <Info size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Instructions Overlay */}
                    {showInstructions && exerciseData && (
                        <div className="absolute bottom-24 left-4 right-4 bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 pointer-events-auto">
                            <h4 className="text-sm font-semibold text-white mb-2">Instructions</h4>
                            <ol className="space-y-1.5">
                                {exerciseData.instructions.map((inst, i) => (
                                    <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                        <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold">
                                            {i + 1}
                                        </span>
                                        {inst}
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <h5 className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Tips</h5>
                                {exerciseData.tips.map((tip, i) => (
                                    <p key={i} className="text-xs text-white/50 flex items-center gap-1">
                                        <Star size={10} className="text-yellow-400 shrink-0" />
                                        {tip}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : showSummary && session ? (
                /* Workout Summary */
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center mx-auto">
                        <Check size={32} className="text-[var(--color-primary)]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Workout Complete!</h3>
                    <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{formatTime(timer)}</p>
                            <p className="text-xs text-white/40">Duration</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[var(--color-primary)]">{Math.round(timer * 0.15)}</p>
                            <p className="text-xs text-white/40">Calories</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{currentSet - 1}</p>
                            <p className="text-xs text-white/40">Sets Done</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setShowSummary(false);
                            setTimer(0);
                            setCurrentSet(1);
                            setCurrentRep(0);
                            setSession(null);
                        }}
                        className="px-6 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-black font-semibold rounded-xl hover:scale-105 transition-transform"
                    >
                        Back to Library
                    </button>
                </div>
            ) : selectedModel && exerciseData ? (
                /* Exercise Detail View */
                <div className="space-y-4">
                    {/* Back Button */}
                    <button
                        onClick={() => {
                            setSelectedModel(null);
                            setExerciseData(null);
                        }}
                        className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Back to models
                    </button>

                    {/* Exercise Card */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        {/* Preview */}
                        <div className="relative aspect-video bg-black/30 flex items-center justify-center">
                            {selectedModel.thumbnailUrl ? (
                                <img
                                    src={selectedModel.thumbnailUrl}
                                    alt={selectedModel.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <Box size={48} className="text-[var(--color-primary)]" />
                                    <p className="text-white/40 text-sm">3D Model Preview</p>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[selectedModel.difficulty]}`}>
                                    {DIFFICULTY_LABELS[selectedModel.difficulty]}
                                </span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-5 space-y-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedModel.name}</h3>
                                <p className="text-sm text-white/50 mt-1">{selectedModel.description}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {selectedModel.bodyPart && (
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 capitalize border border-white/10">
                                        {BODY_PART_LABELS[selectedModel.bodyPart] || selectedModel.bodyPart}
                                    </span>
                                )}
                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 border border-white/10 flex items-center gap-1">
                                    <Clock size={10} />
                                    {exerciseData.duration}s
                                </span>
                                {exerciseData.repetitions && (
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 border border-white/10">
                                        {exerciseData.repetitions} reps
                                    </span>
                                )}
                                {exerciseData.sets && (
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 border border-white/10">
                                        {exerciseData.sets} sets
                                    </span>
                                )}
                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 border border-white/10 uppercase">
                                    {selectedModel.format}
                                </span>
                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/60 border border-white/10">
                                    {formatFileSize(selectedModel.fileSizeBytes)}
                                </span>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Layers size={14} className="text-[var(--color-primary)]" />
                                    Instructions
                                </h4>
                                <ol className="space-y-2">
                                    {exerciseData.instructions.map((inst, i) => (
                                        <li key={i} className="text-sm text-white/60 flex items-start gap-3">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            {inst}
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Tips */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Zap size={14} className="text-yellow-400" />
                                    Tips
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {exerciseData.tips.map((tip, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-xs text-yellow-400/80"
                                        >
                                            {tip}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStartAR}
                                className="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-black font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                                <Camera size={20} />
                                Start AR Workout
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Model Browser */
                <>
                    {/* Body Part Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => {
                                setSelectedBodyPart(null);
                                setPage(1);
                            }}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                !selectedBodyPart
                                    ? 'bg-[var(--color-primary)] text-black'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                        >
                            All
                        </button>
                        {bodyParts.map((bp) => (
                            <button
                                key={bp.name}
                                onClick={() => {
                                    setSelectedBodyPart(bp.name === selectedBodyPart ? null : bp.name);
                                    setPage(1);
                                }}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                                    selectedBodyPart === bp.name
                                        ? 'bg-[var(--color-primary)] text-black'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                            >
                                {BODY_PART_LABELS[bp.name] || bp.name} ({bp.count})
                            </button>
                        ))}
                    </div>

                    {/* Models Grid */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20 text-red-400 gap-2">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    ) : models.length === 0 ? (
                        <div className="text-center py-20 text-white/40">
                            <Box size={40} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No AR models found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {models.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => fetchExerciseData(model.id)}
                                    className="group text-left bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-square bg-black/30 flex items-center justify-center">
                                        {model.thumbnailUrl ? (
                                            <img
                                                src={model.thumbnailUrl}
                                                alt={model.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <Box size={40} className="text-[var(--color-primary)] opacity-50" />
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                                                <Play size={20} className="ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <h4 className="text-sm font-semibold text-white group-hover:text-[var(--color-primary)] transition-colors">
                                            {model.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLORS[model.difficulty]}`}>
                                                {DIFFICULTY_LABELS[model.difficulty]}
                                            </span>
                                            {model.bodyPart && (
                                                <span className="text-[10px] text-white/40 capitalize">
                                                    {BODY_PART_LABELS[model.bodyPart] || model.bodyPart}
                                                </span>
                                            )}
                                            <span className="ml-auto text-[10px] text-white/30 uppercase">
                                                {model.format}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                        p === page
                                            ? 'bg-[var(--color-primary)] text-black'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
