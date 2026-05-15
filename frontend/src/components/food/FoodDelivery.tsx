'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface FoodRestaurant {
    id: string;
    name: string;
    cuisineType: string;
    rating: number;
    deliveryTimeMin: number;
    deliveryFeeEgp: number;
    minOrderEgp: number;
    imageUrl: string | null;
    isHealthy: boolean;
    tags: string[];
    address: string | null;
}

interface FoodMenuItem {
    id: string;
    name: string;
    description: string | null;
    priceEgp: number;
    category: string;
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatsG: number | null;
    isHealthy: boolean;
}

interface CartItem {
    menuItemId: string;
    name: string;
    priceEgp: number;
    quantity: number;
    calories: number | null;
}

interface FoodOrder {
    id: string;
    restaurantName: string;
    totalEgp: number;
    status: string;
    createdAt: string;
}

// ─── FoodDelivery Component ─────────────────────────────────────

export default function FoodDelivery() {
    const [view, setView] = useState<'restaurants' | 'menu' | 'cart' | 'orders'>('restaurants');
    const [restaurants, setRestaurants] = useState<FoodRestaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<FoodRestaurant | null>(null);
    const [menuItems, setMenuItems] = useState<FoodMenuItem[]>([]);
    const [menuCategories, setMenuCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<FoodOrder[]>([]);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchRestaurants = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/food/restaurants', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setRestaurants(data.data);
        } catch {
            setError('Failed to load restaurants');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/food/orders', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setOrders(data.data);
        } catch {
            /* silent */
        }
    }, [token]);

    useEffect(() => {
        fetchRestaurants();
        fetchOrders();
    }, [fetchRestaurants, fetchOrders]);

    const fetchMenu = async (restaurant: FoodRestaurant) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/food/menu/${restaurant.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSelectedRestaurant(data.data.restaurant);
                setMenuItems(data.data.menu);
                const cats = [...new Set(data.data.menu.map((m: FoodMenuItem) => m.category))];
                setMenuCategories(cats);
                setActiveCategory('all');
                setView('menu');
                setCart([]);
            }
        } catch {
            setError('Failed to load menu');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: FoodMenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id);
            if (existing) {
                return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { menuItemId: item.id, name: item.name, priceEgp: item.priceEgp, quantity: 1, calories: item.calories }];
        });
    };

    const removeFromCart = (menuItemId: string) => {
        setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
    };

    const updateQuantity = (menuItemId: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.menuItemId !== menuItemId) return c;
            const newQty = Math.max(1, c.quantity + delta);
            return { ...c, quantity: newQty };
        }));
    };

    const cartTotal = cart.reduce((sum, c) => sum + c.priceEgp * c.quantity, 0);
    const cartCalories = cart.reduce((sum, c) => sum + (c.calories || 0) * c.quantity, 0);

    const placeOrder = async () => {
        if (!selectedRestaurant || cart.length === 0) return;
        if (!deliveryAddress.trim()) {
            setError('Delivery address is required');
            return;
        }
        setPlacingOrder(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/food/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    restaurant_id: selectedRestaurant.id,
                    items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
                    delivery_address: deliveryAddress,
                    payment_method: 'cash',
                    notes: orderNotes || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setCart([]);
                setView('orders');
                fetchOrders();
            } else {
                setError(data.message || 'Failed to place order');
            }
        } catch {
            setError('Failed to place order');
        } finally {
            setPlacingOrder(false);
        }
    };

    const filteredMenu = activeCategory === 'all' ? menuItems : menuItems.filter(m => m.category === activeCategory);

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">delivery_dining</span>
                        Healthy Food Delivery
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Nutritious meals from nearby restaurants</p>
                </div>
                <div className="flex gap-2">
                    <ApiButton variant="ghost" onClick={() => setView('restaurants')} className={view === 'restaurants' ? 'border-[#ff7b00]/50' : ''}>
                        Restaurants
                    </ApiButton>
                    <ApiButton variant="ghost" onClick={() => setView('orders')} className={view === 'orders' ? 'border-[#ff7b00]/50' : ''}>
                        My Orders
                    </ApiButton>
                    {cart.length > 0 && (
                        <ApiButton variant="primary" onClick={() => setView('cart')}>
                            Cart ({cart.length})
                        </ApiButton>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

            {/* Restaurants View */}
            {view === 'restaurants' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurants.map(r => (
                        <div
                            key={r.id}
                            onClick={() => fetchMenu(r)}
                            className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-white/[0.08] hover:border-[#ff7b00]/30 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 rounded-xl bg-[#ff7b00]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#ff7b00]">restaurant</span>
                                </div>
                                {r.isHealthy && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">Healthy</span>
                                )}
                            </div>
                            <h3 className="text-white font-bold mb-1">{r.name}</h3>
                            <p className="text-white/40 text-sm mb-2">{r.cuisineType}</p>
                            <div className="flex items-center gap-3 text-xs text-white/30 mb-2">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-yellow-400 text-sm">star</span>
                                    {r.rating}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    {r.deliveryTimeMin} min
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {r.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize">{tag}</span>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs text-white/30">
                                <span>Min: {r.minOrderEgp} EGP</span>
                                <span>Delivery: {r.deliveryFeeEgp} EGP</span>
                            </div>
                        </div>
                    ))}
                    {restaurants.length === 0 && !loading && (
                        <EmptyState icon="restaurant" title="No restaurants found" />
                    )}
                </div>
            )}

            {/* Menu View */}
            {view === 'menu' && selectedRestaurant && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <ApiButton variant="ghost" onClick={() => setView('restaurants')}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </ApiButton>
                        <h2 className="text-xl font-bold text-white">{selectedRestaurant.name}</h2>
                        {cart.length > 0 && (
                            <ApiButton variant="primary" onClick={() => setView('cart')} className="ml-auto">
                                Cart ({cart.reduce((s, c) => s + c.quantity, 0)}) - {cartTotal} EGP
                            </ApiButton>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                                activeCategory === 'all' ? 'bg-[#ff7b00] text-black' : 'bg-white/5 text-white/50'
                            }`}
                        >
                            All
                        </button>
                        {menuCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                                    activeCategory === cat ? 'bg-[#ff7b00] text-black' : 'bg-white/5 text-white/50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredMenu.map(item => (
                            <div key={item.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="text-white font-bold text-sm">{item.name}</h4>
                                    {item.description && <p className="text-white/40 text-xs mt-1">{item.description}</p>}
                                    <div className="flex gap-2 mt-2 text-[10px] text-white/30">
                                        {item.calories && <span>{item.calories} kcal</span>}
                                        {item.proteinG && <span className="text-blue-400">{item.proteinG}g protein</span>}
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <p className="text-[#ff7b00] font-bold">{item.priceEgp} EGP</p>
                                    <ApiButton
                                        variant="ghost"
                                        className="mt-2 !px-3 !py-1 !text-xs"
                                        onClick={() => addToCart(item)}
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                    </ApiButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cart View */}
            {view === 'cart' && (
                <ApiCard>
                    <div className="flex items-center gap-2 mb-4">
                        <ApiButton variant="ghost" onClick={() => setView('menu')}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </ApiButton>
                        <h2 className="text-lg font-bold text-white">Your Cart</h2>
                    </div>

                    {cart.length === 0 ? (
                        <EmptyState icon="shopping_cart" title="Cart is empty" subtitle="Add items from the menu" />
                    ) : (
                        <>
                            <div className="space-y-3 mb-4">
                                {cart.map(c => (
                                    <div key={c.menuItemId} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">{c.name}</p>
                                            <p className="text-white/40 text-xs">{c.priceEgp} EGP each</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(c.menuItemId, -1)}
                                                className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                            </button>
                                            <span className="text-white font-bold text-sm w-6 text-center">{c.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(c.menuItemId, 1)}
                                                className="w-7 h-7 rounded-full bg-[#ff7b00] text-black flex items-center justify-center hover:bg-[#ff7b00]/80"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </button>
                                        </div>
                                        <div className="text-right min-w-[60px]">
                                            <p className="text-white font-bold">{(c.priceEgp * c.quantity).toFixed(0)}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(c.menuItemId)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">Subtotal</span>
                                    <span className="text-white">{cartTotal.toFixed(0)} EGP</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">Delivery</span>
                                    <span className="text-white">{selectedRestaurant?.deliveryFeeEgp || 0} EGP</span>
                                </div>
                                {cartCalories > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/50">Est. Calories</span>
                                        <span className="text-green-400">{cartCalories} kcal</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-3">
                                    <span className="text-white">Total</span>
                                    <span className="text-[#ff7b00]">{(cartTotal + (selectedRestaurant?.deliveryFeeEgp || 0)).toFixed(0)} EGP</span>
                                </div>

                                <input
                                    type="text"
                                    value={deliveryAddress}
                                    onChange={e => setDeliveryAddress(e.target.value)}
                                    placeholder="Delivery address"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                                />
                                <input
                                    type="text"
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                    placeholder="Order notes (optional)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]"
                                />
                                <ApiButton
                                    fullWidth
                                    loading={placingOrder}
                                    onClick={placeOrder}
                                    icon={<span className="material-symbols-outlined">delivery_dining</span>}
                                >
                                    Place Order
                                </ApiButton>
                            </div>
                        </>
                    )}
                </ApiCard>
            )}

            {/* Orders View */}
            {view === 'orders' && (
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-white mb-2">Order History</h2>
                    {orders.length === 0 ? (
                        <EmptyState icon="receipt_long" title="No orders yet" subtitle="Your order history will appear here" />
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-white font-bold">{order.restaurantName}</h4>
                                        <p className="text-white/40 text-xs">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#ff7b00] font-bold">{Number(order.totalEgp).toFixed(0)} EGP</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                            order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>{order.status.replace(/_/g, ' ')}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
