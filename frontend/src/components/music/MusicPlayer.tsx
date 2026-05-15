'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Music,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Headphones,
    WifiOff,
    Zap,
    Flame,
    Wind,
    Droplets,
    Volume2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ExternalLink,
    AlertTriangle,
    ListMusic,
    Radio,
    Loader2,
} from 'lucide-react';
import { ApiButton, ApiCard } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface MusicPlaylist {
    id: string;
    name: string;
    description?: string;
    intensity: 'low' | 'medium' | 'high' | 'extreme';
    workoutType?: string;
    trackCount: number;
    imageUrl?: string;
    isGemzCurated: boolean;
    durationMinutes?: number;
}

interface NowPlaying {
    trackName: string;
    artistName: string;
    albumName: string;
    albumImageUrl?: string;
    durationMs: number;
    progressMs: number;
    isPlaying: boolean;
    playlistName?: string;
}

interface ConnectionStatus {
    connected: boolean;
    provider?: string;
    preferredIntensity?: string;
    playlistSyncEnabled?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const INTENSITY_CONFIG = {
    low: { label: 'Low', labelAr: 'منخفض', icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    medium: { label: 'Medium', labelAr: 'متوسط', icon: Wind, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
    high: { label: 'High', labelAr: 'عالي', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    extreme: { label: 'Extreme', labelAr: 'شديد', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

// ─── Mini Player ──────────────────────────────────────────────────

function MiniPlayer({ nowPlaying, isSimulated, onTogglePlay }: { nowPlaying: NowPlaying; isSimulated: boolean; onTogglePlay: () => void }) {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const progressPercent = nowPlaying.durationMs > 0
        ? Math.min(100, (nowPlaying.progressMs / nowPlaying.durationMs) * 100)
        : 0;

    const formatTime = (ms: number) => {
        const secs = Math.floor(ms / 1000);
        const mins = Math.floor(secs / 60);
        const rem = secs % 60;
        return `${mins}:${rem.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
                {nowPlaying.albumImageUrl ? (
                    <img src={nowPlaying.albumImageUrl} alt="album" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/30 to-purple-500/30 flex items-center justify-center">
                        <Music size={24} className="text-white/40" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-semibold truncate">{nowPlaying.trackName}</h4>
                    <p className="text-white/40 text-xs truncate">{nowPlaying.artistName}</p>
                    {nowPlaying.playlistName && (
                        <p className="text-white/30 text-[10px] flex items-center gap-1 mt-0.5">
                            <ListMusic size={10} />
                            {nowPlaying.playlistName}
                        </p>
                    )}
                </div>
                <button
                    onClick={onTogglePlay}
                    className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-black hover:scale-105 transition-transform"
                >
                    {nowPlaying.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
            </div>
            <div className="space-y-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between text-white/20 text-[10px]">
                    <span>{formatTime(nowPlaying.progressMs)}</span>
                    <span>{formatTime(nowPlaying.durationMs)}</span>
                </div>
            </div>
            {isSimulated && (
                <div className="flex items-center gap-1 text-white/20 text-[10px]">
                    <Radio size={10} />
                    {t('Simulated playback — Connect Spotify for real audio', 'تشغيل محاكي — اتصل بسبوتيفاي للصوت الحقيقي')}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export default function MusicPlayer() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [connection, setConnection] = useState<ConnectionStatus | null>(null);
    const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
    const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
    const [selectedIntensity, setSelectedIntensity] = useState<string>('medium');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [simulatedPlaying, setSimulatedPlaying] = useState(false);
    const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

    // ─── Fetch Data ─────────────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/music/status`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setConnection(data.data);
                if (data.data.preferredIntensity) {
                    setSelectedIntensity(data.data.preferredIntensity);
                }
            }
        } catch {
            // silently fail
        }
    }, []);

    const fetchPlaylists = useCallback(async (intensity?: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const url = new URL(`${API_BASE}/music/playlists`);
            if (intensity) url.searchParams.set('intensity', intensity);

            const response = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setPlaylists(data.data);
            }
        } catch {
            setError(t('Failed to load playlists', 'فشل تحميل قوائم التشغيل'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    const fetchNowPlaying = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/music/now-playing`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success && data.data) {
                setNowPlaying(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchPlaylists();
        fetchNowPlaying();

        // Poll now-playing every 10s if connected
        const interval = setInterval(() => {
            if (connection?.connected) {
                fetchNowPlaying();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchStatus, fetchPlaylists, fetchNowPlaying, connection?.connected]);

    // ─── Actions ────────────────────────────────────────────────────

    const handleConnect = () => {
        setIsConnecting(true);
        // In production, this would open Spotify OAuth
        // For now, simulate connection
        setTimeout(() => {
            setConnection({ connected: true, provider: 'spotify', preferredIntensity: 'medium' });
            setIsConnecting(false);
        }, 1500);
    };

    const handleIntensityChange = async (intensity: string) => {
        setSelectedIntensity(intensity);
        await fetchPlaylists(intensity);

        if (connection?.connected) {
            try {
                const token = localStorage.getItem('gemz_access_token');
                await fetch(`${API_BASE}/music/intensity`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ intensity }),
                });
            } catch {
                // silently fail
            }
        }
    };

    const simulatePlayback = (playlist: MusicPlaylist) => {
        setSimulatedPlaying(true);
        setNowPlaying({
            trackName: `${playlist.name} — Track 1`,
            artistName: 'Workout Mix',
            albumName: playlist.name,
            durationMs: 180000,
            progressMs: 0,
            isPlaying: true,
            playlistName: playlist.name,
        });
    };

    const togglePlay = () => {
        if (nowPlaying) {
            setNowPlaying({ ...nowPlaying, isPlaying: !nowPlaying.isPlaying });
        }
    };

    // ─── Playlist Card ──────────────────────────────────────────────

    const PlaylistCard = ({ playlist }: { playlist: MusicPlaylist }) => {
        const intensity = INTENSITY_CONFIG[playlist.intensity];
        const IntensityIcon = intensity.icon;

        return (
            <div
                className="bg-white/[0.03] rounded-xl border border-white/10 hover:border-[var(--color-primary)]/30 transition-all overflow-hidden cursor-pointer group"
                onClick={() => simulatePlayback(playlist)}
            >
                <div className="flex gap-3 p-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-purple-500/20 flex items-center justify-center shrink-0 group-hover:from-[var(--color-primary)]/40 group-hover:to-purple-500/40 transition-all">
                        {playlist.imageUrl ? (
                            <img src={playlist.imageUrl} alt={playlist.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <Headphones size={24} className="text-white/40" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-white text-sm font-semibold truncate">{playlist.name}</h4>
                            {playlist.isGemzCurated && (
                                <span className="px-1.5 py-0.5 bg-[var(--color-primary)]/20 rounded text-[10px] text-[var(--color-primary)] font-bold shrink-0">
                                    GEM Z
                                </span>
                            )}
                        </div>
                        {playlist.description && (
                            <p className="text-white/30 text-xs truncate mt-0.5">{playlist.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${intensity.bg} ${intensity.color}`}>
                                <IntensityIcon size={10} />
                                {isArabic ? intensity.labelAr : intensity.label}
                            </span>
                            <span className="text-white/20 text-[10px]">{playlist.trackCount} tracks</span>
                            {playlist.durationMinutes && (
                                <span className="text-white/20 text-[10px]">{playlist.durationMinutes}min</span>
                            )}
                            {playlist.workoutType && (
                                <span className="text-white/20 text-[10px]">{playlist.workoutType}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center self-center">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-black transition-all">
                            <Play size={14} className="text-white/40 group-hover:text-black" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ─── Not Connected State ────────────────────────────────────────

    if (!connection?.connected) {
        return (
            <div className="space-y-6 max-w-lg mx-auto">
                <div className="text-center">
                    <Headphones className="text-[var(--color-primary)] mx-auto mb-3" size={40} />
                    <h2 className="text-2xl font-bold font-heading text-white">
                        {t('Music', 'الموسيقى')}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">
                        {t('Connect Spotify for workout music that adapts to your intensity', 'اتصل بسبوتيفاي لموسيقى التمرين التي تتكيف مع شدتك')}
                    </p>
                </div>

                <ApiCard className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-[#1DB954]/10 flex items-center justify-center mx-auto">
                        <Music size={36} className="text-[#1DB954]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">Spotify</h3>
                        <p className="text-white/40 text-sm mt-1">
                            {t('Connect your Spotify account to access workout playlists synced to your training intensity', 'اربط حساب سبوتيفاي للوصول إلى قوائم تشغيل التمرين المتزامنة مع شدتك')}
                        </p>
                    </div>
                    <ApiButton onClick={handleConnect} loading={isConnecting} icon={<ExternalLink size={18} />} variant="primary" fullWidth>
                        {isConnecting ? t('Connecting...', 'جاري الاتصال...') : t('Connect Spotify', 'اتصل بسبوتيفاي')}
                    </ApiButton>

                    <div className="pt-2 border-t border-white/5">
                        <p className="text-white/20 text-[10px]">
                            {t('Or try simulated playlists below', 'أو جرب قوائم التشغيل المحاكاة أدناه')}
                        </p>
                    </div>
                </ApiCard>

                {/* Simulated playlists for demo */}
                <div className="space-y-3">
                    <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                        {t('Demo Playlists', 'قوائم تشغيل تجريبية')}
                    </h3>
                    {[
                        { id: '1', name: 'HIIT Power', description: 'High-intensity interval training beats', intensity: 'extreme' as const, trackCount: 25, isGemzCurated: true, durationMinutes: 45, workoutType: 'HIIT' },
                        { id: '2', name: 'Gym Flow', description: 'Steady gym workout mix', intensity: 'high' as const, trackCount: 40, isGemzCurated: true, durationMinutes: 60, workoutType: 'Strength' },
                        { id: '3', name: 'Yoga & Stretch', description: 'Calm and relaxing', intensity: 'low' as const, trackCount: 20, isGemzCurated: true, durationMinutes: 30, workoutType: 'Yoga' },
                    ].map((p) => (
                        <PlaylistCard key={p.id} playlist={p} />
                    ))}
                </div>
            </div>
        );
    }

    // ─── Connected State ────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                        <Music size={20} className="text-[#1DB954]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold font-heading text-white">
                            {t('Music Player', 'مشغل الموسيقى')}
                        </h2>
                        <p className="text-white/40 text-xs">
                            {t('Spotify Connected', 'متصل بسبوتيفاي')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleConnect}
                    className="text-white/30 hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                    <RefreshCw size={12} />
                    {t('Reconnect', 'إعادة الاتصال')}
                </button>
            </div>

            {/* Now Playing */}
            {nowPlaying && (
                <MiniPlayer nowPlaying={nowPlaying} isSimulated={simulatedPlaying} onTogglePlay={togglePlay} />
            )}

            {/* Intensity Selector */}
            <ApiCard>
                <h3 className="font-bold text-white flex items-center gap-2 mb-3">
                    <Zap size={18} className="text-[var(--color-primary)]" />
                    {t('Workout Intensity', 'شدة التمرين')}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(INTENSITY_CONFIG) as [string, typeof INTENSITY_CONFIG.low][]).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                            <button
                                key={key}
                                onClick={() => handleIntensityChange(key)}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border ${
                                    selectedIntensity === key
                                        ? `${config.bg} ${config.border} ${config.color}`
                                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                }`}
                            >
                                <Icon size={20} />
                                <span className="text-xs font-semibold">{isArabic ? config.labelAr : config.label}</span>
                            </button>
                        );
                    })}
                </div>
            </ApiCard>

            {/* Playlists */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <ListMusic size={18} className="text-[var(--color-primary)]" />
                        {t('Workout Playlists', 'قوائم تشغيل التمرين')}
                    </h3>
                    <span className="text-white/30 text-xs">{playlists.length} playlists</span>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                    </div>
                ) : playlists.length > 0 ? (
                    <div className="space-y-2">
                        {playlists.map((playlist) => (
                            <PlaylistCard key={playlist.id} playlist={playlist} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/5">
                        <Music size={32} className="text-white/10 mx-auto mb-2" />
                        <p className="text-white/30 text-sm">{t('No playlists found', 'لم يتم العثور على قوائم تشغيل')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
