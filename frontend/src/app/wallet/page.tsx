'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useWallet } from '../../hooks/useWallet';
import { useToast } from '../../context/ToastContext';
import { ApiButton, SpinnerOverlay, ErrorState, EmptyState } from '../../components/ui/ApiComponents';
import { Loader2, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

// ─── Translations ────────────────────────────────────────────

const T = {
    en: {
        header: 'GEM Z',
        totalBalance: 'TOTAL BALANCE',
        activeLedger: 'Active Ledger',
        topUp: 'TOP UP',
        withdraw: 'WITHDRAW',
        squadRank: 'SQUAD RANK',
        multiplier: 'MULTIPLIER',
        history: 'HISTORY',
        viewAll: 'View All',
        noTx: 'No transactions yet.',
        systemTransfer: 'System Transfer',
        topUpTitle: 'Top Up Wallet',
        topUpAmount: 'Amount (EGP)',
        topUpConfirm: 'Confirm Top-Up',
        topUpSuccess: 'Wallet topped up!',
        topUpError: 'Top-up failed. Try again.',
        loading: 'Secure Connection...',
    },
    ar: {
        header: 'GEM Z',
        totalBalance: 'إجمالي الرصيد',
        activeLedger: 'مجاميع السجل الصافي',
        topUp: 'شحن الرصيد',
        withdraw: 'سحب مالي',
        squadRank: 'رتبة الفريق',
        multiplier: 'مضاعف الرصيد',
        history: 'سجل العمليات',
        viewAll: 'عرض الكل',
        noTx: 'لا توجد حركات مالية حتى الآن.',
        systemTransfer: 'تحويل منهجي',
        topUpTitle: 'شحن المحفظة',
        topUpAmount: 'المبلغ (ج.م)',
        topUpConfirm: 'تأكيد الشحن',
        topUpSuccess: 'تم شحن المحفظة!',
        topUpError: 'فشل الشحن. حاول مرة أخرى.',
        loading: 'تشفير الاتصال الآمن...',
    },
};

// ─── Transaction Row ─────────────────────────────────────────

function TransactionRow({ txn, t }: { txn: any; t: typeof T.en }) {
    const isCredit = Number(txn.amount) > 0;
    return (
        <div className="group bg-white/[0.03] p-4 rounded-2xl flex items-center justify-between hover:bg-white/[0.06] transition-colors border border-white/5">
            <div className="flex items-center gap-4">
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCredit
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-red-500/10 border border-red-500/30'
                    }`}
                >
                    {isCredit
                        ? <ArrowDownLeft size={16} className="text-green-400" />
                        : <ArrowUpRight size={16} className="text-red-400" />}
                </div>
                <div>
                    <div className="font-bold text-white text-sm capitalize">
                        {txn.type?.replace(/_/g, ' ') || t.systemTransfer}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                        {new Date(txn.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className={`font-black text-sm ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                    {isCredit ? '+' : ''}
                    {Number(txn.amount).toLocaleString()}
                </div>
                <div className="text-[10px] text-white/30 uppercase font-bold mt-0.5">
                    {txn.status}
                </div>
            </div>
        </div>
    );
}

// ─── Top-Up Modal ────────────────────────────────────────────

const QUICK_AMOUNTS = [50, 100, 200, 500];

function TopUpModal({
    isArabic,
    t,
    toppingUp,
    onClose,
    onConfirm,
}: {
    isArabic: boolean;
    t: typeof T.en;
    toppingUp: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
}) {
    const [amount, setAmount] = useState('');

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-[#111] border border-white/10 rounded-t-3xl md:rounded-3xl p-8 shadow-[0_-20px_60px_rgba(255,123,0,0.2)]"
                onClick={e => e.stopPropagation()}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-[#ff7b00] italic">{t.topUpTitle}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-white/40 hover:text-white transition"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">
                    {t.topUpAmount}
                </label>
                <input
                    id="topup-amount"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="10"
                    placeholder="100"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-2xl font-black text-white outline-none focus:border-[#ff7b00] transition-colors mb-4"
                />

                <div className="grid grid-cols-4 gap-2 mb-6">
                    {QUICK_AMOUNTS.map(q => (
                        <button
                            key={q}
                            onClick={() => setAmount(String(q))}
                            className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                                amount === String(q)
                                    ? 'bg-[#ff7b00]/20 border-[#ff7b00] text-[#ff7b00]'
                                    : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
                            }`}
                        >
                            {q}
                        </button>
                    ))}
                </div>

                <ApiButton
                    variant="primary"
                    fullWidth
                    loading={toppingUp}
                    disabled={!amount || Number(amount) <= 0}
                    onClick={() => onConfirm(Number(amount))}
                >
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        payments
                    </span>
                    {t.topUpConfirm}
                </ApiButton>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────

export default function WalletPage() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    const toast = useToast();

    const { wallet, transactions, squadRank, multiplier, loading, error, toppingUp, topup, refetch } = useWallet();
    const [showTopUp, setShowTopUp] = useState(false);

    const handleTopUp = async (amount: number) => {
        const result = await topup(amount);
        if (result) {
            toast.success(t.topUpSuccess);
            setShowTopUp(false);
        } else {
            toast.error(t.topUpError);
        }
    };

    // ── Loading ──
    if (loading) return <SpinnerOverlay text={t.loading} />;

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <ErrorState message={error} onRetry={refetch} />
            </div>
        );
    }

    const balance = wallet?.available_bal ?? 0;
    const currency = wallet?.currency ?? 'EGP';

    return (
        <div
            dir={isArabic ? 'rtl' : 'ltr'}
            className="bg-[#0a0a0a] text-white min-h-screen relative"
        >
            {/* Header */}
            <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 w-full bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#ff7b00] text-lg">account_balance_wallet</span>
                    </div>
                    <a href="https://gem-z.shop/">
                        <h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter">{t.header}</h1>
                    </a>
                </div>
                <button className="text-white/30 hover:text-[#ff7b00] transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
            </header>

            <main className="min-h-screen pb-32 pt-6 px-5 max-w-xl mx-auto">

                {/* ── Balance Section ── */}
                <section className="mb-10 relative">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#ff7b00]/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="flex flex-col gap-1 mb-7">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                            {t.totalBalance}
                        </span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-7xl font-black italic tracking-tighter text-[#ff7b00] drop-shadow-[0_0_30px_rgba(255,123,0,0.4)]">
                                {balance.toLocaleString()}
                            </span>
                            <span className="text-2xl font-bold text-white/40 italic">{currency}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-white/40 font-bold text-xs bg-white/5 self-start px-3 py-1.5 rounded-full border border-white/10">
                            <TrendingUp size={12} />
                            <span>{t.activeLedger}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setShowTopUp(true)}
                            className="bg-[#ff7b00] text-black font-black italic py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,123,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                            {t.topUp}
                        </button>
                        <button className="bg-white/5 border border-white/10 text-white font-black italic py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.98] transition-all">
                            <span className="material-symbols-outlined text-xl">account_balance</span>
                            {t.withdraw}
                        </button>
                    </div>
                </section>

                {/* ── Stats Cards ── */}
                <section className="grid grid-cols-2 gap-3 mb-10">
                    <div className="bg-white/[0.04] border border-white/8 p-5 rounded-2xl flex flex-col gap-3">
                        <span className="material-symbols-outlined text-[#ff7b00]">military_tech</span>
                        <div>
                            <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{t.squadRank}</div>
                            <div className="text-xl font-black font-mono">{squadRank ?? '—'}</div>
                        </div>
                    </div>
                    <div className="bg-white/[0.04] border border-white/8 p-5 rounded-2xl flex flex-col gap-3">
                        <span className="material-symbols-outlined text-yellow-400">bolt</span>
                        <div>
                            <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{t.multiplier}</div>
                            <div className="text-xl font-black font-mono">{multiplier ? `x${multiplier}` : '—'}</div>
                        </div>
                    </div>
                </section>

                {/* ── Transactions ── */}
                <section>
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-xl font-black italic tracking-tight">{t.history}</h2>
                        <button className="text-[#ff7b00] text-xs font-bold uppercase tracking-widest hover:underline">
                            {t.viewAll}
                        </button>
                    </div>

                    {transactions.length === 0 ? (
                        <EmptyState
                            icon="receipt_long"
                            title={t.noTx}
                            subtitle={isArabic ? 'ستظهر هنا معاملاتك المالية' : 'Your transactions will appear here'}
                        />
                    ) : (
                        <div className="flex flex-col gap-2">
                            {transactions.map((txn: any) => (
                                <TransactionRow key={txn.id} txn={txn} t={t} />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#111]/80 backdrop-blur-2xl rounded-t-[2rem] z-50 border-t border-white/5">
                {[
                    { href: '/ai-coach', icon: 'psychology', label: isArabic ? 'المدرب' : 'Coach' },
                    { href: '/shop', icon: 'shopping_bag', label: isArabic ? 'المتجر' : 'Shop' },
                    { href: '/social', icon: 'dynamic_feed', label: isArabic ? 'المنشورات' : 'Feed' },
                    { href: '/wallet', icon: 'account_balance_wallet', label: isArabic ? 'المحفظة' : 'Wallet', active: true },
                    { href: '/squads', icon: 'groups', label: isArabic ? 'الفرق' : 'Squads' },
                ].map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center gap-1 transition-transform hover:scale-110 ${
                            item.active ? 'text-[#ff7b00] drop-shadow-[0_0_8px_rgba(255,123,0,0.6)]' : 'text-white/30'
                        }`}
                    >
                        <span
                            className="material-symbols-outlined text-2xl"
                            style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}
                        >
                            {item.icon}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Top-Up Modal */}
            {showTopUp && (
                <TopUpModal
                    isArabic={isArabic}
                    t={t}
                    toppingUp={toppingUp}
                    onClose={() => setShowTopUp(false)}
                    onConfirm={handleTopUp}
                />
            )}
        </div>
    );
}
