'use client';
import React, { useState, useEffect } from 'react';
import {
    Trophy, Users, Timer, Target, Flame, ChevronRight,
    Globe, Star, CheckCircle, Lock, Zap, Award, Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';
import { GemZApi } from '../../lib/api';

const MY_PROGRESS = {
    activeChallenges: 2,
    completedChallenges: 5,
    totalPoints: 1840,
    currentStreak: 12,
};

export default function CommunityChallengePage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [selected, setSelected] = useState<any | null>(null);
    const [filter, setFilter] = useState<'all' | 'mine'>('all');
    
    const [challenges, setChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const res: any = await GemZApi.Challenges.list();
            if (res.success && res.challenges) {
                setChallenges(res.challenges);
            }
        } catch (error) {
            console.error('Failed to load challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (id: string, e: any) => {
        e.stopPropagation();
        try {
            const res: any = await GemZApi.Challenges.join(id);
            if (res.success) {
                setChallenges(p => p.map(c => c.id === id ? { ...c, joined: true } : c));
            }
        } catch (error) {
            console.error('Failed to join', error);
        }
    };

    const displayed = filter === 'mine' ? challenges.filter(c => c.joined) : challenges;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans tracking-tight bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-[#00FFA3]" />
            </div>
        );
    }

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-20" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2"><Trophy size={18} className="text-[#FFCC00]" />{isArabic ? 'تحديات المجتمع' : 'Community Challenges'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تنافس واربح جوائز حقيقية!' : 'Compete & win real prizes!'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto p-6">
                {/* My Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: Zap, label: isArabic ? 'تحديات نشطة' : 'Active Challenges', value: MY_PROGRESS.activeChallenges, color: '#00FFA3' },
                        { icon: CheckCircle, label: isArabic ? 'تحديات مكتملة' : 'Completed', value: MY_PROGRESS.completedChallenges, color: '#34C759' },
                        { icon: Star, label: isArabic ? 'النقاط المكتسبة' : 'Total Points', value: MY_PROGRESS.totalPoints.toLocaleString('en-US'), color: '#FFCC00' },
                        { icon: Flame, label: isArabic ? 'أيام متتالية' : 'Current Streak', value: `${MY_PROGRESS.currentStreak}🔥`, color: '#FF6B35' },
                    ].map((s, i) => (
                        <div key={i} className="rounded-2xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <s.icon size={20} className="mx-auto mb-2" style={{ color: s.color }} />
                            <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: 'all', en: 'All Challenges', ar: 'كل التحديات' },
                        { id: 'mine', en: 'My Challenges', ar: 'تحدياتي' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setFilter(tab.id as 'all' | 'mine')}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={{ background: filter === tab.id ? '#FFCC00' : 'var(--bg-card)', color: filter === tab.id ? '#000' : 'var(--text-secondary)', border: `1px solid ${filter === tab.id ? '#FFCC00' : 'var(--border-subtle)'}` }}>
                            {isArabic ? tab.ar : tab.en}
                        </button>
                    ))}
                </div>

                {/* Challenges Grid */}
                <div className={`grid grid-cols-1 ${selected ? 'lg:grid-cols-2' : 'md:grid-cols-2'} gap-5`}>
                    {displayed.map(challenge => (
                        <div key={challenge.id} onClick={() => setSelected(selected?.id === challenge.id ? null : challenge)}
                            className="rounded-3xl p-6 cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ background: 'var(--bg-card)', border: `1px solid ${challenge.joined ? `${challenge.color}40` : 'var(--border-subtle)'}` }}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="text-4xl mb-3">{challenge.emoji}</div>
                                    <h3 className="font-bold text-lg font-heading">{isArabic ? challenge.titleAr : challenge.titleEn}</h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? challenge.descAr : challenge.descEn}</p>
                                </div>
                                {challenge.joined && <span className="text-xs px-2 py-1 rounded-full font-bold shrink-0 ms-2" style={{ background: 'rgba(0,255,163,0.1)', color: '#00FFA3', border: '1px solid rgba(0,255,163,0.3)' }}>✓ {isArabic ? 'منضم' : 'Joined'}</span>}
                            </div>

                            {/* Progress bar for joined challenges */}
                            {challenge.joined && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        <span>{isArabic ? 'التقدم' : 'Progress'}</span>
                                        <span>{challenge.totalDays - challenge.daysLeft}/{challenge.totalDays} {isArabic ? 'يوم' : 'days'}</span>
                                    </div>
                                    <div className="h-2 rounded-full" style={{ background: 'var(--bg-input)' }}>
                                        <div className="h-2 rounded-full transition-all" style={{ width: `${((challenge.totalDays - challenge.daysLeft) / challenge.totalDays) * 100}%`, background: challenge.color }} />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="flex items-center gap-1"><Users size={13} />{challenge.participants.toLocaleString('en-US')}</span>
                                    <span className="flex items-center gap-1"><Timer size={13} />{challenge.daysLeft}d {isArabic ? 'متبقي' : 'left'}</span>
                                </div>
                                <div className="flex items-center gap-1 font-bold" style={{ color: challenge.color }}>
                                    <Award size={14} />
                                    <span className="text-xs">{isArabic ? challenge.prizeAr : challenge.prize}</span>
                                </div>
                            </div>

                            {!challenge.joined && (
                                <button className="mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                                    style={{ background: `${challenge.color}15`, color: challenge.color, border: `1px solid ${challenge.color}40` }}>
                                    {isArabic ? '+ انضم للتحدي' : '+ Join Challenge'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Challenge Detail / Leaderboard */}
                {selected && (
                    <div className="mt-6 rounded-3xl p-6" style={{ background: 'var(--bg-card)', border: `1px solid ${selected.color}40` }}>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-3xl">{selected.emoji}</span>
                            <div>
                                <h3 className="font-bold text-xl">{isArabic ? selected.titleAr : selected.titleEn}</h3>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'لوحة الصدارة' : 'Leaderboard'}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {selected.leaderboard.map((entry: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl"
                                    style={{ background: entry.isMe ? `${selected.color}10` : 'var(--bg-input)', border: entry.isMe ? `1px solid ${selected.color}40` : '1px solid transparent' }}>
                                    <span className="text-xl">{entry.medal}</span>
                                    <span className="font-mono text-sm w-8" style={{ color: 'var(--text-muted)' }}>#{entry.rank}</span>
                                    <span className="flex-1 font-bold">{entry.name}</span>
                                    <span className="font-mono text-sm font-bold" style={{ color: (entry as any).isMe ? selected.color : 'var(--text-primary)' }}>
                                        {(entry as any).lost || (entry as any).days || (entry as any).steps || (entry as any).score}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
