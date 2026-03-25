import React from 'react';
import { Package, Plus, TrendingDown, MoreVertical, ShoppingCart, Percent } from 'lucide-react';

export default function StoreDashboard() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-sans">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Package className="w-8 h-8 text-[var(--color-secondary)]" /> Store Inventory
                    </h1>
                    <p className="text-gray-400 mt-2">Manage products, stock, and platform orders.</p>
                </div>
                <button className="bg-[var(--color-secondary)] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#0096FF] transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(var(--color-secondary-rgb), 0.3]">
                    <Plus className="w-5 h-5" /> Add Product
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inventory List */}
                <div className="lg:col-span-2 bg-[#141414]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-lg font-semibold flex items-center gap-2">Stock Management</h3>
                        <input type="text" placeholder="Search SKU..." className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--color-secondary)] transition-colors" />
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {[
                                { name: 'Whey Protein Isolate - 2kg', price: 89.99, stock: 45, alert: false },
                                { name: 'GEM Z Signature Pre-workout', price: 34.50, stock: 12, alert: true },
                                { name: 'Lifting Belt - Pro Leather', price: 45.00, stock: 89, alert: false },
                            ].map((product, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-800 rounded-lg" />
                                        {product.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-300 font-mono">${product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-md font-mono text-xs ${product.alert ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex w-fit items-center gap-1'}`}>
                                            {product.stock} Units {product.alert && <TrendingDown className="w-3 h-3 inline ml-1" />}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-500 hover:text-white transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Orders & Commission Management */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[#141414] to-black border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-secondary)]/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />

                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-white z-10 relative">
                            <ShoppingCart className="w-5 h-5 text-[var(--color-secondary)]" /> Recent Orders
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {[1, 2, 3].map((order) => (
                                <div key={order} className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-sm text-gray-300">ORD-99{order}2A</span>
                                        <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded">Pending</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-4">
                                        <div>
                                            <p className="text-xl font-bold text-white">$124.49</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                <Percent className="w-3 h-3" /> Platform Cut: <span className="text-[var(--color-secondary)] font-mono">-$12.44</span>
                                            </p>
                                        </div>
                                        <button className="text-sm text-[var(--color-primary)] hover:underline">Fulfill</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 text-sm font-medium rounded-xl transition-colors border border-transparent hover:border-white/10">
                            View All Orders Ledger
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
