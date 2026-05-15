'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Watch,
    Smartphone,
    Activity,
    Heart,
    Footprints,
    Flame,
    Moon,
    Timer,
    Route,
    TrendingUp,
    Loader2,
    RefreshCw,
    Unlink,
    Link,
    ChevronRight,
    AlertTriangle,
    CheckCircle,
    BarChart3,
    Settings,
} from 'lucide-react';
import { ApiButton, ApiCard, EmptyState, ErrorState } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

type Provider = 'apple_healthkit' | 'google_fit' | 'garmin' | 'fitbit';
type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'syncing';

interface WearableConnection {
    id: string;
    provider: Provider;
    status: ConnectionStatus;
    providerUserId: string | null;
    lastSyncedAt: string | null;
    syncEnabled: boolean;
    metricsEnabled: {
        steps: boolean;
        heartRate: boolean;
        calories: boolean;
        sleep: boolean;
        workouts: boolean;
        distance: boolean;
        floors: boolean;
    };
    createdAt: string;
}

interface AggregatedMetrics {
    summary: {
        avgSteps: number;
        avgCalories: number;
        avgSleep: number;
        avgHeartRate: number;
        totalWorkouts: number;
    };
    daily: Array<{
        date: string;
        steps: number | null;
        calories: number | null;
        sleep: number | null;
        heartRateAvg: number | null;
        workouts: number | null;
    }>;
}

const PROVIDERS: Array<{
    id: Provider;
    name: string;
    nameAr: string;
    icon: string;
    color: string;
}> = [
    {
        id: 'apple_healthkit',
        name: 'Apple Health',
        nameAr: 'صحة آبل',
        icon: 'health_and_safety',
        color: '#FF3B30',
    },
    {
        id: 'google_fit',
        name: 'Google Fit',
        nameAr: 'جوجل فيت',
        icon: 'fitness_center',
        color: '#4285F4',
    },
    {
        id: 'garmin',
        name: 'Garmin Connect',
        nameAr: 'جارمين',
        icon: 'watch',
        color: '#007CC2',
    },
    {
        id: 'fitbit',
        name: 'Fitbit',
        nameAr: 'فيتبيت',
        icon: 'watch_button_press',
        color: '#00B0B9',
    },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Component ────────────────────────────────────────────────────

export default function WearableConnect() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [connections, setConnections] = useState<WearableConnection[]>([]);
    const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState<Provider | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeConnection, setActiveConnection] = useState<string | null>(null);

    // ─── Data Fetching ──────────────────────────────────────────────

    const fetchConnections = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/wearables/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setConnections(data.connections || []);
            }
        } catch {
            setError(t('Failed to load connections', 'فشل تحميل الاتصالات'));
        }
    }, [t]);

    const fetchMetrics = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/wearables/metrics?days=7`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setMetrics(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchConnections();
        fetchMetrics();
    }, [fetchConnections, fetchMetrics]);

    // ─── Actions ────────────────────────────────────────────────────

    const connectDevice = async (provider: Provider) => {
        setIsConnecting(provider);
        setError(null);

        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/wearables/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ provider }),
            });

            const data = await response.json();

            if (data.success) {
                if (data.authUrl) {
                    // OAuth flow
                    window.location.href = data.authUrl;
                } else {
                    // Native SDK flow (Apple HealthKit)
                    await fetchConnections();
                }
            } else {
                setError(data.message || 'Connection failed');
            }
        } catch {
            setError(t('Network error', 'خطأ في الشبكة'));
        } finally {
            setIsConnecting(null);
        }
    };

    const disconnectDevice = async (connectionId: string) => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            await fetch(`${API_BASE}/wearables/${connectionId}/disconnect`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchConnections();
        } catch {
            setError(t('Failed to disconnect', 'فشل فصل الاتصال'));
        }
    };

    const syncDevice = async (connectionId: string) => {
        setIsSyncing(connectionId);
        setError(null);

        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/wearables/${connectionId}/sync`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                await fetchConnections();
                await fetchMetrics();
            } else {
                setError(data.message || 'Sync failed');
            }
        } catch {
            setError(t('Sync failed', 'فشل المزامنة'));
        } finally {
            setIsSyncing(null);
        }
    };

    // ─── Helpers ────────────────────────────────────────────────────

    const getStatusIcon = (status: ConnectionStatus) => {
        switch (status) {
            case 'connected': return <CheckCircle size={14} className="text-green-400" />;
            case 'syncing': return <Loader2 size={14} className="text-blue-400 animate-spin" />;
            case 'expired': return <AlertTriangle size={14} className="text-yellow-400" />;
            default: return <Unlink size={14} className="text-white/40" />;
        }
    };

    const getStatusLabel = (status: ConnectionStatus) => {
        switch (status) {
            case 'connected': return t('Connected', 'متصل');
            case 'syncing': return t('Syncing...', 'جاري المزامنة...');
            case 'expired': return t('Expired', 'منتهي');
            default: return t('Disconnected', 'غير متصل');
        }
    };

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <Watch className="text-[var(--color-primary)]" size={28} />
                    {t('Wearables', 'الأجهزة الذكية')}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                    {t('Connect your fitness devices and track your health', 'اتصل بأجهزة اللياقة الخاصة بك وتتبع صحتك')}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">
                        &times;
                    </button>
                </div>
            )}

            {/* Provider Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROVIDERS.map((provider) => {
                    const connection = connections.find((c) => c.provider === provider.id);
                    const isConnected = connection?.status === 'connected';

                    return (
                        <div
                            key={provider.id}
                            className={`relative p-4 rounded-2xl border transition-all ${
                                isConnected
                                    ? 'bg-white/[0.06] border-green-500/30'
                                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${provider.color}20` }}
                                >
                                    <span
                                        className="material-symbols-outlined text-2xl"
                                        style={{ fontVariationSettings: "'FILL' 1", color: provider.color }}
                                    >
                                        {provider.icon}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-sm">
                                        {isArabic ? provider.nameAr : provider.name}
                                    </h3>
                                    {connection && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {getStatusIcon(connection.status)}
                                            <span className="text-xs text-white/50">{getStatusLabel(connection.status)}</span>
                                        </div>
                                    )}
                                    {connection?.lastSyncedAt && (
                                        <p className="text-white/30 text-xs mt-0.5">
                                            {t('Last sync:', 'آخر مزامنة:')} {new Date(connection.lastSyncedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>

                                {/* Action */}
                                {isConnected ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => syncDevice(connection.id)}
                                            disabled={isSyncing === connection.id}
                                            className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                                            title={t('Sync', 'مزامنة')}
                                        >
                                            {isSyncing === connection.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={16} />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => disconnectDevice(connection.id)}
                                            className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                            title={t('Disconnect', 'فصل')}
                                        >
                                            <Unlink size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <ApiButton
                                        onClick={() => connectDevice(provider.id)}
                                        loading={isConnecting === provider.id}
                                        icon={<Link size={16} />}
                                        variant="primary"
                                        className="!px-3 !py-2 !text-xs"
                                    >
                                        {t('Connect', 'اتصال')}
                                    </ApiButton>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Health Metrics */}
            {metrics && (
                <div className="space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <BarChart3 size={18} className="text-[var(--color-primary)]" />
                        {t('Health Overview', 'نظرة عامة على الصحة')}
                    </h3>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <MetricCard
                            icon={<Footprints size={16} />}
                            label={t('Avg Steps', 'الخطوات')}
                            value={metrics.summary.avgSteps.toLocaleString()}
                            color="text-blue-400"
                        />
                        <MetricCard
                            icon={<Flame size={16} />}
                            label={t('Avg Calories', 'السعرات')}
                            value={metrics.summary.avgCalories.toLocaleString()}
                            color="text-orange-400"
                        />
                        <MetricCard
                            icon={<Moon size={16} />}
                            label={t('Avg Sleep', 'النوم')}
                            value={`${metrics.summary.avgSleep.toFixed(1)}h`}
                            color="text-purple-400"
                        />
                        <MetricCard
                            icon={<Heart size={16} />}
                            label={t('Avg HR', 'النبض')}
                            value={`${metrics.summary.avgHeartRate} bpm`}
                            color="text-red-400"
                        />
                        <MetricCard
                            icon={<Activity size={16} />}
                            label={t('Workouts', 'التمارين')}
                            value={`${metrics.summary.totalWorkouts}`}
                            color="text-green-400"
                        />
                    </div>

                    {/* Daily Chart */}
                    {metrics.daily.length > 0 && (
                        <ApiCard>
                            <h4 className="font-semibold text-white text-sm mb-3">
                                {t('7-Day Activity', 'نشاط 7 أيام')}
                            </h4>
                            <div className="flex items-end gap-1 h-32">
                                {metrics.daily.map((day, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex flex-col gap-0.5">
                                            <div
                                                className="w-full bg-blue-500/40 rounded-t-sm min-h-[2px]"
                                                style={{ height: `${Math.min(60, ((day.steps || 0) / 15000) * 60)}px` }}
                                                title={`${t('Steps', 'خطوات')}: ${day.steps || 0}`}
                                            />
                                            <div
                                                className="w-full bg-orange-500/40 rounded-t-sm min-h-[2px]"
                                                style={{ height: `${Math.min(40, ((day.calories || 0) / 3000) * 40)}px` }}
                                                title={`${t('Calories', 'سعرات')}: ${day.calories || 0}`}
                                            />
                                        </div>
                                        <span className="text-white/30 text-[9px]">
                                            {new Date(day.date).toLocaleDateString([], { weekday: 'narrow' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="flex items-center gap-1 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500/40" /> {t('Steps', 'خطوات')}</span>
                                <span className="flex items-center gap-1 text-orange-400"><div className="w-2 h-2 rounded-full bg-orange-500/40" /> {t('Calories', 'سعرات')}</span>
                            </div>
                        </ApiCard>
                    )}
                </div>
            )}

            {/* No connections state */}
            {connections.length === 0 && (
                <EmptyState
                    icon="watch"
                    title={t('No Devices Connected', 'لا توجد أجهزة متصلة')}
                    subtitle={t('Connect your fitness tracker to start syncing health data', 'اتصل بجهاز تتبع اللياقة لبدء مزامنة بيانات الصحة')}
                />
            )}
        </div>
    );
}

// ─── Metric Card ──────────────────────────────────────────────────

function MetricCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
            <div className={`${color} flex justify-center mb-1`}>{icon}</div>
            <p className="text-white font-bold text-sm">{value}</p>
            <p className="text-white/40 text-xs">{label}</p>
        </div>
    );
}
