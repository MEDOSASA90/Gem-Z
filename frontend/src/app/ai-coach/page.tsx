'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

type Message = {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    time: string;
    isCard?: boolean;
};

export default function Page() {
    const { t, isArabic } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: isArabic 
                ? "قم وعُد للعمل! بيانات الأداء الحيوي من جلسة الأمس تظهر زيادة بنسبة 12% في الإجهاد العضلي. هل يجب أن نغير تمرين اليوم إلى الإطالة والتعافي؟" 
                : "Rise and grind! Your biomechanics data from yesterday's session shows a 12% fatigue increase in your kinetic chain. Should we pivot today's workout to focused mobility and recovery?",
            sender: 'ai',
            time: '08:42 AM'
        },
        {
            id: 2,
            text: isArabic 
                ? "في الواقع، أشعر بطاقة عالية اليوم. هل يمكننا الالتزام بروتين القوة الانفجارية؟ أريد كسر رقمي القياسي في القرفصاء." 
                : "Actually, I feel high energy today. Can we stick to the explosive power routine? I want to hit that PR on squats.",
            sender: 'user',
            time: '08:44 AM'
        },
        {
            id: 3,
            text: isArabic 
                ? "مفهوم. سأقوم بتعديل البرنامج لزيادة القوة الانفجارية مع الحفاظ على فترات راحة أطول لضمان التعافي. هل أنت مستعد للبدء بالإحماء؟" 
                : "Understood. I will adjust the program to maximize explosive power while maintaining longer rest periods to guarantee recovery. Are you ready to start warm-ups?",
            sender: 'ai',
            time: '08:45 AM'
        },
        {
            id: 4,
            text: "card",
            sender: 'ai',
            time: '08:45 AM',
            isCard: true
        }
    ]);
    
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        
        const newMsg: Message = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');
        setIsTyping(true);

        setTimeout(() => {
            const aiReply: Message = {
                id: Date.now() + 1,
                text: isArabic ? "لقد تم تحليل هدفك بدقة. جاري إعداد وتخصيص الخطة الفورية لك..." : "Your goal has been analyzed precisely. I'm preparing an immediate customized plan for you...",
                sender: 'ai',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, aiReply]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface h-screen flex flex-col font-body">
            
            <header className="bg-black/60 backdrop-blur-xl text-[#ff7b00] font-headline font-bold tracking-tight border-b border-white/5 shadow-[0_4px_20px_rgba(255,123,0,0.1)] flex justify-between items-center px-6 py-4 w-full z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/20 overflow-hidden">
                        <Link href="/trainee" className="w-full h-full block">
                            <img alt="User Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTZS2sO9u1Hm_aDgWY2kbdYTC6Zn4rXC8j6mgSYmP3zu1d_hY7tMuvRWMnbAg7a1xBoJ62ntG0FSEslQycbVHRwWAGz6xCVB-YSC7hXT-XRkdMuVcvYJEAfSTHk90FWmW9xDD3GDTSRwU1rAgfAgmnsfihMPFRJgehPoSpn6y2vGAZ-7V4XNkl7GiELbqfvdmhCoyu2A7retsCAgEkhuiGrmvbODWIVJt6GBjcUFEPFHkiKtEOGx4Cvjc30_EIjof-1WUBkicAGdya"/>
                        </Link>
                    </div>
                    <Link href="/">
                        <h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">{t("GEM Z")}</h1>
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => alert(isArabic ? 'سجل المحادثات قديماً سيكون متاحاً قريباً ⏳' : 'Chat history coming soon ⏳')} className="text-on-surface-variant hover:text-[#ff7b00] transition-colors active:scale-90">
                        <span translate="no" className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                    </button>
                    <button onClick={() => alert(isArabic ? 'إعدادات الجلسة ⚙️' : 'Session Settings ⚙️')} className="text-on-surface-variant hover:text-[#ff7b00] transition-colors active:scale-90">
                        <span translate="no" className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>more_vert</span>
                    </button>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden relative">
                
                {/* Chat Area */}
                <section className="flex-grow flex flex-col relative w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-container-lowest to-[#0a0a0a]">
                    
                    {/* Header bar for Z-COACH AI */}
                    <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
                        <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-primary-fixed/20 bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(255,123,0,0.15)] pointer-events-auto">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff7b00] to-[#ffb300] flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,123,0,0.4)] animate-pulse">
                                        <span className="material-symbols-outlined font-black" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-black font-headline text-on-surface uppercase tracking-widest">{t("Z-COACH AI")}</p>
                                    <p className="text-[10px] text-primary-dim uppercase tracking-[0.2em] font-bold">{t("Optimal Performance Engine")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-grow overflow-y-auto px-6 pt-28 pb-40 flex flex-col gap-6 scrollbar-hide">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex items-start gap-4 w-full md:max-w-[70%] ${msg.sender === 'user' ? 'self-end justify-end' : 'self-start justify-start'}`}>
                                {msg.isCard ? (
                                    <div className="w-[85%] sm:w-80 glass-card rounded-[2rem] p-1 overflow-hidden border border-[#ff7b00]/30 shadow-[0_0_30px_rgba(255,123,0,0.1)]">
                                        <div className="relative h-48 md:h-56 rounded-[1.5rem] overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 flex flex-col justify-end p-6">
                                                <span className="text-[#ff7b00] font-black text-xs uppercase tracking-widest mb-2 drop-shadow-md">{isArabic ? 'المهارة الموصى بها اليوم' : 'Recommended Skill'}</span>
                                                <h3 className="font-headline font-black text-white text-xl drop-shadow-lg">{isArabic ? 'ميكانيكا القرفصاء التفصيلية' : 'Explosive Squat Mechanics'}</h3>
                                            </div>
                                            <img alt="Workout Preview" className="w-full h-full object-cover mix-blend-overlay opacity-80" data-alt="Modern high-tech gym interior with neon orange lighting and professional squat rack, dark atmospheric background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBoksrLwFJ3jwR17w5kvA7-ZuxAeQlxH8veHdrD9QSzt4z6jqGyw7LkdBE7jPgVLpazXkcwfKi0dJ0VW3klafZbZIYfmELQYwLwr1z-jHeRwVk07z3fr7gqbnDfvluEZRw1Nfwic2n6z8GRjl4xCP9yuiDuNsmwuUHfrZdEQtaZ6FvMVIeitnu8-AWNMYCrEs84he4eFN-EvY1b4QWfpMtChRsMdUg1YDjFK-U4mvi3gK36kpCuIA5qqltdJVb-ztXOcgTS1yjLSFZ"/>
                                        </div>
                                        <div className="p-4 flex justify-between items-center bg-surface-container-highest/50">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#ff7b00]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                                                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">15 {isArabic ? 'دقيقة تدريب' : 'min module'}</span>
                                            </div>
                                            <Link href="/ai-coach" className="bg-gradient-to-r from-[#ff7b00] to-[#ffb300] text-black px-5 py-2 rounded-full text-[10px] font-black hover:scale-105 shadow-[0_0_15px_rgba(255,123,0,0.3)] transition-all uppercase tracking-widest whitespace-nowrap">{isArabic ? 'استعد' : 'Watch'}</Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`max-w-[85%] ${msg.sender === 'user' ? 'bg-[#ff7b00]/10 border border-[#ff7b00]/30 shadow-[0_0_20px_rgba(255,123,0,0.15)] rounded-2xl p-5 rounded-tl-none' : 'glass-card border border-white/10 rounded-2xl p-5 rounded-tr-none'}`}>
                                        <p className={`text-[15px] leading-relaxed font-medium ${msg.sender === 'user' ? 'text-white' : 'text-on-surface-variant'}`}>
                                            {msg.text}
                                        </p>
                                        <p className={`text-[10px] mt-3 font-mono font-bold uppercase tracking-widest text-[#ff7b00]`}>
                                            {msg.time}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex items-start gap-4 max-w-[85%] self-start animate-fade-in">
                                <div className="glass-card border border-[#ff7b00]/30 rounded-2xl p-4 rounded-tr-none flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-[#ff7b00] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="absolute bottom-[80px] md:bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-30">
                        <div className="max-w-4xl mx-auto glass-card border border-[#ff7b00]/20 bg-surface-container-highest/60 backdrop-blur-2xl rounded-[2rem] p-2 flex items-center gap-2 group focus-within:border-[#ff7b00] focus-within:shadow-[0_0_30px_rgba(255,123,0,0.15)] transition-all">
                            <button onClick={() => alert(isArabic ? 'إرفاق ملفات القياس قريباً 📎' : 'File attachments coming soon 📎')} className="p-3 md:p-4 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors shrink-0 active:scale-90">
                                <span translate="no" className="material-symbols-outlined text-xl">attachment</span>
                            </button>
                            <input 
                                className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 font-bold py-3 px-2 md:px-4 w-full" 
                                placeholder={isArabic ? 'أخبر مدربك بما تريده اليوم...' : 'Tell Z-Coach your goal...'}
                                type="text"
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                            />
                            <button onClick={() => alert(isArabic ? 'الأوامر الصوتية قريباً 🎙️' : 'Voice commands coming soon 🎙️')} className="p-3 md:p-4 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors shrink-0 active:scale-90">
                                <span translate="no" className="material-symbols-outlined text-xl">mic</span>
                            </button>
                            <button 
                                onClick={handleSend}
                                className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full bg-[#ff7b00] flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,123,0,0.4)] hover:scale-105 hover:bg-[#ffb300] active:scale-95 transition-all">
                                <span className="material-symbols-outlined text-xl font-black" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/90 backdrop-blur-3xl rounded-t-[2rem] z-[100] border-t border-white/5 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
                <Link className="flex flex-col items-center justify-center text-[#ff7b00] hover:scale-110 drop-shadow-[0_0_15px_rgba(255,123,0,0.5)] transition-transform" href="/ai-coach">
                    <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    <span className="font-body text-[10px] uppercase tracking-widest font-black">{t("Coach")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white hover:scale-110 transition-all" href="/shop">
                    <span className="material-symbols-outlined mb-1">shopping_bag</span>
                    <span className="font-body text-[10px] uppercase tracking-widest font-bold">{t("Shop")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white hover:scale-110 transition-all" href="/social">
                    <span className="material-symbols-outlined mb-1">dynamic_feed</span>
                    <span className="font-body text-[10px] uppercase tracking-widest font-bold">{t("Feed")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white hover:scale-110 transition-all" href="/wallet">
                    <span className="material-symbols-outlined mb-1">account_balance_wallet</span>
                    <span className="font-body text-[10px] uppercase tracking-widest font-bold">{t("Wallet")}</span>
                </Link>
                <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white hover:scale-110 transition-all" href="/squads">
                    <span className="material-symbols-outlined mb-1">groups</span>
                    <span className="font-body text-[10px] uppercase tracking-widest font-bold">{t("Squads")}</span>
                </Link>
            </nav>
        </div>
    );
}
