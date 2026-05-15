'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState, ErrorState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface CommunityChallengeData {
    id: string;
    title: string;
    description: string | null;
    challengeType: string;
    targetValue: number;
    unit: string;
    startDate: string;
    endDate: string;
    status: string;
    reward: string | null;
    participantCount: number;
    creatorName: string;
    isJoined: boolean;
    userProgress?: number;
    maxParticipants: number | null;
}

interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    progress: number;
    completed: boolean;
}

const CHALLENGE_TYPES = ['steps', 'distance', 'calories', 'workouts', 'water', 'sleep', 'custom'];
const TYPE_ICONS: Record<string, string> = {
    steps: 'directions_walk',
    distance: 'directions_run',
    calories: 'local_fire_department',
    workouts: 'fitness_center',
    water: 'water_drop',
    sleep: 'bedtime',
    custom: 'emoji_events',
};

const TYPE_COLORS: Record<string, string> = {
    steps: '#FF6B35',
    distance: '#00FFA3',
    calories: '#FF4444',
    workouts: '#FFD700',
    water: '#00B8FF',
    sleep: '#B084FF',
    custom: '#ff7b00',
};

// ─── CommunityChallenge Component ───────────────────────────────

export default function CommunityChallenge() {
    const [challenges, setChallenges] = useState<CommunityChallengeData[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<{
        challenge: CommunityChallengeData;
        leaderboard: LeaderboardEntry[];
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'joined' | 'mine'>('all');

    // Create form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [challengeType, setChallengeType] = useState('steps');
    const [targetValue, setTargetValue] = useState(10000);
    const [unit, setUnit] = useState('steps');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reward, setReward] = useState('');

    const fetchChallenges = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filter === 'active') params.set('status', 'active');
            if (filter === 'joined') params.set('mine', 'false');
            if (filter === 'mine') params.set('mine', 'true');

            const res = await fetch(`/api/v1/community/challenges?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (data.success) {
                const filtered = filter === 'joined'
                    ? data.data.filter((c: CommunityChallengeData) => c.isJoined)
                    : data.data;
                setChallenges(filtered);
            }
        } catch {
            setError('Failed to load challenges');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

    const fetchChallengeDetail = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/community/challenges/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (data.success) setSelectedChallenge(data.data);
        } catch {
            setError('Failed to load challenge details');
        }
    };

    const createChallenge = async () => {
        try {
            const res = await fetch('/api/v1/community/challenges', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    title, description, challengeType, targetValue, unit,
                    startDate, endDate, reward: reward || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreate(false);
                resetForm();
                fetchChallenges();
            } else {
                setError(data.message || 'Failed to create challenge');
            }
        } catch {
            setError('Failed to create challenge');
        }
    };

    const joinChallenge = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/community/challenges/${id}/join`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (data.success) {
                fetchChallenges();
                if (selectedChallenge?.challenge.id === id) fetchChallengeDetail(id);
            }
        } catch {
            setError('Failed to join challenge');
        }
    };

    const leaveChallenge = async (id: string) => {
        try {
            await fetch(`/api/v1/community/challenges/${id}/leave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            fetchChallenges();
            if (selectedChallenge?.challenge.id === id) fetchChallengeDetail(id);
        } catch {
            setError('Failed to leave challenge');
        }
    };

    const updateProgress = async (id: string, progress: number) => {
        try {
            const res = await fetch(`/api/v1/community/challenges/${id}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ progress }),
            });
            const data = await res.json();
            if (data.success) fetchChallengeDetail(id);
        } catch {
            setError('Failed to update progress');
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setChallengeType('steps');
        setTargetValue(10000);
        setUnit('steps');
        setStartDate('');
        setEndDate('');
        setReward('');
    };

    const getProgressPercent = (current: number, target: number) =>
        Math.min(100, Math.round((current / target) * 100));

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">emoji_events</span>
                        Community Challenges
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Join challenges and compete with the community</p>
                </div>
                <ApiButton onClick={() => setShowCreate(!showCreate)} icon={<span className="material-symbols-outlined">add</span>}>
                    {showCreate ? 'Cancel' : 'Create'}
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

            {/* Create Form */}
            {showCreate && (
                <ApiCard>
                    <h2 className="text-lg font-bold text-white mb-4">Create Challenge</h2>
                    <div className="space-y-3">
                        <input
                            type="text" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Challenge title"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                        />
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Description"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <select
                                value={challengeType} onChange={e => setChallengeType(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                            >
                                {CHALLENGE_TYPES.map(t => (
                                    <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>
                                ))}
                            </select>
                            <input
                                type="text" value={unit} onChange={e => setUnit(e.target.value)}
                                placeholder="Unit (steps, km, kcal)"
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                            />
                        </div>
                        <input
                            type="number" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))}
                            placeholder="Target value"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-white/30 text-xs">Start Date</label>
                                <input
                                    type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                                />
                            </div>
                            <div>
                                <label className="text-white/30 text-xs">End Date</label>
                                <input
                                    type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                                />
                            </div>
                        </div>
                        <input
                            type="text" value={reward} onChange={e => setReward(e.target.value)}
                            placeholder="Reward (optional)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                        />
                        <ApiButton onClick={createChallenge} fullWidth>
                            Create Challenge
                        </ApiButton>
                    </div>
                </ApiCard>
            )}

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'active', 'joined', 'mine'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                            filter === f
                                ? 'bg-[#ff7b00] text-black'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Challenge Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {challenges.map(challenge => {
                    const progress = challenge.userProgress || 0;
                    const percent = getProgressPercent(progress, challenge.targetValue);
                    const typeColor = TYPE_COLORS[challenge.challengeType] || '#ff7b00';
                    const icon = TYPE_ICONS[challenge.challengeType] || 'emoji_events';

                    return (
                        <div
                            key={challenge.id}
                            className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer"
                            onClick={() => fetchChallengeDetail(challenge.id)}
                        >
                            {/* Type Badge */}
                            <div className="flex items-center gap-2 mb-3">
                                <span
                                    className="material-symbols-outlined text-lg"
                                    style={{ color: typeColor }}
                                >
                                    {icon}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: typeColor }}>
                                    {challenge.challengeType}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                                    challenge.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                    challenge.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                    {challenge.status}
                                </span>
                            </div>

                            <h3 className="text-white font-bold text-lg mb-1">{challenge.title}</h3>
                            {challenge.description && (
                                <p className="text-white/40 text-sm mb-3 line-clamp-2">{challenge.description}</p>
                            )}

                            {/* Progress Bar */}
                            {challenge.isJoined && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-white/40">Your progress</span>
                                        <span className="text-white font-bold">{progress.toLocaleString()} / {challenge.targetValue.toLocaleString()} {challenge.unit}</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{ width: `${percent}%`, backgroundColor: typeColor }}
                                        />
                                    </div>
                                    <p className="text-right text-xs font-bold mt-0.5" style={{ color: typeColor }}>
                                        {percent}%
                                    </p>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-xs text-white/30">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">groups</span>
                                    {challenge.participantCount}
                                    {challenge.maxParticipants && ` / ${challenge.maxParticipants}`}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    {new Date(challenge.endDate).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                                {challenge.isJoined ? (
                                    <ApiButton
                                        variant="ghost"
                                        fullWidth
                                        onClick={() => leaveChallenge(challenge.id)}
                                    >
                                        Leave
                                    </ApiButton>
                                ) : (
                                    <ApiButton
                                        fullWidth
                                        onClick={() => joinChallenge(challenge.id)}
                                        icon={<span className="material-symbols-outlined">add</span>}
                                    >
                                        Join
                                    </ApiButton>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {challenges.length === 0 && !loading && (
                <EmptyState icon="emoji_events" title="No challenges found" subtitle="Create one or adjust your filters" />
            )}

            {/* Selected Challenge Detail */}
            {selectedChallenge && (
                <ApiCard className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedChallenge.challenge.title}</h2>
                            <p className="text-white/40 text-sm">{selectedChallenge.challenge.description}</p>
                        </div>
                        <button
                            onClick={() => setSelectedChallenge(null)}
                            className="p-2 rounded-xl hover:bg-white/5 text-white/40"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Update Progress */}
                    {selectedChallenge.challenge.isJoined && (
                        <div className="mb-4 p-4 bg-white/5 rounded-xl">
                            <label className="text-white/50 text-xs uppercase font-bold">Update Your Progress</label>
                            <div className="flex gap-2 mt-2">
                                <input
                                    type="number"
                                    placeholder={`${selectedChallenge.challenge.unit}`}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const val = Number((e.target as HTMLInputElement).value);
                                            if (val > 0) updateProgress(selectedChallenge.challenge.id, val);
                                        }
                                    }}
                                />
                                <ApiButton
                                    onClick={() => {
                                        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                                        if (input && Number(input.value) > 0) {
                                            updateProgress(selectedChallenge.challenge.id, Number(input.value));
                                        }
                                    }}
                                >
                                    Update
                                </ApiButton>
                            </div>
                        </div>
                    )}

                    {/* Leaderboard */}
                    <h3 className="text-lg font-bold text-white mb-3">Leaderboard</h3>
                    {selectedChallenge.leaderboard.length === 0 ? (
                        <EmptyState icon="groups" title="No participants yet" subtitle="Be the first to join!" />
                    ) : (
                        <div className="space-y-2">
                            {selectedChallenge.leaderboard.map(entry => (
                                <div
                                    key={entry.userId}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${
                                        entry.rank <= 3 ? 'bg-white/5' : 'bg-white/[0.02]'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                        entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                        entry.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                                        entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-white/5 text-white/40'
                                    }`}>
                                        {entry.rank}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-sm text-white/40">person</span>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-white font-bold text-sm">{entry.userName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-white font-bold text-sm">
                                            {Math.round(entry.progress).toLocaleString()}
                                        </span>
                                        {entry.completed && (
                                            <span className="material-symbols-outlined text-green-400 text-sm ml-1">check_circle</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ApiCard>
            )}
        </div>
    );
}
