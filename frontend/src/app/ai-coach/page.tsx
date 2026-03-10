'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Bot, User, Zap, RotateCcw, Globe, Sparkles, Copy
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

type Message = { id: number; role: 'user' | 'assistant'; text: string; time: string };

const SUGGESTED_QUESTIONS = [
    { en: 'How much protein do I need daily?', ar: 'كم برتوين أحتاج يومياً؟' },
    { en: 'What\'s a good substitute for chicken?', ar: 'ما هو بديل جيد للدجاج؟' },
    { en: 'How do I fix knee pain during squats?', ar: 'كيف أعالج ألم الركبة أثناء السكوات؟' },
    { en: 'Best time to take creatine?', ar: 'أفضل وقت لأخذ الكرياتين؟' },
    { en: 'How many rest days per week?', ar: 'كم يوم راحة في الأسبوع؟' },
    { en: 'Build a 3-day beginner workout plan', ar: 'ابنِ لي خطة مبتدئ 3 أيام' },
];

const BOT_RESPONSES: Record<string, string> = {
    'protein': 'Based on your profile (82kg, muscle gain goal), you need **1.8–2.2g of protein per kg of body weight**, which means **148–180g of protein daily**.\n\n🍗 Top sources:\n• Chicken breast (31g/100g)\n• Eggs (6g each)\n• Tuna (30g/100g)\n• Greek Yogurt (10g/100g)\n\n💡 Spread protein over 4-5 meals for optimal muscle protein synthesis.',
    'بروتين': '**بناءً على ملفك الشخصي (82 كيلو، هدف بناء عضل)**، تحتاج إلى **1.8–2.2 جرام بروتين لكل كيلوجرام من وزنك**، أي **148–180 جرام يومياً**.\n\n🍗 أفضل المصادر:\n• صدر الدجاج (31 جرام/100 جرام)\n• البيض (6 جرام للبيضة)\n• التونة (30 جرام/100 جرام)\n• يوغرت يوناني (10 جرام/100 جرام)\n\n💡 وزّع البروتين على 4-5 وجبات للحصول على أقصى استفادة.',
    'chicken': '**Great alternatives to chicken (equal protein):**\n\n🐟 **Tuna** — 30g protein/100g, very similar macros\n🥚 **Eggs** — 3 eggs ≈ same protein as 100g chicken\n🫘 **Lentils** — 18g protein/100g, iron-rich bonus\n🐄 **Lean beef** — 26g protein/100g, higher iron\n🐟 **Salmon** — 25g + healthy omega-3 fats\n\n💡 Any of these work as 1:1 swaps in your current AI meal plan.',
    'دجاج': '**بدائل ممتازة للدجاج بنفس البروتين:**\n\n🐟 **التونة** — 30 جرام بروتين/100 جرام\n🥚 **البيض** — 3 بيضات = بروتين 100 جرام دجاج\n🫘 **العدس** — 18 جرام بروتين + حديد ممتاز\n🐄 **اللحم الفيليه** — 26 جرام بروتين، حديد عالٍ\n🐟 **السلمون** — 25 جرام + أوميجا 3\n\n💡 أي منها يعمل كبديل مباشر في خطتك الغذائية الحالية.',
    'knee': '**Knee pain during squats — common causes & fixes:**\n\n❌ **Issue:** Knees caving inward\n✅ **Fix:** Push knees outward, use a band for feedback\n\n❌ **Issue:** Heels rising\n✅ **Fix:** Elevate heels with plates, or wear squat shoes\n\n❌ **Issue:** Going too deep too fast\n✅ **Fix:** Start with box squats, build depth gradually\n\n⚠️ If pain persists, rest for 48 hours and consult a physio.\n\n💡 Try the AI Form Correction for a live analysis of your squat!',
    'ركبة': '**ألم الركبة أثناء السكوات — الأسباب والحلول:**\n\n❌ **المشكلة:** الركب تنهار للداخل\n✅ **الحل:** ادفع الركبتين للخارج، استخدم المطاط للمساعدة\n\n❌ **المشكلة:** رفع الكعب\n✅ **الحل:** ضع أوزان تحت الكعب أو استخدم أحذية سكوات\n\n⚠️ إذا استمر الألم، ارتاح 48 ساعة واستشر طبيب علاج طبيعي',
    'creatine': '**Best timing for creatine:**\n\n🏋️ **On training days:** Take 3-5g **post-workout** with your protein shake (slightly better absorption)\n\n😴 **On rest days:** Any time with food is fine\n\n📋 **Loading phase (optional):** 20g/day for 5-7 days to saturate faster\n\n💧 **Important:** Drink extra 2-3 cups of water daily when taking creatine\n\n✅ Creatine monohydrate is the most researched form — no need for expensive alternatives.',
    'كرياتين': '**أفضل وقت للكرياتين:**\n\n🏋️ **أيام التمرين:** 3-5 جرام **بعد التمرين** مع مشروب البروتين (امتصاص أفضل)\n\n😴 **أيام الراحة:** في أي وقت مع الطعام\n\n📋 **مرحلة التحميل (اختيارية):** 20 جرام/يوم لمدة 5-7 أيام\n\n💧 **مهم:** اشرب 2-3 أكواب ماء إضافية يومياً عند أخذ الكرياتين',
    'rest': '**Optimal rest days per week:**\n\n**Beginner (0-1 year):** 2-3 rest days\n**Intermediate (1-3 years):** 1-2 rest days \n**Advanced (3+ years):** 1 rest day minimum\n\n💡 **Signs you need more rest:**\n• Strength decreasing\n• Mood changes / irritability\n• Poor sleep\n• Persistent muscle soreness\n\n🔄 Active recovery (walking, light yoga) is better than complete rest on off-days.',
    'راحة': '**أيام الراحة المثالية في الأسبوع:**\n\n**مبتدئ:** 2-3 أيام راحة\n**متوسط:** 1-2 يوم راحة\n**متقدم:** يوم راحة واحد على الأقل\n\n💡 **علامات تحتاج راحة أكثر:**\n• انخفاض القوة\n• مزاج سيء\n• نوم سيئ\n• ألم عضلي مستمر',
    'workout plan': '**3-Day Beginner Workout Plan:**\n\n📅 **Day 1 — Push (Chest/Shoulders)**\n• Bench Press: 3×10\n• Shoulder Press: 3×10\n• Lateral Raise: 3×15\n\n📅 **Day 2 — Pull (Back/Biceps)**\n• Pull-downs: 3×10\n• Cable Row: 3×10\n• Bicep Curl: 3×12\n\n📅 **Day 3 — Legs**\n• Squat: 4×10\n• Leg Press: 3×12\n• Calf Raise: 3×20\n\n⏰ Rest 48h between sessions. Add it to your GEM Z workout planner! 💪',
    'خطة': '**خطة تمرين مبتدئ 3 أيام:**\n\n📅 **اليوم 1 — دفع (صدر/أكتاف)**\n• ضغط صدر: 3×10\n• ضغط أكتاف: 3×10\n• رفع جانبي: 3×15\n\n📅 **اليوم 2 — سحب (ظهر/بايسبس)**\n• لات بول داون: 3×10\n• كيبل رو: 3×10\n• كيرل بايسبس: 3×12\n\n📅 **اليوم 3 — أرجل**\n• سكوات: 4×10\n• ضغط رجل: 3×12\n• رفع كعب: 3×20\n\n⏰ ارتاح 48 ساعة بين الجلسات. أضفها لمخطط تمارين GEM Z! 💪',
};

function getBotResponse(q: string, isAr: boolean): string {
    const lower = q.toLowerCase();
    for (const key of Object.keys(BOT_RESPONSES)) {
        if (lower.includes(key)) return BOT_RESPONSES[key];
    }
    return isAr
        ? '🤖 سؤال ممتاز! للحصول على إجابة دقيقة موثوقة، يُنصح باستشارة خبير تغذية أو مدرب متخصص على المنصة. يمكنني مساعدتك في أسئلة عامة عن التغذية والتمرين.'
        : '🤖 Great question! For a precise, trusted answer I recommend consulting a certified nutritionist or trainer on the platform. I can help with general nutrition and training questions!';
}

export default function CoachAIChatPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, role: 'assistant', text: isArabic ? 'مرحباً! أنا مساعد GEM Z الذكي 🤖💪\n\nاسألني أي سؤال عن:\n• التغذية والوجبات\n• برامج التمارين\n• المكملات الغذائية\n• الإصابات والوقاية منها\n\nكيف يمكنني مساعدتك اليوم؟' : 'Hey! I\'m your GEM Z AI Coach 🤖💪\n\nAsk me anything about:\n• Nutrition & meal planning\n• Workout programs\n• Supplements\n• Injury prevention & recovery\n\nHow can I help you today?', time: 'now' }
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const sendMessage = (text?: string) => {
        const q = text || input.trim();
        if (!q) return;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMsg: Message = { id: Date.now(), role: 'user', text: q, time: now };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setTyping(true);
        setTimeout(() => {
            const response = getBotResponse(q, isArabic);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            setTyping(false);
        }, 1200 + Math.random() * 800);
    };

    const formatText = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold mb-1">{line.slice(2, -2)}</p>;
            }
            if (line.includes('**')) {
                const parts = line.split('**');
                return <p key={i} className="mb-0.5">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
            }
            if (line.startsWith('•') || line.startsWith('✅') || line.startsWith('❌') || line.startsWith('💡') || line.startsWith('📅') || line.startsWith('⏰') || line.startsWith('⚠️')) {
                return <p key={i} className="mb-0.5 text-sm">{line}</p>;
            }
            return line ? <p key={i} className="mb-0.5">{line}</p> : <div key={i} className="mb-2" />;
        });
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="h-screen flex flex-col font-sans" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="shrink-0 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#A78BFA] flex items-center justify-center"><Bot size={14} className="text-black" /></div>
                            {isArabic ? 'المساعد الرياضي AI' : 'AI Fitness Coach'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                            <p className="text-xs text-[#34C759]">{isArabic ? 'متصل الآن' : 'Online now'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setMessages(msgs => msgs.slice(0, 1))} className="p-2 rounded-xl" title={isArabic ? 'محادثة جديدة' : 'New chat'} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><RotateCcw size={16} /></button>
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            {/* Suggested prompts (only visible when empty) */}
            {messages.length <= 1 && (
                <div className="shrink-0 px-6 py-4">
                    <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'أسئلة مقترحة' : 'Try asking'}</p>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_QUESTIONS.map((q, i) => (
                            <button key={i} onClick={() => sendMessage(isArabic ? q.ar : q.en)}
                                className="text-xs px-3 py-2 rounded-xl transition-all hover:bg-[#A78BFA] hover:text-white font-medium"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                {isArabic ? q.ar : q.en}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gradient-to-br from-[#00FFA3] to-[#00B8FF]' : 'bg-[#A78BFA]'}`}>
                            {msg.role === 'user' ? <User size={16} className="text-black" /> : <Bot size={16} className="text-white" />}
                        </div>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'text-black' : ''}`}
                            style={{
                                background: msg.role === 'user' ? 'linear-gradient(to right, #00FFA3, #00B8FF)' : 'var(--bg-card)',
                                border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                                color: msg.role === 'user' ? '#000' : 'inherit',
                                borderRadius: msg.role === 'user' ? (isArabic ? '20px 4px 20px 20px' : '4px 20px 20px 20px') : (isArabic ? '4px 20px 20px 20px' : '20px 4px 20px 20px'),
                            }}>
                            {msg.role === 'assistant' ? formatText(msg.text) : msg.text}
                            <p className="text-xs mt-2 opacity-60">{msg.time}</p>
                        </div>
                    </div>
                ))}
                {typing && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#A78BFA] flex items-center justify-center shrink-0"><Bot size={16} className="text-white" /></div>
                        <div className="px-4 py-3 rounded-2xl flex items-center gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-6 py-4 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex gap-3 items-end">
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder={isArabic ? 'اسألني أي شيء عن التغذية والتمرين...' : 'Ask me anything about fitness & nutrition...'}
                        className="flex-1 px-4 py-3 rounded-2xl text-sm input-base resize-none" />
                    <button onClick={() => sendMessage()} disabled={!input.trim() || typing}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold transition-all disabled:opacity-40"
                        style={{ background: input.trim() ? '#A78BFA' : 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <Send size={18} style={{ color: input.trim() ? '#fff' : 'var(--text-muted)' }} />
                    </button>
                </div>
                <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                    {isArabic ? '⚠️ للحصول على استشارة طبية دقيقة، تواصل مع أحد مدربينا المعتمدين' : '⚠️ For medical advice, consult one of our certified trainers'}
                </p>
            </div>
        </div>
    );
}
