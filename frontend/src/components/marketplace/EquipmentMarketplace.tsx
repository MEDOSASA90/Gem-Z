'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiCard, ApiButton, EmptyState, SpinnerOverlay } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface MarketplaceListing {
    id: string;
    sellerName: string | null;
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
    originalPrice: number | null;
    images: string[];
    location: string | null;
    brand: string | null;
    model: string | null;
    quantity: number;
    negotiable: boolean;
    shippingAvailable: boolean;
    shippingCost: number | null;
    viewCount: number;
    status: string;
    createdAt: string;
}

interface MarketplaceOrder {
    id: string;
    listingTitle: string;
    quantity: number;
    totalAmount: number;
    status: string;
    createdAt: string;
}

// ─── EquipmentMarketplace Component ─────────────────────────────

export default function EquipmentMarketplace() {
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
    const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'browse' | 'sell' | 'orders'>('browse');
    const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filters
    const [category, setCategory] = useState<string>('all');
    const [condition, setCondition] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');
    const [search, setSearch] = useState('');

    // Sell form
    const [sellTitle, setSellTitle] = useState('');
    const [sellDesc, setSellDesc] = useState('');
    const [sellCategory, setSellCategory] = useState('weights');
    const [sellCondition, setSellCondition] = useState('new');
    const [sellPrice, setSellPrice] = useState('');
    const [sellOriginalPrice, setSellOriginalPrice] = useState('');
    const [sellBrand, setSellBrand] = useState('');
    const [sellLocation, setSellLocation] = useState('');
    const [sellQuantity, setSellQuantity] = useState('1');
    const [sellShipping, setSellShipping] = useState(false);
    const [sellShippingCost, setSellShippingCost] = useState('');
    const [sellImages, setSellImages] = useState('');
    const [creating, setCreating] = useState(false);

    const getToken = () => localStorage.getItem('token') || '';

    const fetchListings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (category !== 'all') params.append('category', category);
            if (condition !== 'all') params.append('condition', condition);
            if (sortBy !== 'newest') params.append('sortBy', sortBy);
            if (search) params.append('search', search);

            const [listingsRes, myRes, ordersRes] = await Promise.all([
                fetch(`/api/v1/marketplace/listings?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/v1/marketplace/my-listings', { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/v1/marketplace/orders/buyer', { headers: { Authorization: `Bearer ${getToken()}` } }),
            ]);

            const [listingsData, myData, ordersData] = await Promise.all([
                listingsRes.json(), myRes.json(), ordersRes.json(),
            ]);

            if (listingsData.success) setListings(listingsData.data || []);
            if (myData.success) setMyListings(myData.data || []);
            if (ordersData.success) setOrders(ordersData.data || []);
        } catch {
            setError('Failed to load marketplace');
        } finally {
            setLoading(false);
        }
    }, [category, condition, sortBy, search]);

    useEffect(() => { fetchListings(); }, [fetchListings]);

    const handleCreateListing = async () => {
        if (!sellTitle.trim() || !sellDesc.trim() || !sellPrice) {
            setError('Title, description, and price are required');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/marketplace/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    title: sellTitle,
                    description: sellDesc,
                    category: sellCategory,
                    condition: sellCondition,
                    price: Number(sellPrice),
                    originalPrice: sellOriginalPrice ? Number(sellOriginalPrice) : undefined,
                    brand: sellBrand || undefined,
                    location: sellLocation || undefined,
                    quantity: Number(sellQuantity) || 1,
                    shippingAvailable: sellShipping,
                    shippingCost: sellShippingCost ? Number(sellShippingCost) : undefined,
                    images: sellImages ? sellImages.split(',').map(s => s.trim()) : undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Listing created!');
                setSellTitle(''); setSellDesc(''); setSellPrice(''); setSellOriginalPrice('');
                setSellBrand(''); setSellLocation(''); setSellImages('');
                setActiveTab('browse');
                fetchListings();
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(data.message || 'Failed to create listing');
            }
        } catch {
            setError('Failed to create listing');
        } finally {
            setCreating(false);
        }
    };

    const handleBuy = async (listingId: string) => {
        setBuying(listingId);
        setError(null);
        try {
            const res = await fetch(`/api/v1/marketplace/${listingId}/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ quantity: 1 }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Order placed successfully!');
                setSelectedListing(null);
                fetchListings();
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(data.message || 'Purchase failed');
            }
        } catch {
            setError('Failed to place order');
        } finally {
            setBuying(null);
        }
    };

    const conditionLabel = (c: string) => {
        const labels: Record<string, string> = {
            new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', used: 'Used',
        };
        return labels[c] || c;
    };

    const conditionColor = (c: string) => {
        const colors: Record<string, string> = {
            new: 'bg-green-500/20 text-green-400',
            like_new: 'bg-green-500/20 text-green-400',
            good: 'bg-blue-500/20 text-blue-400',
            fair: 'bg-yellow-500/20 text-yellow-400',
            used: 'bg-orange-500/20 text-orange-400',
        };
        return colors[c] || 'bg-white/10 text-white/50';
    };

    if (loading) return <SpinnerOverlay text="Loading marketplace..." />;

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#FFD700]">storefront</span>
                        Equipment Marketplace
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Buy and sell gym equipment</p>
                </div>
                <div className="flex items-center gap-2">
                    {(['browse', 'sell', 'orders'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab ? 'bg-[#FFD700] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <span className="material-symbols-outlined text-green-400 text-2xl">check_circle</span>
                    <p className="text-green-400 font-bold">{successMessage}</p>
                </div>
            )}

            {/* ─── Browse Tab ───────────────────────────────────── */}
            {activeTab === 'browse' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search equipment..."
                            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20"
                        />
                        <select value={category} onChange={e => setCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                            <option value="all">All Categories</option>
                            <option value="weights">Weights</option>
                            <option value="machines">Machines</option>
                            <option value="accessories">Accessories</option>
                            <option value="supplements">Supplements</option>
                        </select>
                        <select value={condition} onChange={e => setCondition(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                            <option value="all">All Conditions</option>
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="used">Used</option>
                        </select>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                            <option value="newest">Newest</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="popular">Most Popular</option>
                        </select>
                    </div>

                    {/* Listings Grid */}
                    {listings.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {listings.map(listing => (
                                <div
                                    key={listing.id}
                                    className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFD700]/30 transition-all cursor-pointer group"
                                    onClick={() => setSelectedListing(selectedListing?.id === listing.id ? null : listing)}
                                >
                                    {/* Image */}
                                    <div className="relative h-40 bg-black/40 overflow-hidden">
                                        {listing.images && listing.images.length > 0 ? (
                                            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-4xl text-white/20">fitness_center</span>
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${conditionColor(listing.condition)}`}>
                                                {conditionLabel(listing.condition)}
                                            </span>
                                        </div>
                                        {listing.negotiable && (
                                            <div className="absolute top-2 right-2 bg-[#FFD700]/80 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                Negotiable
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 space-y-2">
                                        <h3 className="text-white font-bold text-sm truncate">{listing.title}</h3>
                                        {listing.brand && <p className="text-white/30 text-xs">{listing.brand} {listing.model}</p>}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[#FFD700] font-bold text-lg">EGP {Number(listing.price).toLocaleString()}</span>
                                            {listing.originalPrice && (
                                                <span className="text-white/30 text-xs line-through">EGP {Number(listing.originalPrice).toLocaleString()}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/30 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">location_on</span>
                                                {listing.location || 'Egypt'}
                                            </span>
                                            <span className="text-white/30 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">visibility</span>
                                                {listing.viewCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon="storefront" title="No listings found" subtitle="Try different filters or be the first to list!" />
                    )}
                </div>
            )}

            {/* ─── Detail Modal (inline) ────────────────────────── */}
            {selectedListing && (
                <ApiCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">{selectedListing.title}</h3>
                        <button onClick={() => setSelectedListing(null)} className="text-white/50 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            {selectedListing.images && selectedListing.images.length > 0 ? (
                                <img src={selectedListing.images[0]} alt={selectedListing.title} className="w-full rounded-xl" />
                            ) : (
                                <div className="w-full h-64 bg-white/5 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-white/20">fitness_center</span>
                                </div>
                            )}
                            {selectedListing.images && selectedListing.images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto">
                                    {selectedListing.images.slice(1).map((img, i) => (
                                        <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conditionColor(selectedListing.condition)}`}>
                                    {conditionLabel(selectedListing.condition)}
                                </span>
                                <span className="text-xs bg-white/10 text-white/50 ml-2 px-2 py-0.5 rounded-full capitalize">
                                    {selectedListing.category}
                                </span>
                            </div>
                            <p className="text-white/60 text-sm">{selectedListing.description}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[#FFD700] font-bold text-3xl">EGP {Number(selectedListing.price).toLocaleString()}</span>
                                {selectedListing.originalPrice && (
                                    <span className="text-white/30 text-sm line-through">EGP {Number(selectedListing.originalPrice).toLocaleString()}</span>
                                )}
                            </div>
                            <div className="space-y-1 text-sm">
                                {selectedListing.brand && <p className="text-white/50">Brand: <span className="text-white">{selectedListing.brand}</span></p>}
                                {selectedListing.model && <p className="text-white/50">Model: <span className="text-white">{selectedListing.model}</span></p>}
                                <p className="text-white/50">Quantity: <span className="text-white">{selectedListing.quantity} available</span></p>
                                <p className="text-white/50">Location: <span className="text-white">{selectedListing.location || 'Egypt'}</span></p>
                                {selectedListing.shippingAvailable && (
                                    <p className="text-white/50">Shipping: <span className="text-green-400">Available {selectedListing.shippingCost ? `(+EGP ${Number(selectedListing.shippingCost).toLocaleString()})` : '(Free)'}</span></p>
                                )}
                            </div>
                            <ApiButton
                                loading={buying === selectedListing.id}
                                onClick={() => handleBuy(selectedListing.id)}
                                disabled={selectedListing.quantity <= 0}
                                className="w-full"
                            >
                                {selectedListing.quantity <= 0 ? 'Sold Out' : 'Buy Now'}
                            </ApiButton>
                        </div>
                    </div>
                </ApiCard>
            )}

            {/* ─── Sell Tab ─────────────────────────────────────── */}
            {activeTab === 'sell' && (
                <div className="space-y-6">
                    {/* My Listings */}
                    {myListings.length > 0 && (
                        <ApiCard>
                            <h3 className="text-lg font-bold text-white mb-4">My Listings</h3>
                            <div className="space-y-2">
                                {myListings.map(l => (
                                    <div key={l.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            {l.images && l.images.length > 0 ? (
                                                <img src={l.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white/20">fitness_center</span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-white font-bold text-sm">{l.title}</p>
                                                <p className="text-[#FFD700] text-xs">EGP {Number(l.price).toLocaleString()} &bull; {l.quantity} left</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            l.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                            l.status === 'sold' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {l.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ApiCard>
                    )}

                    {/* Create Form */}
                    <ApiCard>
                        <h3 className="text-lg font-bold text-white mb-4">Create New Listing</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-white/50 text-sm block mb-1">Title *</label>
                                <input value={sellTitle} onChange={e => setSellTitle(e.target.value)} placeholder="e.g. Olympic Barbell 20kg"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-white/50 text-sm block mb-1">Description *</label>
                                <textarea value={sellDesc} onChange={e => setSellDesc(e.target.value)} placeholder="Describe your item..." rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Category *</label>
                                <select value={sellCategory} onChange={e => setSellCategory(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                                    <option value="weights">Weights</option>
                                    <option value="machines">Machines</option>
                                    <option value="accessories">Accessories</option>
                                    <option value="supplements">Supplements</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Condition *</label>
                                <select value={sellCondition} onChange={e => setSellCondition(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                                    <option value="new">New</option>
                                    <option value="like_new">Like New</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                    <option value="used">Used</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Price (EGP) *</label>
                                <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="5000"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Original Price (EGP)</label>
                                <input type="number" value={sellOriginalPrice} onChange={e => setSellOriginalPrice(e.target.value)} placeholder="8000"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Brand</label>
                                <input value={sellBrand} onChange={e => setSellBrand(e.target.value)} placeholder="Rogue, Eleiko..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Location</label>
                                <input value={sellLocation} onChange={e => setSellLocation(e.target.value)} placeholder="Cairo, Alexandria..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Quantity</label>
                                <input type="number" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Shipping Available</label>
                                <select value={sellShipping ? 'yes' : 'no'} onChange={e => setSellShipping(e.target.value === 'yes')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
                            </div>
                            {sellShipping && (
                                <div>
                                    <label className="text-white/50 text-sm block mb-1">Shipping Cost (EGP)</label>
                                    <input type="number" value={sellShippingCost} onChange={e => setSellShippingCost(e.target.value)} placeholder="0 = free"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                                </div>
                            )}
                            <div className="sm:col-span-2">
                                <label className="text-white/50 text-sm block mb-1">Image URLs (comma separated)</label>
                                <input value={sellImages} onChange={e => setSellImages(e.target.value)} placeholder="https://..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20" />
                            </div>
                            <div className="sm:col-span-2">
                                <ApiButton loading={creating} onClick={handleCreateListing} className="w-full">
                                    Create Listing
                                </ApiButton>
                            </div>
                        </div>
                    </ApiCard>
                </div>
            )}

            {/* ─── Orders Tab ───────────────────────────────────── */}
            {activeTab === 'orders' && (
                <ApiCard>
                    <h3 className="text-lg font-bold text-white mb-4">My Orders</h3>
                    {orders.length > 0 ? (
                        <div className="space-y-2">
                            {orders.map(order => (
                                <div key={order.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[#FFD700]">shopping_bag</span>
                                        <div>
                                            <p className="text-white font-bold text-sm">{order.listingTitle}</p>
                                            <p className="text-white/30 text-xs">{new Date(order.createdAt).toLocaleDateString()} &bull; Qty: {order.quantity}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#FFD700] font-bold text-sm">EGP {Number(order.totalAmount).toLocaleString()}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon="shopping_bag" title="No orders yet" subtitle="Start browsing and make your first purchase!" />
                    )}
                </ApiCard>
            )}
        </div>
    );
}
