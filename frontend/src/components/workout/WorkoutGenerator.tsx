'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState, ErrorState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface WorkoutExercise {
    id: string;
    dayOfWeek: number;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: string;
    restSeconds: number;
    durationMinutes: number | null;
    equipment: string;
    instructions: string | null;
    orderIndex: number;
}

interface WorkoutPlan {
    id: string;
    goal: string;
    fitnessLevel: string;
    equipmentAvailable: string[];
    daysPerWeek: number;
    status: string;
    createdAt: string;
    exercises: WorkoutExercise[];
}

interface WorkoutPlanSummary {
    id: string;
    goal: string;
    fitnessLevel: string;
    daysPerWeek: number;
    status: string;
    createdAt: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GOALS = [
    { value: 'lose_weight', label: 'Lose Weight', icon: 'trending_down' },
    { value: 'build_muscle', label: 'Build Muscle', icon: 'fitness_center' },
    { value: 'endurance', label: 'Endurance', icon: 'directions_run' },
];
const LEVELS = [
    { value: 'beginner', label: 'Beginner', icon: 'eco' },
    { value: 'intermediate', label: 'Intermediate', icon: 'local_fire_department' },
    { value: 'advanced', label: 'Advanced', icon: 'bolt' },
];
const EQUIPMENT_OPTIONS = ['none', 'dumbbells', 'barbell', 'pull-up bar', 'resistance bands', 'kettlebell', 'bench', 'jump rope'];

const MUSCLE_COLORS: Record<string, string> = {
    chest: 'bg-red-500/20 text-red-400',
    back: 'bg-blue-500/20 text-blue-400',
    legs: 'bg-green-500/20 text-green-400',
    shoulders: 'bg-purple-500/20 text-purple-400',
    arms: 'bg-yellow-500/20 text-yellow-400',
    core: 'bg-orange-500/20 text-orange-400',
    cardio: 'bg-cyan-500/20 text-cyan-400',
    full_body: 'bg-pink-500/20 text-pink-400',
};

// ─── WorkoutGenerator Component ─────────────────────────────────

export default function WorkoutGenerator() {
    const [plans, setPlans] = useState<WorkoutPlanSummary[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
    const [activeDay, setActiveDay] = useState(0);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generation form state
    const [goal, setGoal] = useState('lose_weight');
    const [fitnessLevel, setFitnessLevel] = useState('beginner');
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['none']);
    const [daysPerWeek, setDaysPerWeek] = useState(3);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/workout', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            const data = await res.json();
            if (data.success) setPlans(data.data);
        } catch {
            setError('Failed to load workout plans');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const fetchPlanDetails = async (planId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/workout/${planId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (data.success) {
                setSelectedPlan(data.data);
                setActiveDay(0);
            }
        } catch {
            setError('Failed to load plan details');
        } finally {
            setLoading(false);
        }
    };

    const generatePlan = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/workout/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    goal,
                    fitness_level: fitnessLevel,
                    equipment_available: selectedEquipment,
                    days_per_week: daysPerWeek,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSelectedPlan(data.data);
                setActiveDay(0);
                fetchPlans();
            } else {
                setError(data.message || 'Failed to generate plan');
            }
        } catch {
            setError('Failed to generate workout plan');
        } finally {
            setGenerating(false);
        }
    };

    const archivePlan = async (planId: string) => {
        if (!confirm('Archive this workout plan?')) return;
        try {
            await fetch(`/api/v1/workout/${planId}/archive`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (selectedPlan?.id === planId) setSelectedPlan(null);
            fetchPlans();
        } catch {
            setError('Failed to archive plan');
        }
    };

    const toggleEquipment = (eq: string) => {
        setSelectedEquipment(prev => {
            if (eq === 'none') return ['none'];
            const filtered = prev.filter(e => e !== 'none');
            if (filtered.includes(eq)) return filtered.filter(e => e !== eq).length === 0 ? ['none'] : filtered.filter(e => e !== eq);
            return [...filtered, eq];
        });
    };

    const getExercisesForDay = (day: number) => {
        if (!selectedPlan) return [];
        return selectedPlan.exercises.filter(e => e.dayOfWeek === day).sort((a, b) => a.orderIndex - b.orderIndex);
    };

    const getTrainingDays = () => {
        if (!selectedPlan) return [];
        const days = new Set(selectedPlan.exercises.map(e => e.dayOfWeek));
        return Array.from(days).sort();
    };

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">fitness_center</span>
                        AI Workout Generator
                    </h1>
                    <p className="text-white/50 text-sm mt-1">AI-powered personalized workout plans</p>
                </div>
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

            {/* Generation Form */}
            <ApiCard>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff7b00]">auto_awesome</span>
                    Generate New Plan
                </h2>

                {/* Goal */}
                <div className="mb-4">
                    <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-2 block">Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                        {GOALS.map(g => (
                            <button
                                key={g.value}
                                onClick={() => setGoal(g.value)}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                    goal === g.value
                                        ? 'border-[#ff7b00] bg-[#ff7b00]/10 text-[#ff7b00]'
                                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg block mb-1">{g.icon}</span>
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fitness Level */}
                <div className="mb-4">
                    <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-2 block">Fitness Level</label>
                    <div className="grid grid-cols-3 gap-2">
                        {LEVELS.map(l => (
                            <button
                                key={l.value}
                                onClick={() => setFitnessLevel(l.value)}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                    fitnessLevel === l.value
                                        ? 'border-[#ff7b00] bg-[#ff7b00]/10 text-[#ff7b00]'
                                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg block mb-1">{l.icon}</span>
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Equipment */}
                <div className="mb-4">
                    <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-2 block">Equipment Available</label>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENT_OPTIONS.map(eq => (
                            <button
                                key={eq}
                                onClick={() => toggleEquipment(eq)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                                    selectedEquipment.includes(eq)
                                        ? 'bg-[#ff7b00] text-black'
                                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {eq}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Days per week */}
                <div className="mb-4">
                    <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-2 block">
                        Days per week: <span className="text-white">{daysPerWeek}</span>
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={7}
                        value={daysPerWeek}
                        onChange={e => setDaysPerWeek(Number(e.target.value))}
                        className="w-full accent-[#ff7b00]"
                    />
                    <div className="flex justify-between text-white/30 text-xs mt-1">
                        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                    </div>
                </div>

                <ApiButton
                    loading={generating}
                    onClick={generatePlan}
                    icon={<span className="material-symbols-outlined">auto_awesome</span>}
                >
                    Generate Workout Plan
                </ApiButton>
            </ApiCard>

            {/* Plans + Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Your Plans</h3>
                    {plans.length === 0 && !loading && (
                        <EmptyState icon="fitness_center" title="No workout plans" subtitle="Generate your first plan above" />
                    )}
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            onClick={() => fetchPlanDetails(plan.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedPlan?.id === plan.id
                                    ? 'border-[#ff7b00] bg-[#ff7b00]/10'
                                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-white font-bold text-sm capitalize">{plan.goal.replace('_', ' ')}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>{plan.status}</span>
                            </div>
                            <p className="text-white/40 text-xs mt-1 capitalize">{plan.fitnessLevel} | {plan.daysPerWeek} days/week</p>
                            <p className="text-white/30 text-xs">{new Date(plan.createdAt).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>

                {/* Detail */}
                <div className="lg:col-span-3">
                    {selectedPlan ? (
                        <ApiCard loading={loading}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white capitalize">
                                        {selectedPlan.goal.replace('_', ' ')} Plan
                                    </h2>
                                    <p className="text-white/40 text-sm capitalize">
                                        {selectedPlan.fitnessLevel} | {selectedPlan.daysPerWeek} days/week | {selectedPlan.exercises.length} exercises
                                    </p>
                                </div>
                                <button
                                    onClick={() => archivePlan(selectedPlan.id)}
                                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                >
                                    <span className="material-symbols-outlined">archive</span>
                                </button>
                            </div>

                            {/* Day Tabs */}
                            <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                                {getTrainingDays().map(dayIdx => (
                                    <button
                                        key={dayIdx}
                                        onClick={() => setActiveDay(dayIdx)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                            activeDay === dayIdx
                                                ? 'bg-[#ff7b00] text-black'
                                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                    >
                                        {DAYS[dayIdx].slice(0, 3)}
                                    </button>
                                ))}
                            </div>

                            {/* Exercises */}
                            <div className="space-y-3">
                                {getExercisesForDay(activeDay).map(ex => (
                                    <div key={ex.id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                        MUSCLE_COLORS[ex.muscleGroup] || MUSCLE_COLORS.full_body
                                                    }`}>
                                                        {ex.muscleGroup}
                                                    </span>
                                                    {ex.equipment !== 'none' && (
                                                        <span className="text-white/30 text-xs">{ex.equipment}</span>
                                                    )}
                                                </div>
                                                <h4 className="text-white font-bold">{ex.name}</h4>
                                                {ex.instructions && (
                                                    <p className="text-white/40 text-sm mt-1">{ex.instructions}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-white">{ex.sets}</p>
                                                <p className="text-white/30 text-[10px]">Sets</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-[#ff7b00]">{ex.reps}</p>
                                                <p className="text-white/30 text-[10px]">Reps</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-blue-400">{ex.restSeconds}s</p>
                                                <p className="text-white/30 text-[10px]">Rest</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {getExercisesForDay(activeDay).length === 0 && (
                                    <EmptyState icon="event_busy" title="Rest Day" subtitle="No exercises scheduled for this day" />
                                )}
                            </div>
                        </ApiCard>
                    ) : (
                        <EmptyState
                            icon="fitness_center"
                            title="Select or create a workout plan"
                            subtitle="Choose a plan from the sidebar or generate a new one"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
