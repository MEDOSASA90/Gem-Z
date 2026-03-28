'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

const TABS = [
  { id: 'direct', icon: 'person', label: 'Direct', labelAr: 'مباشر' },
  { id: 'squad', icon: 'groups', label: 'Squad', labelAr: 'Squad' },
  { id: 'challenge', icon: 'emoji_events', label: 'Challenge', labelAr: 'تحدي' },
  { id: 'gym', icon: 'fitness_center', label: 'Gym', labelAr: 'الصالة' },
  { id: 'store', icon: 'storefront', label: 'Store', labelAr: 'المتجر' },
];

const CONVERSATIONS: Record<string, any[]> = {
  direct: [
    { id: 1, name: 'Coach Marcus', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4ZVdvL6EiSzjVV0_3f1V26e6anjcoVdPB1nQ-8lynG_sz7q4HiE5Odr8NyVtSDWHvxqIc83NbMM6orCjcdm7TUTyjo5B0mlPx8AkV38dyjwO-dEUSWB05YpzKKyduDkhnJ7AgNbHkdYAtThubaCyrXRl1tGqF7wjpFjIwYdvNfcXmJk7q6s5G1fWL9AC1d6Xp0RzTBpo3LibkGcqQxpzPApeM--NpExTu5aaNpdckcQCLSOvWtn1YCM_NBV9lzGd8e8TW7cybpqSY', last: 'Your form on the last set was elite.', time: 'LIVE', online: true, unread: 2 },
    { id: 2, name: 'Sara Mohamed', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0nIfoh9_7g5iYMPvCHdLQun4VKrOXKWheX6w-ItxAJl4-uKU5LcFi1srj9h_V3xIczNJOqX3d5AkGhv5puh79JJrtGZevMXPo_ejZC96RusnA-krTKf2ZAfjINrqbVj1KaZ765V-UWY7rDDavx1FKAxVdEsF3d5-zI8ENFxsa8FqDcacxpEb05phndC8CkU9K18jcgMoUeMWNSTcCAOpFuRTchGpRif1O7ThRDYPKfs57fNEMPlX_jOrUXbYch6lCD6ZydTSIRAv1', last: 'Did you see the new challenge?', time: '2m', online: true, unread: 0 },
    { id: 3, name: 'Omar Ali', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHpQYfDFha1M8akujkgkv1u-vY49rFU5AheTml4yj6vP0YuuU3SRskz4I89nvQI2SErdayH82d1ONHNcv10DBhNfXFHyqZAtUtS1oYcXLh14Wp8b-5XxteOEUTg2hofkib_YmqiEw_NkhpguW2xt2Kq3N5BW1kSXW1qS_6AEse0wEU_QxGKc6X6_DWuP2Zhs46XPVYM5zBP516ISDtDZwTIVCnk0KNjC9eq8wS6ytjq9ZAvTPdDqYmxDl-7u6e9ZXPGcRsifdDrbAx', last: 'Finished the 30-day squat challenge!', time: '1h', online: false, unread: 1 },
  ],
  squad: [
    { id: 10, name: 'Iron Brotherhood', avatar: null, initials: 'IB', last: 'Ahmed: New PR this week! 💪', time: '5m', online: false, unread: 5, members: 12 },
    { id: 11, name: 'Fat Loss Fam', avatar: null, initials: 'FL', last: 'Nour: Anyone tried intermittent fasting?', time: '20m', online: false, unread: 0, members: 8 },
  ],
  challenge: [
    { id: 20, name: '30-Day Squat Challenge', avatar: null, initials: '🏆', last: '47 athletes competing — Day 18', time: 'Now', online: false, unread: 3, members: 47 },
    { id: 21, name: 'March Step Count', avatar: null, initials: '👟', last: 'Leaderboard updated!', time: '1h', online: false, unread: 0, members: 120 },
  ],
  gym: [
    { id: 30, name: 'Gem Z Main Gym', avatar: null, initials: '🏋️', last: 'Sunday class rescheduled to 7 AM', time: '3h', online: false, unread: 1, members: 200 },
  ],
  store: [
    { id: 40, name: 'Gem Z Store Support', avatar: null, initials: '🛍️', last: 'Your order #1234 has been shipped!', time: '2h', online: false, unread: 1, members: null },
  ],
};

const DEMO_MESSAGES = [
  { text: 'Your form on the last set was elite. Keep it up!', sent: false, time: '09:10' },
  { text: 'شكراً كوتش! أنا حاسس بفرق كبير.', sent: true, time: '09:11' },
  { text: 'Remember to eat 40g protein within 30 min post-workout.', sent: false, time: '09:12' },
  { text: 'ماشي سأضيف الويي بروتين بعد التمرين.', sent: true, time: '09:14' },
];

// Ad Banner component
function AdBanner({ isArabic }: { isArabic: boolean }) {
  return (
    <div className="mx-4 my-3 rounded-xl bg-gradient-to-r from-[#ff7b00]/10 to-purple-500/10 border border-[#ff7b00]/20 p-3 flex items-center gap-3 cursor-pointer hover:bg-[#ff7b00]/15 transition-all">
      <div className="w-10 h-10 rounded-lg bg-[#ff7b00]/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[#ff7b00] text-lg">campaign</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-[#ff7b00] uppercase tracking-wider">{isArabic ? '✦ إعلان ممول' : '✦ Sponsored'}</p>
        <p className="text-xs text-on-surface-variant truncate">{isArabic ? 'خصم 20% على بروتين Gold Standard — لفترة محدودة' : '20% off Gold Standard Whey — Limited time'}</p>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant text-sm">open_in_new</span>
    </div>
  );
}

export default function ChatPage() {
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState('direct');
  const [activeConv, setActiveConv] = useState<any>(CONVERSATIONS.direct[0]);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [input, setInput] = useState('');

  const conversations = CONVERSATIONS[activeTab] || [];

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, sent: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput('');
  };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="bg-surface-container-lowest text-on-surface min-h-screen font-body flex flex-col" style={{ height: '100dvh' }}>

<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)] shrink-0">
<div className="flex items-center gap-4">
<a href="#" onClick={e => { e.preventDefault(); try { const r = JSON.parse(localStorage.getItem('gemz_user') || '{}').role; window.location.href = r === 'trainer' ? '/trainer' : '/trainee'; } catch { window.location.href = '/login'; } }} className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-white/10">
<img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoGCSACSiCrx0iooakyhJ_ND3s_ptZSU8Yi1WpmAoW8vrzTgD1oL1LXNmU_dEJoW7ZqC4synz91uGqxQxGfz8XjrcrIHHLiN4AR5DuP1jNdBRxO91pV5mvpgu6QqgiVH93TQrYLCqucQquQwv8w8YI1Flh1m87pIRVhim9qkE4XS7F0S9EzY2LtiDfGmjZR1uxaQXHd0myeOIIqUNgL6xjkR35UOiiFy9L6bQskCPXIhrEhET9mm3orKHTFUNDgiQurrVjreZChdxD" alt="User" />
</a>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">GEM Z</span></a>
</div>
<div className="flex items-center gap-3">
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">edit_note</button>
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">notifications</button>
</div>
</header>

{/* Chat Tabs */}
<div className="flex bg-[#0e0e0e] border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
{TABS.map(tab => (
<button key={tab.id} onClick={() => { setActiveTab(tab.id); setActiveConv(CONVERSATIONS[tab.id]?.[0] || null); }} className={`flex items-center gap-2 px-5 py-3.5 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? 'border-[#ff7b00] text-[#ff7b00]' : 'border-transparent text-on-surface-variant hover:text-white'}`}>
<span className="material-symbols-outlined text-sm">{tab.icon}</span>
{isArabic ? tab.labelAr : tab.label}
{CONVERSATIONS[tab.id]?.reduce((n, c) => n + (c.unread || 0), 0) > 0 && (
<span className="w-4 h-4 rounded-full bg-[#ff7b00] text-black text-[10px] font-black flex items-center justify-center">
{CONVERSATIONS[tab.id]?.reduce((n, c) => n + (c.unread || 0), 0)}
</span>
)}
</button>
))}
</div>

<div className="flex flex-1 overflow-hidden">

{/* Conversation List */}
<aside className="w-20 md:w-80 bg-[#0e0e0e] flex flex-col border-r border-white/5 shrink-0 overflow-hidden">
<div className="hidden md:block p-4 border-b border-white/5">
<div className="relative">
<span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
<input className="w-full bg-white/5 rounded-full py-2 pl-9 pr-4 text-sm outline-none focus:bg-white/8 transition-all text-on-surface placeholder:text-on-surface-variant" placeholder={isArabic ? 'بحث...' : 'Search...'} />
</div>
</div>

{/* Ad Banner in sidebar */}
<div className="hidden md:block">
<AdBanner isArabic={isArabic} />
</div>

<div className="flex-1 overflow-y-auto">
{conversations.map(conv => (
<button key={conv.id} onClick={() => setActiveConv(conv)} className={`w-full flex items-center gap-3 p-3 md:p-4 hover:bg-white/5 transition-all text-left ${activeConv?.id === conv.id ? 'bg-[#ff7b00]/10 border-l-4 border-[#ff7b00] md:border-l-4' : 'border-l-4 border-transparent'}`}>
<div className="relative shrink-0">
{conv.avatar ? (
<img className={`w-11 h-11 rounded-full object-cover ${activeConv?.id === conv.id ? 'ring-2 ring-[#ff7b00]' : ''}`} src={conv.avatar} alt={conv.name} />
) : (
<div className="w-11 h-11 rounded-full bg-[#ff7b00]/20 flex items-center justify-center text-lg">{conv.initials}</div>
)}
{conv.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0e0e0e]"></span>}
</div>
<div className="hidden md:block flex-1 min-w-0">
<div className="flex items-center justify-between mb-0.5">
<span className="font-bold text-sm truncate">{conv.name}</span>
<span className={`text-[10px] font-bold ${conv.time === 'LIVE' || conv.time === 'Now' ? 'text-[#ff7b00]' : 'text-on-surface-variant'}`}>{conv.time}</span>
</div>
<div className="flex items-center justify-between">
<p className="text-xs text-on-surface-variant truncate">{conv.last}</p>
{conv.unread > 0 && <span className="shrink-0 w-4 h-4 rounded-full bg-[#ff7b00] text-black text-[10px] font-black flex items-center justify-center ml-1">{conv.unread}</span>}
</div>
{conv.members && <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{conv.members} {isArabic ? 'عضو' : 'members'}</p>}
</div>
</button>
))}
</div>
</aside>

{/* Chat Panel */}
<div className="flex-1 flex flex-col overflow-hidden">
{activeConv ? (
<>
{/* Chat Header */}
<div className="bg-[#111] border-b border-white/5 px-6 py-3 flex items-center gap-4 shrink-0">
<div className="flex items-center gap-3 flex-1">
{activeConv.avatar ? (
<img className="w-10 h-10 rounded-full object-cover" src={activeConv.avatar} alt={activeConv.name} />
) : (
<div className="w-10 h-10 rounded-full bg-[#ff7b00]/20 flex items-center justify-center">{activeConv.initials}</div>
)}
<div>
<p className="font-bold text-sm">{activeConv.name}</p>
<p className="text-xs text-green-500">{activeConv.online ? (isArabic ? 'متصل الآن' : 'Online') : (isArabic ? 'آخر ظهور منذ قليل' : 'Last seen recently')}</p>
</div>
</div>
<div className="flex items-center gap-3">
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">call</button>
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">videocam</button>
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">more_vert</button>
</div>
</div>

{/* Messages */}
<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
{/* Inline Ad */}
<div className="flex justify-center">
<div className="bg-[#ff7b00]/5 border border-[#ff7b00]/10 rounded-full px-4 py-1.5 text-[10px] text-[#ff7b00] font-bold flex items-center gap-2 cursor-pointer hover:bg-[#ff7b00]/10 transition-all">
<span className="material-symbols-outlined text-xs">campaign</span>
{isArabic ? 'عرض ممول: انضم لأكاديمية Gem Z المتقدمة' : 'Sponsored: Join Gem Z Advanced Academy →'}
</div>
</div>
{messages.map((msg, i) => (
<div key={i} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
<div className={`max-w-xs md:max-w-sm lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sent ? 'bg-[#ff7b00] text-black rounded-br-sm font-medium' : 'bg-surface-container-high text-on-surface rounded-bl-sm'}`}>
{msg.text}
<p className={`text-[10px] mt-1 ${msg.sent ? 'text-black/50 text-right' : 'text-on-surface-variant'}`}>{msg.time}</p>
</div>
</div>
))}
</div>

{/* Input */}
<div className="px-4 pb-4 pt-2 border-t border-white/5 shrink-0">
<div className="flex items-center gap-3 bg-surface-container-low rounded-full px-4 py-2 border border-white/5">
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">add_circle</button>
<input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 bg-transparent outline-none text-sm placeholder:text-on-surface-variant" placeholder={isArabic ? 'اكتب رسالة...' : 'Type a message...'} />
<button className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">mic</button>
<button onClick={send} disabled={!input.trim()} className="w-9 h-9 rounded-full bg-[#ff7b00] text-black flex items-center justify-center disabled:opacity-40 hover:scale-110 active:scale-95 transition-all">
<span className="material-symbols-outlined text-sm">send</span>
</button>
</div>
</div>
</>
) : (
<div className="flex-1 flex items-center justify-center flex-col gap-4 text-on-surface-variant">
<span className="material-symbols-outlined text-5xl">chat_bubble</span>
<p className="font-bold">{isArabic ? 'اختر محادثة للبدء' : 'Select a conversation'}</p>
</div>
)}
</div>
</div>

    </div>
  );
}
