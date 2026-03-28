'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

const MUSCLES = [
  { id: 'all', label: 'All Muscles', labelAr: 'كل العضلات', icon: 'fitness_center' },
  { id: 'chest', label: 'Chest', labelAr: 'صدر', icon: 'favorite' },
  { id: 'back', label: 'Back', labelAr: 'ظهر', icon: 'accessibility_new' },
  { id: 'legs', label: 'Legs', labelAr: 'أرجل', icon: 'directions_run' },
  { id: 'shoulders', label: 'Shoulders', labelAr: 'أكتاف', icon: 'sports_martial_arts' },
  { id: 'arms', label: 'Arms', labelAr: 'ذراعين', icon: 'pan_tool' },
  { id: 'core', label: 'Core', labelAr: 'وسط', icon: 'radio_button_checked' },
  { id: 'full', label: 'Full Body', labelAr: 'جسم كامل', icon: 'self_improvement' },
];

const EXERCISES = [
  { id: 1, name: 'BARBELL SQUAT', muscle: 'legs', equipment: 'Barbell', intensity: 'Elite', gems: 420, videoId: 'aclHkVaku9U', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFgMpRUByMUAA5_l5KVJYH51Vn_WBYuEFQ2UcOZVa_wsXdggsQlp-yI6THQ9quq8XPlcQhOP4JPruKcOEZNnc7Q3Ig7PunxeqQfBabFKyfF-22BSBUiGDojLEMNFAoGGamD_Rd89zlrOHlIv0Ij2KwlAbnFQKbgbWaiiXhTJBbQfnQLa85_RPifTw5ViCvp9OGI3ChquYjKcykLzBbE3cjcUtJJudIhXdpsMbKn-a2hRdjsvv7nDdLaf2niB5Jz10V7QO2VY7yz3Dy' },
  { id: 2, name: 'DUMBBELL PRESS', muscle: 'chest', equipment: 'Dumbbell', intensity: 'Intermediate', gems: 350, videoId: 'VmB1G1K7v94', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATID42co1w5GuFh0piN6orSAuKqMuY57vdWXKMeOsNVnsvEED4Ld4powUuZ9AcLilSsO_Zj7hLEnpQmP72iY1u1h_q84LvTHjZthy9vvM76DG6Vuud7GbPCH-XszhtNmYV3L1h6FmV9D5kBB2013X29svAztxpDWII3Czn952q2WTisppfS0AcJRnNjN1ITu2qpdwTd5k8GTsnnukclFo6HJYNlrgx8SFnXePgja7sT4OLIidrT-XOmE6H' },
  { id: 3, name: 'WIDE PULL-UPS', muscle: 'back', equipment: 'Bodyweight', intensity: 'Advanced', gems: 480, videoId: 'eGo4IYlbE5g', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqx2TU1UY5-HO-8Jg3n1XszV0jZAbXkfj9E7mpsNLxWiA3ZVCbeOSt_DGNP2NDSEknQWBiy-7dlaKNgLLc-oy_ta-A53OTZ7sA8oEERRaCAdOfSdB4FhO0kmL_qXPvrFFg4ncAwzUKfQmuBxKIlmuySg_G3A6Y0GjRwb6YZMdV51wKgy5eKcd8ZerxrDZKLMF_kJW-e35rw0EcE7tRb8cXhrWsIDmH51sm7EfJTXRUVBBG3zPp1P0qAYEdOD4k-gYAjwzdBMaTMzuS' },
  { id: 4, name: 'KB SWINGS', muscle: 'full', equipment: 'Kettlebell', intensity: 'Moderate', gems: 290, videoId: 'YSxHifyI6s8', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-SU_TQDg1WEJQkVCW2Ikex2p5atQCeGsFcuUF4Iw75Zr6GNTmI0cmF0fAjVUrV3STYYA-TVJQPCIvLL_IP2inyBqjEoPb_kS1vTNnP0FuorWOky018CXIZK90nA0Ak2RFRBXI5nT2bwwug5ysiBU5KuvFxd8z7qGlm66Z0GFMYpY6Tk6ns8FSPEoO4S3lHhojoSToBfLkMQ_pBZ4L3zYJQb_sNcI-qvgrsvUddVDm2InZ1sF8zsLAHkRmDKDQx2mYupQCUiXLMkN' },
  { id: 5, name: 'LUNGES', muscle: 'legs', equipment: 'Bodyweight', intensity: 'Basic', gems: 150, videoId: 'QOVaHwm-Q6U', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD05vXSkc8sg6pmRfJAwx6D5NZRvkH30P0YjmwW0gRmUdqxCzuuY3NRqGLiucPXj2zEqOF5aDmGAwxF1xx5c-X0tHn877kowIDi76yjrjSSA8Zuu5DLgX_4-E0mLDHAlkNkRuD9kFl9wCjrw7qh8ev-h8DQW26dRv9UAwIobq19mPtEvdJZVSqBm3CshbVzwiZZN2-GEgUVwCXDpfG1Z08a05BQeZSAJbAocQS2S' },
  { id: 6, name: 'BAR DIPS', muscle: 'arms', equipment: 'Bars', intensity: 'Advanced', gems: 510, videoId: '2z8JmcrW-As', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvWqF7k_qqoQZyu-cCzUWmNi15hosjnqrrL92NArqFz3AFs7M7e_ecueDvxXqKQPr05P-ljDNwJeEvhH0c91W4NPOTfqjqR4wVS4aB8jECPCSi8OiICywbr4OrRxmKY-hEMwSWlNMWDe0JI2UCEAqXshyc7EFvvGW5v8Gyh6OCXYlw9zYxC86ZaWYdoYivo8sohaRvyxsBlga_GuDvp2ML1o_qP8GsO2frlDdzBlmIHOk00hhJLmsCkt8bdSTD_bWM4XXgrahc4dto' },
  { id: 7, name: 'OVERHEAD PRESS', muscle: 'shoulders', equipment: 'Barbell', intensity: 'Advanced', gems: 440, videoId: '_RlRDWO2jfg', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
  { id: 8, name: 'PLANK', muscle: 'core', equipment: 'Bodyweight', intensity: 'Basic', gems: 120, videoId: 'ASdvSXt5KLI', img: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400&q=80' },
];

export default function Page() {
    const { t, isArabic } = useLanguage();
    const [activeMuscle, setActiveMuscle] = useState('all');
    const [search, setSearch] = useState('');
    const [playingId, setPlayingId] = useState<number | null>(null);

    const filtered = EXERCISES.filter(e => {
        const matchMuscle = activeMuscle === 'all' || e.muscle === activeMuscle;
        const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.equipment.toLowerCase().includes(search.toLowerCase());
        return matchMuscle && matchSearch;
    });

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">

<header className="bg-black/60 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] no-border tonal-transition-bg">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/20">
<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" data-alt="Close up portrait of a focused professional athlete" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR4vwFCo22gKurzbuDQjxj5QZkzmMP0Hl4jRt3d2-RI24pBGkYNOSCcVUahJWlM05y360QQG6CRNZVGeMnGcixFWDi8LDA1UYOlQ1KBB5cEZz3bK3PjUDY94IvNlkAE3pYAH9sAS7xZUiehKgiEOvfSFhxo3fuMmQkRDtsKJgzCJnpWJRiINRpji3EymwGA6rJ8eg3LM1L8YcDRRr8vuxhJV7uyKmYxt0mEeA6RG-UAqGsxeZuw_eeqSUWvgNj_qhQCuNW9GZtKtXW"/></a>
</div>
<a href="https://gem-z.shop/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</h1></a>
</div>
<div className="flex items-center gap-4">
<button className="text-gray-400 hover:text-[#ff7b00] transition-colors scale-95 active:duration-150">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
<span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
</button>
</div>
</header>

<main className="pb-32 px-6 pt-8 max-w-7xl mx-auto">

<section className="mb-10">
<h2 className="text-6xl md:text-8xl font-black font-headline tracking-tighter leading-[0.9] text-white uppercase opacity-90 mb-4">{t("Elite")}<br/><span className="text-primary">{t("Catalog")}</span></h2>
<p className="text-on-surface-variant max-w-md font-body text-lg">{t("High-performance movement library optimized for biometric tracking and form analysis.")}</p>
</section>

{/* Search + Muscle Filter */}
<section className="mb-8 space-y-5">
<div className="relative">
<span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
<input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-surface-container-low border-b-2 border-outline-variant/20 focus:border-primary transition-all py-5 pl-14 pr-6 rounded-t-lg font-headline text-xl outline-none placeholder:text-outline-variant" placeholder={isArabic ? 'ابحث عن تمرين...' : 'Search movements...'} type="text"/>
</div>

<div>
<p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-3">{isArabic ? 'فلتر حسب العضلة' : 'Filter by Muscle Group'}</p>
<div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
{MUSCLES.map(m => (
<button key={m.id} onClick={() => setActiveMuscle(m.id)} className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
  activeMuscle === m.id
    ? 'bg-[#ff7b00] text-black shadow-[0_0_16px_rgba(255,123,0,0.4)]'
    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-white/5'
}`}>
<span className="material-symbols-outlined text-sm">{m.icon}</span>
{isArabic ? m.labelAr : m.label}
</button>
))}
</div>
</div>
<p className="text-on-surface-variant text-sm">{filtered.length} {isArabic ? 'تمرين' : 'exercises'}</p>
</section>

{/* Exercise Grid */}
<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
{filtered.length === 0 ? (
<div className="col-span-3 text-center py-16 text-on-surface-variant">
<span className="material-symbols-outlined text-5xl mb-4 block">search_off</span>
<p className="font-bold">{isArabic ? 'لا توجد تمارين بهذه المعايير' : 'No exercises match these filters'}</p>
</div>
) : (
filtered.map(ex => (
<div key={ex.id} className="group relative overflow-hidden rounded-lg bg-surface-container-low border border-white/5 hover:border-primary/40 transition-all duration-500">
<div className="aspect-[4/5] relative">
{playingId === ex.id ? (
<iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ex.videoId}?autoplay=1&controls=1`} allow="autoplay; encrypted-media" allowFullScreen title={ex.name} />
) : (
<>
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75 group-hover:brightness-100" src={ex.img} alt={ex.name} />
<div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
<button onClick={() => setPlayingId(ex.id)} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
<div className="w-16 h-16 rounded-full bg-[#ff7b00]/90 flex items-center justify-center shadow-[0_0_30px_rgba(255,123,0,0.6)] hover:scale-110 transition-all">
<span className="material-symbols-outlined text-black text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span>
</div>
</button>
<div className="absolute top-4 left-4 flex gap-2">
{(() => { const m = MUSCLES.find(x => x.id === ex.muscle); return <span className="bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-primary/30">{isArabic ? m?.labelAr : m?.label}</span>; })()}
<span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">{ex.equipment}</span>
</div>
<div className="absolute top-4 right-4">
<span className="material-symbols-outlined text-white/70 bg-black/40 rounded-full p-1">play_circle</span>
</div>
</>
)}
</div>
<div className="p-6">
<h3 className="text-2xl font-black font-headline italic tracking-tighter mb-2">{t(ex.name)}</h3>
<div className="flex justify-between items-center text-on-surface-variant text-sm font-medium">
<span>{isArabic ? 'شدة: ' : 'Intensity: '}{ex.intensity}</span>
<div className="flex items-center gap-1 text-primary">
<span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<span>{ex.gems} Gems</span>
</div>
</div>
</div>
</div>
))
)}
</section>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl z-50 rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] no-border glassmorphism-surface">
<Link href="/ai-coach" className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined" data-icon="psychology">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
</Link>
<Link href="/shop" className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
</Link>
<Link href="/social" className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform">
<span className="material-symbols-outlined" data-icon="dynamic_feed">dynamic_feed</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
</Link>
<Link href="/wallet" className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
</Link>
<Link href="/squads" className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform">
<span className="material-symbols-outlined" data-icon="groups">groups</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
</Link>
</nav>

    </div>
  );
}
