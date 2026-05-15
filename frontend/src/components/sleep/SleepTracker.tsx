'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState, ErrorState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface SleepLog {
    id: string;
    bedTime: string;
    wakeTime: string;
    durationMinutes: number;
    quality: number;
    deepSleepMinutes: number;
    lightSleepMinutes: number;
    remSleepMinutes: number;
    awakeMinutes: number;
    factors: string[];
    notes: string | null;
    createdAt: string;
}

interface SleepStats {
    avgDuration: number;
    avgQuality: number;
    avgDeepSleep: number;
    avgRemSleep: number;
    totalEntries: number;
    consistencyScore: number;
    trend: 'improving' | 'declining' | 'stable';
}

interface SleepTrend {
    date: string;
    durationMinutes: number;
    quality: number;
    deepSleepMinutes: number;
}

const FACTOR_OPTIONS = ['caffeine', 'stress', 'exercise', 'alcohol', 'screen_time', 'late_meal', 'noise', 'meditation', 'reading', 'cool_room', 'dark_room'];

const QUALITY_LABELS: Record<number, string> = {
    1: 'Terrible', 2: 'Poor', 3: 'Bad', 4: 'Fair', 5: 'Okay',
    6: 'Decent', 7: 'Good', 8: 'Great', 9: 'Excellent', 10: 'Perfect'
};

// ─── SleepTracker Component ─────────────────────────────────────

export default function SleepTracker() {
    const [logs, setLogs] = useState<SleepLog[]>([]);
    const [stats, setStats] = useState<SleepStats | null>(null);
    const [trends, setTrends] = useState<SleepTrend[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [bedTime, setBedTime] = useState('');
    const [wakeTime, setWakeTime] = useState('');
    const [quality, setQuality] = useState(7);
    const [deepSleep, setDeepSleep] = useState(0);
    const [lightSleep, setLightSleep] = useState(0);
    const [remSleep, setRemSleep] = useState(0);
    const [awake, setAwake] = useState(0);
    const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [logsRes, statsRes, trendsRes] = await Promise.all([
                fetch('/api/v1/sleep/logs?limit=30', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/v1/sleep/stats', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/v1/sleep/trends', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const [logsData, statsData, trendsData] = await Promise.all([
                logsRes.json(), statsRes.json(), trendsRes.json(),
            ]);

            if (logsData.success) setLogs(logsData.data.logs);
            if (statsData.success) setStats(statsData.data);
            if (trendsData.success) setTrends(trendsData.data);
        } catch {
            setError('Failed to load sleep data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const submitLog = async () => {
        if (!bedTime || !wakeTime) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/sleep/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    bedTime,
                    wakeTime,
                    quality,
                    deepSleepMinutes: deepSleep || undefined,
                    lightSleepMinutes: lightSleep || undefined,
                    remSleepMinutes: remSleep || undefined,
                    awakeMinutes: awake || undefined,
                    factors: selectedFactors,
                    notes: notes || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setShowForm(false);
                resetForm();
                fetchData();
            } else {
                setError(data.message || 'Failed to log sleep');
            }
        } catch {
            setError('Failed to log sleep');
        }
    };

    const resetForm = () => {
        setBedTime('');
        setWakeTime('');
        setQuality(7);
        setDeepSleep(0);
        setLightSleep(0);
        setRemSleep(0);
        setAwake(0);
        setSelectedFactors([]);
        setNotes('');
    };

    const toggleFactor = (factor: string) => {
        setSelectedFactors(prev =>
            prev.includes(factor) ? prev.filter(f => f !== factor) : [...prev, factor]
        );
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    // Quality chart bar calculation
    const maxQualityBar = Math.max(...(trends.length ? trends.map(t => t.quality) : [10]), 1);

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">bedtime</span>
                        Sleep Tracker
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Log sleep, track quality, and monitor trends</p>
                </div>
                <ApiButton onClick={() => setShowForm(!showForm)} icon={<span className="material-symbols-outlined">add</span>}>
                    {showForm ? 'Cancel' : 'Log Sleep'}
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

            {/* Sleep Log Form */}
            {showForm && (
                <ApiCard>
                    <h2 className="text-lg font-bold text-white mb-4">Log Your Sleep</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-white/50 text-xs uppercase font-bold">Bed Time</label>
                            <input
                                type="datetime-local"
                                value={bedTime}
                                onChange={e => setBedTime(e.target.value)}
                                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                            />
                        </div>
                        <div>
                            <label className="text-white/50 text-xs uppercase font-bold">Wake Time</label>
                            <input
                                type="datetime-local"
                                value={wakeTime}
                                onChange={e => setWakeTime(e.target.value)}
                                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-white/50 text-xs uppercase font-bold">Sleep Quality: {quality}/10 - {QUALITY_LABELS[quality]}</label>
                        <input
                            type="range" min={1} max={10} value={quality}
                            onChange={e => setQuality(Number(e.target.value))}
                            className="w-full mt-2 accent-[#ff7b00]"
                        />
                        <div className="flex justify-between text-white/20 text-xs mt-1">
                            <span>1</span><span>5</span><span>10</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                            { label: 'Deep Sleep (min)', value: deepSleep, setter: setDeepSleep },
                            { label: 'Light Sleep (min)', value: lightSleep, setter: setLightSleep },
                            { label: 'REM Sleep (min)', value: remSleep, setter: setRemSleep },
                            { label: 'Awake (min)', value: awake, setter: setAwake },
                        ].map(field => (
                            <div key={field.label}>
                                <label className="text-white/50 text-[10px] uppercase font-bold">{field.label}</label>
                                <input
                                    type="number" min={0} value={field.value}
                                    onChange={e => field.setter(Number(e.target.value))}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mb-4">
                        <label className="text-white/50 text-xs uppercase font-bold">Factors</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {FACTOR_OPTIONS.map(factor => (
                                <button
                                    key={factor}
                                    onClick={() => toggleFactor(factor)}
                                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                                        selectedFactors.includes(factor)
                                            ? 'bg-[#ff7b00] text-black'
                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                                >
                                    {factor.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-white/50 text-xs uppercase font-bold">Notes</label>
                        <textarea
                            value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="How did you sleep?"
                            rows={2}
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                        />
                    </div>

                    <ApiButton onClick={submitLog} icon={<span className="material-symbols-outlined">save</span>}>
                        Save Sleep Log
                    </ApiButton>
                </ApiCard>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: 'schedule', color: 'text-blue-400' },
                        { label: 'Avg Quality', value: `${stats.avgQuality}/10`, icon: 'star', color: 'text-yellow-400' },
                        { label: 'Entries', value: String(stats.totalEntries), icon: 'calendar_month', color: 'text-green-400' },
                        { label: 'Consistency', value: `${stats.consistencyScore}%`, icon: 'trending_up', color: stats.trend === 'improving' ? 'text-green-400' : stats.trend === 'declining' ? 'text-red-400' : 'text-white/40' },
                    ].map(s => (
                        <div key={s.label} className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
                                <span className="text-white/30 text-xs uppercase font-bold">{s.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Quality Chart */}
            {trends.length > 0 && (
                <ApiCard>
                    <h2 className="text-lg font-bold text-white mb-4">Sleep Quality Trend</h2>
                    <div className="space-y-2">
                        {trends.slice(-14).map((t, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-white/30 text-xs w-16 flex-shrink-0">
                                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                                        style={{
                                            width: `${(t.quality / maxQualityBar) * 100}%`,
                                            backgroundColor: t.quality >= 7 ? '#00ffa3' : t.quality >= 5 ? '#ff7b00' : '#ff4444',
                                        }}
                                    >
                                        <span className="text-black text-[10px] font-bold">{t.quality}</span>
                                    </div>
                                </div>
                                <span className="text-white/30 text-xs w-12 text-right">
                                    {formatDuration(t.durationMinutes)}
                                </span>
                            </div>
                        ))}
                    </div>
                </ApiCard>
            )}

            {/* Recent Logs */}
            <ApiCard loading={loading && !logs.length}>
                <h2 className="text-lg font-bold text-white mb-4">Recent Sleep Logs</h2>
                {logs.length === 0 ? (
                    <EmptyState icon="bedtime" title="No sleep logs yet" subtitle="Start logging your sleep to see trends" />
                ) : (
                    <div className="space-y-3">
                        {logs.slice(0, 10).map(log => (
                            <div key={log.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <span className={`material-symbols-outlined text-2xl ${
                                        log.quality >= 7 ? 'text-green-400' : log.quality >= 5 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>bedtime</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold text-sm">
                                            {new Date(log.bedTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                            log.quality >= 7 ? 'bg-green-500/20 text-green-400' :
                                            log.quality >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                            {log.quality}/10
                                        </span>
                                    </div>
                                    <p className="text-white/30 text-xs">
                                        {formatDuration(log.durationMinutes)} | Deep: {Math.round(log.deepSleepMinutes / 60 * 10) / 10}h
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ApiCard>
        </div>
    );
}
