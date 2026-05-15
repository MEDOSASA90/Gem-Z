'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Play,
    Circle,
    Send,
    Users,
    Eye,
    Clock,
    ArrowLeft,
    Loader2,
    Radio,
    MessageSquare,
    Heart,
    Share2,
    Flag,
} from 'lucide-react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface LiveStream {
    id: string;
    hostId: string;
    hostName: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    status: 'live' | 'ended';
    tags: string[];
    viewerCount: number;
    startedAt: string;
}

interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    message: string;
    createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// ─── Component ────────────────────────────────────────────────────

interface StreamViewerProps {
    streamId?: string;
}

export default function StreamViewer({ streamId }: StreamViewerProps) {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [activeTab, setActiveTab] = useState<'browse' | 'watch'>('browse');
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewerCount, setViewerCount] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Fetch Active Streams ───────────────────────────────────────

    const fetchStreams = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/live/active`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setStreams(data.streams || []);
            }
        } catch {
            setError(t('Failed to load streams', 'فشل تحميل البثوث')));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (activeTab === 'browse') {
            fetchStreams();
        }
    }, [activeTab, fetchStreams]);

    // ─── Join Stream ────────────────────────────────────────────────

    const joinStream = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('gemz_access_token');

            // Get stream details
            const response = await fetch(`${API_BASE}/live/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            const stream: LiveStream = data.stream;
            setCurrentStream(stream);
            setViewerCount(stream.viewerCount);
            setActiveTab('watch');

            // Fetch chat history
            const chatRes = await fetch(`${API_BASE}/live/${id}/chat`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const chatData = await chatRes.json();
            if (chatData.success) {
                setMessages(chatData.messages || []);
            }

            // Setup WebRTC receive
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            });
            pcRef.current = pc;

            pc.ontrack = (event) => {
                if (videoRef.current && event.streams[0]) {
                    videoRef.current.srcObject = event.streams[0];
                }
            };

            // WebSocket signaling
            const wsUrl = SOCKET_URL.replace(/^http/, 'ws');
            const ws = new WebSocket(`${wsUrl}/live/${id}/signal?token=${token}`);
            wsRef.current = ws;

            ws.onopen = async () => {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
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
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/live/${id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    if (d.success) setViewerCount(d.stream.viewerCount);
                } catch {
                    // ignore
                }
            }, 5000);

            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || t('Failed to join stream', 'فشل الانضمام للبث'));
            setIsLoading(false);
        }
    }, [t]);

    // ─── Send Chat ──────────────────────────────────────────────────

    const sendChatMessage = useCallback(async () => {
        if (!chatInput.trim() || !currentStream) return;

        const token = localStorage.getItem('gemz_access_token');
        const message = chatInput.trim();

        try {
            await fetch(`${API_BASE}/live/${currentStream.id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message }),
            });

            // Optimistic
            const optimistic: ChatMessage = {
                id: `temp_${Date.now()}`,
                userId: 'me',
                userName: t('You', 'أنت'),
                message,
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimistic]);
            setChatInput('');
        } catch {
            // ignore
        }
    }, [chatInput, currentStream, t]);

    // ─── Leave Stream ───────────────────────────────────────────────

    const leaveStream = useCallback(() => {
        pcRef.current?.close();
        wsRef.current?.close();
        if (pollRef.current) clearInterval(pollRef.current);
        if (videoRef.current) videoRef.current.srcObject = null;
        setCurrentStream(null);
        setMessages([]);
        setActiveTab('browse');
    }, []);

    // ─── Scroll Chat ────────────────────────────────────────────────

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ─── Cleanup ────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            pcRef.current?.close();
            wsRef.current?.close();
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // ─── Format Time ────────────────────────────────────────────────

    const formatDuration = (startedAt: string) => {
        const diff = Date.now() - new Date(startedAt).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    // ─── JSX: Browse ────────────────────────────────────────────────

    if (activeTab === 'browse') {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <Radio className="text-[var(--color-primary)]" size={28} />
                        {t('Live Streams', 'البثوث المباشرة')}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                        {t('Watch live fitness sessions from trainers', 'شاهد جلسات اللياقة المباشرة من المدربين')}
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                ) : streams.length === 0 ? (
                    <EmptyState
                        icon="live_tv"
                        title={t('No Live Streams', 'لا توجد بثوث مباشرة')}
                        subtitle={t('Check back later for live fitness sessions', 'تحقق لاحقاً من جلسات اللياقة المباشرة')}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {streams.map((stream) => (
                            <button
                                key={stream.id}
                                onClick={() => joinStream(stream.id)}
                                className="group text-left bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--color-primary)]/30 transition-all"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-black/50">
                                    {stream.thumbnailUrl ? (
                                        <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Radio size={36} className="text-white/20" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-red-500/90 text-white rounded-full text-xs font-bold">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        {t('LIVE', 'مباشر')}
                                    </div>
                                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white rounded-full text-xs">
                                        <Eye size={12} />
                                        {stream.viewerCount}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-bold text-white group-hover:text-[var(--color-primary)] transition-colors truncate">
                                        {stream.title}
                                    </h3>
                                    <p className="text-white/50 text-sm mt-1">{stream.hostName}</p>
                                    {stream.description && (
                                        <p className="text-white/30 text-xs mt-1 line-clamp-2">{stream.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-3 text-white/40 text-xs">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatDuration(stream.startedAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users size={12} />
                                            {stream.viewerCount} {t('watching', 'يشاهدون')}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ─── JSX: Watch ─────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={leaveStream}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{currentStream?.title}</h3>
                    <p className="text-white/40 text-xs">{currentStream?.hostName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                        {t('LIVE', 'مباشر')}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 text-white/60 rounded-full text-xs">
                        <Eye size={12} />
                        {viewerCount}
                    </div>
                </div>
            </div>

            {/* Video & Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Video */}
                <div className="lg:col-span-2">
                    <div className="relative aspect-video bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {!videoRef.current?.srcObject && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <Loader2 size={32} className="text-[var(--color-primary)] animate-spin mb-2" />
                                <p className="text-white/40 text-sm">{t('Connecting to stream...', 'جاري الاتصال بالبث...')}</p>
                            </div>
                        )}
                    </div>

                    {/* Stream Info */}
                    {currentStream && (
                        <div className="mt-4 space-y-3">
                            <h3 className="text-xl font-bold">{currentStream.title}</h3>
                            {currentStream.description && (
                                <p className="text-white/50 text-sm">{currentStream.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                                {currentStream.tags?.map((tag) => (
                                    <span key={tag} className="px-2 py-1 bg-white/5 rounded-lg text-white/40 text-xs">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 text-white/40 text-xs">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatDuration(currentStream.startedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users size={12} />
                                    {viewerCount} {t('watching', 'يشاهدون')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[500px] lg:h-auto">
                    {/* Chat Header */}
                    <div className="shrink-0 p-3 border-b border-white/10 flex items-center gap-2">
                        <MessageSquare size={16} className="text-[var(--color-primary)]" />
                        <span className="font-bold text-sm">{t('Live Chat', 'الدردشة المباشرة')}</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm">
                                <MessageSquare size={24} className="mb-2 opacity-30" />
                                {t('No messages yet', 'لا توجد رسائل بعد')}
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className="space-y-0.5">
                                    <span className="text-[var(--color-primary)] text-xs font-semibold">
                                        {msg.userName}
                                    </span>
                                    <p className="text-white/80 text-sm">{msg.message}</p>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="shrink-0 p-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                placeholder={t('Say something...', 'قل شيئاً...')}
                                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                            <button
                                onClick={sendChatMessage}
                                disabled={!chatInput.trim()}
                                className="w-9 h-9 rounded-xl bg-[var(--color-primary)] text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40 disabled:scale-100"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
