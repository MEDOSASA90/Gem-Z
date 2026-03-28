'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function Page() {
    const { t, isArabic } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState<any>(null);
    const [topUpModal, setTopUpModal] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpLoading, setTopUpLoading] = useState(false);
    const [topUpSuccess, setTopUpSuccess] = useState(false);

    const handleTopUp = async () => {
        if (!topUpAmount || Number(topUpAmount) <= 0) return;
        setTopUpLoading(true);
        try {
            await GemZApi.request('/finance/wallet/topup', { method: 'POST', body: JSON.stringify({ amount: Number(topUpAmount) }) });
        } catch {}
        setTopUpSuccess(true);
        setTimeout(() => { setTopUpModal(false); setTopUpSuccess(false); setTopUpAmount(''); }, 2000);
        setTopUpLoading(false);
    };

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const res = await GemZApi.Finance.getWallet();
                if (res.success) {
                    setWalletData(res);
                }
            } catch (err) {
                console.error("Failed to fetch wallet:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWallet();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center text-primary-fixed">
                <Loader2 className="animate-spin w-16 h-16 mb-4" />
                <span className="font-headline font-bold uppercase tracking-widest">{t("Secure Connection...")}</span>
            </div>
        );
    }

    const { wallet, transactions = [] } = walletData || {};
    const balance = wallet?.available_bal || 0;
    const currency = wallet?.currency || "GEMS";

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      
<header className="bg-black/60 backdrop-blur-xl docked full-width top-0 sticky z-50 no-border tonal-transition-bg shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center overflow-hidden">
<span className="material-symbols-outlined text-primary-fixed">account_balance_wallet</span>
</div>
<a href="https://gem-z.shop/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</h1></a>
</div>
<div className="flex items-center gap-4">
<button className="text-gray-400 hover:text-[#ff7b00] transition-colors scale-95 active:duration-150">
<span className="material-symbols-outlined">notifications</span>
</button>
</div>
</header>
<main className="min-h-screen pb-32 pt-6 px-6 max-w-2xl mx-auto">

<section className="mb-12 relative">
<div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-fixed/10 rounded-full blur-[100px]"></div>
<div className="flex flex-col gap-1 mb-8">
<span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{t("TOTAL BALANCE")}</span>
<div className="flex items-baseline gap-3">
<span className="text-7xl font-black italic tracking-tighter font-headline text-primary-fixed drop-shadow-[0_0_30px_rgba(255,123,0,0.4)]">
    {balance.toLocaleString()}
</span>
<span className="text-2xl font-bold font-headline text-secondary italic">{currency}</span>
</div>
<div className="flex gap-2 mt-2 items-center text-secondary-dim font-bold text-sm bg-secondary-container/10 self-start px-3 py-1 rounded-full border border-secondary/20">
<span className="material-symbols-outlined text-sm">trending_up</span>
<span>{t("Active Ledger")}</span>
</div>
</div>

<div className="grid grid-cols-2 gap-4">
<button onClick={() => setTopUpModal(true)} className="bg-primary-fixed text-on-primary-fixed font-black italic py-5 rounded-lg flex items-center justify-center gap-3 shadow-[0_0_24px_rgba(255,123,0,0.3)] hover:scale-105 active:scale-95 transition-all">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>{t("TOP UP")}</button>
<Link href="/wallet" className="glass-card border border-outline-variant/30 text-on-surface font-black italic py-5 rounded-lg flex items-center justify-center gap-3 hover:bg-surface-container-high transition-all">
<span className="material-symbols-outlined">account_balance</span>{t("WITHDRAW")}</Link>
</div>
</section>

<section className="grid grid-cols-2 gap-4 mb-12">
<div className="glass-card p-6 rounded-lg border border-outline-variant/10 flex flex-col gap-4">
<span className="material-symbols-outlined text-secondary">military_tech</span>
<div>
<div className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">{t("SQUAD RANK")}</div>
<div className="text-xl font-black font-headline">{t("ELITE IV")}</div>
</div>
</div>
<div className="glass-card p-6 rounded-lg border border-outline-variant/10 flex flex-col gap-4">
<span className="material-symbols-outlined text-primary">bolt</span>
<div>
<div className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">{t("MULTIPLIER")}</div>
<div className="text-xl font-black font-headline">{t("x1.45")}</div>
</div>
</div>
</section>

<section>
<div className="flex justify-between items-end mb-6">
<h2 className="text-2xl font-black italic font-headline tracking-tight">{t("HISTORY")}</h2>
<button className="text-primary-fixed text-xs font-bold uppercase tracking-widest">{t("View All")}</button>
</div>
<div className="flex flex-col gap-3">

{transactions.length === 0 ? (
    <div className="text-center text-on-surface-variant py-8 font-label tracking-widest uppercase">{t("No transactions yet.")}</div>
) : (
    transactions.map((txn: any) => (
        <div key={txn.id} className="group bg-surface-container-low p-5 rounded-lg flex items-center justify-between hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center ${txn.amount > 0 ? 'text-primary' : 'text-error'}`}>
                    <span className="material-symbols-outlined">{txn.amount > 0 ? 'arrow_downward' : 'arrow_upward'}</span>
                </div>
                <div>
                    <div className="font-bold text-on-surface capitalize">{txn.type?.replace('_', ' ') || t("System Transfer")}</div>
                    <div className="text-xs text-on-surface-variant">{new Date(txn.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                </div>
            </div>
            <div className="text-right">
                <div className={`font-black ${txn.amount > 0 ? 'text-primary-fixed' : 'text-error-dim'}`}>
                    {txn.amount > 0 ? '+' : ''}{Number(txn.amount).toLocaleString()}
                </div>
                <div className="text-[10px] text-on-surface-variant uppercase font-bold">{txn.status}</div>
            </div>
        </div>
    ))
)}

</div>
</section>
</main>

<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 no-border glassmorphism-surface shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
<span className="material-symbols-outlined">psychology</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Coach")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/shop">
<span className="material-symbols-outlined">shopping_bag</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Shop")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
<span className="material-symbols-outlined">dynamic_feed</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Feed")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform" href="/wallet">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Wallet")}</span>
</Link>
<Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/squads">
<span className="material-symbols-outlined">groups</span>
<span className="font-label text-[10px] uppercase tracking-widest font-bold">{t("Squads")}</span>
</Link>
</nav>
<Link href="/squads" className="fixed bottom-28 right-6 w-16 h-16 rounded-full bg-black/80 backdrop-blur-xl border border-primary-fixed/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,123,0,0.6)] hover:shadow-[0_0_45px_rgba(255,123,0,0.8)] hover:scale-110 active:scale-95 transition-all z-[60] group">
<span className="material-symbols-outlined text-primary-fixed text-3xl group-hover:rotate-90 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 0" }}>add</span>
</Link>
{/* Top-Up Modal */}
{topUpModal && (
<div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setTopUpModal(false)}>
<div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl p-8 shadow-[0_-20px_60px_rgba(255,123,0,0.2)]" onClick={e => e.stopPropagation()}>
<div className="flex items-center justify-between mb-6">
<h2 className="text-2xl font-black font-headline text-[#ff7b00] italic">{isArabic ? 'شحن الرصيد' : 'TOP UP'}</h2>
<button onClick={() => setTopUpModal(false)} className="material-symbols-outlined text-on-surface-variant">close</button>
</div>
{topUpSuccess ? (
<div className="text-center py-8">
<span className="material-symbols-outlined text-5xl text-green-500 mb-3 block">check_circle</span>
<p className="font-bold text-green-500 text-lg">{isArabic ? 'تم الشحن بنجاح!' : 'Top-Up Successful!'}</p>
</div>
) : (
<>
<div className="mb-4">
<label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">{isArabic ? 'المبلغ (EGP)' : 'Amount (EGP)'}</label>
<input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} min="10" placeholder="100" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-2xl font-black text-white outline-none focus:border-[#ff7b00] transition-all" />
</div>
<div className="grid grid-cols-4 gap-2 mb-6">
{[50, 100, 200, 500].map(amt => (
<button key={amt} onClick={() => setTopUpAmount(String(amt))} className={`py-2 rounded-lg text-sm font-bold border transition-all ${ topUpAmount === String(amt) ? 'bg-[#ff7b00]/20 border-[#ff7b00] text-[#ff7b00]' : 'border-white/10 text-on-surface-variant hover:border-white/30' }`}>{amt}</button>
))}
</div>
<button onClick={handleTopUp} disabled={topUpLoading || !topUpAmount} className="w-full py-4 rounded-xl bg-[#ff7b00] text-black font-black text-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
{topUpLoading ? <Loader2 className="animate-spin" /> : <span className="material-symbols-outlined">payments</span>}
{isArabic ? 'تأكيد الشحن' : 'Confirm Top-Up'}
</button>
</>
)}
</div>
</div>
)}

    </div>
  );
}
