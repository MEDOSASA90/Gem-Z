'use client';

import React, { useState } from 'react';
import {
    MapPin,
    Check,
    X,
    RefreshCw,
    Zap,
    Shield,
    Crown,
    Star,
    Clock,
    ChevronRight,
    Dumbbell,
    Wifi,
    Droplets,
    Car,
    Bike,
    QrCode,
    History,
    Navigation,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────

export type PassTier = 'basic' | 'premium' | 'elite';
export type PassStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment';

export interface GymPassPlan {
    id: string;
    name: string;
    description: string | null;
    tier: PassTier;
    price: number;
    priceUnit: string;
    durationDays: number;
    maxGyms: number;
    maxVisitsPerMonth: number | null;
    perks: Record<string, any> | null;
}

export interface GymPassData {
    id: string;
    planId: string;
    planName: string;
    status: PassStatus;
    gymsAccessed: string[];
    visitsUsed: number;
    visitsRemaining: number | null;
    validFrom: string;
    validUntil: string;
    autoRenew: boolean;
}

export interface GymNetworkEntry {
    gymId: string;
    gymName: string;
    branchName: string | null;
    city: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    rating: number | null;
    isActive: boolean;
    amenities: string[];
    images: string[];
    passTiers: PassTier[];
    distance?: number | null;
}

export interface PassHistoryEntry {
    visitId: string;
    gymId: string;
    gymName: string;
    visitedAt: string;
}

export interface GymPassCardProps {
    activePasses: GymPassData[];
    availablePlans: GymPassPlan[];
    gymNetwork: GymNetworkEntry[];
    passHistory: PassHistoryEntry[];
    onPurchase: (planId: string, autoRenew: boolean) => Promise<void>;
    onCancelRenew: (passId: string) => Promise<void>;
    onValidate: (gymId: string) => Promise<{ valid: boolean; message: string; visitsRemaining: number | null }>;
    onRedeem: (passId: string, gymId: string) => Promise<{ visitsRemaining: number | null; message: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────

const tierConfig: Record<PassTier, { label: string; color: string; bg: string; border: string; icon: any }> = {
    basic: {
        label: 'Basic',
        color: 'text-slate-300',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        icon: Shield,
    },
    premium: {
        label: 'Premium',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        icon: Star,
    },
    elite: {
        label: 'Elite',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        icon: Crown,
    },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Active' },
    expired: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Expired' },
    cancelled: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Cancelled' },
    pending_payment: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Pending' },
};

const amenityIcons: Record<string, any> = {
    wifi: Wifi,
    shower: Droplets,
    parking: Car,
    cycling: Bike,
    weights: Dumbbell,
};

const daysLeft = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// ─── Component ──────────────────────────────────────────────────

export default function GymPassCard({
    activePasses,
    availablePlans,
    gymNetwork,
    passHistory,
    onPurchase,
    onCancelRenew,
    onValidate,
    onRedeem,
}: GymPassCardProps) {
    const [selectedTab, setSelectedTab] = useState<'passes' | 'plans' | 'gyms'>('passes');
    const [selectedGym, setSelectedGym] = useState<string | null>(null);
    const [validatingGym, setValidatingGym] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<{
        gymId: string;
        valid: boolean;
        message: string;
        visitsRemaining: number | null;
    } | null>(null);
    const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

    const activePass = activePasses.find((p) => p.status === 'active');

    const handleValidate = async (gymId: string) => {
        setValidatingGym(gymId);
        try {
            const result = await onValidate(gymId);
            setValidationResult({ gymId, ...result });
        } catch (e) {
            setValidationResult({ gymId, valid: false, message: 'Validation failed', visitsRemaining: 0 });
        }
        setValidatingGym(null);
    };

    const handlePurchase = async (planId: string) => {
        setPurchaseLoading(planId);
        try {
            await onPurchase(planId, false);
        } catch (e) {
            /* error handled by parent */
        }
        setPurchaseLoading(null);
    };

    return (
        <div className="space-y-5">
            {/* Active Pass Hero */}
            {activePass ? (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/15 to-fuchsia-600/10 backdrop-blur-md p-5 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                                <Check className="w-3 h-3" />
                                {statusConfig.active.label}
                            </span>
                            {activePass.autoRenew && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-sky-500/10 text-sky-400">
                                    <RefreshCw className="w-3 h-3" />
                                    Auto-renew
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-white">{activePass.planName}</h3>

                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                                <span className="text-xs text-slate-400 block">Visits</span>
                                <span className="text-sm font-semibold text-white">
                                    {activePass.visitsUsed}
                                    {activePass.visitsRemaining !== null &&
                                        ` / ${activePass.visitsUsed + activePass.visitsRemaining}`}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block">Gyms</span>
                                <span className="text-sm font-semibold text-white">
                                    {activePass.gymsAccessed.length}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block">Expires</span>
                                <span className="text-sm font-semibold text-white">
                                    {daysLeft(activePass.validUntil)}d
                                </span>
                            </div>
                        </div>

                        {/* Progress */}
                        {activePass.visitsRemaining !== null && (
                            <div className="mt-4">
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${
                                                (activePass.visitsUsed /
                                                    (activePass.visitsUsed + activePass.visitsRemaining)) *
                                                100
                                            }%`,
                                        }}
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                                    />
                                </div>
                            </div>
                        )}

                        {activePass.autoRenew && (
                            <button
                                onClick={() => onCancelRenew(activePass.id)}
                                className="mt-4 text-xs text-slate-400 hover:text-red-400 transition-colors underline"
                            >
                                Cancel auto-renew
                            </button>
                        )}
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
                >
                    <Shield className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-white mb-1">No Active Pass</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Purchase a gym pass to access multiple gyms
                    </p>
                    <button
                        onClick={() => setSelectedTab('plans')}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
                    >
                        Browse Plans
                    </button>
                </motion.div>
            )}

            {/* Tabs */}
            <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                {(['passes', 'plans', 'gyms'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                            selectedTab === tab
                                ? 'bg-violet-600 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Passes Tab */}
            {selectedTab === 'passes' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                >
                    {activePasses.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">No passes yet</p>
                    ) : (
                        activePasses.map((pass) => {
                            const st = statusConfig[pass.status] || statusConfig.pending_payment;
                            return (
                                <div
                                    key={pass.id}
                                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-semibold text-white">
                                                    {pass.planName}
                                                </h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                                                    {st.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(pass.validFrom).toLocaleDateString()} -{' '}
                                                {new Date(pass.validUntil).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Recent History */}
                    {passHistory.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <History className="w-4 h-4 text-sky-400" />
                                Recent Visits
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {passHistory.slice(0, 10).map((entry) => (
                                    <div
                                        key={entry.visitId}
                                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-white">{entry.gymName}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(entry.visitedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Plans Tab */}
            {selectedTab === 'plans' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                >
                    {availablePlans.map((plan) => {
                        const tier = tierConfig[plan.tier];
                        const TierIcon = tier.icon;
                        return (
                            <div
                                key={plan.id}
                                className={`rounded-xl border ${tier.border} bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-all`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${tier.bg}`}>
                                            <TierIcon className={`w-5 h-5 ${tier.color}`} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-white">
                                                {plan.name}
                                            </h4>
                                            <span className={`text-xs ${tier.color} font-medium`}>
                                                {tier.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-white">
                                            {plan.price}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-1">
                                            {plan.priceUnit}
                                        </span>
                                    </div>
                                </div>

                                {plan.description && (
                                    <p className="text-xs text-slate-400 mt-2">{plan.description}</p>
                                )}

                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {plan.durationDays} days
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        Up to {plan.maxGyms} gyms
                                    </span>
                                    {plan.maxVisitsPerMonth && (
                                        <span className="flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            {plan.maxVisitsPerMonth} visits/mo
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePurchase(plan.id)}
                                    disabled={purchaseLoading === plan.id}
                                    className="w-full mt-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all disabled:opacity-50"
                                >
                                    {purchaseLoading === plan.id ? 'Processing...' : 'Purchase'}
                                </button>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {/* Gyms Tab */}
            {selectedTab === 'gyms' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                >
                    {gymNetwork.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">No gyms in network</p>
                    ) : (
                        gymNetwork.map((gym) => (
                            <div
                                key={gym.gymId}
                                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-white truncate">
                                            {gym.gymName}
                                        </h4>
                                        {gym.branchName && (
                                            <p className="text-xs text-slate-400">{gym.branchName}</p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {gym.city}
                                            {gym.address && ` - ${gym.address}`}
                                        </p>
                                        {gym.rating !== null && (
                                            <span className="inline-flex items-center gap-1 text-xs text-amber-400 mt-1">
                                                <Star className="w-3 h-3 fill-amber-400" />
                                                {gym.rating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedGym(gym.gymId);
                                            handleValidate(gym.gymId);
                                        }}
                                        disabled={validatingGym === gym.gymId}
                                        className="ml-3 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {validatingGym === gym.gymId ? 'Checking...' : 'Validate'}
                                    </button>
                                </div>

                                {/* Amenities */}
                                {gym.amenities.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {gym.amenities.slice(0, 5).map((amenity) => {
                                            const Icon = amenityIcons[amenity] || Zap;
                                            return (
                                                <span
                                                    key={amenity}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-slate-400"
                                                >
                                                    <Icon className="w-2.5 h-2.5" />
                                                    {amenity}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Validation Result */}
                                {validationResult?.gymId === gym.gymId && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-2 p-2.5 rounded-lg bg-white/5 border border-white/5"
                                    >
                                        <div className="flex items-center gap-2">
                                            {validationResult.valid ? (
                                                <Check className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <X className="w-4 h-4 text-red-400" />
                                            )}
                                            <span
                                                className={`text-xs font-medium ${
                                                    validationResult.valid
                                                        ? 'text-emerald-400'
                                                        : 'text-red-400'
                                                }`}
                                            >
                                                {validationResult.message}
                                            </span>
                                        </div>
                                        {validationResult.visitsRemaining !== null && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                {validationResult.visitsRemaining} visits remaining
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        ))
                    )}
                </motion.div>
            )}
        </div>
    );
}
