'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Play,
    Pause,
    Search,
    Clock,
    Eye,
    Heart,
    Filter,
    X,
    ChevronRight,
    Volume2,
    VolumeX,
    Maximize2,
    Loader2,
    Grid3X3,
    List,
    Tag,
    User,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface VideoTutorial {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    category: string;
    tags: string[];
    trainerName?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    language: string;
    viewCount: number;
    likeCount: number;
    liked?: boolean;
    isPublished: boolean;
    createdAt: string;
}

interface VideoCategory {
    name: string;
    count: number;
}

interface VideoLibraryProps {
    onVideoSelect?: (video: VideoTutorial) => void;
    embedPlayer?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const DIFFICULTY_LABELS: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-yellow-500/20 text-yellow-400',
    advanced: 'bg-red-500/20 text-red-400',
};

const CATEGORY_ICONS: Record<string, string> = {
    workout: 'Dumbbell',
    nutrition: 'Apple',
    technique: 'Target',
    stretching: 'Move',
    motivation: 'Flame',
    education: 'BookOpen',
    yoga: 'Sun',
    cardio: 'Heart',
    strength: 'Zap',
    hiit: 'Timer',
};

// ─── Component ────────────────────────────────────────────────────

export default function VideoLibrary({ onVideoSelect, embedPlayer = true }: VideoLibraryProps) {
    const [videos, setVideos] = useState<VideoTutorial[]>([]);
    const [categories, setCategories] = useState<VideoCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    // ─── Data Fetching ────────────────────────────────────────────

    const fetchVideos = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set('q', searchQuery);
            if (selectedCategory) params.set('category', selectedCategory);
            if (difficultyFilter) params.set('difficulty', difficultyFilter);
            params.set('page', String(page));
            params.set('limit', '20');

            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/videos?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const data = await response.json();

            if (data.success) {
                setVideos(data.data.videos);
                setCategories(data.data.categories);
                setTotalPages(data.data.totalPages);
            } else {
                setError(data.message || 'Failed to load videos');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedCategory, difficultyFilter, page]);

    const fetchVideoDetails = useCallback(async (videoId: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/videos/${videoId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const data = await response.json();

            if (data.success) {
                setSelectedVideo(data.data);
                onVideoSelect?.(data.data);
                setIsPlaying(true);
            }
        } catch {
            setError('Failed to load video details');
        }
    }, [onVideoSelect]);

    const toggleLike = useCallback(async (videoId: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/videos/${videoId}/like`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (data.success) {
                setVideos((prev) =>
                    prev.map((v) =>
                        v.id === videoId
                            ? { ...v, liked: data.data.liked, likeCount: data.data.likeCount }
                            : v
                    )
                );
                if (selectedVideo?.id === videoId) {
                    setSelectedVideo((prev) =>
                        prev
                            ? { ...prev, liked: data.data.liked, likeCount: data.data.likeCount }
                            : null
                    );
                }
            }
        } catch {
            // Silently fail
        }
    }, [selectedVideo]);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    // ─── Video Player Handlers ────────────────────────────────────

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play();
                progressInterval.current = setInterval(() => {
                    if (videoRef.current) {
                        const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                        setProgress(pct || 0);
                    }
                }, 1000);
            } else {
                videoRef.current.pause();
                if (progressInterval.current) {
                    clearInterval(progressInterval.current);
                }
            }
        }

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [isPlaying, selectedVideo]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pct = Number(e.target.value);
        setProgress(pct);
        if (videoRef.current) {
            videoRef.current.currentTime = (videoRef.current.duration * pct) / 100;
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ─── Render ───────────────────────────────────────────────────

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-white">Video Library</h2>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-white/5 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-l-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-white/40 hover:text-white'}`}
                        >
                            <Grid3X3 size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-r-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-white/40 hover:text-white'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-secondary)]/50 transition-colors placeholder:text-white/30"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setPage(1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <select
                    value={difficultyFilter || ''}
                    onChange={(e) => {
                        setDifficultyFilter(e.target.value || null);
                        setPage(1);
                    }}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
                >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </select>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => {
                        setSelectedCategory(null);
                        setPage(1);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        !selectedCategory
                            ? 'bg-[var(--color-primary)] text-black'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                >
                    All ({categories.reduce((acc, c) => acc + c.count, 0)})
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => {
                            setSelectedCategory(cat.name === selectedCategory ? null : cat.name);
                            setPage(1);
                        }}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                            selectedCategory === cat.name
                                ? 'bg-[var(--color-primary)] text-black'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                    >
                        {cat.name} ({cat.count})
                    </button>
                ))}
            </div>

            {/* Video Player (when selected) */}
            {embedPlayer && selectedVideo && (
                <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                    <video
                        ref={videoRef}
                        src={selectedVideo.videoUrl}
                        className="w-full aspect-video bg-black"
                        onEnded={() => setIsPlaying(false)}
                        muted={isMuted}
                        playsInline
                    />

                    {/* Player Controls Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        {/* Top Bar */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-white font-semibold text-lg">{selectedVideo.title}</h3>
                                <div className="flex items-center gap-3 mt-1 text-white/60 text-xs">
                                    {selectedVideo.trainerName && (
                                        <span className="flex items-center gap-1">
                                            <User size={12} /> {selectedVideo.trainerName}
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLORS[selectedVideo.difficulty]}`}>
                                        {DIFFICULTY_LABELS[selectedVideo.difficulty]}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedVideo(null);
                                    setIsPlaying(false);
                                    setProgress(0);
                                }}
                                className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Center Play Button */}
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="self-center w-16 h-16 rounded-full bg-[var(--color-primary)]/90 flex items-center justify-center text-black hover:scale-110 transition-transform"
                        >
                            {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                        </button>

                        {/* Bottom Controls */}
                        <div className="space-y-2">
                            {/* Progress Bar */}
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={progress}
                                onChange={handleSeek}
                                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:rounded-full"
                            />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        className="text-white/70 hover:text-white transition-colors"
                                    >
                                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                    </button>
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="text-white/70 hover:text-white transition-colors"
                                    >
                                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <span className="text-xs text-white/50">
                                        {formatDuration(selectedVideo.duration)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleLike(selectedVideo.id)}
                                        className={`flex items-center gap-1 text-sm transition-colors ${selectedVideo.liked ? 'text-red-400' : 'text-white/50 hover:text-white'}`}
                                    >
                                        <Heart size={16} fill={selectedVideo.liked ? 'currentColor' : 'none'} />
                                        {selectedVideo.likeCount}
                                    </button>
                                    <button className="text-white/50 hover:text-white transition-colors">
                                        <Maximize2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video List */}
            {isLoading && videos.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-400">{error}</div>
            ) : videos.length === 0 ? (
                <div className="text-center py-20 text-white/40">
                    <Play size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No videos found matching your criteria</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map((video) => (
                        <button
                            key={video.id}
                            onClick={() => fetchVideoDetails(video.id)}
                            className="group text-left bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all hover:shadow-lg"
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-black/30 overflow-hidden">
                                {video.thumbnailUrl ? (
                                    <img
                                        src={video.thumbnailUrl}
                                        alt={video.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20">
                                        <Play size={32} className="text-white/40" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                                        <Play size={20} className="ml-0.5" />
                                    </div>
                                </div>
                                {video.duration && (
                                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">
                                        {formatDuration(video.duration)}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                                    {video.title}
                                </h4>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLORS[video.difficulty]}`}>
                                            {DIFFICULTY_LABELS[video.difficulty]}
                                        </span>
                                        <span className="text-[10px] text-white/40 capitalize">{video.category}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/30 text-[10px]">
                                        <span className="flex items-center gap-0.5">
                                            <Eye size={10} /> {formatCount(video.viewCount)}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Heart size={10} /> {formatCount(video.likeCount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {videos.map((video) => (
                        <button
                            key={video.id}
                            onClick={() => fetchVideoDetails(video.id)}
                            className="group w-full flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all text-left"
                        >
                            {/* Thumbnail */}
                            <div className="relative shrink-0 w-36 aspect-video bg-black/30 rounded-lg overflow-hidden">
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Play size={20} className="text-white/30" />
                                    </div>
                                )}
                                {video.duration && (
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">
                                        {formatDuration(video.duration)}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                    {video.title}
                                </h4>
                                <p className="text-xs text-white/50 mt-1 line-clamp-1">{video.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLORS[video.difficulty]}`}>
                                        {DIFFICULTY_LABELS[video.difficulty]}
                                    </span>
                                    <span className="text-[10px] text-white/40 capitalize flex items-center gap-1">
                                        <Tag size={10} /> {video.category}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                                        <Eye size={10} /> {formatCount(video.viewCount)}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                                        <Heart size={10} /> {formatCount(video.likeCount)}
                                    </span>
                                </div>
                            </div>

                            <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
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
        </div>
    );

    function formatCount(num: number): string {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return String(num);
    }
}
