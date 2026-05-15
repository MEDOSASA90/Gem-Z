'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState, SpinnerOverlay } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface BadgeProgress {
    badgeId: string;
    badgeName: string;
    badgeDescription: string;
    badgeIcon: string;
    badgeColor: string;
    badgeCategory: string;
    badgeTier: string;
    pointsAwarded: number;
    progress: number;
    currentValue: number;
    targetValue: number;
    unit: string;
    earned: boolean;
    earnedAt: string | null;
}

interface BadgeStats {
    totalBadges: number;
    earnedBadges: number;
    totalPoints: number;
    categoryBreakdown: Record<string, number>;
    tierBreakdown: Record<string, number>;
}

const TIER_COLORS: Record<string, string> = {
    bronze: 'from-orange-700 to-amber-900',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-amber-600',
    platinum: 'from-cyan-400 to-blue-600',
    diamond: 'from-cyan-200 to-blue-400',
};

const TIER_BORDERS: Record<string, string> = {
    bronze: 'border-orange-600',
    silver: 'border-gray-400',
    gold: 'border-yellow-400',
    platinum: 'border-cyan-400',
    diamond: 'border-cyan-200',
};

const CATEGORY_ICONS: Record<string, string> = {
    fitness: 'fitness_center',
    nutrition: 'restaurant',
    social: 'groups',
    sleep: 'bedtime',
    hydration: 'water_drop',
    consistency: 'local_fire_department',
    milestone: 'military_tech',
};

// ─── BadgeCollection Component ──────────────────────────────────

export default function BadgeCollection() {
    const [badges, setBadges] = useState<BadgeProgress[]>([]);
    const [stats, setStats] = useState<BadgeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [newlyEarned, setNewlyEarned] = useState<string[]>([]);

    const fetchBadges = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [badgesRes, statsRes] = await Promise.all([
                fetch('/api/v1/badges', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/v1/badges/stats', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const [badgesData, statsData] = await Promise.all([
                badgesRes.json(), statsRes.json(),
            ]);
            if (badgesData.success) setBadges(badgesData.data);
            if (statsData.success) setStats(statsData.data);
        } catch {
            setError('Failed to load badges');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBadges(); }, [fetchBadges]);

    const checkBadges = async () => {
        setChecking(true);
        try {
            const res = await fetch('/api/v1/badges/check', {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (data.success && data.data.awarded.length > 0) {
                setNewlyEarned(data.data.awarded.map((b: any) => b.badgeId));
                setTimeout(() => setNewlyEarned([]), 5000);
                fetchBadges();
            }
        } catch {
            setError('Failed to check badges');
        } finally {
            setChecking(false);
        }
    };

    const categories = ['all', ...Array.from(new Set(badges.map(b => b.badgeCategory)))];

    const filteredBadges = activeCategory === 'all'
        ? badges
        : badges.filter(b => b.badgeCategory === activeCategory);

    const earnedCount = badges.filter(b => b.earned).length;
    const totalCount = badges.length;

    if (loading) return <SpinnerOverlay text="Loading badges..." />;

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#FFD700]">emoji_events</span>
                        Badge Collection
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Earn badges by completing fitness milestones</p>
                </div>
                <ApiButton
                    loading={checking}
                    onClick={checkBadges}
                    icon={<span className="material-symbols-outlined">refresh</span>}
                >
                    Check Progress
                </ApiButton>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

            {/* Newly Earned Banner */}
            {newlyEarned.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <span className="material-symbols-outlined text-green-400 text-2xl">celebration</span>
                    <div>
                        <p className="text-green-400 font-bold">New Badges Earned!</p>
                        <p className="text-green-400/60 text-sm">Congratulations on your new achievements!</p>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#FFD700]">{earnedCount}/{totalCount}</p>
                        <p className="text-white/30 text-xs uppercase font-bold">Badges Earned</p>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#ff7b00]">{stats.totalPoints.toLocaleString()}</p>
                        <p className="text-white/30 text-xs uppercase font-bold">Points</p>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-green-400">
                            {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
                        </p>
                        <p className="text-white/30 text-xs uppercase font-bold">Completion</p>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#00B8FF]">
                            {Object.keys(stats.categoryBreakdown).length}
                        </p>
                        <p className="text-white/30 text-xs uppercase font-bold">Categories</p>
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {stats && Object.keys(stats.categoryBreakdown).length > 0 && (
                <ApiCard>
                    <h3 className="text-sm font-bold text-white/50 uppercase mb-3">Category Progress</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {Object.entries(stats.categoryBreakdown).map(([category, count]) => {
                            const icon = CATEGORY_ICONS[category] || 'stars';
                            const totalInCategory = badges.filter(b => b.badgeCategory === category).length;
                            return (
                                <div key={category} className="bg-white/5 rounded-xl p-3 text-center">
                                    <span className="material-symbols-outlined text-white/40">{icon}</span>
                                    <p className="text-white font-bold text-lg">{count}/{totalInCategory}</p>
                                    <p className="text-white/30 text-xs capitalize">{category}</p>
                                </div>
                            );
                        })}
                    </div>
                </ApiCard>
            )}

            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                            activeCategory === cat
                                ? 'bg-[#FFD700] text-black'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Badge Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBadges.map(badge => {
                    const tierGradient = TIER_COLORS[badge.badgeTier] || TIER_COLORS.bronze;
                    const tierBorder = TIER_BORDERS[badge.badgeTier] || TIER_BORDERS.bronze;
                    const isNewlyEarned = newlyEarned.includes(badge.badgeId);

                    return (
                        <div
                            key={badge.badgeId}
                            className={`relative bg-white/[0.04] border rounded-2xl p-5 transition-all ${
                                badge.earned
                                    ? `${tierBorder} ${isNewlyEarned ? 'ring-2 ring-green-400' : ''}`
                                    : 'border-white/10 opacity-70'
                            }`}
                        >
                            {/* Earned Indicator */}
                            {badge.earned && (
                                <div className="absolute top-3 right-3">
                                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                                </div>
                            )}

                            {/* New Badge */}
                            {isNewlyEarned && (
                                <div className="absolute -top-2 -left-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    NEW
                                </div>
                            )}

                            {/* Badge Icon */}
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tierGradient} flex items-center justify-center mb-4 mx-auto ${
                                !badge.earned ? 'grayscale' : ''
                            }`}>
                                <span
                                    className="material-symbols-outlined text-3xl"
                                    style={{ color: badge.badgeColor, fontVariationSettings: "'FILL' 1" }}
                                >
                                    {badge.badgeIcon}
                                </span>
                            </div>

                            {/* Badge Info */}
                            <div className="text-center">
                                <h3 className="text-white font-bold text-sm">{badge.badgeName}</h3>
                                <p className="text-white/40 text-xs mt-1">{badge.badgeDescription}</p>
                            </div>

                            {/* Tier Badge */}
                            <div className="flex justify-center mt-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    badge.badgeTier === 'bronze' ? 'bg-orange-500/20 text-orange-400' :
                                    badge.badgeTier === 'silver' ? 'bg-gray-400/20 text-gray-300' :
                                    badge.badgeTier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                                    badge.badgeTier === 'platinum' ? 'bg-cyan-500/20 text-cyan-400' :
                                    'bg-cyan-200/20 text-cyan-200'
                                }`}>
                                    {badge.badgeTier}
                                </span>
                                <span className="text-[10px] bg-white/5 text-white/30 ml-2 px-2 py-0.5 rounded-full capitalize">
                                    {badge.badgeCategory}
                                </span>
                            </div>

                            {/* Progress Bar (for unearned) */}
                            {!badge.earned && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] text-white/30 mb-1">
                                        <span>{badge.currentValue} / {badge.targetValue} {badge.unit}</span>
                                        <span>{badge.progress}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#FFD700] transition-all"
                                            style={{ width: `${badge.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Points */}
                            {badge.earned && (
                                <p className="text-center text-[#ff7b00] text-xs font-bold mt-2">
                                    +{badge.pointsAwarded} pts
                                </p>
                            )}

                            {/* Earned Date */}
                            {badge.earnedAt && (
                                <p className="text-center text-white/20 text-[10px] mt-1">
                                    Earned {new Date(badge.earnedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredBadges.length === 0 && (
                <EmptyState icon="emoji_events" title="No badges in this category" subtitle="Keep going to earn more!" />
            )}
        </div>
    );
}
