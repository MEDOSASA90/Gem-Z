'use client';

import React, { useState, useMemo } from 'react';
import {
    TrendingUp,
    Users,
    Dumbbell,
    Wallet,
    Activity,
    Target,
    BarChart3,
    PieChart as PieIcon,
    Award,
    Clock,
    RefreshCw,
    ChevronDown,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────

export interface TimeSeriesPoint {
    date: string;
    value: number;
}

export interface KpiSummary {
    totalUsers: number;
    activeUsersDaily: number;
    activeUsersMonthly: number;
    totalWorkouts: number;
    totalRevenue: number;
    avgWorkoutsPerUser: number;
    newUsersThisMonth: number;
    userGrowthRate: number;
}

export interface EngagementMetrics {
    avgSessionDuration: number;
    retentionDay7: number;
    retentionDay30: number;
    churnRate: number;
    avgSessionsPerWeek: number;
}

export interface RevenueBreakdown {
    category: string;
    amount: number;
    percentage: number;
}

export interface TopPerformingGym {
    gymId: string;
    gymName: string;
    totalMembers: number;
    monthlyRevenue: number;
    avgRating: number;
}

export interface UserSegment {
    segment: string;
    count: number;
    percentage: number;
}

export interface AnalyticsDashboardData {
    kpis: KpiSummary;
    userGrowth: TimeSeriesPoint[];
    workoutTrend: TimeSeriesPoint[];
    revenueTrend: TimeSeriesPoint[];
    revenueBreakdown: RevenueBreakdown[];
    engagement: EngagementMetrics;
    topGyms: TopPerformingGym[];
    userSegments: UserSegment[];
}

export interface AnalyticsDashboardProps {
    data: AnalyticsDashboardData;
    onRefresh: (range: string) => Promise<void>;
    isLoading?: boolean;
}

type DateRange = '7d' | '30d' | '90d' | '1y';

// ─── Helpers ────────────────────────────────────────────────────

const SEGMENT_COLORS: Record<string, string> = {
    'Highly Active': '#10b981',
    'Active': '#3b82f6',
    'At Risk': '#f59e0b',
    'Dormant': '#ef4444',
};

const REVENUE_COLORS: Record<string, string> = {
    'Subscriptions': '#8b5cf6',
    'Top-ups': '#06b6d4',
    'Gym Passes': '#10b981',
    'Store': '#f59e0b',
    'booking': '#ec4899',
};

const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(n % 1 === 0 ? 0 : 1);
};

// ─── Mini SVG Line Chart ────────────────────────────────────────

function MiniLineChart({ data, color = '#8b5cf6', height = 60 }: { data: TimeSeriesPoint[]; color?: string; height?: number }) {
    if (!data || data.length < 2) return <div className="h-[60px] bg-white/5 rounded-lg" />;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 300;
    const padding = 4;
    const points = data
        .map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            const y = padding + (1 - (d.value - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        })
        .join(' ');

    const areaPoints = `${points} ${width - padding},${height} ${padding},${height}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[60px]" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <polygon
                points={areaPoints}
                fill={`url(#grad-${color.replace('#', '')})`}
            />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ─── Mini SVG Bar Chart ─────────────────────────────────────────

function MiniBarChart({ data, color = '#8b5cf6' }: { data: TimeSeriesPoint[]; color?: string }) {
    if (!data || data.length === 0) return <div className="h-[60px] bg-white/5 rounded-lg" />;

    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);

    return (
        <svg viewBox="0 0 300 60" className="w-full h-[60px]" preserveAspectRatio="none">
            {data.map((d, i) => {
                const barWidth = 280 / data.length - 2;
                const x = 10 + i * (barWidth + 2);
                const barHeight = (d.value / max) * 50;
                const y = 60 - barHeight;
                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={Math.max(barWidth, 2)}
                        height={barHeight}
                        rx="2"
                        fill={color}
                        opacity={0.7 + (d.value / max) * 0.3}
                    />
                );
            })}
        </svg>
    );
}

// ─── SVG Donut Chart ────────────────────────────────────────────

function DonutChart({
    data,
    colors,
    totalLabel,
}: {
    data: { label: string; value: number }[];
    colors: Record<string, string>;
    totalLabel?: string;
}) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const radius = 45;
    const cx = 55;
    const cy = 55;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    return (
        <div className="flex items-center gap-4">
            <svg viewBox="0 0 110 110" className="w-28 h-28 flex-shrink-0">
                {data.map((segment, i) => {
                    const dashLength = (segment.value / total) * circumference;
                    const dashOffset = offset;
                    offset -= dashLength;

                    return (
                        <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill="none"
                            stroke={colors[segment.label] || '#6b7280'}
                            strokeWidth="12"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 55 55)"
                            strokeLinecap="round"
                        />
                    );
                })}
                <text x="55" y="52" textAnchor="middle" className="text-[10px] fill-white font-bold">
                    {totalLabel || formatNumber(total)}
                </text>
                <text x="55" y="64" textAnchor="middle" className="text-[7px] fill-slate-400">
                    Total
                </text>
            </svg>

            <div className="space-y-2 flex-1">
                {data.map((segment) => (
                    <div key={segment.label} className="flex items-center gap-2">
                        <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colors[segment.label] || '#6b7280' }}
                        />
                        <span className="text-xs text-slate-300 flex-1">{segment.label}</span>
                        <span className="text-xs font-semibold text-white">
                            {segment.percentage !== undefined
                                ? `${segment.percentage}%`
                                : formatNumber(segment.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────

export default function AnalyticsDashboard({
    data,
    onRefresh,
    isLoading = false,
}: AnalyticsDashboardProps) {
    const [range, setRange] = useState<DateRange>('30d');
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh(range);
        setRefreshing(false);
    };

    const rangeLabels: Record<DateRange, string> = {
        '7d': '7 Days',
        '30d': '30 Days',
        '90d': '90 Days',
        '1y': '1 Year',
    };

    const kpiCards = useMemo(
        () => [
            {
                label: 'Total Users',
                value: formatNumber(data.kpis.totalUsers),
                sub: `${formatNumber(data.kpis.newUsersThisMonth)} new this month`,
                icon: Users,
                color: 'text-sky-400',
                bg: 'bg-sky-500/10',
                trend: data.kpis.userGrowthRate,
            },
            {
                label: 'DAU / MAU',
                value: `${formatNumber(data.kpis.activeUsersDaily)}`,
                sub: `MAU: ${formatNumber(data.kpis.activeUsersMonthly)}`,
                icon: Activity,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                trend: null,
            },
            {
                label: 'Total Workouts',
                value: formatNumber(data.kpis.totalWorkouts),
                sub: `${data.kpis.avgWorkoutsPerUser.toFixed(1)} avg/user`,
                icon: Dumbbell,
                color: 'text-violet-400',
                bg: 'bg-violet-500/10',
                trend: null,
            },
            {
                label: 'Revenue',
                value: `EGP ${formatNumber(data.kpis.totalRevenue)}`,
                sub: 'Lifetime',
                icon: Wallet,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                trend: null,
            },
        ],
        [data.kpis]
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-violet-400" />
                        Analytics Dashboard
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">Platform performance overview</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Range Selector */}
                    <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                        {(['7d', '30d', '90d', '1y'] as DateRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => {
                                    setRange(r);
                                    handleRefresh();
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                    range === r
                                        ? 'bg-violet-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {rangeLabels[r]}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || isLoading}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <motion.div
                            key={kpi.label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/15 transition-all"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                                </div>
                                {kpi.trend !== null && kpi.trend !== undefined && (
                                    <span
                                        className={`flex items-center gap-0.5 text-xs font-semibold ${
                                            kpi.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}
                                    >
                                        {kpi.trend >= 0 ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                        )}
                                        {Math.abs(kpi.trend)}%
                                    </span>
                                )}
                            </div>
                            <div className="text-xl font-bold text-white">{kpi.value}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* User Growth */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-sky-400" />
                        User Growth
                    </h4>
                    <MiniLineChart data={data.userGrowth} color="#38bdf8" />
                    <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-slate-500">
                            {data.userGrowth[0]?.date?.slice(0, 10) || ''}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {data.userGrowth[data.userGrowth.length - 1]?.date?.slice(0, 10) || ''}
                        </span>
                    </div>
                </motion.div>

                {/* Workout Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-violet-400" />
                        Workouts
                    </h4>
                    <MiniBarChart data={data.workoutTrend} color="#8b5cf6" />
                </motion.div>

                {/* Revenue Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Revenue Trend
                    </h4>
                    <MiniLineChart data={data.revenueTrend} color="#10b981" />
                    <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-slate-500">
                            {data.revenueTrend[0]?.date?.slice(0, 10) || ''}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {data.revenueTrend[data.revenueTrend.length - 1]?.date?.slice(0, 10) || ''}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                    <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <PieIcon className="w-4 h-4 text-amber-400" />
                        Revenue Breakdown
                    </h4>
                    <DonutChart
                        data={data.revenueBreakdown}
                        colors={REVENUE_COLORS}
                        totalLabel="30d"
                    />
                </motion.div>

                {/* Engagement Metrics */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                    <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-400" />
                        Engagement
                    </h4>
                    <div className="space-y-4">
                        {[
                            { label: 'Avg Session', value: `${data.engagement.avgSessionDuration} min`, icon: Clock, pct: Math.min((data.engagement.avgSessionDuration / 60) * 100, 100), color: 'bg-sky-500' },
                            { label: '7-Day Retention', value: `${data.engagement.retentionDay7}%`, icon: Target, pct: data.engagement.retentionDay7, color: 'bg-emerald-500' },
                            { label: '30-Day Retention', value: `${data.engagement.retentionDay30}%`, icon: Target, pct: data.engagement.retentionDay30, color: 'bg-violet-500' },
                            { label: 'Weekly Sessions', value: `${data.engagement.avgSessionsPerWeek}`, icon: Activity, pct: Math.min((data.engagement.avgSessionsPerWeek / 7) * 100, 100), color: 'bg-amber-500' },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-2 text-xs text-slate-400">
                                            <Icon className="w-3 h-3" />
                                            {item.label}
                                        </span>
                                        <span className="text-xs font-semibold text-white">{item.value}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.pct}%` }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                            className={`h-full ${item.color} rounded-full`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* User Segments */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                    <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        User Segments
                    </h4>
                    <DonutChart
                        data={data.userSegments}
                        colors={SEGMENT_COLORS}
                    />
                </motion.div>
            </div>

            {/* Top Gyms Table */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
                <div className="p-4 border-b border-white/5">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Top Performing Gyms
                    </h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-slate-500 border-b border-white/5">
                                <th className="text-left p-3 font-medium">Gym</th>
                                <th className="text-right p-3 font-medium">Members</th>
                                <th className="text-right p-3 font-medium">Monthly Revenue</th>
                                <th className="text-right p-3 font-medium">Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topGyms.map((gym, idx) => (
                                <tr
                                    key={gym.gymId}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="p-3">
                                        <span className="text-white font-medium">{gym.gymName}</span>
                                    </td>
                                    <td className="p-3 text-right text-slate-300">
                                        {gym.totalMembers.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right text-emerald-400 font-semibold">
                                        EGP {gym.monthlyRevenue.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="inline-flex items-center gap-1 text-amber-400">
                                            <Award className="w-3 h-3" />
                                            {gym.avgRating.toFixed(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
