'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      

<header className="bg-black/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20">
<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" className="w-full h-full object-cover" data-alt="Close up portrait of a professional athlete with focused expression, high contrast lighting, dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTjeeSrTEbqEvBqLkE9CTc0SYdo6hzwcOUtAaw4zga8L4hl63nVAQ9sJ1u9rNv-PU0RHqDofI0NLJzDMTHQN8SDtRJCjJ3xkkrGE1aLq-cGbucCp2mgK8F6O6qzFzH02afbJB47YwpZ4TQJfl6NvPNA1C7q7gKwvDS4Zt8-_iFLUMlQHrMWPuKJlwOAJoLpeObsbX5OwabKftbWwVGL2yxIhI3pBI-pbcm3D-HrlAQ1LAn1DTqMRBqVlehwCnRQtPHK740fMyLpoOJ"/></a>
</div>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline uppercase">{t("GEM Z")}</span></a>
</div>
<div className="flex items-center gap-4">
<button className="text-gray-400 hover:text-[#ff7b00] transition-colors scale-95 active:duration-150">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button className="text-gray-400 hover:text-[#ff7b00] transition-colors scale-95 active:duration-150 md:hidden">
<span className="material-symbols-outlined" data-icon="menu">{t("menu")}</span>
</button>
</div>
</header>
<main className="min-h-screen pb-32">

<section className="relative w-full h-[530px] flex flex-col justify-end p-8 overflow-hidden">
<div className="absolute inset-0 z-0">
<img className="w-full h-full object-cover" data-alt="Cinematic shot of high-end carbon fiber wireless headphones floating in a dark void with orange laser beams and smoke" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI5iJ9pTRcNzck7BEGf0AYt00iK6JhWClQoZi8bBFDUu2ViIvvCJQe-qpQywolZTkFyLMaGNx3yTTOKpLoJnOmnaITZZnN2ovZPJhofAbx5goxmmCQ8JS66rVO_hsdKwaiWWsMSl7epE8A0Tzj7MIm6ruDriSWjBolzYQnVI9lrQ5bwQ7U2GhnqWJOOVk2ZXvyi6k0ofA4Y4met7nAWBWIkNE06wJgSCauSq6DcI5wpsJmI1Wslpjom7lkVFA0Eql0F2K9WqkC2KJQ"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-transparent"></div>
</div>
<div className="relative z-10 max-w-4xl">
<div className="flex items-center gap-2 mb-4">
<span className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">{t("Live Now")}</span>
<div className="glass-panel px-3 py-1 rounded-full border border-primary/30 flex items-center gap-2">
<span className="material-symbols-outlined text-xs text-primary" data-icon="timer">{t("timer")}</span>
<span className="text-primary font-mono font-bold text-sm tracking-tighter">04:12:59</span>
</div>
</div>
<h1 className="font-headline text-5xl md:text-7xl font-black text-on-surface uppercase leading-[0.9] tracking-tighter mb-4">{t("TITAN X")}<br/><span className="text-primary">{t("PRO BUDS")}</span>
</h1>
<p className="text-on-surface-variant text-lg max-w-md mb-8">{t("Ultimate sensory isolation. 48-hour battery. Liquid metal finish.")}</p>
<div className="flex items-center gap-6">
<button className="kinetic-gradient text-on-primary-fixed px-10 py-4 rounded-xl font-black uppercase tracking-tighter text-xl neon-glow-primary hover:scale-105 transition-transform flex items-center gap-3">{t("Buy Now")}<span className="material-symbols-outlined" data-icon="bolt" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
</button>
<div className="flex flex-col">
<span className="text-on-surface-variant line-through text-sm">499 GEMS</span>
<span className="text-on-surface text-3xl font-black tracking-tighter">249 GEMS</span>
</div>
</div>
</div>
</section>

<section className="px-6 py-12">
<div className="flex justify-between items-end mb-10">
<div>
<h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">{t("Flash Deals")}</h2>
<p className="text-on-surface-variant text-sm">{t("Exclusive drops. Limited quantities. High speed only.")}</p>
</div>
<div className="hidden md:flex gap-2">
<button className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined" data-icon="arrow_back">{t("arrow_back")}</span>
</button>
<button className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined" data-icon="arrow_forward">{t("arrow_forward")}</span>
</button>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<div className="group relative bg-surface-container rounded-lg overflow-hidden transition-all duration-300 hover:translate-y-[-8px]">
<div className="h-64 relative overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="Sleek neon red running shoes on a pitch black background with sharp dramatic rim lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjhJcDfrzLkX_W03h2BdxzrAyiuUVo2VN1599I4PNXZLVvqmaLFLgK82_wvdwOetLUDWA_4y0ewL7O7qEJxPpygiuUA1_w85SoJfAq4QAZltUisL1FXVRhnmF77b0Ja5zM7nD0wAaU8UMrQ__syH_RAVqBuQVgUzf5i5wHoixG0umYXIHlp_7fAqOxAR00uKjmCkYu5ko4HL-KWlzvIu3Lgj4Uib_Fgwdzi86sPXYd3etqOmCJ63HuTDWS7eNWJ4TAzBp3SxRl7XHF"/>
<div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase">
                            -40% OFF
                        </div>
</div>
<div className="p-6">
<div className="flex justify-between items-start mb-2">
<h3 className="font-headline font-bold text-xl uppercase tracking-tighter">{t("Velocity Pro-1")}</h3>
<div className="flex flex-col items-end">
<span className="text-primary font-black text-xl italic">120 GEMS</span>
</div>
</div>
<div className="w-full bg-surface-container-high h-1.5 rounded-full mb-6 overflow-hidden">
<div className="bg-primary h-full w-3/4 shadow-[0_0_8px_#ff7b00]"></div>
</div>
<div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6">
<span>{t("Only 12 left")}</span>
<span className="text-primary">{t("Ends in 02h : 15m")}</span>
</div>
<button className="w-full bg-surface-container-highest border border-outline-variant/30 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-on-primary-fixed transition-all">{t("Add to Cart")}</button>
</div>
</div>

<div className="group relative bg-surface-container rounded-lg overflow-hidden transition-all duration-300 hover:translate-y-[-8px]">
<div className="h-64 relative overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="Luxury minimalist smart watch with black leather strap on a dark textured surface with subtle amber reflections" src="https://lh3.googleusercontent.com/aida-public/AB6AXuABS5h25oay9wX0pdxien2-3mJnzBfBAxumc15zzeMrXDY5u6XfO4bgeN0BcaEMhjEwyU4tTMjei-W394BPHgX_VCXsljaadfiEYVxMvIcAF15I8hqqjY7Lpgpoopylhlm3LA28ONbLYmvscIUFbreqq17-9Xs_piWunq9YA2-UaKQC0xgQwnba3nJtBqcIURFq9_g28nrIVxjc3WvqrQFVlgDHZlw3oxBd85la-cx7Sh011iZ0dfypEUqFDhyjRahVsVQWizpVsO0f"/>
<div className="absolute top-4 right-4 glass-panel px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase font-arabic" dir="rtl">
                            خصم ٦٠٪
                        </div>
</div>
<div className="p-6" dir="rtl">
<div className="flex justify-between items-start mb-2">
<h3 className="font-arabic font-bold text-xl tracking-tight">ساعة زينيث الذكية</h3>
<div className="flex flex-col items-start">
<span className="text-primary font-black text-xl italic">٨٥ جوهرة</span>
</div>
</div>
<div className="w-full bg-surface-container-high h-1.5 rounded-full mb-6 overflow-hidden">
<div className="bg-primary h-full w-1/4 shadow-[0_0_8px_#ff7b00]"></div>
</div>
<div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6 font-arabic">
<span>بقي ٤ فقط</span>
<span className="text-primary">ينتهي في: ٠٠:٤٥:١٢</span>
</div>
<button className="w-full bg-surface-container-highest border border-outline-variant/30 py-3 rounded-xl font-arabic font-bold uppercase tracking-widest text-sm hover:bg-primary hover:text-on-primary-fixed transition-all">
                            شراء الآن
                        </button>
</div>
</div>

<div className="group relative bg-surface-container rounded-lg overflow-hidden transition-all duration-300 hover:translate-y-[-8px]">
<div className="h-64 relative overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="Premium matte black metal water bottle with orange neon accents sitting on a dark volcanic rock" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxuzr9nJb3UPqY8OIxDYX7-u5GLplom8xuDk9ZKXJtoVbkiageVrffILlZWGlRPpcp7-10Ska7PVw9WO7ICtDqbn529Z3PpwlRh-6quyDYShyijJN2o-PT2_pfBjA91z6ykw3pggEsyCLq_vMv3cviBTIeVsVeMzjokJgHpXps6zTigS8-jJtEU4PfkwOQiA64gLURsIIOB3WaXE7W0rhONdRGT-uLDL4rFqZP5cMgN1mD0D9voxcLkQWC8HQeYBB6OLK9QOOjr6kv"/>
<div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase">{t("LIMITED EDITION")}</div>
</div>
<div className="p-6">
<div className="flex justify-between items-start mb-2">
<h3 className="font-headline font-bold text-xl uppercase tracking-tighter">{t("Cryo Flask 2.0")}</h3>
<div className="flex flex-col items-end">
<span className="text-primary font-black text-xl italic">45 GEMS</span>
</div>
</div>
<div className="w-full bg-surface-container-high h-1.5 rounded-full mb-6 overflow-hidden">
<div className="bg-primary h-full w-1/2 shadow-[0_0_8px_#ff7b00]"></div>
</div>
<div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6">
<span>Sold 250+</span>
<span className="text-primary">{t("Restocking in 4 days")}</span>
</div>
<button className="w-full bg-surface-container-highest border border-outline-variant/30 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-on-primary-fixed transition-all">{t("Add to Cart")}</button>
</div>
</div>
</div>
</section>

<section className="mt-8 px-6">
<h4 className="text-[10px] uppercase font-black tracking-[0.3em] text-on-surface-variant mb-6">{t("Upcoming Auctions")}</h4>
<div className="flex gap-4 overflow-x-auto no-scrollbar pb-8">
<div className="min-w-[280px] bg-surface-container-low p-6 rounded-lg border-l-4 border-primary/40">
<span className="material-symbols-outlined text-primary mb-4" data-icon="gavel">gavel</span>
<h5 className="font-headline font-bold text-lg mb-1">{t("Elite Trainer Session")}</h5>
<p className="text-on-surface-variant text-sm mb-4">{t("Starting bid: 500 Gems")}</p>
<div className="text-[10px] font-black text-primary uppercase tracking-widest">{t("Starts in 2h 45m")}</div>
</div>
<div className="min-w-[280px] bg-surface-container-low p-6 rounded-lg border-l-4 border-outline-variant/40">
<span className="material-symbols-outlined text-on-surface-variant mb-4" data-icon="military_tech">military_tech</span>
<h5 className="font-headline font-bold text-lg mb-1">{t("Legendary Badge")}</h5>
<p className="text-on-surface-variant text-sm mb-4">{t("Starting bid: 1,200 Gems")}</p>
<div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{t("Starts in 5h 20m")}</div>
</div>
<div className="min-w-[280px] bg-surface-container-low p-6 rounded-lg border-l-4 border-outline-variant/40">
<span className="material-symbols-outlined text-on-surface-variant mb-4" data-icon="restaurant">restaurant</span>
<h5 className="font-headline font-bold text-lg mb-1">{t("VIP Nutrition Plan")}</h5>
<p className="text-on-surface-variant text-sm mb-4">{t("Starting bid: 300 Gems")}</p>
<div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{t("Starts in 12h 10m")}</div>
</div>
</div>
</section>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
<span className="material-symbols-outlined" data-icon="psychology">psychology</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform" href="/shop">
<span className="material-symbols-outlined" data-icon="shopping_bag" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
<span className="material-symbols-outlined" data-icon="dynamic_feed">{t("dynamic_feed")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/wallet">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/squads">
<span className="material-symbols-outlined" data-icon="groups">{t("groups")}</span>
<span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
</Link>
</nav>

<aside className="hidden lg:flex fixed left-0 top-0 h-full w-80 bg-[#0e0e0e] rounded-r-[lg] shadow-2xl shadow-orange-900/20 flex-col p-6 z-[60]">
<div className="flex items-center gap-4 mb-10 pb-6 border-b border-outline-variant/10">
<div className="w-12 h-12 rounded-full bg-surface-container-highest overflow-hidden">
<img alt="User Avatar" className="w-full h-full object-cover" data-alt="Portrait of a female fitness athlete with professional lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAP6xi29HUsJzHwsQlENQ31m1T1EhMAt7NRONb3ukcImlPcuVG91QBPiLpw305kE1OLEdWwd9VxqwDc0A4qDG-03HEmzDRlT-z1IC8kM58d5nr2cpyP-_3Kz9V5L3-ZqvoMfaluQ2kidNOYdbNE0oYDHokhsJtsB6TNiGSP3jZ1kDWUsLsc8HXqVDQgp7bfDO9G16svYHzrwd4OsRh7tM5bzsooSN3b3zNGZ-10dbgNi-2VjswyEzGSYKDaU3aFr0ED_Bc1aUeY-q-W"/>
</div>
<div>
<div className="font-headline font-black text-[#ff7b00] text-sm uppercase">{t("Elite Athlete")}</div>
<div className="text-xs text-gray-400">Level 42 • 1,240 Gems</div>
</div>
</div>
<nav className="flex flex-col gap-2">
<Link className="flex items-center gap-4 px-4 py-3 text-gray-300 hover:bg-[#1f1f1f] rounded-xl transition-all font-headline text-lg" href="/">
<span className="material-symbols-outlined text-[#ff7b00]" data-icon="accessibility_new">{t("accessibility_new")}</span>{t("AI Form Analysis")}</Link>
<Link className="flex items-center gap-4 px-4 py-3 text-gray-300 hover:bg-[#1f1f1f] rounded-xl transition-all font-headline text-lg" href="/ai-nutritionist">
<span className="material-symbols-outlined text-[#ff7b00]" data-icon="restaurant">restaurant</span>{t("Nutritionist")}</Link>
<Link className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-[#ff7b00]/20 to-transparent text-[#ff7b00] border-l-4 border-[#ff7b00] rounded-r-xl transition-all font-headline text-lg" href="/progress">
<span className="material-symbols-outlined" data-icon="bolt" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>{t("Flash Deals")}</Link>
<Link className="flex items-center gap-4 px-4 py-3 text-gray-300 hover:bg-[#1f1f1f] rounded-xl transition-all font-headline text-lg" href="/bidding">
<span className="material-symbols-outlined text-[#ff7b00]" data-icon="gavel">gavel</span>{t("Auctions")}</Link>
<Link className="flex items-center gap-4 px-4 py-3 text-gray-300 hover:bg-[#1f1f1f] rounded-xl transition-all font-headline text-lg" href="/challenges">
<span className="material-symbols-outlined text-[#ff7b00]" data-icon="military_tech">military_tech</span>{t("Challenges")}</Link>
<div className="mt-auto">
<Link className="flex items-center gap-4 px-4 py-3 text-gray-300 hover:bg-[#1f1f1f] rounded-xl transition-all font-headline text-lg" href="/">
<span className="material-symbols-outlined text-[#ff7b00]" data-icon="settings">settings</span>{t("Settings")}</Link>
</div>
</nav>
</aside>
<Link className="fixed bottom-32 end-6 z-[60] w-16 h-16 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-primary/30 shadow-[0_0_20px_rgba(255,123,0,0.5)] group transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(255,123,0,0.7)] active:scale-95" href="/squads">
<span className="material-symbols-outlined text-primary text-3xl transition-transform group-hover:rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
</Link>
    </div>
  );
}
