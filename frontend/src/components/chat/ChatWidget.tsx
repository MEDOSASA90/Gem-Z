'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageCircle,
    X,
    Send,
    ChevronLeft,
    Circle,
    Search,
    MoreVertical,
    Trash2,
    Check,
    CheckCheck,
    Loader2,
    Minimize2,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────

interface Conversation {
    id: string;
    participantOne: string;
    participantTwo: string;
    lastMessageAt: string;
    otherParticipant: {
        id: string;
        fullName: string;
        avatarUrl?: string;
    };
    lastMessage?: {
        content: string;
        senderId: string;
        createdAt: string;
    };
    unreadCount: number;
}

interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    receiverId: string;
    content: string;
    messageType: 'text' | 'image' | 'voice' | 'file';
    fileUrl?: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}

interface ChatState {
    conversations: Conversation[];
    activeRoomId: string | null;
    messages: ChatMessage[];
    isLoading: boolean;
    isSending: boolean;
    isTyping: boolean;
    searchQuery: string;
    error: string | null;
    unreadTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// ─── Component ────────────────────────────────────────────────────

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'conversations' | 'chat'>('conversations');
    const [state, setState] = useState<ChatState>({
        conversations: [],
        activeRoomId: null,
        messages: [],
        isLoading: false,
        isSending: false,
        isTyping: false,
        searchQuery: '',
        error: null,
        unreadTotal: 0,
    });
    const [messageInput, setMessageInput] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Socket Connection ────────────────────────────────────────

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        newSocket.on('connect', () => {
            console.log('[Chat] Socket connected');
        });

        newSocket.on('receive_message', (msg: ChatMessage) => {
            setState((prev) => {
                const isActiveRoom = prev.activeRoomId === msg.roomId;
                const updatedConversations = prev.conversations.map((conv) => {
                    if (conv.id === msg.roomId) {
                        return {
                            ...conv,
                            lastMessage: {
                                content: msg.content,
                                senderId: msg.senderId,
                                createdAt: msg.createdAt,
                            },
                            unreadCount: isActiveRoom ? conv.unreadCount : conv.unreadCount + 1,
                        };
                    }
                    return conv;
                });

                return {
                    ...prev,
                    conversations: updatedConversations,
                    messages: isActiveRoom ? [...prev.messages, msg] : prev.messages,
                    unreadTotal: isActiveRoom ? prev.unreadTotal : prev.unreadTotal + 1,
                };
            });

            if (state.activeRoomId === msg.roomId) {
                newSocket.emit('mark_read', { roomId: msg.roomId });
            }
        });

        newSocket.on('message_sent', (msg: ChatMessage) => {
            setState((prev) => ({
                ...prev,
                messages: [...prev.messages, msg],
                isSending: false,
            }));
        });

        newSocket.on('user_typing', (data: { userId: string; roomId: string; isTyping: boolean }) => {
            if (data.roomId === state.activeRoomId) {
                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    if (data.isTyping) {
                        next.add(data.userId);
                    } else {
                        next.delete(data.userId);
                    }
                    return next;
                });
            }
        });

        newSocket.on('messages_read', (data: { roomId: string; userId: string }) => {
            setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                    msg.receiverId === data.userId && msg.roomId === data.roomId
                        ? { ...msg, isRead: true, readAt: new Date().toISOString() }
                        : msg
                ),
            }));
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Chat] Socket error:', err.message);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    // ─── Data Fetching ────────────────────────────────────────────

    const fetchConversations = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        setState((prev) => ({ ...prev, isLoading: true }));

        try {
            const response = await fetch(`${API_BASE}/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (data.success) {
                setState((prev) => ({
                    ...prev,
                    conversations: data.data,
                    isLoading: false,
                }));
            }
        } catch {
            setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load conversations' }));
        }
    }, []);

    const fetchMessages = useCallback(async (roomId: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        setState((prev) => ({ ...prev, isLoading: true, activeRoomId: roomId }));

        try {
            const response = await fetch(`${API_BASE}/chat/messages/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (data.success) {
                setState((prev) => ({
                    ...prev,
                    messages: data.data.messages,
                    isLoading: false,
                }));

                // Mark as read
                await fetch(`${API_BASE}/chat/messages/${roomId}/read`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });

                // Clear unread for this room
                setState((prev) => ({
                    ...prev,
                    conversations: prev.conversations.map((conv) =>
                        conv.id === roomId ? { ...conv, unreadCount: 0 } : conv
                    ),
                }));

                // Join room via socket
                socket?.emit('join_room', roomId);
            }
        } catch {
            setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load messages' }));
        }
    }, [socket]);

    const fetchUnreadCount = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/chat/unread`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (data.success) {
                setState((prev) => ({ ...prev, unreadTotal: data.data.unreadCount }));
            }
        } catch {
            // Silently fail
        }
    }, []);

    // ─── Effects ──────────────────────────────────────────────────

    useEffect(() => {
        if (isOpen) {
            fetchConversations();
            fetchUnreadCount();
        }
    }, [isOpen, fetchConversations, fetchUnreadCount]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.messages, typingUsers]);

    // ─── Handlers ─────────────────────────────────────────────────

    const handleSendMessage = useCallback(() => {
        if (!messageInput.trim() || !state.activeRoomId || !socket) return;

        const currentUserId = getCurrentUserId();
        const conversation = state.conversations.find((c) => c.id === state.activeRoomId);
        if (!conversation) return;

        const receiverId =
            conversation.participantOne === currentUserId
                ? conversation.participantTwo
                : conversation.participantOne;

        setState((prev) => ({ ...prev, isSending: true }));

        socket.emit('private_message', {
            receiverId,
            content: messageInput.trim(),
        });

        // Optimistic update
        const optimisticMsg: ChatMessage = {
            id: `temp_${Date.now()}`,
            roomId: state.activeRoomId,
            senderId: currentUserId || '',
            receiverId,
            content: messageInput.trim(),
            messageType: 'text',
            isRead: false,
            createdAt: new Date().toISOString(),
        };

        setState((prev) => ({
            ...prev,
            messages: [...prev.messages, optimisticMsg],
            conversations: prev.conversations.map((conv) =>
                conv.id === state.activeRoomId
                    ? {
                          ...conv,
                          lastMessage: {
                              content: messageInput.trim(),
                              senderId: currentUserId || '',
                              createdAt: new Date().toISOString(),
                          },
                      }
                    : conv
            ),
        }));

        setMessageInput('');
    }, [messageInput, state.activeRoomId, socket, state.conversations]);

    const handleTyping = useCallback(() => {
        if (!socket || !state.activeRoomId) return;

        socket.emit('typing', {
            roomId: state.activeRoomId,
            isTyping: true,
        });

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', {
                roomId: state.activeRoomId,
                isTyping: false,
            });
        }, 3000);
    }, [socket, state.activeRoomId]);

    const handleDeleteConversation = useCallback(async (roomId: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            await fetch(`${API_BASE}/chat/conversations/${roomId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            setState((prev) => ({
                ...prev,
                conversations: prev.conversations.filter((c) => c.id !== roomId),
                activeRoomId: prev.activeRoomId === roomId ? null : prev.activeRoomId,
            }));

            if (state.activeRoomId === roomId) {
                setActiveTab('conversations');
            }
        } catch {
            setState((prev) => ({ ...prev, error: 'Failed to delete conversation' }));
        }
    }, [state.activeRoomId]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        },
        [handleSendMessage]
    );

    // ─── Derived State ────────────────────────────────────────────

    const filteredConversations = state.conversations.filter((conv) =>
        conv.otherParticipant.fullName.toLowerCase().includes(state.searchQuery.toLowerCase())
    );

    const activeConversation = state.conversations.find((c) => c.id === state.activeRoomId);

    // ─── Render Helpers ───────────────────────────────────────────

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return formatTime(dateStr);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // ─── JSX ──────────────────────────────────────────────────────

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setActiveTab('conversations');
                }}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isOpen
                        ? 'bg-white/10 backdrop-blur-md scale-90'
                        : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:scale-110'
                }`}
            >
                {isOpen ? (
                    <Minimize2 size={22} className="text-white" />
                ) : (
                    <>
                        <MessageCircle size={24} className="text-black" />
                        {state.unreadTotal > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                                {state.unreadTotal}
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-[#141414] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="shrink-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] p-4 flex items-center justify-between">
                        {activeTab === 'chat' && activeConversation ? (
                            <>
                                <button
                                    onClick={() => setActiveTab('conversations')}
                                    className="flex items-center gap-2 text-black"
                                >
                                    <ChevronLeft size={20} />
                                    <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-sm font-bold">
                                        {activeConversation.otherParticipant.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-sm truncate max-w-[140px]">
                                        {activeConversation.otherParticipant.fullName}
                                    </span>
                                    {typingUsers.size > 0 && (
                                        <span className="text-[10px] text-black/60 animate-pulse">
                                            typing...
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => activeRoomId && handleDeleteConversation(activeRoomId)}
                                    className="text-black/50 hover:text-black transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-black font-bold font-heading">Messages</h3>
                                {state.unreadTotal > 0 && (
                                    <span className="px-2 py-0.5 bg-black/20 rounded-full text-black text-xs font-semibold">
                                        {state.unreadTotal} new
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Content */}
                    {activeTab === 'conversations' ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Search */}
                            <div className="p-3 border-b border-white/5">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                                    <Search size={16} className="text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        value={state.searchQuery}
                                        onChange={(e) =>
                                            setState((prev) => ({ ...prev, searchQuery: e.target.value }))
                                        }
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                                    />
                                </div>
                            </div>

                            {/* Conversation List */}
                            <div className="flex-1 overflow-y-auto">
                                {state.isLoading && state.conversations.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                                        <MessageCircle size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm">
                                            {state.searchQuery ? 'No matches found' : 'No conversations yet'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => {
                                                fetchMessages(conv.id);
                                                setActiveTab('chat');
                                            }}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-black font-bold text-sm">
                                                    {conv.otherParticipant.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                {conv.unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-white truncate">
                                                        {conv.otherParticipant.fullName}
                                                    </span>
                                                    <span className="text-[10px] text-white/40 shrink-0">
                                                        {conv.lastMessageAt
                                                            ? formatDate(conv.lastMessageAt)
                                                            : formatDate(conv.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/50 truncate mt-0.5">
                                                    {conv.lastMessage
                                                        ? `${conv.lastMessage.senderId === conv.otherParticipant.id ? '' : 'You: '}${conv.lastMessage.content}`
                                                        : 'Start a conversation...'}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/30">
                                {state.isLoading && state.messages.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                                    </div>
                                ) : state.messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                                        <Send size={28} className="mb-2 opacity-50" />
                                        <p className="text-sm">Send your first message</p>
                                    </div>
                                ) : (
                                    state.messages.map((msg) => {
                                        const isMe = msg.senderId !== activeConversation?.otherParticipant.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                                                        isMe
                                                            ? 'bg-[var(--color-primary)]/20 text-white rounded-br-sm border border-[var(--color-primary)]/30'
                                                            : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                                                    }`}
                                                >
                                                    <p>{msg.content}</p>
                                                    <div className="flex items-center justify-end gap-1 mt-1">
                                                        <span className="text-[10px] text-white/40">
                                                            {formatTime(msg.createdAt)}
                                                        </span>
                                                        {isMe &&
                                                            (msg.isRead ? (
                                                                <CheckCheck size={12} className="text-[var(--color-primary)]" />
                                                            ) : (
                                                                <Check size={12} className="text-white/30" />
                                                            ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                {typingUsers.size > 0 && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-bl-sm">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="shrink-0 p-3 border-t border-white/10 bg-[#141414]">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => {
                                            setMessageInput(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-secondary)]/50 transition-colors placeholder:text-white/30"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || state.isSending}
                                        className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-40 disabled:scale-100"
                                    >
                                        {state.isSending ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Error Toast */}
                    {state.error && (
                        <div className="absolute bottom-16 left-3 right-3 p-3 bg-red-500/90 text-white text-xs rounded-xl text-center animate-in slide-in-from-bottom-2">
                            {state.error}
                        </div>
                    )}
                </div>
            )}
        </>
    );

    function getCurrentUserId(): string | null {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId || null;
        } catch {
            return null;
        }
    }
}
