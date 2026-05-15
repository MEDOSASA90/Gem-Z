'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface HomeWorkout {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    durationMinutes: number;
    category: string;
    calorieBurnEstimate: number | null;
    imageUrl: string | null;
    equipmentNeeded: string[];
    muscleGroups: string[];
}

interface HomeWorkoutExercise {
    id: string;
    name: string;
    description: string | null;
    durationSeconds: number | null;
    reps: string | null;
    sets: number | null;
    restSeconds: number | null;
    orderIndex: number;
}

interface WorkoutSession {
    id: string;
    workoutId: string;
    workoutTitle: string;
    startedAt: string;
    completedAt: string | null;
    durationSeconds: number | null;
    caloriesBurned: number | null;
    status: string;
}

// ─── Constants ──────────────────────────────────────────────────

const DIFFICULTIES = [
    { value: '', label: 'All Levels', icon: 'filter_list' },
    { value: 'beginner', label: 'Beginner', icon: 'eco', color: 'bg-green-500/20 text-green-400' },
    { value: 'intermediate', label: 'Intermediate', icon: 'local_fire_department', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'advanced', label: 'Advanced', icon: 'bolt', color: 'bg-red-500/20 text-red-400' },
];

const CATEGORIES = [
    { value: '', label: 'All' },
    { value: 'full_body', label: 'Full Body' },
    { value: 'core', label: 'Core' },
    { value: 'upper_body', label: 'Upper Body' },
    { value: 'lower_body', label: 'Lower Body' },
    { value: 'cardio', label: 'Cardio' },
];

const MUSCLE_ICONS: Record<string, string> = {
    full_body: 'accessibility',
    core: 'sports_gymnastics',
    legs: 'directions_run',
    glutes: 'fitness_center',
    chest: 'favorite',
    back: 'back_hand',
    arms: 'sports_martial_arts',
    shoulders: 'person',
    cardio: 'monitor_heart',
};

// ─── HomeWorkouts Component ─────────────────────────────────────

export default function HomeWorkouts() {
    const [view, setView] = useState<'list' | 'detail' | 'active' | 'history'>('list');
    const [workouts, setWorkouts] = useState<HomeWorkout[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<(HomeWorkout & { exercises: HomeWorkoutExercise[] }) | null>(null);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [activeSession, setActiveSession] = useState<{ id: string; workoutTitle: string; difficulty: string; startedAt: string } | null>(null);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [restTimer, setRestTimer] = useState(0);
    const [workoutTimer, setWorkoutTimer] = useState(0);
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [starting, setStarting] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchWorkouts = useCallback(async () => {
        setLoading(true);
        try {
            let url = '/api/v1/home/workouts';
            const params = new URLSearchParams();
            if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
            if (selectedCategory) params.append('category', selectedCategory);
            if (params.toString()) url += `?${params.toString()}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setWorkouts(data.data);
        } catch {
            setError('Failed to load workouts');
        } finally {
            setLoading(false);
        }
    }, [selectedDifficulty, selectedCategory, token]);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/home/workouts/sessions', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setSessions(data.data);
        } catch {
            /* silent */
        }
    }, [token]);

    const fetchActiveSession = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/home/workouts/sessions/active', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success && data.data) setActiveSession(data.data);
        } catch {
            /* silent */
        }
    }, [token]);

    useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);
    useEffect(() => { fetchSessions(); fetchActiveSession(); }, [fetchSessions, fetchActiveSession]);

    // Workout timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (view === 'active') {
            interval = setInterval(() => setWorkoutTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [view]);

    // Rest timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isResting && restTimer > 0) {
            interval = setInterval(() => {
                setRestTimer(t => {
                    if (t <= 1) {
                        setIsResting(false);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isResting, restTimer]);

    const fetchWorkoutDetail = async (workoutId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/home/workouts/${workoutId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSelectedWorkout(data.data);
                setView('detail');
            }
        } catch {
            setError('Failed to load workout details');
        } finally {
            setLoading(false);
        }
    };

    const startWorkout = async (workoutId: string) => {
        setStarting(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/home/workouts/${workoutId}/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setActiveSession(data.data);
                setCurrentExerciseIndex(0);
                setIsResting(false);
                setWorkoutTimer(0);
                setView('active');
            } else {
                setError(data.message || 'Failed to start workout');
            }
        } catch {
            setError('Failed to start workout');
        } finally {
            setStarting(false);
        }
    };

    const completeWorkout = async () => {
        if (!activeSession) return;
        setCompleting(true);
        try {
            const exercisesCompleted = selectedWorkout ? Math.min(currentExerciseIndex + 1, selectedWorkout.exercises.length) : 0;
            await fetch(`/api/v1/home/workouts/sessions/${activeSession.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    duration_seconds: workoutTimer,
                    exercises_completed: exercisesCompleted,
                }),
            });
            setActiveSession(null);
            setView('history');
            fetchSessions();
        } catch {
            setError('Failed to complete workout');
        } finally {
            setCompleting(false);
        }
    };

    const nextExercise = () => {
        if (!selectedWorkout) return;
        const currentEx = selectedWorkout.exercises[currentExerciseIndex];
        if (currentEx?.restSeconds && currentEx.restSeconds > 0) {
            setIsResting(true);
            setRestTimer(currentEx.restSeconds);
        }
        if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
            setCurrentExerciseIndex(i => i + 1);
        } else {
            completeWorkout();
        }
    };

    const skipRest = () => {
        setIsResting(false);
        setRestTimer(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getDifficultyColor = (d: string) => {
        const found = DIFFICULTIES.find(diff => diff.value === d);
        return found ? found.color : 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">home</span>
                        Home Workouts
                    </h1>
                    <p className="text-white/50 text-sm mt-1">No-equipment workouts for any fitness level</p>
                </div>
                <div className="flex gap-2">
                    <ApiButton variant="ghost" onClick={() => setView('list')} className={view === 'list' ? 'border-[#ff7b00]/50' : ''}>
                        Workouts
                    </ApiButton>
                    <ApiButton variant="ghost" onClick={() => setView('history')} className={view === 'history' ? 'border-[#ff7b00]/50' : ''}>
                        History
                    </ApiButton>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

            {/* Workouts List */}
            {view === 'list' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="flex gap-1">
                            {DIFFICULTIES.map(d => (
                                <button
                                    key={d.value}
                                    onClick={() => setSelectedDifficulty(d.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                                        selectedDifficulty === d.value
                                            ? 'bg-[#ff7b00] text-black'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            {CATEGORIES.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setSelectedCategory(c.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                                        selectedCategory === c.value
                                            ? 'bg-[#ff7b00] text-black'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Workout Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workouts.map(workout => (
                            <div
                                key={workout.id}
                                className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-[#ff7b00]/30 transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${getDifficultyColor(workout.difficulty)}`}>
                                        {workout.difficulty}
                                    </div>
                                    <span className="text-[#ff7b00] font-bold">{workout.durationMinutes}m</span>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">{workout.title}</h3>
                                {workout.description && (
                                    <p className="text-white/40 text-xs mb-3 line-clamp-2">{workout.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {workout.muscleGroups.map(mg => (
                                        <span key={mg} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">{MUSCLE_ICONS[mg] || 'fitness_center'}</span>
                                            {mg.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                                {workout.equipmentNeeded.length > 0 && workout.equipmentNeeded[0] !== '' && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {workout.equipmentNeeded.map(eq => (
                                            <span key={eq} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 capitalize">{eq}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <ApiButton
                                        variant="ghost"
                                        className="flex-1 !py-2 !text-xs"
                                        onClick={() => fetchWorkoutDetail(workout.id)}
                                    >
                                        View
                                    </ApiButton>
                                    <ApiButton
                                        className="flex-1 !py-2 !text-xs"
                                        loading={starting}
                                        onClick={() => startWorkout(workout.id)}
                                        icon={<span className="material-symbols-outlined text-sm">play_arrow</span>}
                                    >
                                        Start
                                    </ApiButton>
                                </div>
                            </div>
                        ))}
                        {workouts.length === 0 && !loading && (
                            <EmptyState icon="fitness_center" title="No workouts found" />
                        )}
                    </div>
                </>
            )}

            {/* Workout Detail */}
            {view === 'detail' && selectedWorkout && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ApiButton variant="ghost" onClick={() => setView('list')}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </ApiButton>
                        <h2 className="text-xl font-bold text-white">{selectedWorkout.title}</h2>
                    </div>

                    <ApiCard>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${getDifficultyColor(selectedWorkout.difficulty)}`}>
                                {selectedWorkout.difficulty}
                            </span>
                            <span className="text-white/40 text-xs flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                {selectedWorkout.durationMinutes} minutes
                            </span>
                            {selectedWorkout.calorieBurnEstimate && (
                                <span className="text-white/40 text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                                    {selectedWorkout.calorieBurnEstimate} kcal
                                </span>
                            )}
                        </div>

                        <h3 className="text-white font-bold mb-3">Exercises ({selectedWorkout.exercises.length})</h3>
                        <div className="space-y-3 mb-6">
                            {selectedWorkout.exercises.map((ex, i) => (
                                <div key={ex.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#ff7b00]/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[#ff7b00] font-bold text-xs">{i + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-sm">{ex.name}</p>
                                        {ex.description && <p className="text-white/40 text-xs">{ex.description}</p>}
                                    </div>
                                    <div className="text-right text-xs text-white/30">
                                        {ex.sets && <span className="block">{ex.sets} sets</span>}
                                        {ex.reps && <span className="block text-[#ff7b00]">{ex.reps}</span>}
                                        {ex.durationSeconds && <span className="block">{ex.durationSeconds}s</span>}
                                        {ex.restSeconds && <span className="block">Rest: {ex.restSeconds}s</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <ApiButton
                            fullWidth
                            loading={starting}
                            onClick={() => startWorkout(selectedWorkout.id)}
                            icon={<span className="material-symbols-outlined">play_arrow</span>}
                        >
                            Start Workout
                        </ApiButton>
                    </ApiCard>
                </div>
            )}

            {/* Active Workout */}
            {view === 'active' && selectedWorkout && activeSession && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedWorkout.title}</h2>
                            <p className="text-white/40 text-xs">{formatTime(workoutTimer)} elapsed</p>
                        </div>
                        <ApiButton variant="danger" onClick={completeWorkout} loading={completing}>
                            Finish
                        </ApiButton>
                    </div>

                    {/* Progress */}
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#ff7b00] rounded-full transition-all"
                            style={{ width: `${((currentExerciseIndex + 1) / selectedWorkout.exercises.length) * 100}%` }}
                        />
                    </div>
                    <p className="text-white/30 text-xs text-right">
                        {currentExerciseIndex + 1} / {selectedWorkout.exercises.length}
                    </p>

                    {/* Current Exercise */}
                    <ApiCard>
                        {isResting ? (
                            <div className="text-center py-12">
                                <div className="w-32 h-32 rounded-full border-4 border-[#ff7b00] flex items-center justify-center mx-auto mb-4">
                                    <span className="text-4xl font-bold text-[#ff7b00]">{restTimer}</span>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">Rest</h3>
                                <p className="text-white/40 text-sm mb-4">Catch your breath</p>
                                <ApiButton variant="ghost" onClick={skipRest}>
                                    Skip Rest
                                </ApiButton>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                {(() => {
                                    const ex = selectedWorkout.exercises[currentExerciseIndex];
                                    if (!ex) return null;
                                    return (
                                        <>
                                            <span className="text-xs text-[#ff7b00] font-bold uppercase tracking-wider">
                                                Exercise {currentExerciseIndex + 1} of {selectedWorkout.exercises.length}
                                            </span>
                                            <h3 className="text-2xl font-bold text-white mt-2 mb-2">{ex.name}</h3>
                                            {ex.description && <p className="text-white/40 text-sm mb-6">{ex.description}</p>}

                                            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                                                {ex.sets && (
                                                    <div className="bg-white/5 rounded-xl p-3">
                                                        <p className="text-2xl font-bold text-white">{ex.sets}</p>
                                                        <p className="text-white/30 text-xs">Sets</p>
                                                    </div>
                                                )}
                                                {ex.reps && (
                                                    <div className="bg-white/5 rounded-xl p-3">
                                                        <p className="text-2xl font-bold text-[#ff7b00]">{ex.reps}</p>
                                                        <p className="text-white/30 text-xs">Reps</p>
                                                    </div>
                                                )}
                                                {ex.durationSeconds && (
                                                    <div className="bg-white/5 rounded-xl p-3">
                                                        <p className="text-2xl font-bold text-[#ff7b00]">{ex.durationSeconds}s</p>
                                                        <p className="text-white/30 text-xs">Duration</p>
                                                    </div>
                                                )}
                                                {ex.restSeconds && (
                                                    <div className="bg-white/5 rounded-xl p-3">
                                                        <p className="text-2xl font-bold text-blue-400">{ex.restSeconds}s</p>
                                                        <p className="text-white/30 text-xs">Rest</p>
                                                    </div>
                                                )}
                                            </div>

                                            <ApiButton
                                                fullWidth
                                                onClick={nextExercise}
                                                icon={<span className="material-symbols-outlined">check</span>}
                                            >
                                                {currentExerciseIndex < selectedWorkout.exercises.length - 1 ? 'Done, Next' : 'Complete Workout'}
                                            </ApiButton>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </ApiCard>
                </div>
            )}

            {/* History View */}
            {view === 'history' && (
                <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white">Workout History</h3>
                    {sessions.length === 0 ? (
                        <EmptyState icon="history" title="No workouts yet" subtitle="Complete your first workout" />
                    ) : (
                        sessions.map(session => (
                            <div key={session.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#ff7b00]/10 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[#ff7b00] text-sm">fitness_center</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-sm">{session.workoutTitle}</p>
                                    <p className="text-white/40 text-xs">
                                        {new Date(session.startedAt).toLocaleDateString()} | {session.durationSeconds ? formatTime(session.durationSeconds) : '--'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                        session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        session.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>{session.status}</span>
                                    {session.caloriesBurned && (
                                        <p className="text-[#ff7b00] text-xs font-bold mt-1">{session.caloriesBurned} kcal</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
