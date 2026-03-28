'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { GemZApi } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

const DEMO_PRODUCTS: Record<string, any> = {
  '1': { id: '1', name: 'Pro Lifting Belt', category: 'Equipment', price: 1800, rating: 4.8, reviews: 124, stock: 15, discount: 0, description: 'Premium leather lifting belt engineered for elite powerlifters. 13mm thick double-prong buckle, contoured cut for maximum ROM. Trusted by national-level athletes across MENA.', features: ['13mm Full-Grain Leather', 'Dual-Prong Steel Buckle', 'Tapered Back Design', 'Sizes S–XXL', '2-Year Warranty'], images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'] },
  '2': { id: '2', name: 'Whey Protein 5LB', category: 'Nutrition', price: 2400, rating: 4.6, reviews: 312, stock: 8, discount: 15, description: 'Ultra-premium cold-filtered whey protein isolate. 27g protein per scoop, zero artificial fillers. Formulated for maximum recovery and lean muscle synthesis.', features: ['27g Protein / Scoop', 'Cold-Filtered Isolate', '< 1g Sugar', 'Chocolate / Vanilla / Strawberry', 'Halal Certified'], images: ['https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80'] },
  '3': { id: '3', name: 'Resistance Bands Set', category: 'Equipment', price: 450, rating: 4.9, reviews: 87, stock: 32, discount: 0, description: 'Professional-grade latex resistance bands set — 5 resistance levels (5–50 lbs). Perfect for mobility, warm-up, and hypertrophy accessory work.', features: ['5 Resistance Levels', '100% Natural Latex', 'Carry Bag Included', 'Anti-Snap Design', '600% Stretch Factor'], images: ['https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600&q=80'] },
};

export default function ProductDetailClient({ id }: { id: string }) {
  const { isArabic } = useLanguage();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

  const REVIEWS = [
    { name: 'Ahmed M.', rating: 5, text: isArabic ? 'منتج ممتاز، استخدمته في كل تمرين وفرق كبير في الأداء.' : 'Outstanding product! Been using it every session — noticeable performance boost.', date: 'Mar 2026' },
    { name: 'Sara T.', rating: 4, text: isArabic ? 'جودة عالية جداً وبسعر معقول مقارنة بالمنافسين.' : 'High quality for the price. Ships fast too.', date: 'Feb 2026' },
    { name: 'Omar K.', rating: 5, text: isArabic ? 'أنصح بيه لأي حد جاد في التمرين.' : 'Highly recommend to any serious athlete.', date: 'Jan 2026' },
  ];

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const res = await GemZApi.request(`/store/products/${id}`);
        if (res.success && res.product) { setProduct(res.product); return; }
      } catch {}
      setProduct(DEMO_PRODUCTS[id] || DEMO_PRODUCTS['1']);
      setLoading(false);
    };
    loadProduct().finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  if (loading) return <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center"><Loader2 className="animate-spin text-[#ff7b00]" size={48} /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Product not found</div>;

  const discountedPrice = product.discount ? Math.round(product.price * (1 - product.discount / 100)) : product.price;

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen font-body pb-32">

<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 sticky top-0 w-full z-50 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex items-center gap-4">
<Link href="/shop" className="text-on-surface-variant hover:text-white transition-colors"><span className="material-symbols-outlined">arrow_back</span></Link>
<h1 className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-xl uppercase">GEM Z</h1>
</div>
<Link href="/shop" className="relative">
<span className="material-symbols-outlined text-on-surface-variant hover:text-[#ff7b00] transition-colors">shopping_cart</span>
</Link>
</header>

<main className="max-w-5xl mx-auto px-6 pt-8">

{/* Image Gallery + Product Info Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
<div>
<div className="aspect-square rounded-2xl overflow-hidden bg-surface-container-low mb-4">
<img src={product.images?.[activeImg] || product.images?.[0]} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
</div>
{product.images?.length > 1 && (
<div className="flex gap-3">
{product.images.map((img: string, i: number) => (
<button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-[#ff7b00]' : 'border-white/10'}`}>
<img src={img} alt="" className="w-full h-full object-cover" />
</button>
))}
</div>
)}
</div>

<div className="space-y-6">
<div>
<span className="text-xs text-[#ff7b00] font-bold uppercase tracking-[0.2em]">{product.category}</span>
<h1 className="text-4xl font-black font-headline tracking-tight text-white mt-1">{product.name}</h1>
<div className="flex items-center gap-3 mt-3">
<div className="flex">
{[...Array(5)].map((_, i) => <span key={i} className={`material-symbols-outlined text-sm ${i < Math.round(product.rating) ? 'text-yellow-400' : 'text-white/20'}`} style={{fontVariationSettings:"'FILL' 1"}}>star</span>)}
</div>
<span className="text-sm text-on-surface-variant">{product.rating} ({product.reviews} {isArabic ? 'تقييم' : 'reviews'})</span>
</div>
</div>

<div className="flex items-baseline gap-3">
<span className="text-4xl font-black font-headline text-[#ff7b00]">{discountedPrice.toLocaleString()} EGP</span>
{product.discount > 0 && <><span className="text-xl line-through text-on-surface-variant">{product.price.toLocaleString()}</span><span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full">-{product.discount}%</span></>}
</div>

<div className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${product.stock > 10 ? 'bg-green-500/10 text-green-500' : product.stock > 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
<span className="material-symbols-outlined text-sm">{product.stock > 0 ? 'check_circle' : 'cancel'}</span>
{product.stock > 0 ? (isArabic ? `${product.stock} قطعة متاحة` : `${product.stock} in stock`) : (isArabic ? 'نفد المخزون' : 'Out of Stock')}
</div>

<div className="flex items-center gap-4">
<div className="flex items-center bg-surface-container-high rounded-full border border-white/10">
<button onClick={() => setQty(q => Math.max(1, q-1))} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all font-black text-xl">−</button>
<span className="w-10 text-center font-black">{qty}</span>
<button onClick={() => setQty(q => q+1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all font-black text-xl">+</button>
</div>
<button onClick={handleAddToCart} disabled={product.stock === 0} className={`flex-1 py-3 rounded-full font-black flex items-center justify-center gap-2 transition-all ${addedToCart ? 'bg-green-500 text-white' : 'bg-[#ff7b00] text-black hover:scale-105 active:scale-95 shadow-[0_0_24px_rgba(255,123,0,0.3)]'} disabled:opacity-50`}>
<span className="material-symbols-outlined">{addedToCart ? 'check_circle' : 'add_shopping_cart'}</span>
{addedToCart ? (isArabic ? 'أُضيف!' : 'Added!') : (isArabic ? 'أضف للسلة' : 'Add to Cart')}
</button>
</div>
</div>
</div>

{/* Tabs - Description / Reviews */}
<div className="mt-8">
<div className="flex gap-1 bg-surface-container-low p-1 rounded-full w-fit mb-8">
<button onClick={() => setActiveTab('desc')} className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'desc' ? 'bg-[#ff7b00] text-black' : 'text-on-surface-variant hover:text-white'}`}>{isArabic ? 'الوصف' : 'Description'}</button>
<button onClick={() => setActiveTab('reviews')} className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'reviews' ? 'bg-[#ff7b00] text-black' : 'text-on-surface-variant hover:text-white'}`}>{isArabic ? 'التقييمات' : 'Reviews'} ({product.reviews})</button>
</div>

{activeTab === 'desc' ? (
<div className="space-y-8 pb-8">
<p className="text-on-surface-variant leading-relaxed text-lg">{product.description}</p>
{product.features && (
<div>
<h3 className="font-black font-headline text-xl mb-4">{isArabic ? 'المواصفات' : 'Key Features'}</h3>
<ul className="space-y-3">
{product.features.map((f: string, i: number) => (
<li key={i} className="flex items-center gap-3 text-on-surface-variant">
<span className="material-symbols-outlined text-[#ff7b00] text-sm">check_circle</span> {f}
</li>
))}
</ul>
</div>
)}
</div>
) : (
<div className="space-y-6 pb-8">
{REVIEWS.map((r, i) => (
<div key={i} className="bg-surface-container-low rounded-2xl p-6">
<div className="flex items-start justify-between mb-3">
<div>
<p className="font-bold text-white">{r.name}</p>
<p className="text-xs text-on-surface-variant">{r.date}</p>
</div>
<div className="flex">
{[...Array(5)].map((_, s) => <span key={s} className={`material-symbols-outlined text-sm ${s < r.rating ? 'text-yellow-400' : 'text-white/20'}`} style={{fontVariationSettings:"'FILL' 1"}}>star</span>)}
</div>
</div>
<p className="text-on-surface-variant">{r.text}</p>
</div>
))}
</div>
)}
</div>

</main>

    </div>
  );
}
