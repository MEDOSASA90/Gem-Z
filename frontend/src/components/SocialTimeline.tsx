'use client';
import React, { useState } from 'react';
import { Heart, MessageSquare, Share2, Flame, Award, Send, Image as ImageIcon, Globe, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { GemZApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function SocialTimeline() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const [postContent, setPostContent] = useState('');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    React.useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res: any = await GemZApi.Social.getFeed();
            if (res.success) {
                setPosts(res.posts);
            }
        } catch (error) {
            console.error('Failed to fetch posts', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async () => {
        if (!postContent.trim()) return;
        setPosting(true);
        try {
            const res: any = await GemZApi.Social.createPost(postContent);
            if (res.success && res.post) {
                setPosts([res.post, ...posts]);
                setPostContent('');
            }
        } catch (error) {
            console.error('Failed to create post', error);
        } finally {
            setPosting(false);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen flex justify-center p-4 lg:p-8 font-sans transition-colors duration-300 pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Feed Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Header Controls (Mobile Friendly) */}
                    <div className="flex justify-between items-center lg:hidden mb-4">
                        <h1 className="text-2xl font-bold font-heading">{isArabic ? 'المجتمع' : 'Social Feed'}</h1>
                        <div className="flex gap-2">
                            <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                {isDark ? '☀️' : '🌙'}
                            </button>
                            <button onClick={toggleLanguage} className="p-2 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                <Globe className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Create Post Input */}
                    <div className="p-4 rounded-3xl shadow-lg glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full p-[2px] shrink-0" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
                                <div className="w-full h-full rounded-full bg-gray-300 dark:bg-gray-800 border-2" style={{ borderColor: 'var(--bg-card)' }} />
                            </div>
                            <textarea
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                placeholder={isArabic ? 'شارك إنجازك أو تمرين اليوم...' : "Share your PR or today's workout..."}
                                className="w-full bg-transparent resize-none outline-none font-medium pt-3"
                                style={{ color: 'var(--text-primary)' }}
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                            <button className="transition-colors p-2 flex items-center gap-2 hover:text-[#00FFA3]" style={{ color: 'var(--text-secondary)' }}>
                                <ImageIcon className="w-5 h-5" /> <span className="text-sm font-bold hidden sm:inline">{isArabic ? 'إضافة وسائط' : 'Add Media'}</span>
                            </button>
                            <button
                                onClick={handlePost}
                                disabled={posting || !postContent.trim()}
                                className="text-black font-bold px-6 py-2 rounded-full hover:opacity-90 flex items-center gap-2 transition-opacity disabled:opacity-50"
                                style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}
                            >
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>{isArabic ? 'نشر' : 'Post'} <Send className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} /></>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Feed Posts */}
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-[#00FFA3]" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center p-8" style={{ color: 'var(--text-secondary)' }}>
                            {isArabic ? 'لا توجد منشورات حتى الآن. كن أول من ينشر!' : 'No posts yet. Be the first to post!'}
                        </div>
                    ) : (
                        posts.map((post) => (
                            <div key={post.id} className="rounded-3xl p-5 glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold bg-gradient-to-br from-[#00FFA3] to-[#00B8FF] text-black border-2 border-[#0A0A0A]">
                                            {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold flex items-center gap-2">
                                                {post.author_name || 'Gem Z User'} 
                                                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold" style={{ background: 'rgba(0,184,255,0.1)', color: '#00B8FF' }}>{post.author_role || 'Trainee'}</span>
                                            </h4>
                                            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                                {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p className="mb-4 leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }} dir="auto">
                                    {post.content}
                                </p>

                                {post.media_urls && post.media_urls.length > 0 && (
                                    <div className="mb-4 rounded-xl overflow-hidden bg-[#0A0A0A] aspect-video flex items-center justify-center">
                                        <img src={post.media_urls[0]} alt="Post media" className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                                    <button className="flex items-center gap-2 transition-colors group hover:text-[#00FFA3]">
                                        <Heart className={`w-5 h-5 group-hover:fill-[#00FFA3] ${post.likes_count > 0 ? 'fill-[#00FFA3] text-[#00FFA3]' : ''}`} /> <span className="font-bold font-mono">{post.likes_count || 0}</span>
                                    </button>
                                    <button className="flex items-center gap-2 transition-colors hover:text-[#00B8FF]">
                                        <MessageSquare className="w-5 h-5" /> <span className="font-bold font-mono">{post.comments_count || 0}</span>
                                    </button>
                                    <button className="flex items-center gap-2 transition-colors hover:text-[#A78BFA]">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sidebar: Leaderboards & Streaks */}
                <div className="space-y-6 hidden lg:block">
                    {/* Header Controls (Desktop) */}
                    <div className="flex justify-end gap-3 mb-2">
                        <button onClick={toggleTheme} className="p-2.5 rounded-xl transition-colors shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        <button onClick={toggleLanguage} className="py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <Globe className="w-4 h-4" /> <span className="text-sm font-bold">{isArabic ? 'EN' : 'عربي'}</span>
                        </button>
                    </div>

                    <div className="rounded-3xl p-6 glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: '2px solid rgba(0,255,163,0.3)', boxShadow: isDark ? '0 0 30px rgba(0,255,163,0.03)' : 'none' }}>
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                            <Flame className="w-5 h-5 text-[#00FFA3]" /> {isArabic ? 'أعلى السلاسل النشطة' : 'Top Active Streaks'}
                        </h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Marcus D.', streak: 45 },
                                { name: 'Elena R.', streak: 38 },
                                { name: 'Tarik J.', streak: 31 }
                            ].map((u, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                                        <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'var(--border-medium)' }} />
                                        <span className="text-sm font-bold">{u.name}</span>
                                    </div>
                                    <span className="text-[#00FFA3] font-mono font-bold">{u.streak} 🔥</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: '2px solid rgba(0,184,255,0.3)' }}>
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                            <Award className="w-5 h-5 text-[#00B8FF]" /> {isArabic ? 'شارات الأسبوع' : 'Weekly Badges'}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map(b => (
                                <div key={b} className="aspect-square rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                    <div className="w-10 h-10 rounded-full shadow-inner" style={{ background: 'var(--border-medium)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
