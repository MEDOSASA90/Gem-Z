'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Mic,
    MicOff,
    Loader2,
    Volume2,
    X,
    Command,
    Brain,
    Activity,
    ChevronRight,
    Settings,
    History,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface VoiceButtonProps {
    onCommand?: (result: VoiceCommandResult) => void;
    size?: 'sm' | 'md' | 'lg';
    position?: 'fixed' | 'inline';
}

interface VoiceCommandResult {
    commandId: string;
    transcript: string;
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    suggestedAction?: string;
    responseText?: string;
    processingTimeMs: number;
}

interface VoiceStatus {
    available: boolean;
    engine: string;
    supportedLanguages: Array<{ code: string; name: string }>;
    maxAudioLength: string;
    maxDuration: string;
}

interface CommandHistory {
    id: string;
    transcript: string;
    intent: string;
    confidence: number;
    createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const INTENT_ICONS: Record<string, string> = {
    start_workout: 'play',
    stop_workout: 'square',
    pause_workout: 'pause',
    resume_workout: 'play',
    next_exercise: 'skip-forward',
    previous_exercise: 'skip-back',
    show_stats: 'bar-chart',
    show_profile: 'user',
    search_exercise: 'search',
    play_video: 'video',
    set_timer: 'clock',
    check_progress: 'trending-up',
    book_session: 'calendar',
    unknown: 'help-circle',
};

const INTENT_COLORS: Record<string, string> = {
    start_workout: 'text-green-400 bg-green-500/10',
    stop_workout: 'text-red-400 bg-red-500/10',
    pause_workout: 'text-yellow-400 bg-yellow-500/10',
    resume_workout: 'text-blue-400 bg-blue-500/10',
    next_exercise: 'text-purple-400 bg-purple-500/10',
    previous_exercise: 'text-orange-400 bg-orange-500/10',
    show_stats: 'text-cyan-400 bg-cyan-500/10',
    show_profile: 'text-pink-400 bg-pink-500/10',
    search_exercise: 'text-teal-400 bg-teal-500/10',
    play_video: 'text-indigo-400 bg-indigo-500/10',
    set_timer: 'text-lime-400 bg-lime-500/10',
    check_progress: 'text-sky-400 bg-sky-500/10',
    book_session: 'text-violet-400 bg-violet-500/10',
    unknown: 'text-gray-400 bg-gray-500/10',
};

// ─── Component ────────────────────────────────────────────────────

export default function VoiceButton({ onCommand, size = 'md', position = 'fixed' }: VoiceButtonProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<VoiceStatus | null>(null);
    const [history, setHistory] = useState<CommandHistory[]>([]);
    const [language, setLanguage] = useState('en');
    const [visualizerData, setVisualizerData] = useState<number[]>(Array(20).fill(0));
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);

    // ─── Size Classes ─────────────────────────────────────────────

    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-14 h-14',
        lg: 'w-16 h-16',
    };

    const iconSizes = {
        sm: 18,
        md: 24,
        lg: 28,
    };

    // ─── Fetch Status ─────────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/voice/status`);
            const data = await response.json();
            if (data.success) {
                setStatus(data.data);
            }
        } catch {
            // Silently fail
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/voice/history?limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setHistory(data.data.commands);
            }
        } catch {
            // Silently fail
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory, fetchHistory]);

    // ─── Audio Visualizer ─────────────────────────────────────────

    const startVisualizer = useCallback((stream: MediaStream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animate = () => {
            analyser.getByteFrequencyData(dataArray);
            const normalized = Array.from(dataArray.slice(0, 20)).map(
                (v) => v / 255
            );
            setVisualizerData(normalized);
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();
    }, []);

    const stopVisualizer = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (analyserRef.current?.context?.state === 'running') {
            analyserRef.current.context.close();
        }
        setVisualizerData(Array(20).fill(0));
    }, []);

    // ─── Voice Recording ──────────────────────────────────────────

    const startListening = useCallback(async () => {
        setError(null);
        setTranscript('');
        setLastResult(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processAudio(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsListening(true);
            startVisualizer(stream);

            // Auto-stop after 30 seconds
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    stopListening();
                }
            }, 30000);
        } catch (err) {
            setError('Microphone access denied. Please allow microphone permissions.');
            setIsListening(false);
        }
    }, [startVisualizer]);

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsListening(false);
        stopVisualizer();
    }, [stopVisualizer]);

    // ─── Audio Processing ─────────────────────────────────────────

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);

        try {
            // Convert to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = reader.result?.toString().split(',')[1] || '';
                    resolve(base64);
                };
            });
            reader.readAsDataURL(audioBlob);
            const base64Audio = await base64Promise;

            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/voice/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    audioData: base64Audio,
                    language,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setTranscript(data.data.transcript);
                setLastResult(data.data);
                onCommand?.(data.data);
            } else {
                setError(data.message || 'Failed to process voice command');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const processTextCommand = useCallback(async (text: string) => {
        if (!text.trim()) return;

        setIsProcessing(true);
        setError(null);
        setTranscript(text);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/voice/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({ text, language }),
            });

            const data = await response.json();

            if (data.success) {
                setLastResult(data.data);
                onCommand?.(data.data);
            } else {
                setError(data.message || 'Failed to process command');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    }, [language, onCommand]);

    // ─── Render ───────────────────────────────────────────────────

    return (
        <>
            {/* Voice Button */}
            <button
                onClick={() => {
                    setShowPanel(!showPanel);
                    if (!showPanel) {
                        setShowHistory(false);
                        setError(null);
                    }
                }}
                className={`${position === 'fixed' ? 'fixed bottom-24 right-6 z-50' : 'relative'} ${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isListening
                        ? 'bg-red-500 animate-pulse shadow-red-500/30'
                        : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:scale-110 hover:shadow-xl'
                }`}
            >
                {isListening ? (
                    <MicOff size={iconSizes[size]} className="text-white" />
                ) : (
                    <Mic size={iconSizes[size]} className="text-black" />
                )}
            </button>

            {/* Voice Panel */}
            {showPanel && (
                <div
                    className={`${position === 'fixed' ? 'fixed bottom-40 right-6 z-50' : 'absolute bottom-full mb-3 right-0'} w-80 bg-[#141414] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain size={18} className="text-black" />
                            <span className="text-black font-bold text-sm">Voice Assistant</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-1 rounded-lg hover:bg-black/20 text-black/70 hover:text-black transition-colors"
                            >
                                <History size={16} />
                            </button>
                            <button
                                onClick={() => setShowPanel(false)}
                                className="p-1 rounded-lg hover:bg-black/20 text-black/70 hover:text-black transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {showHistory ? (
                            /* History Tab */
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {history.length === 0 ? (
                                    <p className="text-center text-white/40 text-sm py-4">No commands yet</p>
                                ) : (
                                    history.map((cmd) => (
                                        <div
                                            key={cmd.id}
                                            className="flex items-start gap-2 p-2 bg-white/5 rounded-lg"
                                        >
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cmd.confidence > 0.7 ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                            <div className="min-w-0">
                                                <p className="text-xs text-white/80 truncate">{cmd.transcript}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${INTENT_COLORS[cmd.intent]?.split(' ')[1] || 'bg-white/5'}`}>
                                                        {cmd.intent}
                                                    </span>
                                                    <span className="text-[10px] text-white/30">
                                                        {new Date(cmd.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Audio Visualizer */}
                                <div className="flex items-center justify-center gap-[2px] h-16">
                                    {visualizerData.map((value, i) => (
                                        <div
                                            key={i}
                                            className={`w-1 rounded-full transition-all duration-75 ${
                                                isListening ? 'bg-[var(--color-primary)]' : 'bg-white/10'
                                            }`}
                                            style={{
                                                height: `${Math.max(4, value * 48)}px`,
                                                opacity: isListening ? 0.4 + value * 0.6 : 0.3,
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Status */}
                                <div className="text-center">
                                    <p className="text-sm text-white/80 font-medium">
                                        {isListening
                                            ? 'Listening...'
                                            : isProcessing
                                            ? 'Processing...'
                                            : lastResult
                                            ? 'Command Recognized'
                                            : 'Tap the microphone to speak'}
                                    </p>
                                    {status && !status.available && (
                                        <p className="text-[10px] text-yellow-400 mt-1">
                                            Using offline mode
                                        </p>
                                    )}
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    disabled={isProcessing}
                                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                                        isListening
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                            : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-black hover:opacity-90'
                                    } disabled:opacity-50`}
                                >
                                    {isListening ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <MicOff size={16} /> Stop Listening
                                        </span>
                                    ) : isProcessing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 size={16} className="animate-spin" /> Processing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Mic size={16} /> Start Listening
                                        </span>
                                    )}
                                </button>

                                {/* Text Input Fallback */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Or type your command..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                processTextCommand(e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-secondary)]/50 transition-colors placeholder:text-white/30"
                                    />
                                    <button
                                        onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            if (input) {
                                                processTextCommand(input.value);
                                                input.value = '';
                                            }
                                        }}
                                        className="shrink-0 p-2 rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                {/* Transcript */}
                                {transcript && (
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Transcript</p>
                                        <p className="text-sm text-white/80">{transcript}</p>
                                    </div>
                                )}

                                {/* Result */}
                                {lastResult && (
                                    <div className={`p-3 rounded-xl border ${INTENT_COLORS[lastResult.intent] || 'border-white/10 bg-white/5'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Command size={14} />
                                            <span className="text-xs font-semibold capitalize">
                                                {lastResult.intent.replace(/_/g, ' ')}
                                            </span>
                                            <span className="ml-auto text-[10px] text-white/40">
                                                {Math.round(lastResult.confidence * 100)}% confidence
                                            </span>
                                        </div>
                                        {lastResult.responseText && (
                                            <p className="text-xs text-white/70">{lastResult.responseText}</p>
                                        )}
                                        {lastResult.suggestedAction && (
                                            <button
                                                onClick={() => {
                                                    window.location.href = lastResult.suggestedAction!;
                                                }}
                                                className="mt-2 text-[10px] px-2 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/30 transition-colors"
                                            >
                                                Go to {lastResult.suggestedAction}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Language Selector */}
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/40">Language</span>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                    >
                                        {status?.supportedLanguages.map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </option>
                                        )) || (
                                            <>
                                                <option value="en">English</option>
                                                <option value="ar">Arabic</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                                        {error}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
