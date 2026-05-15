'use client';

import React, { useState, useCallback } from 'react';
import {
    Share2,
    Users,
    Coins,
    Copy,
    Check,
    Link,
    Gift,
    Trophy,
    ArrowRight,
    TrendingUp,
    ExternalLink,
    ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────

export interface ReferralStats {
    userId: string;
    referralCode: string;
    totalReferrals: number;
    totalRewards: number;
    pendingReferrals: number;
    completedReferrals: number;
    rewardUnit: string;
    referralLink: string;
}

export interface ReferredUser {
    id: string;
    referredName: string;
    referredAvatar: string | null;
    status: 'pending' | 'completed' | 'rewarded';
    rewardAmount: number;
    createdAt: string;
    completedAt: string | null;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    totalReferrals: number;
    totalRewards: number;
}

export interface ReferralPanelProps {
    stats: ReferralStats;
    referredUsers: ReferredUser[];
    leaderboard: LeaderboardEntry[];
    onRefresh: () => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pending' },
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
    rewarded: { bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Rewarded' },
};

// ─── Component ──────────────────────────────────────────────────

export default function ReferralPanel({
    stats,
    referredUsers,
    leaderboard,
    onRefresh,
}: ReferralPanelProps) {
    const [copied, setCopied] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const handleCopyLink = useCallback(() => {
        if (stats.referralLink) {
            navigator.clipboard.writeText(stats.referralLink).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            });
        }
    }, [stats.referralLink]);

    const handleShare = useCallback(async () => {
        if (navigator.share && stats.referralLink) {
            try {
                await navigator.share({
                    title: 'Join GEM Z!',
                    text: `Use my referral code ${stats.referralCode} to join GEM Z and start your fitness journey!`,
                    url: stats.referralLink,
                });
            } catch {
                handleCopyLink();
            }
        } else {
            handleCopyLink();
        }
    }, [stats.referralLink, stats.referralCode, handleCopyLink]);

    return (
        <div className="space-y-5">
            {/* Share Card */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/5 backdrop-blur-md p-5"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Invite Friends</h3>
                        <p className="text-xs text-slate-400">Earn rewards for every friend who joins</p>
                    </div>
                </div>

                {/* Referral Code */}
                <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/5">
                    <span className="text-xs text-slate-500 block mb-1">Your Referral Code</span>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-xl font-bold text-violet-300 tracking-wider">
                            {stats.referralCode || '---'}
                        </code>
                        <button
                            onClick={handleCopyLink}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                            title="Copy referral link"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2"
                >
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Share Referral Link'}
                </button>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3"
            >
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-sky-400" />
                        <span className="text-xs text-slate-400">Total Referrals</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalReferrals}</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-slate-400">Total Rewards</span>
                    </div>
                    <span className="text-2xl font-bold text-amber-400">
                        {stats.totalRewards} <span className="text-sm">{stats.rewardUnit}</span>
                    </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-slate-400">Completed</span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-400">{stats.completedReferrals}</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-slate-400">Pending</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-400">{stats.pendingReferrals}</span>
                </div>
            </motion.div>

            {/* Referred Users */}
            {referredUsers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-sky-400" />
                        Referred Friends
                    </h4>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {referredUsers.map((user, idx) => {
                            const s = statusColors[user.status] || statusColors.pending;
                            return (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center text-xs font-bold text-white">
                                        {user.referredName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="flex-1 text-sm text-white truncate">
                                        {user.referredName}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.bg} ${s.text}`}>
                                        {s.label}
                                    </span>
                                    {user.rewardAmount > 0 && (
                                        <span className="text-xs text-amber-400 font-semibold">
                                            +{user.rewardAmount}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Leaderboard Toggle */}
            {leaderboard.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
                >
                    <button
                        onClick={() => setShowLeaderboard(!showLeaderboard)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-all"
                    >
                        <span className="text-sm font-semibold text-white flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            Referral Leaderboard
                        </span>
                        <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${showLeaderboard ? 'rotate-90' : ''}`}
                        />
                    </button>

                    <AnimatePresence>
                        {showLeaderboard && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-5 pb-5 space-y-2">
                                    {leaderboard.slice(0, 10).map((entry, idx) => (
                                        <div
                                            key={entry.userId}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                                                entry.rank <= 3
                                                    ? 'bg-amber-500/5 border border-amber-500/10'
                                                    : 'bg-white/[0.02]'
                                            }`}
                                        >
                                            <span className={`text-xs font-bold w-5 text-center ${
                                                entry.rank === 1
                                                    ? 'text-amber-400'
                                                    : entry.rank === 2
                                                        ? 'text-slate-300'
                                                        : entry.rank === 3
                                                            ? 'text-amber-600'
                                                            : 'text-slate-500'
                                            }`}>
                                                {entry.rank}
                                            </span>
                                            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                                                {entry.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="flex-1 text-sm text-white truncate">
                                                {entry.userName}
                                            </span>
                                            <span className="text-xs text-sky-400 font-semibold">
                                                {entry.totalReferrals}
                                            </span>
                                            <span className="text-xs text-amber-400">
                                                {entry.totalRewards}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
