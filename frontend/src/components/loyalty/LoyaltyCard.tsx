'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiCard, ApiButton, EmptyState, SpinnerOverlay } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface LoyaltyTier {
    id: string;
    name: string;
    minPoints: number;
    maxPoints: number | null;
    discountPercent: number;
    freePassesPerMonth: number;
    priorityBooking: boolean;
    color: string;
    icon: string;
}

interface PointsTransaction {
    id: string;
    userId: string;
    points: number;
    type: 'checkin' | 'purchase' | 'referral' | 'challenge' | 'redemption' | 'bonus';
    description: string;
    referenceId: string | null;
    createdAt: string;
}

interface LoyaltyPoints {
    userId: string;
    totalPoints: number;
    lifetimePoints: number;
    currentTier: string;
    nextTier: string | null;
    pointsToNextTier: number;
    recentTransactions: PointsTransaction[];
}

interface LoyaltyReward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: 'discount' | 'free_pass' | 'merchandise' | 'priority' | 'experience';
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
    expiresAt: string | null;
}

interface TierStatus {
    tier: LoyaltyTier;
    progress: number;
    pointsToNext: number;
}

const CATEGORY_ICONS: Record<string, string> = {
    discount: 'percent',
    free_pass: 'local_activity',
    merchandise: 'redeem',
    priority: 'star',
    experience: 'auto_awesome',
};

const TYPE_COLORS: Record<string, string> = {
    checkin: 'text-green-400',
    purchase: 'text-blue-400',
    referral: 'text-purple-400',
    challenge: 'text-orange-400',
    redemption: 'text-red-400',
    bonus: 'text-yellow-400',
};

// ─── LoyaltyCard Component ──────────────────────────────────────

export default function LoyaltyCard() {
    const [points, setPoints] = useState<LoyaltyPoints | null>(null);
    const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
    const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
    const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'history'>('overview');

    const getToken = () => localStorage.getItem('token') || '';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pointsRes, tiersRes, tierStatusRes, rewardsRes] = await Promise.all([
                fetch('/api/v1/loyalty/points', { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/v1/loyalty/tiers', { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/v1/loyalty/tier-status', { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/v1/loyalty/rewards', { headers: { Authorization: `Bearer ${getToken()}` } }),
            ]);

            const [pointsData, tiersData, tierStatusData, rewardsData] = await Promise.all([
                pointsRes.json(), tiersRes.json(), tierStatusRes.json(), rewardsRes.json(),
            ]);

            if (pointsData.success) setPoints(pointsData.data);
            if (tiersData.success) setTiers(tiersData.data);
            if (tierStatusData.success) setTierStatus(tierStatusData.data);
            if (rewardsData.success) setRewards(rewardsData.data);
        } catch {
            setError('Failed to load loyalty data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRedeem = async (rewardId: string) => {
        setRedeeming(rewardId);
        setError(null);
        setSuccessMessage(null);
        try {
            const res = await fetch('/api/v1/loyalty/redeem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ rewardId }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(data.message);
                fetchData();
                setTimeout(() => setSuccessMessage(null), 5000);
            } else {
                setError(data.message || 'Redemption failed');
            }
        } catch {
            setError('Failed to redeem reward');
        } finally {
            setRedeeming(null);
        }
    };

    const categories = ['all', ...Array.from(new Set(rewards.map(r => r.category)))];

    const filteredRewards = activeCategory === 'all'
        ? rewards
        : rewards.filter(r => r.category === activeCategory);

    if (loading) return <SpinnerOverlay text="Loading loyalty program..." />;

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined" style={{ color: tierStatus?.tier?.color || '#FFD700' }}>diamond</span>
                        Loyalty Program
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Earn points, unlock tiers, redeem rewards</p>
                </div>
                {points && (
                    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2">
                        <span className="material-symbols-outlined text-[#FFD700]">monetization_on</span>
                        <div>
                            <p className="text-[#FFD700] font-bold text-xl">{points.totalPoints.toLocaleString()}</p>
                            <p className="text-white/30 text-[10px] uppercase font-bold">Points</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <span className="material-symbols-outlined text-green-400 text-2xl">celebration</span>
                    <p className="text-green-400 font-bold">{successMessage}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-0">
                {(['overview', 'rewards', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-all ${
                            activeTab === tab
                                ? 'bg-[#FFD700] text-black'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* ─── Overview Tab ─────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Current Tier Card */}
                    {tierStatus && (
                        <ApiCard>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div
                                    className="w-24 h-24 rounded-2xl flex items-center justify-center"
                                    style={{ background: `linear-gradient(135deg, ${tierStatus.tier.color}, ${tierStatus.tier.color}44)` }}
                                >
                                    <span className="material-symbols-outlined text-5xl text-white">{tierStatus.tier.icon}</span>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-2xl font-bold" style={{ color: tierStatus.tier.color }}>
                                        {tierStatus.tier.name} Member
                                    </h2>
                                    <div className="mt-2 space-y-1">
                                        {tierStatus.tier.discountPercent > 0 && (
                                            <p className="text-white/60 text-sm flex items-center gap-2 justify-center md:justify-start">
                                                <span className="material-symbols-outlined text-sm">percent</span>
                                                {tierStatus.tier.discountPercent}% store discount
                                            </p>
                                        )}
                                        {tierStatus.tier.freePassesPerMonth > 0 && (
                                            <p className="text-white/60 text-sm flex items-center gap-2 justify-center md:justify-start">
                                                <span className="material-symbols-outlined text-sm">local_activity</span>
                                                {tierStatus.tier.freePassesPerMonth} free passes/month
                                            </p>
                                        )}
                                        {tierStatus.tier.priorityBooking && (
                                            <p className="text-white/60 text-sm flex items-center gap-2 justify-center md:justify-start">
                                                <span className="material-symbols-outlined text-sm">star</span>
                                                Priority booking enabled
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center min-w-[140px]">
                                    <p className="text-3xl font-bold text-white">{tierStatus.progress}%</p>
                                    <p className="text-white/30 text-xs">
                                        {tierStatus.pointsToNext > 0
                                            ? `${tierStatus.pointsToNext.toLocaleString()} pts to next tier`
                                            : 'Max tier reached!'}
                                    </p>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-4">
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${tierStatus.progress}%`, background: tierStatus.tier.color }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    {tiers.map(t => (
                                        <div key={t.id} className="text-center flex-1">
                                            <span className="material-symbols-outlined text-sm" style={{ color: t.color }}>shield</span>
                                            <p className="text-[10px] text-white/30">{t.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ApiCard>
                    )}

                    {/* Points Summary */}
                    {points && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-[#FFD700]">{points.totalPoints.toLocaleString()}</p>
                                <p className="text-white/30 text-xs uppercase font-bold">Available Points</p>
                            </div>
                            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-[#00FFA3]">{points.lifetimePoints.toLocaleString()}</p>
                                <p className="text-white/30 text-xs uppercase font-bold">Lifetime Points</p>
                            </div>
                            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-[#00B8FF]">{points.currentTier}</p>
                                <p className="text-white/30 text-xs uppercase font-bold">Current Tier</p>
                            </div>
                            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-[#FF6B35]">
                                    {points.recentTransactions.filter(t => t.points > 0).length}
                                </p>
                                <p className="text-white/30 text-xs uppercase font-bold">Activities</p>
                            </div>
                        </div>
                    )}

                    {/* Recent Transactions */}
                    <ApiCard>
                        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                        {points && points.recentTransactions.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {points.recentTransactions.slice(0, 8).map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined ${TYPE_COLORS[tx.type] || 'text-white/40'}`}>
                                                {tx.type === 'checkin' ? 'check_circle' :
                                                 tx.type === 'purchase' ? 'shopping_cart' :
                                                 tx.type === 'referral' ? 'group_add' :
                                                 tx.type === 'challenge' ? 'emoji_events' :
                                                 tx.type === 'redemption' ? 'redeem' : 'stars'}
                                            </span>
                                            <div>
                                                <p className="text-white text-sm font-bold">{tx.description}</p>
                                                <p className="text-white/30 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold text-sm ${tx.points >= 0 ? 'text-[#FFD700]' : 'text-red-400'}`}>
                                            {tx.points >= 0 ? '+' : ''}{tx.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon="history" title="No activity yet" subtitle="Start earning points today!" />
                        )}
                    </ApiCard>
                </div>
            )}

            {/* ─── Rewards Tab ──────────────────────────────────── */}
            {activeTab === 'rewards' && (
                <div className="space-y-6">
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
                                {cat === 'all' ? 'All Rewards' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Rewards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRewards.map(reward => {
                            const canAfford = (points?.totalPoints || 0) >= reward.pointsCost;
                            return (
                                <div key={reward.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-2xl text-[#FFD700]">
                                                {CATEGORY_ICONS[reward.category] || 'redeem'}
                                            </span>
                                        </div>
                                        {reward.stock < 20 && (
                                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                                                Low Stock
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-white font-bold text-sm mb-1">{reward.name}</h3>
                                    <p className="text-white/40 text-xs mb-3 flex-1">{reward.description}</p>

                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[#FFD700] font-bold text-lg">{reward.pointsCost.toLocaleString()} pts</span>
                                        <span className="text-white/30 text-xs">{reward.stock} left</span>
                                    </div>

                                    <ApiButton
                                        loading={redeeming === reward.id}
                                        onClick={() => canAfford && handleRedeem(reward.id)}
                                        disabled={!canAfford || reward.stock <= 0}
                                        className={!canAfford ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                        {!canAfford ? 'Not Enough Points' : reward.stock <= 0 ? 'Out of Stock' : 'Redeem'}
                                    </ApiButton>
                                </div>
                            );
                        })}
                    </div>

                    {filteredRewards.length === 0 && (
                        <EmptyState icon="card_giftcard" title="No rewards available" subtitle="Check back later for new rewards!" />
                    )}
                </div>
            )}

            {/* ─── History Tab ──────────────────────────────────── */}
            {activeTab === 'history' && (
                <ApiCard>
                    <h3 className="text-lg font-bold text-white mb-4">All Transactions</h3>
                    {points && points.recentTransactions.length > 0 ? (
                        <div className="space-y-2">
                            {points.recentTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`material-symbols-outlined ${TYPE_COLORS[tx.type] || 'text-white/40'}`}>
                                            {tx.type === 'checkin' ? 'check_circle' :
                                             tx.type === 'purchase' ? 'shopping_cart' :
                                             tx.type === 'referral' ? 'group_add' :
                                             tx.type === 'challenge' ? 'emoji_events' :
                                             tx.type === 'redemption' ? 'redeem' : 'stars'}
                                        </span>
                                        <div>
                                            <p className="text-white text-sm font-bold">{tx.description}</p>
                                            <p className="text-white/30 text-xs capitalize">{tx.type} &bull; {new Date(tx.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${tx.points >= 0 ? 'text-[#FFD700]' : 'text-red-400'}`}>
                                        {tx.points >= 0 ? '+' : ''}{tx.points}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon="history" title="No transactions yet" subtitle="Complete activities to earn points!" />
                    )}
                </ApiCard>
            )}
        </div>
    );
}
