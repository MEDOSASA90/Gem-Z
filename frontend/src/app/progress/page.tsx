'use client';
import React, { useState } from 'react';
import {
    TrendingUp, Camera, Plus, Globe, Activity, Calendar,
    ChevronLeft, ChevronRight, Target, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const ENTRIES = [
    { date: '2024-01-01', dateAr: 'يناير 1', weight: 88.5, fat: 28, muscle: 38, waist: 95, photo: null, note: 'Started GEM Z journey', noteAr: 'بدأت رحلتي مع GEM Z' },
    { date: '2024-02-01', dateAr: 'فبراير 1', weight: 86.2, fat: 26, muscle: 39, waist: 93, photo: null, note: 'First month solid', noteAr: 'أول شهر ممتاز' },
    { date: '2024-03-01', dateAr: 'مارس 1', weight: 84.8, fat: 24, muscle: 40.5, waist: 91, photo: null, note: 'Feeling stronger', noteAr: 'أحس بقوة أكبر' },
    { date: '2024-04-01', dateAr: 'أبريل 1', weight: 83.1, fat: 22, muscle: 42, waist: 89, photo: null, note: 'Diet on point', noteAr: 'النظام الغذائي ممتاز' },
    { date: '2024-05-01', dateAr: 'مايو 1', weight: 82.0, fat: 20.5, muscle: 43, waist: 87, photo: null, note: 'Best shape yet!', noteAr: 'أفضل شكل حتى الآن!' },
];

const METRICS = [
    { key: 'weight', labelEn: 'Weight (kg)', labelAr: 'الوزن (كجم)', color: '#00B8FF', unit: 'kg', icon: '⚖️' },
    { key: 'fat', labelEn: 'Body Fat %', labelAr: 'دهون الجسم %', color: '#FF6B35', unit: '%', icon: '🔥' },
    { key: 'muscle', labelEn: 'Muscle Mass %', labelAr: 'كتلة العضل %', color: '#00FFA3', unit: '%', icon: '💪' },
    { key: 'waist', labelEn: 'Waist (cm)', labelAr: 'الخصر (سم)', color: '#A78BFA', unit: 'cm', icon: '📏' },
];

function MiniChart({ entries, metricKey, color }: { entries: typeof ENTRIES, metricKey: string, color: string }) {
    const values = entries.map(e => (e as Record<string, any>)[metricKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const W = 300, H = 80;
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 16) - 4;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
            <defs>
                <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#grad-${metricKey})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {values.map((v, i) => {
                const parts = points.split(' ')[i].split(',');
                return <circle key={i} cx={parseFloat(parts[0])} cy={parseFloat(parts[1])} r="3.5" fill={color} />;
            })}
        </svg>
    );
}

export default function BodyProgressPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedMetric, setSelectedMetric] = useState('weight');
    const [compareIdx, setCompareIdx] = useState<[number, number]>([0, ENTRIES.length - 1]);
    const [showAddModal, setShowAddModal] = useState(false);

    const first = ENTRIES[compareIdx[0]];
    const last = ENTRIES[compareIdx[1]];
    const metric = METRICS.find(m => m.key === selectedMetric)!;
    const firstVal = (first as Record<string, any>)[selectedMetric];
    const lastVal = (last as Record<string, any>)[selectedMetric];
    const diff = +(lastVal - firstVal).toFixed(1);

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-28" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2"><TrendingUp size={18} className="text-[#00FFA3]" />{isArabic ? 'تتبع التقدم' : 'Body Progress'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'رحلتك من البداية حتى الآن' : 'Your transformation journey'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black" style={{ background: '#00FFA3' }}>
                        <Plus size={14} /> {isArabic ? 'إضافة قياس' : 'Log Stats'}
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {METRICS.map(m => {
                        const first = (ENTRIES[0] as Record<string, any>)[m.key];
                        const last = (ENTRIES[ENTRIES.length - 1] as Record<string, any>)[m.key];
                        const d = +(last - first).toFixed(1);
                        const isPositive = d > 0;
                        const isBad = (m.key === 'fat' || m.key === 'waist' || m.key === 'weight') && isPositive;
                        const goodColor = isBad ? '#FF3B30' : '#00FFA3';
                        return (
                            <button key={m.key} onClick={() => setSelectedMetric(m.key)}
                                className="p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
                                style={{ background: selectedMetric === m.key ? `${m.color}12` : 'var(--bg-card)', border: `1px solid ${selectedMetric === m.key ? m.color : 'var(--border-subtle)'}` }}>
                                <div className="text-2xl mb-2">{m.icon}</div>
                                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? m.labelAr : m.labelEn}</p>
                                <p className="text-xl font-bold font-mono" style={{ color: m.color }}>{last}{m.unit}</p>
                                <p className="text-xs font-bold mt-1" style={{ color: goodColor }}>
                                    {d > 0 ? '+' : ''}{d}{m.unit} {isArabic ? 'منذ البداية' : 'since start'}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Chart */}
                <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold">{isArabic ? metric.labelAr : metric.labelEn}</h3>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span>{ENTRIES[0].dateAr || ENTRIES[0].date}</span>
                            <span>→</span>
                            <span>{ENTRIES[ENTRIES.length - 1].dateAr || ENTRIES[ENTRIES.length - 1].date}</span>
                        </div>
                    </div>
                    <MiniChart entries={ENTRIES} metricKey={selectedMetric} color={metric.color} />
                    {/* X axis labels */}
                    <div className="flex justify-between mt-2">
                        {ENTRIES.map((e, i) => (
                            <span key={i} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isArabic ? e.dateAr : e.date.slice(5)}</span>
                        ))}
                    </div>
                </div>

                {/* Before / After Comparison */}
                <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <h3 className="font-bold mb-4">{isArabic ? '📸 مقارنة بيفور/أفتر' : '📸 Before/After Comparison'}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {[compareIdx[0], compareIdx[1]].map((idx, side) => (
                            <div key={side}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold" style={{ color: side === 0 ? '#FF6B35' : '#00FFA3' }}>
                                        {side === 0 ? (isArabic ? 'البداية' : 'BEFORE') : (isArabic ? 'الآن' : 'AFTER')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCompareIdx(p => { const n = [...p] as [number, number]; n[side] = Math.max(0, p[side] - 1); return n; })} className="p-0.5"><ChevronLeft size={14} /></button>
                                        <span className="text-xs">{ENTRIES[idx].date.slice(5)}</span>
                                        <button onClick={() => setCompareIdx(p => { const n = [...p] as [number, number]; n[side] = Math.min(ENTRIES.length - 1, p[side] + 1); return n; })} className="p-0.5"><ChevronRight size={14} /></button>
                                    </div>
                                </div>
                                <div className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
                                    style={{ background: side === 0 ? 'rgba(255,107,53,0.08)' : 'rgba(0,255,163,0.08)', border: `1px dashed ${side === 0 ? '#FF6B35' : '#00FFA3'}50` }}>
                                    <Camera size={32} style={{ color: side === 0 ? '#FF6B35' : '#00FFA3', opacity: 0.5 }} />
                                    <p className="text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>
                                        {isArabic ? 'انقر لإضافة صورة' : 'Tap to add photo'}
                                    </p>
                                    <div className="absolute bottom-3 w-full px-3">
                                        {METRICS.slice(0, 3).map(m => (
                                            <div key={m.key} className="flex justify-between text-xs">
                                                <span style={{ color: 'var(--text-muted)' }}>{m.icon}</span>
                                                <span style={{ color: m.color }}>{(ENTRIES[idx] as Record<string, any>)[m.key]}{m.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-8 p-4 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                        <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? metric.labelAr : metric.labelEn}</p>
                            <p className="font-bold font-mono" style={{ color: '#FF6B35' }}>{firstVal}{metric.unit}</p>
                        </div>
                        <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
                        <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الآن' : 'Now'}</p>
                            <p className="font-bold font-mono" style={{ color: '#00FFA3' }}>{lastVal}{metric.unit}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'التغيير' : 'Change'}</p>
                            <p className="font-bold font-mono text-xl" style={{ color: diff > 0 ? '#FF3B30' : '#00FFA3' }}>
                                {diff > 0 ? '+' : ''}{diff}{metric.unit}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div>
                    <h3 className="font-bold mb-4">{isArabic ? '📅 السجل التاريخي' : '📅 Progress Timeline'}</h3>
                    <div className="space-y-3">
                        {[...ENTRIES].reverse().map((e, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-3 rounded-full bg-[#00FFA3]" />
                                    {i < ENTRIES.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: 'var(--border-subtle)' }} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-sm">{isArabic ? e.dateAr : e.date}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? e.noteAr : e.note}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {METRICS.map(m => (
                                            <span key={m.key} className="text-xs px-2.5 py-1 rounded-full font-mono font-bold"
                                                style={{ background: `${m.color}10`, color: m.color }}>
                                                {m.icon} {(e as Record<string, any>)[m.key]}{m.unit}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add Stats Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowAddModal(false)}>
                    <div className="rounded-3xl p-6 w-full max-w-md space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl">{isArabic ? '➕ سجّل قياسات اليوم' : '➕ Log Today\'s Stats'}</h3>
                        {METRICS.map(m => (
                            <div key={m.key}>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{m.icon} {isArabic ? m.labelAr : m.labelEn}</label>
                                <input type="number" step="0.1" placeholder={String((ENTRIES[ENTRIES.length - 1] as Record<string, any>)[m.key])}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm input-base" />
                            </div>
                        ))}
                        <div className="flex gap-3">
                            <button className="flex-1 py-3 rounded-xl font-bold text-black" style={{ background: '#00FFA3' }}>
                                {isArabic ? '✅ حفظ' : '✅ Save'}
                            </button>
                            <button onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl font-bold" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
