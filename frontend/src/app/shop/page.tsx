'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { GemZApi } from '../../lib/api';
import { ShoppingBag, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react';

export default function ShopPage() {
    const { isArabic } = useLanguage();
    const [products, setProducts] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkedOut, setCheckedOut] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    useEffect(() => {
        GemZApi.Store.getProducts().then(res => setProducts(res.products || [])).catch(console.error);
    }, []);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * Number(product.price) } : i);
            }
            return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1, total: Number(product.price) }];
        });
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setCheckoutLoading(true);
        try {
            await GemZApi.Store.checkout(cart);
            setCheckedOut(true);
            setCart([]);
            // Refresh products
            GemZApi.Store.getProducts().then(res => setProducts(res.products || []));
        } catch (error) {
            console.error(error);
        } finally {
            setCheckoutLoading(false);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-32" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <header className="py-12 text-center" style={{ background: 'var(--bg-card)' }}>
                <ShoppingBag size={48} className="mx-auto text-[var(--color-primary)] mb-4" />
                <h1 className="text-4xl font-black">{isArabic ? 'متجر GEM Z' : 'GEM Z Shop'}</h1>
                <p className="text-gray-400 mt-2">{isArabic ? 'أفضل المكملات والمعدات من صالاتك المفضلة' : 'Top supplements and gear from your favorite stores'}</p>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12">
                {checkedOut && (
                    <div className="mb-12 p-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10">
                        <CheckCircle2 size={32} className="text-[var(--color-primary)]" />
                        <h2 className="text-2xl font-bold text-[var(--color-primary)]">{isArabic ? 'تمت عملية الدفع بنجاح!' : 'Checkout Complete!'}</h2>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(p => (
                        <div key={p.id} onClick={() => setSelectedProduct(p)} className="p-5 rounded-3xl glass-panel hover:scale-105 transition-transform cursor-pointer relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            {Number(p.discount) > 0 && (
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                                    -{p.discount}%
                                </div>
                            )}
                            <div className="w-full h-40 rounded-2xl mb-4 flex items-center justify-center overflow-hidden bg-black/5 dark:bg-black/40">
                                {p.images && p.images.length > 0 ? (
                                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'صورة المنتج' : 'Product Image'}</span>
                                )}
                            </div>
                            <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                            <p className="text-xs text-[var(--color-secondary)] mb-3">{p.store_name || 'STORE'}</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="font-black text-xl text-[var(--color-primary)]">
                                        {(Number(p.price) * (1 - Number(p.discount || 0) / 100)).toFixed(2)} EGP
                                    </span>
                                    {Number(p.discount) > 0 && <span className="text-xs line-through ml-2" style={{ color: 'var(--text-muted)' }}>{Number(p.price).toFixed(2)}</span>}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="p-2 rounded-xl transition hover:scale-110" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' }}>
                                    <ShoppingCart size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Product Detail Modal */}
                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
                        <div className="rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start">
                                <h2 className="text-2xl font-black">{selectedProduct.name}</h2>
                                <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition">×</button>
                            </div>
                            
                            {selectedProduct.images && selectedProduct.images.length > 0 && (
                                <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-64 object-cover rounded-2xl" />
                            )}
                            
                            {/* Rich HTML Description */}
                            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedProduct.description }} />
                            
                            <div className="flex justify-between items-center mt-4 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                <div>
                                    <span className="font-black text-3xl text-[var(--color-primary)]">
                                        {(Number(selectedProduct.price) * (1 - Number(selectedProduct.discount || 0) / 100)).toFixed(2)} EGP
                                    </span>
                                    {Number(selectedProduct.discount) > 0 && <span className="text-sm line-through ml-2" style={{ color: 'var(--text-muted)' }}>{Number(selectedProduct.price).toFixed(2)} EGP</span>}
                                </div>
                                <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="px-8 py-3 rounded-xl font-bold text-black flex items-center gap-2 transition hover:scale-105" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                                    <ShoppingCart size={20} /> {isArabic ? 'أضف للسلة' : 'Add to Cart'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Cart */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-6 z-50 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto bg-black border border-white/10 shadow-2xl rounded-full p-4 flex items-center gap-6 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="text-[var(--color-secondary)]" />
                            <span className="font-bold">{cart.length} {isArabic ? 'منتجات' : 'Items'}</span>
                        </div>
                        <div className="font-black text-[var(--color-primary)] text-xl">
                            {cartTotal.toFixed(2)} EGP
                        </div>
                        <button disabled={checkoutLoading} onClick={handleCheckout} className="px-8 py-3 rounded-full font-bold text-black flex items-center gap-2 transition hover:scale-105" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                            {checkoutLoading ? <Loader2 className="animate-spin" /> : (isArabic ? 'إتمام الشراء' : 'Checkout')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
