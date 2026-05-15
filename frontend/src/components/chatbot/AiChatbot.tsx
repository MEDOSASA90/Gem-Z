'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Bot,
    Send,
    X,
    Loader2,
    User,
    Minimize2,
    Trash2,
    MessageSquare,
    Sparkles,
    Zap,
    TrendingUp,
    ChevronRight,
} from 'lucide-react';
import { ApiButton } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    suggestions?: string[];
    createdAt: string;
}

interface Conversation {
    id: string;
    title: string;
    messageCount: number;
    status: 'active' | 'archived' | 'deleted';
    updatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Quick Prompts ────────────────────────────────────────────────

const QUICK_PROMPTS = [
    { en: 'Create a workout plan for me', ar: 'أنشئ خطة تمارين لي' },
    { en: 'Analyze my nutrition', ar: 'حلل تغذيتي' },
    { en: 'How to improve my squat form?', ar: 'كيف أحسن وضعية السكوات؟' },
    { en: 'Best exercises for abs', ar: 'أفضل تمارين البطن' },
    { en: 'Meal prep ideas', ar: 'أفكار لتحضير الوجبات' },
    { en: 'Recovery tips after workout', ar: 'نصائح التعافي بعد التمرين' },
];

// ─── Component ────────────────────────────────────────────────────

export default function AiChatbot() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ─── Load History ───────────────────────────────────────────────

    const loadConversations = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/chatbot/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setConversations(data.data || []);
            }
        } catch {
            // silently fail
        } finally {
            setIsHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            loadConversations();
        }
    }, [isOpen, activeTab, loadConversations]);

    // ─── Send Message ───────────────────────────────────────────────

    const sendMessage = useCallback(async (content?: string) => {
        const text = content || input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: text,
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        setHasStarted(true);

        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/chatbot/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: text,
                    conversationId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                const assistantMessage: ChatMessage = {
                    id: data.response.id || `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: data.response.content || data.response.message?.content || 'No response',
                    suggestions: data.suggestions || [],
                    createdAt: data.response.createdAt || new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMessage]);

                if (data.conversationId && !conversationId) {
                    setConversationId(data.conversationId);
                }
            } else {
                setError(data.message || 'Failed to get response');
            }
        } catch {
            setError(t('Network error', 'خطأ في الشبكة'));
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, conversationId, t]);

    // ─── Load Conversation ──────────────────────────────────────────

    const loadConversation = async (convId: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/chatbot/${convId}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                const loadedMessages: ChatMessage[] = (data.data || []).map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    createdAt: m.createdAt,
                }));
                setMessages(loadedMessages);
                setConversationId(convId);
                setActiveTab('chat');
                setHasStarted(true);
            }
        } catch {
            setError(t('Failed to load conversation', 'فشل تحميل المحادثة'));
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Delete Conversation ────────────────────────────────────────

    const deleteConversation = async (convId: string) => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            await fetch(`${API_BASE}/chatbot/${convId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setConversations((prev) => prev.filter((c) => c.id !== convId));
            if (conversationId === convId) {
                setMessages([]);
                setConversationId(undefined);
                setHasStarted(false);
            }
        } catch {
            // ignore
        }
    };

    // ─── New Chat ───────────────────────────────────────────────────

    const startNewChat = () => {
        setMessages([]);
        setConversationId(undefined);
        setHasStarted(false);
        setError(null);
        setActiveTab('chat');
    };

    // ─── Scroll ─────────────────────────────────────────────────────

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ─── Format Time ────────────────────────────────────────────────

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isOpen
                        ? 'bg-white/10 backdrop-blur-md scale-90'
                        : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:scale-110'
                }`}
            >
                {isOpen ? (
                    <Minimize2 size={22} className="text-white" />
                ) : (
                    <>
                        <Bot size={26} className="text-black" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0a0a0a]" />
                    </>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 left-6 z-50 w-[400px] h-[580px] bg-[#141414] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="shrink-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                                    <Sparkles size={16} className="text-black" />
                                </div>
                                <div>
                                    <h3 className="text-black font-bold text-sm">GemZ Coach</h3>
                                    <p className="text-black/60 text-xs">{t('AI Fitness Coach', 'مدرب اللياقة AI')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={startNewChat}
                                    className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                                    title={t('New Chat', 'محادثة جديدة')}
                                >
                                    <MessageSquare size={16} className="text-black/70" />
                                </button>
                                <button
                                    onClick={() => setActiveTab(activeTab === 'chat' ? 'history' : 'chat')}
                                    className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                                    title={t('History', 'السجل')}
                                >
                                    {activeTab === 'chat' ? (
                                        <TrendingUp size={16} className="text-black/70" />
                                    ) : (
                                        <ChevronRight size={16} className="text-black/70" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {activeTab === 'chat' ? (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/30">
                                {!hasStarted ? (
                                    /* Welcome Screen */
                                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                                            <Bot size={32} className="text-black" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">
                                                {t('Welcome to GemZ Coach', 'مرحباً بك في مدرب GemZ')}
                                            </h4>
                                            <p className="text-white/40 text-sm mt-1 max-w-[260px]">
                                                {t(
                                                    'Your personal AI fitness assistant. Ask about workouts, nutrition, form, and more.',
                                                    'مساعد اللياقة الشخصي. اسأل عن التمارين والتغذية والوضعيات وأكثر.'
                                                )}
                                            </p>
                                        </div>

                                        {/* Quick Prompts */}
                                        <div className="w-full space-y-2 mt-2">
                                            <p className="text-white/30 text-xs text-left">{t('Try asking:', 'جرب السؤال:')}</p>
                                            {QUICK_PROMPTS.map((prompt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => sendMessage(isArabic ? prompt.ar : prompt.en)}
                                                    className="w-full text-left px-3 py-2 bg-white/5 rounded-xl text-white/60 text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                                                >
                                                    {isArabic ? prompt.ar : prompt.en}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Chat Messages */
                                    <>
                                        {messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[85%] space-y-1`}>
                                                    <div
                                                        className={`flex items-start gap-2 ${
                                                            msg.role === 'user' ? 'flex-row-reverse' : ''
                                                        }`}
                                                    >
                                                        {msg.role === 'assistant' && (
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shrink-0 mt-1">
                                                                <Zap size={12} className="text-black" />
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                                                msg.role === 'user'
                                                                    ? 'bg-[var(--color-primary)]/20 text-white rounded-br-sm border border-[var(--color-primary)]/30'
                                                                    : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                                                            }`}
                                                        >
                                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                                        </div>
                                                        {msg.role === 'user' && (
                                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                                                                <User size={12} className="text-white/60" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className={`text-[10px] text-white/30 ${msg.role === 'user' ? 'text-right' : 'text-left pl-8'}`}>
                                                        {formatTime(msg.createdAt)}
                                                    </p>

                                                    {/* Suggestions */}
                                                    {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pl-8 mt-1">
                                                            {msg.suggestions.map((suggestion, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => sendMessage(suggestion)}
                                                                    className="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs hover:bg-[var(--color-primary)]/20 transition-colors"
                                                                >
                                                                    {suggestion}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Typing Indicator */}
                                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                                            <div className="flex justify-start">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shrink-0">
                                                        <Zap size={12} className="text-black" />
                                                    </div>
                                                    <div className="bg-white/10 px-4 py-2.5 rounded-2xl rounded-tl-sm">
                                                        <div className="flex gap-1">
                                                            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {error && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
                                                {error}
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Input */}
                            <div className="shrink-0 p-3 border-t border-white/10 bg-[#141414]">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder={t('Ask GemZ Coach...', 'اسأل مدرب GemZ...')}
                                        disabled={isLoading}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-secondary)]/50 transition-colors placeholder:text-white/30 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => sendMessage()}
                                        disabled={!input.trim() || isLoading}
                                        className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-40 disabled:scale-100"
                                    >
                                        {isLoading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* History Tab */
                        <div className="flex-1 overflow-y-auto bg-black/30">
                            {isHistoryLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-white/30 text-sm">
                                    <MessageSquare size={24} className="mb-2 opacity-30" />
                                    {t('No conversations yet', 'لا توجد محادثات بعد')}
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {conversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group"
                                        >
                                            <button
                                                onClick={() => loadConversation(conv.id)}
                                                className="flex-1 flex items-center gap-3 text-left min-w-0"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shrink-0">
                                                    <MessageSquare size={16} className="text-black" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">
                                                        {conv.title}
                                                    </p>
                                                    <p className="text-white/40 text-xs">
                                                        {conv.messageCount} {t('messages', 'رسائل')} &middot; {new Date(conv.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <ChevronRight size={16} className="text-white/20 shrink-0" />
                                            </button>
                                            <button
                                                onClick={() => deleteConversation(conv.id)}
                                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
