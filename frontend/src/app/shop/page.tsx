'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);
    const [cartCount, setCartCount] = useState(3); // Mock cart state

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await GemZApi.Store.getProducts();
                if (res.success && res.products) {
                    setProducts(res.products);
                }
            } catch (err) {
                console.error("Failed to load products:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center text-primary-fixed">
                <Loader2 className="animate-spin w-16 h-16 mb-4" />
                <span className="font-headline font-bold uppercase tracking-widest">{t("Loading Arsenal...")}</span>
            </div>
        );
    }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body pb-32">
      
<header className="bg-black/60 backdrop-blur-xl text-[#ff7b00] font-headline font-bold tracking-tight docked full-width top-0 sticky z-50 no-border tonal-transition-bg shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/20">
<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img alt="User Profile" className="w-full h-full object-cover" data-alt="close-up portrait of a professional athlete with intense focus, dramatic low-key lighting against a dark studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyX59C94BGaUXy6YNgSL6_IufhunaqnsvzbEHV93oUgdRWlgThVQGvHBH6v5MLtZuCxk2SVZA8OW-inPPaRjqRsT72d4py37GenzbRJ-6ccq5z8dTYYQO__6-Qr9OaTn-wUYjIYu180pNLmToXBFrjUNnF8jqxl7__UBxGfWoYeviMv20sI3JXVznEvfEXBjUQALHyHobwnZWwKZfqxRz3AgPXlu371zTbHC1oI8O2JR1nettI1-0T2Gba4L716O4ZejyoQPccM5IC"/></a>
</div>
<a href="https://gem-z.shop/"><span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter uppercase">{t("GEM Z")}</span></a>
</div>
<div className="flex items-center gap-4">
<button className="material-symbols-outlined text-[#ff7b00] hover:text-[#ff7b00] transition-colors scale-95 active:duration-150">notifications</button>
</div>
</header>
<main className="px-6 pt-8">

<div className="mb-12">
<h1 className="font-headline text-5xl md:text-7xl font-black text-on-surface leading-none tracking-tighter mb-4">{t("ELITE")}<br/><span className="text-primary-fixed">{t("EQUIPMENT")}</span>
</h1>
<p className="max-w-md text-on-surface-variant/70 text-lg">{t("Fuel your performance with the latest gear. Exclusive drops available only for high-tier athletes.")}</p>
</div>

<div className="flex gap-4 overflow-x-auto pb-8 no-scrollbar">
<button className="whitespace-nowrap px-6 py-2 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-sm uppercase tracking-widest neon-glow">{t("All Gear")}</button>
<button className="whitespace-nowrap px-6 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-bold text-sm uppercase tracking-widest">{t("Wearables")}</button>
<Link href="/ai-nutritionist" className="whitespace-nowrap px-6 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-bold text-sm uppercase tracking-widest">{t("Nutrition")}</Link>
<button className="whitespace-nowrap px-6 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-bold text-sm uppercase tracking-widest">{t("Digital")}</button>
<button className="whitespace-nowrap px-6 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-bold text-sm uppercase tracking-widest">{t("Footwear")}</button>
</div>

{products.length === 0 ? (
    <div className="flex flex-col items-center justify-center p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">inventory_2</span>
        <p className="text-on-surface-variant font-bold text-lg">{t("No gear available in the armory yet.")}</p>
    </div>
) : (
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    
    {products.map((product, index) => (
        <div key={product.id || index} className={`${index === 0 ? 'md:col-span-2 flex-col md:flex-row' : 'flex-col'} glass-card rounded-lg overflow-hidden flex border border-outline-variant/10 p-6`}>
            {index === 0 && (
                <div className="md:w-3/5 h-64 md:h-auto overflow-hidden -m-6 mr-6 mb-6 md:mb-0 relative">
                    <img alt={product.name} className="absolute inset-0 w-full h-full object-cover" src={product.images?.[0] || "https://lh3.googleusercontent.com/aida-public/AB6AXuA-vEa3FYH6WrE5ofM_g4k0hBhk7nmWSzhP1LSYFDYLa0mlB_REw5yKGNcqafK3fARnYPNFOadz9gOMBZsKYkaXR4cHVsjf--Iol86p4dIL3tmE0e88RGTd4-JMqZrC8b9fDZLJARfUQ3kBRqt6AN55PI7wZf5zD62IvYerVuluZDsJ8R0kbzJDM7svUioXw4kbJWpSqXgThx6KDAJsx7BrODtGFWpfLhyedEzDYyM2eRHDdpT0L1aw2IQdATGmzSPj-EEr6QNK6ruV"}/>
                </div>
            )}
            {index !== 0 && (
                <div className="h-48 rounded-lg overflow-hidden mb-6 relative">
                    <img alt={product.name} className="absolute inset-0 w-full h-full object-cover" src={product.images?.[0] || "https://lh3.googleusercontent.com/aida-public/AB6AXuAxgJ3Oz_oMEq3rjFiwOIl2UwP7SD2azHZqwLCfe7SYAPq_V5xhtd-gPHc_H9tWG9gAzJy1LHrqilzl8hTTifuNBXdaM0MmWTAfBkYTa1Fa_mYArfHvrSUqvKn4PDf-y6ydrKhPt0xIBjbjdLqJxxislb8gsbgH6PkXGkC-ODANrR_5fjKqSc4SwSRbyq9yW2lKWmywQ8NFYMU7vKaVd8v060YxFUuhk5dw4plUU1_ziMC8-i0d1fgs1HliokJLbWemVWUxp8WewTzj"}/>
                </div>
            )}
            
            <div className={index === 0 ? "flex flex-col justify-between md:w-2/5" : "flex flex-col justify-between flex-1"}>
                <div>
                    {index === 0 && <span className="text-primary-fixed font-bold text-xs uppercase tracking-[0.3em] mb-2 block">{t("Premium Drop")}</span>}
                    <h3 className={`font-headline font-bold text-on-surface ${index === 0 ? 'text-3xl mb-2' : 'text-xl mb-1'}`}>{product.name}</h3>
                    <p className={`text-on-surface-variant ${index === 0 ? 'text-sm mb-6' : 'text-xs mb-4 uppercase tracking-widest opacity-70'}`}>
                        {index === 0 ? product.description : product.category}
                    </p>
                </div>
                
                <div className={index === 0 ? "flex flex-col gap-4" : "mt-auto pt-4 flex justify-between items-center"}>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                        <span className={`${index === 0 ? 'text-2xl tracking-tighter' : ''} font-black text-on-surface`}>
                            {product.price} {index === 0 && <span className="text-xs text-on-surface-variant font-normal uppercase tracking-widest">{t("Gems")}</span>}
                        </span>
                    </div>
                    {index === 0 ? (
                        <button onClick={() => setCartCount(c => c+1)} className="w-full py-4 rounded-xl bg-primary-fixed text-on-primary-fixed font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all neon-glow">{t("Add to Cart")}</button>
                    ) : (
                        <button onClick={() => setCartCount(c => c+1)} className="p-3 rounded-full bg-surface-container-highest text-primary-fixed border border-primary-fixed/30 hover:bg-primary-fixed hover:text-on-primary-fixed transition-all active:scale-90">
                            <span className="material-symbols-outlined">shopping_cart</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    ))}

</div>
)}
</main>

<nav className="bg-[#1f1f1f]/70 backdrop-blur-2xl fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 rounded-t-[2rem] z-50 no-border glassmorphism-surface shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
<span className="material-symbols-outlined">psychology</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform" href="/shop">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
<span className="material-symbols-outlined">dynamic_feed</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/wallet">
<span className="material-symbols-outlined">account_balance_wallet</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/squads">
<span className="material-symbols-outlined">groups</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Squads")}</span>
</Link>
</nav>

<div className="fixed bottom-32 end-6 z-[60]">
<Link href="/shop" className="w-16 h-16 rounded-full bg-black/80 backdrop-blur-xl border border-primary-fixed/30 text-primary-fixed flex items-center justify-center shadow-[0_0_25px_rgba(255,123,0,0.5)] hover:shadow-[0_0_35px_rgba(255,123,0,0.8)] hover:scale-110 active:scale-95 transition-all duration-300 group">
<span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
{cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary-fixed text-on-primary-fixed text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black group-hover:animate-bounce">{cartCount}</span>}
</Link>
</div>
    </div>
  );
}
