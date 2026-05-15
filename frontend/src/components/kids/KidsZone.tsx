'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiCard, ApiButton, EmptyState, SpinnerOverlay } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface KidExercise {
    name: string;
    description: string;
    durationSeconds: number;
    reps: number | null;
    sets: number;
    restSeconds: number;
    mascotTip: string | null;
}

interface KidsWorkout {
    id: string;
    title: string;
    description: string;
    ageGroup: string;
    difficulty: string;
    durationMinutes: number;
    caloriesBurned: number;
    exercises: KidExercise[];
    mascot: string;
    mascotMessage: string;
    category: string;
    pointsReward: number;
    badgeReward: string | null;
    badgeColor: string | null;
}

interface KidsChallenge {
    id: string;
    title: string;
    description: string;
    ageGroup: string;
    type: string;
    goal: number;
    goalUnit: string;
    pointsReward: number;
    badgeName: string | null;
    badgeIcon: string | null;
    badgeColor: string | null;
    mascot: string;
    participantsCount: number;
}

interface KidStats {
    totalPoints: number;
    totalWorkouts: number;
    totalChallenges: number;
    totalMinutes: number;
    badges: { badgeName: string; badgeIcon: string; badgeColor: string; pointsAwarded: number }[];
}

interface ActivityLog {
    id: string;
    activityType: string;
    pointsEarned: number;
    durationMinutes: number | null;
    createdAt: string;
}

const MASCOT_CONFIGS: Record<string, { icon: string; gradient: string }> = {
    leo_lion: { icon: 'pets', gradient: 'from-yellow-400 to-orange-500' },
    bella_bunny: { icon: 'cruelty_free', gradient: 'from-pink-400 to-rose-500' },
    max_monkey: { icon: 'forest', gradient: 'from-amber-600 to-yellow-700' },
    sophie_star: { icon: 'star', gradient: 'from-purple-400 to-indigo-500' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    hard: 'bg-red-500/20 text-red-400',
};

// ─── KidsZone Component ─────────────────────────────────────────

export default function KidsZone() {
    const [workouts, setWorkouts] = useState<KidsWorkout[]>([]);
    const [challenges, setChallenges] = useState<KidsChallenge[]>([]);
    const [stats, setStats] = useState<KidStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState<string | null>(null);
    const [joining, setJoining] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'workouts' | 'challenges' | 'mystats'>('workouts');
    const [selectedWorkout, setSelectedWorkout] = useState<KidsWorkout | null>(null);
    const [ageGroup, setAgeGroup] = useState<string>('6-12');
    const [activeExercise, setActiveExercise] = useState<number | null>(null);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const getToken = () => localStorage.getItem('token') || '';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [workoutsRes, challengesRes, statsRes] = await Promise.all([
                fetch(`/api/v1/kids/workouts?ageGroup=${ageGroup}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch(`/api/v1/kids/challenges?ageGroup=${ageGroup}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/v1/kids/stats', { headers: { Authorization: `Bearer ${getToken()}` } }),
            ]);

            const [workoutsData, challengesData, statsData] = await Promise.all([
                workoutsRes.json(), challengesRes.json(), statsRes.json(),
            ]);

            if (workoutsData.success) setWorkouts(workoutsData.data);
            if (challengesData.success) setChallenges(challengesData.data);
            if (statsData.success) setStats(statsData.data);
        } catch {
            setError('Failed to load Kids Zone');
        } finally {
            setLoading(false);
        }
    }, [ageGroup]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Timer
    useEffect(() => {
        let interval: any;
        if (isTimerRunning && timerSeconds > 0) {
            interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
        } else if (timerSeconds === 0 && isTimerRunning) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds]);

    const handleCompleteWorkout = async (workoutId: string) => {
        setCompleting(workoutId);
        setError(null);
        try {
            const res = await fetch(`/api/v1/kids/workouts/${workoutId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(data.message);
                setSelectedWorkout(null);
                fetchData();
                setTimeout(() => setSuccessMessage(null), 4000);
            } else {
                setError(data.message || 'Failed to complete workout');
            }
        } catch {
            setError('Failed to complete workout');
        } finally {
            setCompleting(null);
        }
    };

    const handleJoinChallenge = async (challengeId: string) => {
        setJoining(challengeId);
        setError(null);
        try {
            const res = await fetch(`/api/v1/kids/challenges/${challengeId}/join`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Challenge joined! Good luck!');
                fetchData();
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(data.message || 'Failed to join');
            }
        } catch {
            setError('Failed to join challenge');
        } finally {
            setJoining(null);
        }
    };

    const startTimer = (seconds: number, exerciseIndex: number) => {
        setTimerSeconds(seconds);
        setActiveExercise(exerciseIndex);
        setIsTimerRunning(true);
    };

    const getMascotConfig = (mascot: string) => MASCOT_CONFIGS[mascot] || { icon: 'star', gradient: 'from-purple-400 to-indigo-500' };

    if (loading) return <SpinnerOverlay text="Loading Kids Zone..." />;

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Colorful Header */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    {['star', 'favorite', 'bolt', 'emoji_events'].map((icon, i) => (
                        <span
                            key={i}
                            className="material-symbols-outlined absolute text-white"
                            style={{
                                fontSize: `${20 + Math.random() * 30}px`,
                                left: `${10 + Math.random() * 80}%`,
                                top: `${10 + Math.random() * 80}%`,
                                transform: `rotate(${Math.random() * 360}deg)`,
                                opacity: 0.3,
                            }}
                        >
                            {icon}
                        </span>
                    ))}
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-4xl text-yellow-300">star</span>
                        <h1 className="text-3xl font-bold text-white">Kids Zone</h1>
                        <span className="material-symbols-outlined text-4xl text-yellow-300">star</span>
                    </div>
                    <p className="text-white/80 text-sm">Fun workouts, exciting challenges, earn points and badges!</p>
                    {stats && (
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-2xl font-bold text-white">{stats.totalPoints}</p>
                                <p className="text-white/70 text-xs">Points</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-2xl font-bold text-white">{stats.totalWorkouts}</p>
                                <p className="text-white/70 text-xs">Workouts</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <p className="text-2xl font-bold text-white">{stats.badges.length}</p>
                                <p className="text-white/70 text-xs">Badges</p>
                            </div>
                        </div>
                    )}
                </div>
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

            {/* Tabs + Age Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                    {(['workouts', 'challenges', 'mystats'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                        >
                            {tab === 'mystats' ? 'My Stats' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {['6-12', '13-17'].map(ag => (
                        <button
                            key={ag}
                            onClick={() => setAgeGroup(ag)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                ageGroup === ag
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
                                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                        >
                            Ages {ag}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Workouts Tab ─────────────────────────────────── */}
            {activeTab === 'workouts' && (
                <div className="space-y-6">
                    {selectedWorkout ? (
                        /* Workout Detail */
                        <div className="space-y-6">
                            <button
                                onClick={() => { setSelectedWorkout(null); setActiveExercise(null); setIsTimerRunning(false); }}
                                className="flex items-center gap-2 text-white/50 hover:text-white transition-all"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                                Back to Workouts
                            </button>

                            {/* Mascot Banner */}
                            <div className={`bg-gradient-to-r ${getMascotConfig(selectedWorkout.mascot).gradient} rounded-3xl p-6 flex items-center gap-4`}>
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl text-white">{getMascotConfig(selectedWorkout.mascot).icon}</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">{selectedWorkout.title}</p>
                                    <p className="text-white/80 text-sm">{selectedWorkout.mascotMessage}</p>
                                </div>
                            </div>

                            {/* Workout Info */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
                                    <p className="text-[#FFD700] font-bold">{selectedWorkout.durationMinutes} min</p>
                                    <p className="text-white/30 text-xs">Duration</p>
                                </div>
                                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
                                    <p className="text-[#FF6B35] font-bold">{selectedWorkout.caloriesBurned} cal</p>
                                    <p className="text-white/30 text-xs">Burn</p>
                                </div>
                                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
                                    <p className="text-[#00FFA3] font-bold">+{selectedWorkout.pointsReward} pts</p>
                                    <p className="text-white/30 text-xs">Reward</p>
                                </div>
                            </div>

                            {/* Exercises */}
                            <div className="space-y-3">
                                <h3 className="text-white font-bold text-lg">Exercises ({selectedWorkout.exercises.length})</h3>
                                {selectedWorkout.exercises.map((ex, i) => (
                                    <div
                                        key={i}
                                        className={`bg-white/[0.04] border rounded-2xl p-4 transition-all ${
                                            activeExercise === i ? 'border-purple-400/50' : 'border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getMascotConfig(selectedWorkout.mascot).gradient} flex items-center justify-center text-white font-bold`}>
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{ex.name}</p>
                                                    <p className="text-white/40 text-xs">{ex.description}</p>
                                                    {ex.mascotTip && (
                                                        <p className="text-purple-400 text-xs mt-1 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">lightbulb</span>
                                                            {ex.mascotTip}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white/50 text-xs">{ex.sets} sets</p>
                                                {ex.reps && <p className="text-white/50 text-xs">{ex.reps} reps</p>}
                                                <p className="text-white/50 text-xs">{ex.durationSeconds}s</p>
                                            </div>
                                        </div>
                                        {/* Timer */}
                                        {activeExercise === i && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                                                    <p className="text-3xl font-bold text-white">{timerSeconds}s</p>
                                                </div>
                                                <button
                                                    onClick={() => isTimerRunning ? setIsTimerRunning(false) : startTimer(ex.durationSeconds, i)}
                                                    className="bg-purple-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-600 transition-all"
                                                >
                                                    {isTimerRunning ? 'Pause' : timerSeconds === 0 ? 'Restart' : 'Start'}
                                                </button>
                                                <button
                                                    onClick={() => { setActiveExercise(null); setIsTimerRunning(false); }}
                                                    className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold hover:bg-white/20 transition-all"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        )}
                                        {activeExercise !== i && (
                                            <button
                                                onClick={() => startTimer(ex.durationSeconds, i)}
                                                className="mt-2 w-full bg-white/5 text-white/60 text-xs py-2 rounded-xl hover:bg-white/10 transition-all"
                                            >
                                                Start Timer
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Complete Button */}
                            <ApiButton
                                loading={completing === selectedWorkout.id}
                                onClick={() => handleCompleteWorkout(selectedWorkout.id)}
                                className="w-full py-4 text-lg"
                            >
                                <span className="material-symbols-outlined">celebration</span>
                                Complete Workout (+{selectedWorkout.pointsReward} pts)
                            </ApiButton>
                        </div>
                    ) : (
                        /* Workout Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workouts.map(workout => {
                                const mc = getMascotConfig(workout.mascot);
                                return (
                                    <div
                                        key={workout.id}
                                        onClick={() => setSelectedWorkout(workout)}
                                        className="bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden hover:border-purple-400/30 transition-all cursor-pointer group"
                                    >
                                        <div className={`h-24 bg-gradient-to-r ${mc.gradient} flex items-center justify-center`}>
                                            <span className="material-symbols-outlined text-5xl text-white/80">{mc.icon}</span>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[workout.difficulty]}`}>
                                                    {workout.difficulty}
                                                </span>
                                                <span className="text-[10px] bg-white/5 text-white/30 px-2 py-0.5 rounded-full capitalize">
                                                    {workout.category}
                                                </span>
                                            </div>
                                            <h3 className="text-white font-bold">{workout.title}</h3>
                                            <p className="text-white/40 text-xs line-clamp-2">{workout.description}</p>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-white/30">{workout.durationMinutes} min</span>
                                                <span className="text-white/30">{workout.exercises.length} exercises</span>
                                                <span className="text-[#FFD700]">+{workout.pointsReward} pts</span>
                                            </div>
                                            {workout.badgeReward && (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="material-symbols-outlined text-xs" style={{ color: workout.badgeColor || '#FFD700' }}>emoji_events</span>
                                                    <span className="text-white/40">Badge: {workout.badgeReward}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Challenges Tab ───────────────────────────────── */}
            {activeTab === 'challenges' && (
                <div className="space-y-4">
                    {challenges.map(challenge => {
                        const mc = getMascotConfig(challenge.mascot);
                        return (
                            <ApiCard key={challenge.id}>
                                <div className="flex flex-col sm:flex-row items-start gap-4">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${mc.gradient} flex items-center justify-center flex-shrink-0`}>
                                        <span className="material-symbols-outlined text-2xl text-white">{challenge.badgeIcon || 'emoji_events'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-white font-bold">{challenge.title}</h3>
                                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full capitalize">
                                                {challenge.type}
                                            </span>
                                        </div>
                                        <p className="text-white/40 text-sm mb-2">{challenge.description}</p>
                                        <div className="flex flex-wrap gap-3 text-xs">
                                            <span className="text-white/30">Goal: <span className="text-white">{challenge.goal} {challenge.goalUnit}</span></span>
                                            <span className="text-[#FFD700]">+{challenge.pointsReward} pts</span>
                                            <span className="text-white/30">{challenge.participantsCount} participants</span>
                                        </div>
                                        {challenge.badgeName && (
                                            <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: challenge.badgeColor || '#FFD700' }}>
                                                <span className="material-symbols-outlined text-xs">emoji_events</span>
                                                <span>Badge: {challenge.badgeName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <ApiButton
                                        loading={joining === challenge.id}
                                        onClick={() => handleJoinChallenge(challenge.id)}
                                        className="flex-shrink-0"
                                    >
                                        Join
                                    </ApiButton>
                                </div>
                            </ApiCard>
                        );
                    })}
                    {challenges.length === 0 && (
                        <EmptyState icon="emoji_events" title="No challenges" subtitle="Check back soon for new challenges!" />
                    )}
                </div>
            )}

            {/* ─── My Stats Tab ─────────────────────────────────── */}
            {activeTab === 'mystats' && stats && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 rounded-2xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#FFD700]">{stats.totalPoints}</p>
                            <p className="text-white/30 text-xs uppercase font-bold">Total Points</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 rounded-2xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#00B8FF]">{stats.totalWorkouts}</p>
                            <p className="text-white/30 text-xs uppercase font-bold">Workouts</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 rounded-2xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#00FFA3]">{stats.totalChallenges}</p>
                            <p className="text-white/30 text-xs uppercase font-bold">Challenges</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 rounded-2xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#FF6B35]">{stats.totalMinutes}m</p>
                            <p className="text-white/30 text-xs uppercase font-bold">Active Time</p>
                        </div>
                    </div>

                    {/* Badges */}
                    <ApiCard>
                        <h3 className="text-lg font-bold text-white mb-4">My Badges</h3>
                        {stats.badges.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {stats.badges.map((badge, i) => (
                                    <div key={i} className="bg-white/5 rounded-2xl p-4 text-center">
                                        <span className="material-symbols-outlined text-3xl" style={{ color: badge.badgeColor || '#FFD700' }}>emoji_events</span>
                                        <p className="text-white font-bold text-sm mt-2">{badge.badgeName}</p>
                                        <p className="text-[#FFD700] text-xs">+{badge.pointsAwarded} pts</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon="emoji_events" title="No badges yet" subtitle="Complete workouts to earn badges!" />
                        )}
                    </ApiCard>

                    {/* Progress Bar */}
                    <ApiCard>
                        <h3 className="text-lg font-bold text-white mb-4">Progress to Next Level</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">Current Level</span>
                                <span className="text-white font-bold">Level {Math.floor(stats.totalPoints / 500) + 1}</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                                    style={{ width: `${(stats.totalPoints % 500) / 500 * 100}%` }}
                                />
                            </div>
                            <p className="text-white/30 text-xs text-center">{500 - (stats.totalPoints % 500)} points to next level</p>
                        </div>
                    </ApiCard>
                </div>
            )}
        </div>
    );
}
