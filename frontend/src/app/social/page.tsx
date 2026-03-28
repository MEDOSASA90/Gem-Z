'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t, isArabic, toggleLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<any[]>([]);
    
    // Creation state
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await GemZApi.Social.getFeed();
                if (res.success && res.posts) {
                    setPosts(res.posts);
                }
            } catch (err) {
                console.error("Failed to load social feed:", err);
                // Setup some default mock posts if API fails
                setPosts([
                    {
                        id: 'mock1',
                        author_name: 'FitPro_Sarah',
                        author_role: 'trainer',
                        created_at: new Date(Date.now() - 3600000).toISOString(),
                        content: 'Just smashed a new PR on the bench press today! The new Kinetic routines are insane. Keep grinding squad 🔥',
                        likes_count: 24,
                        comments_count: 5
                    },
                    {
                        id: 'mock2',
                        author_name: 'Alpha_User_99',
                        author_role: 'trainee',
                        created_at: new Date(Date.now() - 7200000).toISOString(),
                        content: 'Has anyone tried the new Nebula-X proto shoes from the auctions? Looking for some feedback before I drop my GEMZ on them.',
                        likes_count: 12,
                        comments_count: 8,
                        media_urls: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDiv7K3cu8hpVM99R3dXfjcv83VtzplDNbUqLJggDH3jLQxKUw-VobooUWwM4O6s1k3jAsb7jvBVIxeTpLG_h5-FlgJfUynhnxEeo4FoyKmf_z2KkfwSv7H8uvuULPgQJwpr14hkeal_PucIXME239uT8mZQeKWvape8qOs5Xd4ymrFhdk6qsY144yeNbz5lWYFpAaqPpMQ9_vTZ3YRbyd_jEqa-0YXzsWcWtRz_pk2Efa_i8oygdDrhKCfOWKmDRgboLqV6_3ro45L']
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setIsPosting(true);
        try {
            const res = await GemZApi.Social.createPost(newPostContent);
            if (res.success && res.post) {
                setPosts([res.post, ...posts]);
                setNewPostContent('');
                setIsPosting(false);
                return;
            }
        } catch (err) {
            console.error("API failed, using local mock state:", err);
        }
        
        // Local Fallback if API fails or backend isn't ready
        setTimeout(() => {
            let userName = 'Elite Trainee';
            let userRole = 'trainee';
            try {
                const ls = localStorage.getItem('gemz_user');
                if (ls) {
                    const parsed = JSON.parse(ls);
                    if (parsed.fullName) userName = parsed.fullName;
                    if (parsed.role) userRole = parsed.role;
                }
            } catch (e) {}

            const mockPost = {
                id: Date.now().toString(),
                author_name: userName,
                author_role: userRole,
                created_at: new Date().toISOString(),
                content: newPostContent,
                likes_count: 0,
                comments_count: 0,
            };
            setPosts([mockPost, ...posts]);
            setNewPostContent('');
            setIsPosting(false);
        }, 500);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center text-primary-fixed">
                <Loader2 className="animate-spin w-16 h-16 mb-4" />
                <span className="font-headline font-bold uppercase tracking-widest">{t("Syncing Squad Network...")}</span>
            </div>
        );
    }

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body pb-32">
      
<header className="bg-black/60 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center px-6 py-4 w-full shadow-[0_8px_24px_rgba(255,123,0,0.12)] no-border tonal-transition-bg">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/30">
<Link href="/trainee" className="w-full h-full block">
<img alt="User Profile" className="w-full h-full object-cover" data-alt="Portrait of an elite athlete with sharp features and modern sports gear, cinematic dark lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKXDTl0uysBR94vHLPO-Y0-yuA-mMGT0JAB-14S_ZuzPcwBzh8ZI7zj6HYKEi2fbWhBLqYfjV9Bt-KD0pxiCm_xIoO0UnhYibYjEMNoAW9c_onLw_FBgWqy7y4Au99l0xpELa-bMOAc1SNsJVfCNPrtNZfrWfUmGkkHQrkLdgvhVlHcl-3Fw9W7XVhTuil2bg-4s4jhcTnl7_1jWC05ydEkHSPNsAFYPFq-DJV3lbFvydRXkNjQ6zLKP72dCEzo3nL_Uwz5qSY2CQx"/>
</Link>
</div>
<Link href="/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</h1></Link>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex gap-8 font-headline font-bold tracking-tight">
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/ai-coach">{t("Coach")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/shop">{t("Shop")}</Link>
<Link className="text-[#ff7b00]" href="/social">{t("Feed")}</Link>
<Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/wallet">{t("Wallet")}</Link>
</nav>
<div className="flex items-center gap-3">
    <button onClick={toggleLanguage} className="text-[#ff7b00] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full font-headline font-bold tracking-tight hover:bg-white/10 transition-colors active:scale-95 duration-200">
        {isArabic ? 'EN' : 'عربي'}
    </button>
    <button translate="no" className="material-symbols-outlined text-[#ff7b00] text-2xl scale-95 active:duration-150" onClick={() => alert(isArabic ? 'التنبيهات سيتم تفعيلها قريباً 🔔' : 'Notifications coming soon 🔔')}>notifications</button>
</div>
</div>
</header>

<main className="max-w-4xl mx-auto px-4 pt-8 pb-32">

<div className="mb-12">
<h2 className="text-6xl md:text-8xl font-black italic text-on-surface tracking-tighter font-headline opacity-10 absolute -z-10 select-none">{t("SQUAD FEED")}</h2>
<p className="text-primary-fixed font-headline font-bold tracking-widest uppercase text-sm mb-2 px-1">{t("Live Activity")}</p>
<h3 className="text-4xl md:text-5xl font-extrabold text-on-surface leading-tight tracking-tight">{t("What's the")}<span className="text-primary-fixed italic mx-2">{t("Pulse")}</span>?</h3>
</div>

{/* Sponsored Ad Banner */}
<div className="mb-6 rounded-2xl bg-gradient-to-r from-[#ff7b00]/10 to-yellow-500/5 border border-[#ff7b00]/20 p-4 flex items-center gap-4 cursor-pointer hover:bg-[#ff7b00]/15 transition-all">
<div className="w-12 h-12 rounded-xl bg-[#ff7b00]/20 flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[#ff7b00]">campaign</span>
</div>
<div className="flex-1 min-w-0">
<p className="text-[10px] text-[#ff7b00] font-black uppercase tracking-widest">{isArabic ? '✦ إعلان ممول' : '✦ Sponsored'}</p>
<p className="font-bold text-white text-sm">{isArabic ? 'انضم لتحدي Gem Z — جوائز حتى 5,000 EGP! 🏆' : 'Join Gem Z Challenge — Win up to EGP 5,000!'}</p>
</div>
<span className="material-symbols-outlined text-[#ff7b00] shrink-0">arrow_forward_ios</span>
</div>

<div className="glass-panel p-6 rounded-lg mb-10 border-b-2 border-outline-variant/20 focus-within:border-primary-fixed transition-all duration-300">
<div className="flex gap-4">
<div className="w-12 h-12 rounded-full bg-surface-container-highest flex-shrink-0 border border-outline-variant/30 overflow-hidden">
<Link href="/trainee" className="w-full h-full block">
<img alt="User" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKXDTl0uysBR94vHLPO-Y0-yuA-mMGT0JAB-14S_ZuzPcwBzh8ZI7zj6HYKEi2fbWhBLqYfjV9Bt-KD0pxiCm_xIoO0UnhYibYjEMNoAW9c_onLw_FBgWqy7y4Au99l0xpELa-bMOAc1SNsJVfCNPrtNZfrWfUmGkkHQrkLdgvhVlHcl-3Fw9W7XVhTuil2bg-4s4jhcTnl7_1jWC05ydEkHSPNsAFYPFq-DJV3lbFvydRXkNjQ6zLKP72dCEzo3nL_Uwz5qSY2CQx"/>
</Link>
</div>
<div className="flex-grow">
<textarea 
    value={newPostContent}
    onChange={(e) => setNewPostContent(e.target.value)}
    className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant focus:ring-0 text-xl resize-none font-headline font-bold outline-none" 
    placeholder={isArabic ? 'شارك طاقتك الحركية مع الفِرق...' : 'Share your kinetic energy...'} 
    rows={2}
></textarea>
<div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/10">
<div className="flex gap-4">
<button onClick={() => alert(isArabic ? 'إرفاق الوسائط قريباً 📷' : 'Media attachments coming soon 📷')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary-fixed transition-colors active:scale-95">
<span translate="no" className="material-symbols-outlined">image</span>
<span className="text-xs font-bold uppercase tracking-widest">{t("Media")}</span>
</button>
<button onClick={() => alert(isArabic ? 'قياس الطاقة قريباً ⚡' : 'Energy metrics coming soon ⚡')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary-fixed transition-colors active:scale-95">
<span translate="no" className="material-symbols-outlined">bolt</span>
<span className="text-xs font-bold uppercase tracking-widest">{t("Energy")}</span>
</button>
</div>
<button 
    onClick={handleCreatePost}
    disabled={isPosting || !newPostContent.trim()}
    className="disabled:opacity-50 bg-primary-fixed text-on-primary-fixed px-8 py-2 rounded-full font-headline font-black italic text-sm tracking-tight hover:shadow-[0_0_20px_rgba(255,123,0,0.4)] transition-all active:scale-95 uppercase tracking-widest"
>
    {isPosting ? <Loader2 className="animate-spin w-5 h-5" /> : (isArabic ? 'مشاركة' : 'PULSE')}
</button>
</div>
</div>
</div>
</div>

<div className="flex flex-col gap-8">
    
    {posts.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant font-headline font-bold italic tracking-widest">{t("The network is quiet. Be the first to pulse.")}</div>
    ) : null}

    {posts.map((post) => (
        <article key={post.id} className="group relative bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/10 hover:border-primary-fixed/50 transition-all duration-500 shadow-lg hover:shadow-[0_0_30px_rgba(255,123,0,0.1)]">
            <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary-fixed flex items-center justify-center bg-surface-container-lowest overflow-hidden">
                {post.author_role === 'trainee' && post.author_name === JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('gemz_user') || '{}' : '{}').fullName ? (
                    <img alt="User" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKXDTl0uysBR94vHLPO-Y0-yuA-mMGT0JAB-14S_ZuzPcwBzh8ZI7zj6HYKEi2fbWhBLqYfjV9Bt-KD0pxiCm_xIoO0UnhYibYjEMNoAW9c_onLw_FBgWqy7y4Au99l0xpELa-bMOAc1SNsJVfCNPrtNZfrWfUmGkkHQrkLdgvhVlHcl-3Fw9W7XVhTuil2bg-4s4jhcTnl7_1jWC05ydEkHSPNsAFYPFq-DJV3lbFvydRXkNjQ6zLKP72dCEzo3nL_Uwz5qSY2CQx"/>
                ) : (
                    <span translate="no" className="material-symbols-outlined text-primary-fixed p-0.5">person</span>
                )}
            </div>
            <div>
            <h4 className="font-headline font-bold text-on-surface">{post.author_name}</h4>
            <p className="text-xs text-on-surface-variant font-medium drop-shadow-md">{new Date(post.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})} • <span className="text-primary-fixed font-bold capitalize">{post.author_role.replace('_', ' ')}</span></p>
            </div>
            </div>
            <button className="text-on-surface-variant hover:text-white transition-colors active:scale-90"><span translate="no" className="material-symbols-outlined">more_vert</span></button>
            </div>
            
            <div className="px-6 pb-4">
            <p className="text-on-surface text-lg font-medium leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
            
            {post.media_urls && post.media_urls.length > 0 && (
                <div className="relative h-[250px] md:h-[400px] w-full bg-surface-container overflow-hidden">
                <img alt="Media" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={post.media_urls[0]}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
            )}
            
            <div className="p-4 md:p-6 flex flex-wrap items-center justify-between border-t border-outline-variant/10 bg-black/20">
            <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary-fixed group/btn transition-colors active:scale-95">
            <span translate="no" className="material-symbols-outlined group-active/btn:scale-125 transition-transform" style={post.likes_count > 0 ? {fontVariationSettings: "'FILL' 1", color: '#ff7b00'} : {}}>favorite</span>
            <span className="text-sm font-bold tracking-widest" style={post.likes_count > 0 ? {color: '#ff7b00'} : {}}>{post.likes_count || 0}</span>
            </button>
            <button onClick={() => alert(isArabic ? 'التعليقات' : 'Comments')} className="flex items-center gap-2 text-on-surface-variant hover:text-secondary-fixed transition-colors active:scale-95">
            <span translate="no" className="material-symbols-outlined">mode_comment</span>
            <span className="text-sm font-bold tracking-widest">{post.comments_count || 0}</span>
            </button>
            <button onClick={() => alert(isArabic ? 'مشاركة' : 'Share')} className="flex items-center gap-2 text-on-surface-variant hover:text-tertiary transition-colors active:scale-95">
            <span translate="no" className="material-symbols-outlined">share</span>
            </button>
            </div>
            </div>
        </article>
    ))}

</div>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/80 backdrop-blur-3xl rounded-t-[2rem] z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] md:hidden border-t border-white/5 no-border glassmorphism-surface">
<Link href="/ai-coach" className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90">
<span translate="no" className="material-symbols-outlined mb-1">psychology</span>
<span className="font-headline text-[10px] uppercase tracking-widest font-bold">{t("Coach")}</span>
</Link>
<Link href="/shop" className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90">
<span translate="no" className="material-symbols-outlined mb-1">shopping_bag</span>
<span className="font-headline text-[10px] uppercase tracking-widest font-bold">{t("Shop")}</span>
</Link>
<Link href="/social" className="flex flex-col items-center justify-center text-[#ff7b00] drop-shadow-[0_0_15px_rgba(255,123,0,0.6)] hover:scale-110 transition-transform active:scale-90">
<span translate="no" className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>dynamic_feed</span>
<span className="font-headline text-[10px] uppercase tracking-widest font-black">{t("Feed")}</span>
</Link>
<Link href="/wallet" className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90">
<span translate="no" className="material-symbols-outlined mb-1">account_balance_wallet</span>
<span className="font-headline text-[10px] uppercase tracking-widest font-bold">{t("Wallet")}</span>
</Link>
<Link href="/squads" className="flex flex-col items-center justify-center text-gray-500 hover:text-white hover:scale-110 transition-transform active:scale-90">
<span translate="no" className="material-symbols-outlined mb-1">groups</span>
<span className="font-headline text-[10px] uppercase tracking-widest font-bold">{t("Squads")}</span>
</Link>
</nav>

<nav className="hidden md:flex flex-col gap-4 fixed right-6 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl border border-primary-fixed/20 p-2 text-on-surface-variant rounded-full z-40">
    <Link href="/squads" className="w-12 h-12 flex items-center justify-center hover:text-primary-fixed transition-colors"><span translate="no" className="material-symbols-outlined">explore</span></Link>
    <Link href="/progress" className="w-12 h-12 flex items-center justify-center hover:text-primary-fixed transition-colors"><span translate="no" className="material-symbols-outlined">bar_chart</span></Link>
    <Link href="/social" className="w-12 h-12 flex items-center justify-center text-primary-fixed bg-primary-fixed/10 rounded-full"><span translate="no" className="material-symbols-outlined">dynamic_feed</span></Link>
</nav>

<Link href="/squads" className="fixed right-6 bottom-32 md:right-24 md:bottom-12 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#1a1a1a] border border-[#ff7b00]/30 flex items-center justify-center z-[100] group hover:scale-110 hover:border-[#ff7b00] transition-all duration-500 shadow-[0_0_30px_rgba(255,123,0,0.4)] active:scale-95">
<div className="absolute inset-0 rounded-full bg-[#ff7b00]/10 animate-pulse"></div>
<span translate="no" className="material-symbols-outlined text-3xl md:text-4xl text-[#ff7b00] drop-shadow-[0_0_10px_rgba(255,123,0,0.8)] group-hover:rotate-12 transition-transform">bolt</span>
<span className="absolute -top-12 md:-left-24 px-3 py-1 bg-black border border-outline-variant/20 rounded font-headline text-xs font-bold text-white uppercase tracking-widest scale-0 origin-bottom group-hover:scale-100 transition-all">{t("Quick Action")}</span>
</Link>
    </div>
  );
}
