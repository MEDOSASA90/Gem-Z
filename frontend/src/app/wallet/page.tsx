'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { GemZApi } from '../../lib/api';
import { Wallet, Landmark, TrendingUp, History, Loader2, ArrowUpRight, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function WalletPage() {
    const { isArabic } = useLanguage();
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [payoutLoading, setPayoutLoading] = useState(false);

    const [payoutForm, setPayoutForm] = useState({ amount: '', bankAccount: '', swiftCode: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchWallet();
    }, []);

    const fetchWallet = async () => {
        try {
            const res = await GemZApi.Finance.getWallet();
            if (res.success) {
                setWallet(res.wallet);
                setTransactions(res.transactions || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePayout = async (e: React.FormEvent) => {
        e.preventDefault();
        setPayoutLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const amount = Number(payoutForm.amount);
            if (amount < 100) throw new Error(isArabic ? 'الحد الأدنى للسحب هو 100' : 'Minimum payout is 100');
            if (amount > wallet.available_bal) throw new Error(isArabic ? 'الرصيد غير كافٍ' : 'Insufficient balance');

            const bankDetails = { account: payoutForm.bankAccount, swift: payoutForm.swiftCode };
            await GemZApi.Finance.requestPayout(amount, bankDetails);
            
            setSuccessMsg(isArabic ? 'تم إرسال طلب السحب بنجاح للمراجعة.' : 'Payout request submitted successfully for review.');
            setPayoutForm({ amount: '', bankAccount: '', swiftCode: '' });
            fetchWallet();
        } catch (err: any) {
            setError(err.message || 'Error requesting payout');
        } finally {
            setPayoutLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" size={48} /></div>;

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <header className="relative py-12 px-6 overflow-hidden flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <Wallet size={48} className="text-[var(--color-secondary)] mb-4" />
                <h1 className="text-4xl font-black mb-2">{isArabic ? 'المحفظة المالية' : 'Financial Ledger'}</h1>
                <p className="text-gray-400">{isArabic ? 'إدارة أرباحك، طلب سحب الأموال، ومتابعة سجل العمليات' : 'Manage your earnings, request payouts, and track history'}</p>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Balance Cards */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Available Balance */}
                        <div className="p-8 rounded-3xl shadow-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)' }}>
                            <div className="absolute -right-10 -top-10 text-white/10">
                                <Wallet size={160} />
                            </div>
                            <div className="relative z-10 text-black">
                                <h3 className="text-lg font-bold mb-1 opacity-80">{isArabic ? 'الرصيد المتاح للسحب' : 'Available for Payout'}</h3>
                                <div className="text-5xl font-black mb-2">{wallet?.available_bal?.toFixed(2)} <span className="text-2xl">{wallet?.currency}</span></div>
                                <p className="text-sm font-bold opacity-70 mt-4 flex items-center gap-1">
                                    <TrendingUp size={16} /> {isArabic ? 'جاهز للتحويل البنكي' : 'Ready for wire transfer'}
                                </p>
                            </div>
                        </div>

                        {/* Lifetime Earnings */}
                        <div className="p-8 rounded-3xl shadow-xl glass-panel relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            <h3 className="text-gray-400 font-bold mb-2">{isArabic ? 'إجمالي الأرباح التاريخية' : 'Lifetime Earnings'}</h3>
                            <div className="text-3xl font-black text-white mb-6">{wallet?.lifetime_earned?.toFixed(2)} {wallet?.currency}</div>
                            
                            <h3 className="text-gray-400 font-bold mb-2 pt-4 border-t border-white/10">{isArabic ? 'إجمالي السحوبات السابقة' : 'Total Payouts Triggered'}</h3>
                            <div className="text-3xl font-black text-[var(--color-purple)]">{wallet?.total_payouts?.toFixed(2)} {wallet?.currency}</div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="p-8 rounded-3xl shadow-xl glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <History className="text-[var(--color-purple)]" /> {isArabic ? 'سجل العمليات الأخير' : 'Recent Transactions'}
                        </h2>
                        {transactions.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">{isArabic ? 'لا توجد عمليات مسجلة حتى الآن.' : 'No transactions exist yet.'}</p>
                        ) : (
                            <div className="space-y-4">
                                {transactions.map((tx, i) => (
                                    <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-4 mb-3 md:mb-0">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                                {tx.status === 'COMPLETED' ? <ArrowUpRight size={24} /> : <Loader2 size={24} className="animate-spin" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{isArabic && tx.type === 'STORE_SALE' ? 'مبيعات متجر' : tx.type}</h3>
                                                <p className="text-xs text-gray-400">{format(new Date(tx.created_at), 'PPP p')}</p>
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <div className="font-black text-xl text-[var(--color-primary)]">+{Number(tx.net_amount).toFixed(2)}</div>
                                            <div className="text-xs text-red-400">{isArabic ? 'خصم عمولة 20% المنصة: ' : 'Platform Fee (20%): '}-{Number(tx.platform_fee).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Payout Request Section */}
                <div className="lg:col-span-4">
                    <div className="p-8 rounded-3xl shadow-xl sticky top-6 glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Landmark className="text-[var(--color-secondary)]" /> {isArabic ? 'طلب سحب أرباح' : 'Request Payout'}
                        </h2>

                        {error && <div className="mb-4 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-bold">{error}</div>}
                        {successMsg && <div className="mb-4 p-4 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 text-sm font-bold">{successMsg}</div>}

                        <form onSubmit={handlePayout} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'المبلغ المراد سحبه (EGP)' : 'Amount to withdraw (EGP)'} *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input type="number" name="amount" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} required max={wallet?.available_bal} className="w-full p-4 pl-12 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{isArabic ? 'الحد الأدنى 100 رصيد' : 'Minimum 100 balance required'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'رقم الحساب البنكي (IBAN)' : 'Bank Account (IBAN)'} *</label>
                                <input name="bankAccount" value={payoutForm.bankAccount} onChange={e => setPayoutForm({...payoutForm, bankAccount: e.target.value})} required placeholder="EGXX XXXX XXXX..." className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-gray-400">{isArabic ? 'رمز البنك (SWIFT Code)' : 'SWIFT Code'} *</label>
                                <input name="swiftCode" value={payoutForm.swiftCode} onChange={e => setPayoutForm({...payoutForm, swiftCode: e.target.value})} required className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            </div>

                            <button disabled={payoutLoading || wallet?.available_bal < 100} type="submit" className="w-full mt-4 py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                                {payoutLoading ? <Loader2 className="animate-spin" /> : <Landmark />} {isArabic ? 'تأكيد طلب السحب' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                </div>

            </main>
        </div>
    );
}
