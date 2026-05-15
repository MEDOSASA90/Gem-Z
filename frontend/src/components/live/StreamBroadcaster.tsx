'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    MonitorUp,
    CircleStop,
    Users,
    Eye,
    Copy,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Settings,
} from 'lucide-react';
import { ApiButton, ApiCard } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

interface StreamData {
    id: string;
    title: string;
    description: string | null;
    viewerCount: number;
    startedAt: string;
    status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function StreamBroadcaster() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [streamData, setStreamData] = useState<StreamData | null>(null);
    const [viewerCount, setViewerCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const viewerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ─── WebRTC Setup ───────────────────────────────────────────────

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                }));
            }
        };

        return pc;
    }, []);

    // ─── Start Stream ───────────────────────────────────────────────

    const startStream = useCallback(async () => {
        if (!title.trim()) {
            setError(t('Please enter a stream title', 'يرجى إدخال عنوان البث'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Get media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Call API to start stream
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/live/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || undefined,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            const streamInfo: StreamData = data.stream;
            setStreamData(streamInfo);
            setIsStreaming(true);

            // Setup WebRTC
            const pc = createPeerConnection();
            pcRef.current = pc;

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Connect signaling WebSocket
            const wsUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:5000')
                .replace(/^http/, 'ws');
            const ws = new WebSocket(`${wsUrl}/live/${streamInfo.id}/signal?token=${token}`);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'offer',
                    sdp: offer.sdp,
                }));
            };

            ws.onmessage = async (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg));
                } else if (msg.type === 'ice-candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                }
            };

            // Poll viewer count
            viewerIntervalRef.current = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/live/${streamInfo.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    if (d.success) {
                        setViewerCount(d.stream.viewerCount);
                    }
                } catch {
                    // silently fail
                }
            }, 5000);

            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || t('Failed to start stream', 'فشل بدء البث'));
            setIsLoading(false);

            // Cleanup on error
            streamRef.current?.getTracks().forEach((t) => t.stop());
        }
    }, [title, description, createPeerConnection, t]);

    // ─── Stop Stream ────────────────────────────────────────────────

    const stopStream = useCallback(async () => {
        setIsLoading(true);

        try {
            const token = localStorage.getItem('gemz_access_token');
            if (streamData?.id) {
                await fetch(`${API_BASE}/live/stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ streamId: streamData.id }),
                });
            }
        } catch {
            // ignore
        }

        // Cleanup
        streamRef.current?.getTracks().forEach((track) => track.stop());
        pcRef.current?.close();
        wsRef.current?.close();
        if (viewerIntervalRef.current) clearInterval(viewerIntervalRef.current);

        streamRef.current = null;
        pcRef.current = null;
        wsRef.current = null;

        if (videoRef.current) videoRef.current.srcObject = null;

        setIsStreaming(false);
        setStreamData(null);
        setViewerCount(0);
        setIsLoading(false);
    }, [streamData]);

    // ─── Toggle Media ───────────────────────────────────────────────

    const toggleMute = useCallback(() => {
        streamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = isMuted;
        });
        setIsMuted(!isMuted);
    }, [isMuted]);

    const toggleVideo = useCallback(() => {
        streamRef.current?.getVideoTracks().forEach((track) => {
            track.enabled = isVideoOff;
        });
        setIsVideoOff(!isVideoOff);
    }, [isVideoOff]);

    // ─── Copy Stream Link ───────────────────────────────────────────

    const copyStreamLink = useCallback(() => {
        if (!streamData) return;
        const link = `${window.location.origin}/live/${streamData.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [streamData]);

    // ─── Cleanup ────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            pcRef.current?.close();
            wsRef.current?.close();
            if (viewerIntervalRef.current) clearInterval(viewerIntervalRef.current);
        };
    }, []);

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <MonitorUp className="text-[var(--color-primary)]" size={28} />
                    {t('Go Live', 'ابدأ بثاً')}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                    {t('Start a live stream and share with your audience', 'ابدأ بثاً مباشراً وشاركه مع جمهورك')}
                </p>
            </div>

            {/* Stream Settings */}
            {!isStreaming && (
                <ApiCard>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-white/70 text-sm font-semibold mb-2">
                                {t('Stream Title', 'عنوان البث')} *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('e.g., Morning Workout Session', 'مثال: جلسة تمارين الصباح')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-sm font-semibold mb-2">
                                {t('Description (optional)', 'الوصف (اختياري)')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('Describe your stream...', 'صف البث الخاص بك...')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30 resize-none h-24"
                                maxLength={500}
                            />
                        </div>
                    </div>
                </ApiCard>
            )}

            {/* Preview / Live Video */}
            <div className="relative aspect-video bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* Status Badge */}
                {isStreaming && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/90 text-white rounded-full text-sm font-bold animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full" />
                        {t('LIVE', 'مباشر')}
                    </div>
                )}

                {/* Viewer Count */}
                {isStreaming && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full text-sm">
                        <Eye size={14} />
                        {viewerCount} {t('viewers', 'مشاهد')}
                    </div>
                )}

                {/* Placeholder when no preview */}
                {!streamRef.current && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <Video size={28} className="text-white/20" />
                        </div>
                        <p className="text-white/30 text-sm">{t('Camera preview', 'معاينة الكاميرا')}</p>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    {isStreaming && (
                        <>
                            <button
                                onClick={toggleMute}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                    isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'
                                }`}
                            >
                                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                    isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'
                                }`}
                            >
                                {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                            </button>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isStreaming && streamData && (
                        <button
                            onClick={copyStreamLink}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm hover:bg-white/10 transition-colors"
                        >
                            {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                            {copied ? t('Copied!', 'تم النسخ!') : t('Share', 'مشاركة')}
                        </button>
                    )}

                    {!isStreaming ? (
                        <ApiButton
                            onClick={startStream}
                            loading={isLoading}
                            icon={<MonitorUp size={18} />}
                            variant="primary"
                        >
                            {t('Start Streaming', 'بدء البث')}
                        </ApiButton>
                    ) : (
                        <ApiButton
                            onClick={stopStream}
                            loading={isLoading}
                            icon={<CircleStop size={18} />}
                            variant="danger"
                        >
                            {t('End Stream', 'إنهاء البث')}
                        </ApiButton>
                    )}
                </div>
            </div>

            {/* Stream Info */}
            {isStreaming && streamData && (
                <ApiCard className="!bg-green-500/5 !border-green-500/20">
                    <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-400" />
                        <div>
                            <p className="text-green-400 font-semibold text-sm">{t('Stream is live!', 'البث مباشر!')}</p>
                            <p className="text-white/50 text-xs">
                                {t('Stream ID:', 'معرف البث:')} {streamData.id}
                            </p>
                        </div>
                    </div>
                </ApiCard>
            )}
        </div>
    );
}
