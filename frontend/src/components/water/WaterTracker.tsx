'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface WaterLog {
    id: string;
    amountMl: number;
    loggedAt: string;
    source: string;
    notes: string | null;
}

interface DailySummary {
    totalIntakeMl: number;
    goalMl: number;
    percentage: number;
    entriesCount: number;
    goalMet: boolean;
    remainingMl: number;
}

interface WaterStats {
    currentStreak: number;
    longestStreak: number;
    totalIntakeAllTime: number;
    avgDailyIntake: number;
    daysGoalMet: number;
    totalDays: number;
    goalCompletionRate: number;
}

interface WaterReminder {
    enabled: boolean;
    intervalMinutes: number;
    startTime: string;
    endTime: string;
}

const QUICK_ADD_AMOUNTS = [150, 250, 500, 750, 1000];
const BOTTLE_MAX = 2500;

// ─── WaterTracker Component ─────────────────────────────────────

export default function WaterTracker() {
    const [logs, setLogs] = useState<WaterLog[]>([]);
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [stats, setStats] = useState<WaterStats | null>(null);
    const [reminder, setReminder] = useState<WaterReminder | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [showReminderForm, setShowReminderForm] = useState(false);

    const fetchToday = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [todayRes, statsRes, reminderRes] = await Promise.all([
                fetch('/api/v1/water/today', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/v1/water/stats', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/v1/water/reminder', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const [todayData, statsData, reminderData] = await Promise.all([
                todayRes.json(), statsRes.json(), reminderRes.json(),
            ]);
            if (todayData.success) {
                setLogs(todayData.data.logs);
                setSummary(todayData.data.summary);
            }
            if (statsData.success) setStats(statsData.data);
            if (reminderData.success) setReminder(reminderData.data);
        } catch {
            setError('Failed to load water data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchToday(); }, [fetchToday]);

    const addWater = async (amountMl: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/water/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ amountMl }),
            });
            const data = await res.json();
            if (data.success) fetchToday();
        } catch {
            setError('Failed to log water');
        }
    };

    const deleteLog = async (logId: string) => {
        if (!confirm('Remove this entry?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/v1/water/logs/${logId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchToday();
        } catch {
            setError('Failed to remove entry');
        }
    };

    const updateReminder = async (updated: WaterReminder) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/water/reminder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(updated),
            });
            const data = await res.json();
            if (data.success) {
                setReminder(data.data);
                setShowReminderForm(false);
            }
        } catch {
            setError('Failed to update reminder');
        }
    };

    const percentage = summary?.percentage || 0;
    const bottleHeight = Math.min(100, percentage);

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00B8FF]">water_drop</span>
                        Water Tracker
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Stay hydrated and track your daily intake</p>
                </div>
                <ApiButton variant="ghost" onClick={() => setShowReminderForm(!showReminderForm)} icon={<span className="material-symbols-outlined">notifications</span>}>
                    Reminder
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

            {/* Reminder Form */}
            {showReminderForm && reminder && (
                <ApiCard>
                    <h2 className="text-lg font-bold text-white mb-4">Reminder Settings</h2>
                    <ReminderForm reminder={reminder} onSave={updateReminder} onCancel={() => setShowReminderForm(false)} />
                </ApiCard>
            )}

            {/* Visual Water Bottle + Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Water Bottle Visual */}
                <ApiCard className="flex flex-col items-center justify-center py-8">
                    <div className="relative w-32 h-56 mx-auto">
                        {/* Bottle outline */}
                        <div className="absolute inset-0 border-4 border-white/20 rounded-3xl overflow-hidden bg-white/[0.02]">
                            {/* Water fill */}
                            <div
                                className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                                style={{
                                    height: `${bottleHeight}%`,
                                    background: `linear-gradient(to top, #0066CC, #00B8FF)`,
                                    opacity: 0.8,
                                }}
                            >
                                {/* Wave effect */}
                                <div className="absolute -top-2 left-0 right-0 h-4 bg-[#00B8FF]/40 rounded-full animate-pulse" />
                            </div>
                        </div>
                        {/* Percentage label */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white drop-shadow-lg">{percentage}%</span>
                        </div>
                        {/* Measurement lines */}
                        {[25, 50, 75].map(pct => (
                            <div key={pct} className="absolute left-0 right-0 flex items-center" style={{ bottom: `${pct}%` }}>
                                <div className="w-3 h-px bg-white/20" />
                                <span className="text-[8px] text-white/20 ml-1">{Math.round((summary?.goalMl || 2500) * pct / 100)}ml</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-white font-bold mt-4 text-lg">
                        {summary?.totalIntakeMl || 0} / {summary?.goalMl || 2500} ml
                    </p>
                    <p className="text-white/40 text-sm">
                        {summary?.goalMet
                            ? 'Goal reached! Great job!'
                            : `${summary?.remainingMl || 2500}ml remaining`
                        }
                    </p>
                    {stats && (
                        <div className="flex gap-4 mt-3 text-xs">
                            <span className="bg-[#00B8FF]/20 text-[#00B8FF] px-2 py-1 rounded-full font-bold">
                                {stats.currentStreak} day streak
                            </span>
                            <span className="bg-white/5 text-white/40 px-2 py-1 rounded-full">
                                Best: {stats.longestStreak} days
                            </span>
                        </div>
                    )}
                </ApiCard>

                {/* Quick Add */}
                <ApiCard>
                    <h2 className="text-lg font-bold text-white mb-4">Add Water</h2>

                    {/* Quick Amounts */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {QUICK_ADD_AMOUNTS.map(amt => (
                            <button
                                key={amt}
                                onClick={() => addWater(amt)}
                                className="bg-[#00B8FF]/10 hover:bg-[#00B8FF]/20 border border-[#00B8FF]/30 rounded-xl py-3 px-2 transition-all active:scale-[0.95]"
                            >
                                <span className="material-symbols-outlined text-[#00B8FF] text-xl">water_drop</span>
                                <p className="text-white font-bold text-sm">+{amt}ml</p>
                            </button>
                        ))}
                    </div>

                    {/* Custom Amount */}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={customAmount}
                            onChange={e => setCustomAmount(e.target.value)}
                            placeholder="Custom amount (ml)"
                            min={10}
                            max={5000}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00B8FF]"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && customAmount) {
                                    addWater(Number(customAmount));
                                    setCustomAmount('');
                                }
                            }}
                        />
                        <ApiButton
                            onClick={() => {
                                if (customAmount) {
                                    addWater(Number(customAmount));
                                    setCustomAmount('');
                                }
                            }}
                            disabled={!customAmount}
                            icon={<span className="material-symbols-outlined">add</span>}
                        >
                            Add
                        </ApiButton>
                    </div>
                </ApiCard>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Avg Daily', value: `${stats.avgDailyIntake}ml`, icon: 'water_drop', color: 'text-[#00B8FF]' },
                        { label: 'Goal Rate', value: `${stats.goalCompletionRate}%`, icon: 'check_circle', color: 'text-green-400' },
                        { label: 'Total Intake', value: `${(stats.totalIntakeAllTime / 1000).toFixed(1)}L`, icon: 'storage', color: 'text-blue-400' },
                        { label: 'Days Tracked', value: String(stats.totalDays), icon: 'calendar_month', color: 'text-white/40' },
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

            {/* Today's Logs */}
            <ApiCard loading={loading}>
                <h2 className="text-lg font-bold text-white mb-4">Today&apos;s Entries</h2>
                {logs.length === 0 ? (
                    <EmptyState icon="water_drop" title="No water logged today" subtitle="Start adding water above" />
                ) : (
                    <div className="space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                <span className="material-symbols-outlined text-[#00B8FF]">water_drop</span>
                                <div className="flex-1">
                                    <span className="text-white font-bold">{log.amountMl}ml</span>
                                    <span className="text-white/30 text-xs ml-2">
                                        {new Date(log.loggedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteLog(log.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        ))}
                        <div className="pt-2 border-t border-white/5 flex justify-between text-sm">
                            <span className="text-white/30">{logs.length} entries</span>
                            <span className="text-white/50 font-bold">{summary?.totalIntakeMl}ml total</span>
                        </div>
                    </div>
                )}
            </ApiCard>
        </div>
    );
}

// ─── ReminderForm Sub-Component ─────────────────────────────────

function ReminderForm({ reminder, onSave, onCancel }: {
    reminder: WaterReminder;
    onSave: (r: WaterReminder) => void;
    onCancel: () => void;
}) {
    const [enabled, setEnabled] = useState(reminder?.enabled ?? false);
    const [intervalMinutes, setIntervalMinutes] = useState(reminder?.intervalMinutes ?? 60);
    const [startTime, setStartTime] = useState(reminder?.startTime ?? '08:00');
    const [endTime, setEndTime] = useState(reminder?.endTime ?? '22:00');

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setEnabled(!enabled)}
                    className={`w-12 h-7 rounded-full transition-all relative ${enabled ? 'bg-[#00B8FF]' : 'bg-white/10'}`}
                >
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
                <span className="text-white font-bold text-sm">{enabled ? 'Enabled' : 'Disabled'}</span>
            </div>

            <div>
                <label className="text-white/50 text-xs uppercase font-bold">Interval (minutes)</label>
                <select
                    value={intervalMinutes}
                    onChange={e => setIntervalMinutes(Number(e.target.value))}
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00B8FF]"
                >
                    {[15, 30, 45, 60, 90, 120, 180, 240].map(m => (
                        <option key={m} value={m} className="bg-[#1a1a1a]">Every {m} minutes</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-white/50 text-xs uppercase font-bold">Start Time</label>
                    <input
                        type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00B8FF]"
                    />
                </div>
                <div>
                    <label className="text-white/50 text-xs uppercase font-bold">End Time</label>
                    <input
                        type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00B8FF]"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <ApiButton onClick={() => onSave({ enabled, intervalMinutes, startTime, endTime })}>
                    Save
                </ApiButton>
                <ApiButton variant="ghost" onClick={onCancel}>
                    Cancel
                </ApiButton>
            </div>
        </div>
    );
}
