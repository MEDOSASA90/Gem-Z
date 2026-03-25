'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Settings, CircleDot, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LiveVirtualClass() {
    const { isArabic } = useLanguage();
    const router = useRouter();

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [isVisitor, setIsVisitor] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const u = localStorage.getItem('gemz_user');
        if (!u) {
            setIsVisitor(true);
            setTimeout(() => router.push('/login'), 3500);
        }
        setChecking(false);
    }, [router]);

    if (checking) return null;

    if (isVisitor) {
        return (
            <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center font-sans">
                <div className="w-24 h-24 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 shadow-[#FF0055]/20 shadow-[0_0_40px] border border-red-500/20">
                    <Lock size={40} className="text-red-500" />
                </div>
                <h1 className="text-3xl font-bold mb-3">{isArabic ? 'محتوى حصري للأعضاء' : 'Members Only Content'}</h1>
                <p className="text-gray-400 mb-8 max-w-md text-center leading-relaxed">
                    {isArabic ? 'لا يمكن للزوار الوصول إلى جلسات البث المباشر. جاري توجيهك لصفحة تسجيل الدخول...' : 'Visitors cannot access live streaming sessions. Redirecting you to login...'}
                </p>
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-black text-white flex flex-col font-sans">

            {/* Top Bar */}
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10 absolute top-0 left-0 right-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                        <CircleDot size={14} className="animate-pulse" />
                        <span className="text-xs font-bold tracking-wider">{isArabic ? 'مباشر' : 'LIVE'}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/20 flex items-center gap-2">
                        <Users size={14} />
                        <span className="text-xs font-bold">128</span>
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="font-bold text-sm md:text-base">HIIT Cardio Burn — Coach Tariq</h1>
                    <p className="text-xs text-gray-400 font-mono">00:42:15</p>
                </div>

                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <Settings size={20} />
                </button>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 relative flex">

                {/* Simulator Video Stream */}
                <div className="flex-1 bg-[#111] relative overflow-hidden flex items-center justify-center">
                    {/* Fake Trainer Video Feed */}
                    <div className="absolute inset-0 z-0">
                        <div className="w-full h-full bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] flex flex-col items-center justify-center relative">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-primary) 0%, transparent 50%)' }} />
                            <div className="w-32 h-32 rounded-full border-2 border-[var(--color-primary)] flex items-center justify-center mb-4 neon-glow relative">
                                <span className="text-6xl">🏃‍♂️</span>
                                {/* Sound bars animation */}
                                <div className="absolute -bottom-6 flex gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="w-1 bg-[var(--color-primary)] animate-pulse" style={{ height: `${Math.random() * 20 + 5}px`, animationDelay: `${i * 0.1}s` }} />
                                    ))}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold font-heading z-10">{isArabic ? 'كابتن طارق' : 'Coach Tariq'}</h2>
                            <p className="text-sm text-[var(--color-primary)] z-10">{isArabic ? 'تمرين الضغط العالي' : 'High-Intensity Interval Training'}</p>
                        </div>
                    </div>

                    {/* Floating Emojis Reaction stream (simulated) */}
                    <div className="absolute left-4 bottom-24 flex flex-col gap-2 opacity-80 pointer-events-none">
                        <div className="animate-bounce text-2xl">🔥</div>
                        <div className="animate-bounce delay-100 text-2xl">💪</div>
                        <div className="animate-bounce delay-300 text-2xl">💯</div>
                    </div>

                    {/* Own Camera Picture-in-Picture */}
                    <div className="absolute right-4 bottom-24 w-28 h-40 md:w-36 md:h-48 bg-gray-900 rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group">
                        {isVideoOn ? (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <span className="text-3xl opacity-50">👤</span>
                            </div>
                        ) : (
                            <div className="w-full h-full bg-black flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                                    <span className="text-xl">A</span>
                                </div>
                                <VideoOff size={16} className="text-gray-500" />
                            </div>
                        )}
                        <p className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur">
                            {isArabic ? 'أنت' : 'You'}
                        </p>
                        {isMuted && <MicOff size={14} className="absolute top-2 right-2 text-red-500 drop-shadow-md" />}
                    </div>
                </div>

                {/* Side Chat Panel */}
                {showChat && (
                    <div className="w-full md:w-80 bg-[#0A0A0A] border-l border-white/10 flex flex-col absolute md:relative right-0 h-full z-20">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold">{isArabic ? 'الدردشة المباشرة' : 'Live Chat'}</h3>
                            <button onClick={() => setShowChat(false)} className="md:hidden p-1 bg-white/10 rounded">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {[
                                { user: 'Sara K.', msg: isArabic ? 'تمرين ممتاز جداً!' : 'Awesome workout!', color: 'var(--color-primary)' },
                                { user: 'Omar Aly', msg: isArabic ? 'مش قادر أكمل 😫' : 'Legs are dead 😫', color: 'var(--color-secondary)' },
                                { user: 'Nour', msg: '🔥 🔥 🔥', color: 'var(--color-purple)' },
                                { user: 'Coach Tariq', msg: isArabic ? 'عاش يا شباب 30 ثانية كمان!' : 'Keep pushing! 30 seconds left!', isCoach: true }
                            ].map((c, i) => (
                                <div key={i} className="text-sm">
                                    <span className="font-bold mr-2" style={{ color: c.isCoach ? 'var(--color-warning)' : c.color }}>
                                        {c.isCoach && '👑 '}{c.user}:
                                    </span>
                                    <span className="text-gray-300">{c.msg}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 border-t border-white/10">
                            <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-full p-1 pl-4">
                                <input type="text" placeholder={isArabic ? 'قل شيئاً...' : 'Say something...'} className="bg-transparent flex-1 outline-none text-sm text-white" />
                                <button className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center shrink-0">
                                    ↗
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-4 md:p-6 bg-gradient-to-t from-black to-transparent flex justify-center items-center gap-4 z-10 absolute bottom-0 left-0 right-0">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button
                    onClick={() => setIsVideoOn(!isVideoOn)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-colors ${!isVideoOn ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {!isVideoOn ? <VideoOff size={24} /> : <Video size={24} />}
                </button>

                <button className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg mx-2 transition-transform hover:scale-105">
                    <PhoneOff size={28} />
                </button>

                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-colors ${showChat ? 'bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] border border-[var(--color-secondary)]/50' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <MessageSquare size={24} />
                </button>
            </div>
        </div>
    );
}
