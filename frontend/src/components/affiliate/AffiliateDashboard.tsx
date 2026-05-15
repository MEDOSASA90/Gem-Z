'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiCard, ApiButton, EmptyState, SpinnerOverlay } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface Affiliate {
    id: string;
    userId: string;
    referralCode: string;
    referralLink: string;
    commissionRateSubscription: number;
    commissionRateStore: number;
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    balance: number;
    status: string;
    payoutMethod: string | null;
    createdAt: string;
}

interface AffiliateConversion {
    id: string;
    orderId: string;
    orderType: 'subscription' | 'store';
    orderAmount: number;
    commissionEarned: number;
    status: string;
    createdAt: string;
}

interface AffiliatePayout {
    id: string;
    amount: number;
    method: string;
    status: string;
    requestedAt: string;
    processedAt: string | null;
}

interface DashboardData {
    affiliate: Affiliate;
    clicksThisMonth: number;
    conversionsThisMonth: number;
    earningsThisMonth: number;
    clicksLastMonth: number;
    conversionsLastMonth: number;
    earningsLastMonth: number;
    clickChart: { date: string; clicks: number }[];
    conversionChart: { date: string; conversions: number; earnings: number }[];
    recentConversions: AffiliateConversion[];
}

// ─── AffiliateDashboard Component ───────────────────────────────

export default function AffiliateDashboard() {
    const [isAffiliate, setIsAffiliate] = useState<boolean | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'conversions' | 'payouts'>('overview');
    const [copied, setCopied] = useState(false);

    // Withdraw form
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState<'bank_transfer' | 'instapay'>('instapay');
    const [withdrawDetails, setWithdrawDetails] = useState('');
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);

    const getToken = () => localStorage.getItem('token') || '';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Check if affiliate first
            const meRes = await fetch('/api/v1/affiliate/me', {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const meData = await meRes.json();

            if (meData.success) {
                setIsAffiliate(true);
                // Fetch dashboard
                const [dashRes, payoutsRes] = await Promise.all([
                    fetch('/api/v1/affiliate/dashboard', { headers: { Authorization: `Bearer ${getToken()}` } }),
                    fetch('/api/v1/affiliate/payouts', { headers: { Authorization: `Bearer ${getToken()}` } }),
                ]);
                const [dashData, payoutsData] = await Promise.all([
                    dashRes.json(), payoutsRes.json(),
                ]);
                if (dashData.success) setDashboard(dashData.data);
                if (payoutsData.success) setPayouts(payoutsData.data);
            } else {
                setIsAffiliate(false);
            }
        } catch {
            setError('Failed to load affiliate data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleJoin = async () => {
        setJoining(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/affiliate/join', {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Welcome to the affiliate program!');
                setIsAffiliate(true);
                fetchData();
                setTimeout(() => setSuccessMessage(null), 5000);
            } else {
                setError(data.message || 'Failed to join');
            }
        } catch {
            setError('Failed to join affiliate program');
        } finally {
            setJoining(false);
        }
    };

    const copyLink = () => {
        if (dashboard?.affiliate.referralLink) {
            navigator.clipboard.writeText(dashboard.affiliate.referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < 100) {
            setError('Minimum withdrawal amount is EGP 100');
            return;
        }
        setWithdrawing(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/affiliate/payouts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    amount: Number(withdrawAmount),
                    method: withdrawMethod,
                    details: { info: withdrawDetails },
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Withdrawal request submitted!');
                setShowWithdrawForm(false);
                setWithdrawAmount('');
                setWithdrawDetails('');
                fetchData();
                setTimeout(() => setSuccessMessage(null), 5000);
            } else {
                setError(data.message || 'Withdrawal failed');
            }
        } catch {
            setError('Failed to process withdrawal');
        } finally {
            setWithdrawing(false);
        }
    };

    // Simple bar chart
    const MiniChart = ({ data, color }: { data: number[]; color: string }) => {
        if (!data.length) return <p className="text-white/30 text-xs text-center">No data</p>;
        const max = Math.max(...data, 1);
        return (
            <div className="flex items-end gap-1 h-24">
                {data.map((v, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${(v / max) * 100}%`, background: color, minHeight: 4 }} />
                ))}
            </div>
        );
    };

    if (loading) return <SpinnerOverlay text="Loading affiliate dashboard..." />;

    // ─── Non-Affiliate State ────────────────────────────────────

    if (isAffiliate === false) {
        return (
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                <div className="text-center space-y-6 py-12">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FF6B35] flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-4xl text-black">handshake</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Affiliate Program</h1>
                    <p className="text-white/50 max-w-md mx-auto">
                        Earn 10% commission on every subscription and 5% on every store purchase made through your referral link.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#FFD700]">10%</p>
                            <p className="text-white/30 text-xs">Subscription Commission</p>
                        </div>
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#00FFA3]">5%</p>
                            <p className="text-white/30 text-xs">Store Commission</p>
                        </div>
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#00B8FF]">EGP 100</p>
                            <p className="text-white/30 text-xs">Min Payout</p>
                        </div>
                    </div>
                    <ApiButton loading={joining} onClick={handleJoin} className="mx-auto">
                        Join Affiliate Program
                    </ApiButton>
                </div>
            </div>
        );
    }

    // ─── Affiliate Dashboard ────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#FFD700]">handshake</span>
                        Affiliate Dashboard
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Track clicks, conversions, and earnings</p>
                </div>
                {dashboard && (
                    <div className="flex items-center gap-3">
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2 text-center">
                            <p className="text-[#FFD700] font-bold text-xl">EGP {Number(dashboard.affiliate.balance).toFixed(2)}</p>
                            <p className="text-white/30 text-[10px] uppercase font-bold">Available</p>
                        </div>
                        <ApiButton onClick={() => setShowWithdrawForm(!showWithdrawForm)}>
                            Withdraw
                        </ApiButton>
                    </div>
                )}
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
                    <span className="material-symbols-outlined text-green-400 text-2xl">celebration</span>
                    <p className="text-green-400 font-bold">{successMessage}</p>
                </div>
            )}

            {/* Withdraw Form */}
            {showWithdrawForm && dashboard && (
                <ApiCard>
                    <h3 className="text-lg font-bold text-white mb-4">Request Withdrawal</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Amount (EGP)</label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    placeholder={`Max EGP ${Number(dashboard.affiliate.balance).toFixed(2)}`}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Method</label>
                                <select
                                    value={withdrawMethod}
                                    onChange={e => setWithdrawMethod(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                                >
                                    <option value="instapay">InstaPay</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-white/50 text-sm block mb-1">
                                {withdrawMethod === 'instapay' ? 'Phone Number / InstaPay ID' : 'Bank Account Details'}
                            </label>
                            <input
                                type="text"
                                value={withdrawDetails}
                                onChange={e => setWithdrawDetails(e.target.value)}
                                placeholder={withdrawMethod === 'instapay' ? '01xxxxxxxxx' : 'Bank name, Account number, Branch'}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20"
                            />
                        </div>
                        <div className="flex gap-2">
                            <ApiButton loading={withdrawing} onClick={handleWithdraw}>Submit Request</ApiButton>
                            <ApiButton onClick={() => setShowWithdrawForm(false)} className="!bg-white/10 !text-white">Cancel</ApiButton>
                        </div>
                    </div>
                </ApiCard>
            )}

            {/* Referral Link */}
            {dashboard && (
                <ApiCard>
                    <h3 className="text-sm font-bold text-white/50 uppercase mb-3">Your Referral Link</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={dashboard.affiliate.referralLink}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        />
                        <button
                            onClick={copyLink}
                            className="px-4 py-2 bg-[#FFD700] text-black rounded-xl text-sm font-bold hover:bg-[#FFD700]/90 transition-all"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <p className="text-white/30 text-xs mt-2">Code: <span className="font-mono text-white/50">{dashboard.affiliate.referralCode}</span></p>
                </ApiCard>
            )}

            {/* Stats Grid */}
            {dashboard && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#00B8FF]">{dashboard.clicksThisMonth.toLocaleString()}</p>
                        <p className="text-white/30 text-xs uppercase font-bold">Clicks This Month</p>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#00FFA3]">{dashboard.conversionsThisMonth.toLocaleString()}</p>
                        <p className="text-white/30 text-xs uppercase font-bold">Conversions</p>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#FFD700]">EGP {dashboard.earningsThisMonth.toFixed(2)}</p>
                        <p className="text-white/30 text-xs uppercase font-bold">Earnings</p>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-[#FF6B35]">{dashboard.affiliate.totalClicks.toLocaleString()}</p>
                        <p className="text-white/30 text-xs uppercase font-bold">Total Clicks</p>
                    </div>
                </div>
            )}

            {/* Commission Rates */}
            {dashboard && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ApiCard>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-[#FFD700]">workspace_premium</span>
                            <div>
                                <p className="text-white font-bold">{(dashboard.affiliate.commissionRateSubscription * 100).toFixed(0)}%</p>
                                <p className="text-white/30 text-xs">Subscription Commission</p>
                            </div>
                        </div>
                    </ApiCard>
                    <ApiCard>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-[#00FFA3]">shopping_bag</span>
                            <div>
                                <p className="text-white font-bold">{(dashboard.affiliate.commissionRateStore * 100).toFixed(0)}%</p>
                                <p className="text-white/30 text-xs">Store Commission</p>
                            </div>
                        </div>
                    </ApiCard>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-0">
                {(['overview', 'conversions', 'payouts'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-all ${
                            activeTab === tab ? 'bg-[#FFD700] text-black' : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && dashboard && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ApiCard>
                        <h3 className="text-sm font-bold text-white/50 uppercase mb-3">Clicks (30 Days)</h3>
                        <MiniChart data={dashboard.clickChart.map(c => parseInt(c.clicks as any, 10) || 0)} color="#00B8FF" />
                    </ApiCard>
                    <ApiCard>
                        <h3 className="text-sm font-bold text-white/50 uppercase mb-3">Earnings (30 Days)</h3>
                        <MiniChart data={dashboard.conversionChart.map(c => parseFloat(c.earnings as any) || 0)} color="#FFD700" />
                    </ApiCard>
                    <ApiCard className="lg:col-span-2">
                        <h3 className="text-sm font-bold text-white/50 uppercase mb-3">Month Comparison</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-white/30 text-xs mb-1">This Month</p>
                                <p className="text-white font-bold">{dashboard.clicksThisMonth} clicks</p>
                                <p className="text-[#FFD700] font-bold">EGP {dashboard.earningsThisMonth.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-white/30 text-xs mb-1">Last Month</p>
                                <p className="text-white font-bold">{dashboard.clicksLastMonth} clicks</p>
                                <p className="text-[#FFD700] font-bold">EGP {dashboard.earningsLastMonth.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-white/30 text-xs mb-1">Total Earnings</p>
                                <p className="text-[#FFD700] font-bold text-xl">EGP {Number(dashboard.affiliate.totalEarnings).toFixed(2)}</p>
                            </div>
                        </div>
                    </ApiCard>
                </div>
            )}

            {/* Conversions Tab */}
            {activeTab === 'conversions' && (
                <ApiCard>
                    <h3 className="text-lg font-bold text-white mb-4">Recent Conversions</h3>
                    {dashboard && dashboard.recentConversions.length > 0 ? (
                        <div className="space-y-2">
                            {dashboard.recentConversions.map(conv => (
                                <div key={conv.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`material-symbols-outlined ${conv.orderType === 'subscription' ? 'text-purple-400' : 'text-[#00FFA3]'}`}>
                                            {conv.orderType === 'subscription' ? 'workspace_premium' : 'shopping_bag'}
                                        </span>
                                        <div>
                                            <p className="text-white text-sm font-bold capitalize">{conv.orderType} Order</p>
                                            <p className="text-white/30 text-xs">Order: {conv.orderId.slice(0, 8)}... &bull; {new Date(conv.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#FFD700] font-bold text-sm">+EGP {Number(conv.commissionEarned).toFixed(2)}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            conv.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                            conv.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                            {conv.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon="trending_up" title="No conversions yet" subtitle="Share your link to start earning!" />
                    )}
                </ApiCard>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
                <ApiCard>
                    <h3 className="text-lg font-bold text-white mb-4">Payout History</h3>
                    {payouts.length > 0 ? (
                        <div className="space-y-2">
                            {payouts.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[#FFD700]">payments</span>
                                        <div>
                                            <p className="text-white text-sm font-bold">EGP {Number(p.amount).toFixed(2)}</p>
                                            <p className="text-white/30 text-xs capitalize">{p.method.replace('_', ' ')} &bull; {new Date(p.requestedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        p.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        p.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                        p.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                        {p.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon="payments" title="No payouts yet" subtitle="Request your first withdrawal!" />
                    )}
                </ApiCard>
            )}
        </div>
    );
}
