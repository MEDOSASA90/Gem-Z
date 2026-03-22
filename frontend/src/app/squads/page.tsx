'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import { Users, Shield, Zap, Search, MessageSquare, Send, Trophy, ArrowUpRight } from 'lucide-react';

const SQUADS = [
    { id: 'sq_01', name: 'Iron Lifters', nameAr: 'رافعو الحديد', members: 42, points: 15400, rank: 1, isJoined: true, color: '#FF6B35' },
    { id: 'sq_02', name: 'Cardio Kings', nameAr: 'ملوك الكارديو', members: 28, points: 12100, rank: 2, isJoined: false, color: '#00B8FF' },
    { id: 'sq_03', name: 'Yoga Masters', nameAr: 'خبراء اليوجا', members: 15, points: 8900, rank: 3, isJoined: false, color: '#A78BFA' },
];

export default function SquadsPage() {
    const { isArabic } = useLanguage();
    const { socket, isConnected } = useSocket();

    const [activeTab, setActiveTab] = useState('my_squad');
    const [messages, setMessages] = useState<{ sender: string, text: string, time: string, isMe?: boolean }[]>([
        { sender: 'System', text: 'Welcome to Iron Lifters Squad Chat!', time: '10:00 AM' },
        { sender: 'Omar', text: 'Who is hitting legs today?', time: '10:05 AM' },
        { sender: 'Sara', text: 'Me! See you at 6 PM.', time: '10:12 AM' }
    ]);
    const [chatInput, setChatInput] = useState('');

    const currentSquad = SQUADS.find(s => s.isJoined);

    useEffect(() => {
        if (socket && isConnected && currentSquad) {
            socket.emit('join_squad', currentSquad.id);

            socket.on('new_squad_message', (data: any) => {
                setMessages(prev => [...prev, {
                    sender: data.senderId || 'Member',
                    text: data.message,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            });
        }
        return () => {
            if (socket) socket.off('new_squad_message');
        };
    }, [socket, isConnected]);

    const sendMessage = () => {
        if (!chatInput.trim()) return;

        // Optimistic UI update
        setMessages(prev => [...prev, {
            sender: 'Me',
            text: chatInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true
        }]);

        if (socket && currentSquad) {
            socket.emit('squad_message', { squadId: currentSquad.id, message: chatInput });
        }

        setChatInput('');
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen p-4 md:p-8 font-sans pb-28 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-heading mb-1">{isArabic ? 'الفرق والمجموعات' : 'Squads & Guilds'}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic ? 'انضم لفريق وتنافس للوصول للقمة.' : 'Join a squad and compete for the top rank.'}
                    </p>
                </div>
                {isConnected ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/30 text-[#00FFA3] text-xs font-bold">
                        <div className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse" />
                        Live
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Offline
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none shrink-0">
                <button onClick={() => setActiveTab('my_squad')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-all"
                    style={{ background: activeTab === 'my_squad' ? '#00FFA3' : 'var(--bg-card)', color: activeTab === 'my_squad' ? '#000' : 'var(--text-secondary)', border: `1px solid ${activeTab === 'my_squad' ? '#00FFA3' : 'var(--border-subtle)'}` }}>
                    <Shield size={16} /> {isArabic ? 'فريقي' : 'My Squad'}
                </button>
                <button onClick={() => setActiveTab('leaderboard')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-all"
                    style={{ background: activeTab === 'leaderboard' ? '#00FFA3' : 'var(--bg-card)', color: activeTab === 'leaderboard' ? '#000' : 'var(--text-secondary)', border: `1px solid ${activeTab === 'leaderboard' ? '#00FFA3' : 'var(--border-subtle)'}` }}>
                    <Trophy size={16} /> {isArabic ? 'التصنيف' : 'Leaderboard'}
                </button>
                <button onClick={() => setActiveTab('explore')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-all"
                    style={{ background: activeTab === 'explore' ? '#00FFA3' : 'var(--bg-card)', color: activeTab === 'explore' ? '#000' : 'var(--text-secondary)', border: `1px solid ${activeTab === 'explore' ? '#00FFA3' : 'var(--border-subtle)'}` }}>
                    <Search size={16} /> {isArabic ? 'استكشاف' : 'Explore'}
                </button>
            </div>

            {/* ====== MY SQUAD TAB (INCLUDING GROUP CHAT) ====== */}
            {activeTab === 'my_squad' && currentSquad && (
                <div className="flex flex-col md:flex-row gap-6 flex-1 h-[600px] mb-[6rem]">
                    {/* Squad Info */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4 shrink-0">
                        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${currentSquad.color}40` }}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: currentSquad.color }} />
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg text-2xl" style={{ background: currentSquad.color }}>
                                {currentSquad.name.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-bold mb-1">{isArabic ? currentSquad.nameAr : currentSquad.name}</h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                {isArabic ? 'المركز:' : 'Rank:'} <span className="font-bold text-[#FFCC00]">#{currentSquad.rank} Global</span>
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users size={14} className="text-[#00B8FF]" />
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'الأعضاء' : 'Members'}</span>
                                    </div>
                                    <p className="font-bold text-lg">{currentSquad.members}</p>
                                </div>
                                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Zap size={14} className="text-[#FFCC00]" />
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'النقاط' : 'Points'}</span>
                                    </div>
                                    <p className="font-bold text-lg">{currentSquad.points.toLocaleString('en-US')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-5 flex-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <h3 className="font-bold mb-4">{isArabic ? 'تحدي الأسبوع' : 'Weekly Challenge'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        <span>1000km Running</span>
                                        <span>640km</span>
                                    </div>
                                    <div className="h-2 rounded-full" style={{ background: 'var(--bg-input)' }}>
                                        <div className="h-2 rounded-full bg-[#00FFA3]" style={{ width: '64%' }} />
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-input)' }}>
                                    <span className="text-sm font-medium">{isArabic ? 'مساهمتك:' : 'Your contribution:'}</span>
                                    <span className="font-bold text-[#00FFA3]">42km</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group Chat UI (Socket Driven) */}
                    <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                            <MessageSquare size={18} className="text-[#00B8FF]" />
                            <h3 className="font-bold">{isArabic ? 'دردشة الفريق' : 'Squad Chat'}</h3>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-end min-h-0 bg-[#0A0A0A]">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[85%] ${msg.isMe ? 'self-end' : 'self-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-xs font-bold" style={{ color: msg.sender === 'System' ? '#FFCC00' : msg.isMe ? '#00FFA3' : 'var(--text-secondary)' }}>
                                            {isArabic && msg.isMe ? 'أنت' : msg.sender}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{msg.time}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm ${msg.isMe ? 'rounded-tr-sm bg-[#00FFA3] text-black font-medium' : 'rounded-tl-sm bg-[#1A1A1A] text-white border border-[#333]'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={isArabic ? 'رسالة للفريق...' : 'Message squad...'}
                                    className="flex-1 bg-[#1A1A1A] text-white text-sm px-4 py-3 rounded-xl outline-none border border-[#333] focus:border-[#00FFA3] transition-colors"
                                />
                                <button type="submit" disabled={!chatInput.trim()} className="w-12 h-12 rounded-xl bg-[#00B8FF] text-black flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity">
                                    <Send size={18} className={isArabic ? "rotate-180" : ""} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== LEADERBOARD TAB ====== */}
            {activeTab === 'leaderboard' && (
                <div className="space-y-4">
                    {SQUADS.sort((a, b) => b.points - a.points).map((sq, i) => (
                        <div key={sq.id} className="flex items-center gap-4 p-4 rounded-2xl transition-colors"
                            style={{ background: sq.isJoined ? 'rgba(0,255,163,0.05)' : 'var(--bg-card)', border: sq.isJoined ? '1px solid #00FFA3' : '1px solid var(--border-subtle)' }}>
                            <div className="w-8 text-center font-bold text-lg" style={{ color: i === 0 ? '#FFCC00' : i === 1 ? '#D7D7D7' : i === 2 ? '#B87333' : 'var(--text-muted)' }}>
                                #{sq.rank}
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: sq.color }}>
                                {sq.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold flex items-center gap-2">
                                    {isArabic ? sq.nameAr : sq.name}
                                    {sq.isJoined && <span className="text-[10px] bg-[#00FFA3] text-black px-1.5 py-0.5 rounded font-bold uppercase">{isArabic ? 'فريقك' : 'Your Squad'}</span>}
                                </h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sq.members} {isArabic ? 'عضو' : 'members'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold font-mono text-[#00FFA3]">{sq.points.toLocaleString('en-US')}</p>
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>PTS</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ====== EXPLORE TAB ====== */}
            {activeTab === 'explore' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SQUADS.filter(s => !s.isJoined).map((sq) => (
                        <div key={sq.id} className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl" style={{ background: sq.color }}>
                                        {sq.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{isArabic ? sq.nameAr : sq.name}</h3>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sq.members} / 50 {isArabic ? 'عضو' : 'members'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: 'var(--bg-input)', color: '#FFCC00' }}>
                                        Rank #{sq.rank}
                                    </span>
                                </div>
                            </div>
                            <button className="w-full py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all hover:bg-white/5" style={{ border: '1px solid var(--border-medium)' }}>
                                {isArabic ? 'طلب الانضمام' : 'Request to Join'} <ArrowUpRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
