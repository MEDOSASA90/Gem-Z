'use client';

import React, { useState, useCallback } from 'react';
import {
    Share2,
    Facebook,
    Instagram,
    Music2,
    MessageCircle,
    Twitter,
    Link2,
    X,
    Download,
    Check,
    Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface ShareButtonProps {
    title: string;
    subtitle?: string;
    metric?: string;
    metricLabel?: string;
    type?: 'achievement' | 'workout' | 'progress' | 'challenge';
    gradient?: 'gold' | 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'neon' | 'dark';
    shareUrl?: string;
    onShareGenerated?: (imageUrl: string) => void;
}

interface ShareOption {
    id: string;
    label: string;
    labelAr: string;
    icon: React.ReactNode;
    color: string;
    hoverBg: string;
}

interface ShareResponse {
    success: boolean;
    data?: {
        imageUrl: string;
        width: number;
        height: number;
        sizeBytes: number;
    };
    message?: string;
}

// ─── Constants ────────────────────────────────────────────────────

const SHARE_OPTIONS: ShareOption[] = [
    {
        id: 'facebook',
        label: 'Facebook',
        labelAr: 'فيسبوك',
        icon: <Facebook size={22} />,
        color: '#1877F2',
        hoverBg: 'hover:bg-[#1877F2]/20',
    },
    {
        id: 'instagram',
        label: 'Instagram',
        labelAr: 'إنستغرام',
        icon: <Instagram size={22} />,
        color: '#E4405F',
        hoverBg: 'hover:bg-[#E4405F]/20',
    },
    {
        id: 'tiktok',
        label: 'TikTok',
        labelAr: 'تيك توك',
        icon: <Music2 size={22} />,
        color: '#000000',
        hoverBg: 'hover:bg-white/10',
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        labelAr: 'واتساب',
        icon: <MessageCircle size={22} />,
        color: '#25D366',
        hoverBg: 'hover:bg-[#25D366]/20',
    },
    {
        id: 'twitter',
        label: 'X / Twitter',
        labelAr: 'إكس',
        icon: <Twitter size={22} />,
        color: '#1DA1F2',
        hoverBg: 'hover:bg-[#1DA1F2]/20',
    },
    {
        id: 'copy',
        label: 'Copy Link',
        labelAr: 'نسخ الرابط',
        icon: <Link2 size={22} />,
        color: '#C0FF00',
        hoverBg: 'hover:bg-[#C0FF00]/20',
    },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Component ────────────────────────────────────────────────────

export default function ShareButton({
    title,
    subtitle,
    metric,
    metricLabel,
    type = 'achievement',
    gradient = 'neon',
    shareUrl = typeof window !== 'undefined' ? window.location.href : '',
    onShareGenerated,
}: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Handlers ─────────────────────────────────────────────────

    const handleGenerateImage = useCallback(async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/shares/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    type,
                    title,
                    subtitle,
                    metric,
                    metricLabel,
                    gradient,
                }),
            });

            const data: ShareResponse = await response.json();

            if (data.success && data.data?.imageUrl) {
                setGeneratedImage(data.data.imageUrl);
                onShareGenerated?.(data.data.imageUrl);
            } else {
                setError(data.message || 'Failed to generate share image');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [title, subtitle, metric, metricLabel, type, gradient, onShareGenerated]);

    const handleNativeShare = useCallback(async (platform: string) => {
        if (platform === 'copy') {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // Fallback
                const input = document.createElement('input');
                input.value = shareUrl;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
            return;
        }

        // Open native share window for supported platforms
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedTitle = encodeURIComponent(title);

        const urls: Record<string, string> = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        };

        if (urls[platform]) {
            window.open(urls[platform], '_blank', 'width=600,height=400,noopener,noreferrer');
        }

        // Record the share event
        if (generatedImage) {
            const shareId = generatedImage.split('share_')[1]?.split('.')[0];
            if (shareId) {
                fetch(`${API_BASE}/shares/share_${shareId}/record`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform }),
                }).catch(() => {});
            }
        }
    }, [shareUrl, title, generatedImage]);

    const handleDownload = useCallback(async () => {
        if (!generatedImage) return;

        try {
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemz-share-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download image');
        }
    }, [generatedImage]);

    // ─── Render ───────────────────────────────────────────────────

    return (
        <>
            {/* Share Trigger Button */}
            <button
                onClick={() => {
                    setIsOpen(true);
                    if (!generatedImage) handleGenerateImage();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-black font-semibold rounded-xl shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
                <Share2 size={18} />
                <span>Share</span>
            </button>

            {/* Share Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white">Share Achievement</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-5">
                            {/* Preview */}
                            {isGenerating ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <Loader2 size={32} className="text-[var(--color-primary)] animate-spin" />
                                    <p className="text-sm text-white/60">Generating your share image...</p>
                                </div>
                            ) : generatedImage ? (
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                        <img
                                            src={generatedImage}
                                            alt="Share preview"
                                            className="w-full h-auto object-cover"
                                        />
                                    </div>
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/80 hover:text-white transition-colors"
                                    >
                                        <Download size={16} />
                                        Download Image
                                    </button>
                                </div>
                            ) : null}

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Share Options Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {SHARE_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleNativeShare(option.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 ${option.hoverBg} transition-all duration-200 hover:border-white/15`}
                                    >
                                        <span style={{ color: option.color }}>{option.icon}</span>
                                        <span className="text-xs text-white/70 font-medium">
                                            {option.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Copy Link Row */}
                            <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                                <Link2 size={16} className="text-white/40 shrink-0" />
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-transparent text-sm text-white/60 outline-none truncate"
                                />
                                <button
                                    onClick={() => handleNativeShare('copy')}
                                    className="shrink-0 px-3 py-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-semibold rounded-lg hover:bg-[var(--color-primary)]/30 transition-colors"
                                >
                                    {copied ? (
                                        <span className="flex items-center gap-1">
                                            <Check size={14} /> Copied
                                        </span>
                                    ) : (
                                        'Copy'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Share Bar Component ──────────────────────────────────────────

interface ShareBarProps {
    title: string;
    subtitle?: string;
    metric?: string;
    metricLabel?: string;
    type?: 'achievement' | 'workout' | 'progress' | 'challenge';
    gradient?: 'gold' | 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'neon' | 'dark';
}

export function ShareBar({ title, subtitle, metric, metricLabel, type, gradient }: ShareBarProps) {
    return (
        <div className="flex items-center gap-3">
            <ShareButton
                title={title}
                subtitle={subtitle}
                metric={metric}
                metricLabel={metricLabel}
                type={type}
                gradient={gradient}
            />
        </div>
    );
}
