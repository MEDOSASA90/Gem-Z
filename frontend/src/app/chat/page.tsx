'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { io, Socket } from 'socket.io-client';
import { Send, Search, User, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatPage() {
    const { isArabic } = useLanguage();
    
    const [user, setUser] = useState<any>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [contacts, setContacts] = useState<any[]>([]);
    const [activeContact, setActiveContact] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize Socket
        const token = localStorage.getItem('gemz_token');
        if (!token) return;

        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            setUser(decoded);
        } catch(e) {}

        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
            auth: { token },
            transports: ['websocket']
        });

        newSocket.on('connect', () => console.log('Connected to Chat server'));
        setSocket(newSocket);

        // Fetch Initial Contacts
        GemZApi.Chat.getContacts().then(res => {
            if (res.success) setContacts(res.contacts);
            setLoading(false);
        }).catch(console.error);

        return () => { newSocket.close(); };
    }, []);

    useEffect(() => {
        if (!socket) return;
        
        const handleReceive = (msg: any) => {
            if (activeContact && (msg.sender_id === activeContact.id || msg.receiver_id === activeContact.id)) {
                setMessages(prev => [...prev, msg]);
            } else {
                // Refresh contacts to show new message activity
                GemZApi.Chat.getContacts().then(res => {
                    if (res.success) setContacts(res.contacts);
                });
            }
        };

        socket.on('receive_message', handleReceive);
        socket.on('message_sent', handleReceive); // ack from server

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('message_sent', handleReceive);
        };
    }, [socket, activeContact]);

    useEffect(() => {
        // Scroll to bottom when messages update
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const openChat = async (contact: any) => {
        setActiveContact(contact);
        setMessages([]); // clear while loading
        try {
            const res = await GemZApi.Chat.getHistory(contact.id);
            if (res.success) setMessages(res.messages);
            
            // Add to contacts list if not already there (for searched users)
            if (!contacts.find(c => c.id === contact.id)) {
                setContacts([contact, ...contacts]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const content = messageInput.trim();
        if (!content || !socket || !activeContact) return;

        socket.emit('private_message', { receiverId: activeContact.id, content });
        setMessageInput('');
    };

    const handleSearch = async (e: any) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 2) {
            const res = await GemZApi.request(`/search?query=${query}`);
            if (res.success && res.results.users) {
                // exclude self
                setSearchResults(res.results.users.filter((u: any) => u.id !== user?.userId));
            }
        } else {
            setSearchResults([]);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            
            {/* Sidebar: Contacts */}
            <aside className="w-full md:w-96 border-x shrink-0 flex flex-col h-[calc(100vh-80px)]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
                        <MessageCircle className="text-[var(--color-primary)]" /> {isArabic ? 'المحادثات' : 'Chats'}
                    </h2>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={handleSearch}
                            placeholder={isArabic ? 'ابحث عن مدرب، متدرب...' : 'Search users...'}
                            className="w-full pl-4 pr-12 py-3 rounded-full outline-none border focus:border-[var(--color-primary)] transition-colors"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading && <div className="text-center p-4"><Loader2 className="animate-spin text-[var(--color-primary)] mx-auto" /></div>}
                    
                    {/* Search Results Priority */}
                    {searchResults.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-500 mb-2 px-2">{isArabic ? 'نتائج البحث' : 'Search Results'}</p>
                            {searchResults.map(u => (
                                <button key={u.id} onClick={() => openChat(u)} className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-white/5">
                                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
                                        <User size={20} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{u.full_name}</h4>
                                        <p className="text-xs text-[var(--color-secondary)]">{u.role}</p>
                                    </div>
                                </button>
                            ))}
                            <hr className="my-2 border-white/10" />
                        </div>
                    )}

                    {!loading && contacts.length === 0 && searchResults.length === 0 && (
                        <p className="text-center text-gray-500 py-10 px-4">{isArabic ? 'ابدأ محادثة جديدة عبر البحث عن أصدقائك ومدربيك' : 'Start a new conversation by searching for users.'}</p>
                    )}

                    {/* Contact List */}
                    {contacts.map(c => (
                        <button key={c.id} onClick={() => openChat(c)} className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${activeContact?.id === c.id ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30' : 'hover:bg-white/5 border border-transparent'}`}>
                            <div className="w-12 h-12 rounded-full bg-black/40 border border-[var(--color-primary)]/20 flex items-center justify-center relative">
                                <User size={24} className="text-[var(--color-primary)]" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-lg truncate">{c.full_name}</h4>
                                <p className="text-xs text-gray-400 capitalize">{c.role}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Chat Area */}
            <main className="flex-1 flex flex-col h-[calc(100vh-80px)] relative">
                {!activeContact ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <MessageCircle size={80} className="mb-6 opacity-20" />
                        <h2 className="text-2xl font-black mb-2">{isArabic ? 'مرحباً بك في GEM Z Chat' : 'Welcome to GEM Z Chat'}</h2>
                        <p>{isArabic ? 'تواصل فورياً وبسرية تامة مع مدربيك وصالاتك' : 'Securely connect with your trainers and gyms in real-time.'}</p>
                    </div>
                ) : (
                    <>
                        <header className="p-4 md:p-6 border-b flex items-center gap-4 glass-panel z-10" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                            <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
                                <User size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">{activeContact.full_name}</h2>
                                <p className="text-xs text-[var(--color-secondary)] capitalize">{activeContact.role}</p>
                            </div>
                        </header>

                        {/* Messages Log */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === user?.userId;
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] p-4 rounded-3xl ${isMe ? 'rounded-tr-sm bg-[var(--color-primary)] text-black' : 'rounded-tl-sm bg-black/40 border border-white/10 text-white'}`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                            <div className={`text-[10px] mt-2 ${isMe ? 'text-black/60' : 'text-gray-500'}`}>
                                                {format(new Date(msg.created_at || Date.now()), 'p')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-6 border-t glass-panel z-10" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                            <form onSubmit={sendMessage} className="flex items-center gap-4">
                                <input 
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    placeholder={isArabic ? 'اكتب رسالتك...' : 'Type a message...'}
                                    className="flex-1 p-4 rounded-full outline-none border focus:border-[var(--color-primary)] transition-colors"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }}
                                />
                                <button disabled={!messageInput.trim()} type="submit" className="w-14 h-14 rounded-full flex items-center justify-center text-black disabled:opacity-50 transition-transform active:scale-95" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                                    <Send size={24} className={isArabic ? 'rotate-180' : ''} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
