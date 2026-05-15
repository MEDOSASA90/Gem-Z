'use client';

import React, { useState } from 'react';
import {
    Trophy,
    Users,
    Calendar,
    ChevronRight,
    Medal,
    Award,
    Star,
    Flame,
    Crown,
    Zap,
    Clock,
    ArrowUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    score: number;
    joinedAt: string;
}

export interface TournamentData {
    id: string;
    name: string;
    description: string | null;
    type: 'individual' | 'squad' | 'corporate';
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    prizePool: number;
    prizePoolUnit: string;
    entryFee: number;
    entryFeeUnit: string;
    maxParticipants: number | null;
    currentParticipants: number;
    startDate: string;
    endDate: string;
    rules: string | null;
    imageUrl: string | null;
    createdBy: string;
    gymId: string | null;
}

export interface TournamentCardProps {
    tournament: TournamentData;
    leaderboard: LeaderboardEntry[];
    userRank?: number | null;
    userScore?: number;
    isJoined: boolean;
    onJoin: (tournamentId: string) => Promise<void>;
    onLeave: (tournamentId: string) => Promise<void>;
    onViewDetails: (tournamentId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    active: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Active', icon: Flame },
    upcoming: { color: 'text-sky-400', bg: 'bg-sky-500/15', label: 'Upcoming', icon: Clock },
    completed: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Completed', icon: Award },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Cancelled', icon: Star },
};

const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-amber-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs text-slate-400 w-4 text-center">{rank}</span>;
};

const daysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
};

// ─── Component ──────────────────────────────────────────────────

export default function TournamentCard({
    tournament,
    leaderboard,
    userRank,
    userScore,
    isJoined,
    onJoin,
    onLeave,
    onViewDetails,
}: TournamentCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    const status = statusConfig[tournament.status] || statusConfig.upcoming;
    const StatusIcon = status.icon;
    const remainingDays = daysLeft(tournament.endDate);
    const isFull = tournament.maxParticipants !== null &&
        tournament.currentParticipants >= tournament.maxParticipants;

    const handleJoin = async () => {
        setLoading(true);
        try {
            await onJoin(tournament.id);
        } catch (e) {
            /* error handled by parent */
        }
        setLoading(false);
    };

    const handleLeave = async () => {
        setLoading(true);
        try {
            await onLeave(tournament.id);
        } catch (e) {
            /* error handled by parent */
        }
        setLoading(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden"
        >
            {/* Header Bar */}
            <div className="relative p-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/5 text-slate-400">
                                <Zap className="w-3 h-3" />
                                {tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white truncate pr-2">
                            {tournament.name}
                        </h3>

                        {tournament.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                {tournament.description}
                            </p>
                        )}
                    </div>

                    {/* Prize */}
                    <div className="flex flex-col items-center gap-1 min-w-[72px]">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/20 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-amber-400" />
                        </div>
                        <span className="text-xs font-bold text-amber-400">
                            {tournament.prizePool} {tournament.prizePoolUnit}
                        </span>
                    </div>
                </div>

                {/* Meta Row */}
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {tournament.currentParticipants.toLocaleString()}
                        {tournament.maxParticipants && ` / ${tournament.maxParticipants.toLocaleString()}`}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(tournament.startDate).toLocaleDateString()}
                    </span>
                    {tournament.status === 'active' && (
                        <span className="flex items-center gap-1 text-orange-400">
                            <Clock className="w-3.5 h-3.5" />
                            {remainingDays}d left
                        </span>
                    )}
                    {tournament.entryFee > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400">
                            <ArrowUp className="w-3.5 h-3.5" />
                            Entry: {tournament.entryFee} {tournament.entryFeeUnit}
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                {tournament.maxParticipants && (
                    <div className="mt-3">
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min(
                                        (tournament.currentParticipants / tournament.maxParticipants) * 100,
                                        100
                                    )}%`,
                                }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                    {isJoined ? (
                        <>
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Award className="w-4 h-4" />
                                {expanded ? 'Hide Leaderboard' : 'View Leaderboard'}
                                <ChevronRight
                                    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                />
                            </button>
                            {tournament.status !== 'completed' && (
                                <button
                                    onClick={handleLeave}
                                    disabled={loading}
                                    className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                >
                                    Leave
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={handleJoin}
                            disabled={loading || isFull || tournament.status === 'completed'}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isFull ? 'Full' : tournament.status === 'completed' ? 'Ended' : 'Join Tournament'}
                        </button>
                    )}
                </div>
            </div>

            {/* Leaderboard Panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pt-1 border-t border-white/5">
                            <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                Leaderboard
                            </h4>

                            {leaderboard.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No participants yet. Be the first!
                                </p>
                            ) : (
                                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                    {leaderboard.map((entry, idx) => (
                                        <motion.div
                                            key={entry.userId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                                                entry.rank <= 3
                                                    ? 'bg-amber-500/5 border border-amber-500/10'
                                                    : 'bg-white/[0.02]'
                                            }`}
                                        >
                                            <div className="w-6 flex justify-center">
                                                {getMedalIcon(entry.rank)}
                                            </div>

                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center text-xs font-bold text-white">
                                                {entry.userName.charAt(0).toUpperCase()}
                                            </div>

                                            <span className="flex-1 text-sm text-white truncate">
                                                {entry.userName}
                                            </span>

                                            <span className="text-sm font-bold text-violet-400">
                                                {entry.score.toLocaleString()}
                                            </span>
                                        </motion.div>
                                    ))}

                                    {/* User standing */}
                                    {userRank && userRank > leaderboard.length && (
                                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mt-2">
                                            <span className="text-xs text-emerald-400 w-6 text-center">
                                                {userRank}
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Star className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <span className="flex-1 text-sm text-emerald-400">You</span>
                                            <span className="text-sm font-bold text-emerald-400">
                                                {userScore?.toLocaleString() || 0}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
