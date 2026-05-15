'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Gift,
    Mail,
    User,
    Phone,
    MessageSquare,
    Zap,
    Crown,
    Palette,
    ChevronRight,
    AlertTriangle,
    CheckCircle,
    Copy,
    Sparkles,
    DollarSign,
    CreditCard,
    RefreshCw,
    QrCode,
    Send,
} from 'lucide-react';
import { ApiButton, ApiCard } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface GiftCard {
    id: string;
    code: string;
    recipientEmail: string;
    recipientName?: string;
    message?: string;
    giftType: 'balance' | 'subscription';
    amount?: number;
    currency: string;
    status: string;
    expiryDate: string;
    qrCodeUrl?: string;
    designTheme: string;
    createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const AMOUNT_PRESETS = [10, 25, 50, 100, 200, 500];

const THEMES: Record<string, { label: string; gradient: string; text: string; accent: string; border: string }> = {
    gold: {
        label: 'Gold',
        gradient: 'from-yellow-500/20 via-amber-500/10 to-yellow-600/5',
        text: 'text-yellow-400',
        accent: 'bg-yellow-500',
        border: 'border-yellow-500/30',
    },
    silver: {
        label: 'Silver',
        gradient: 'from-gray-400/20 via-slate-400/10 to-gray-500/5',
        text: 'text-gray-300',
        accent: 'bg-gray-400',
        border: 'border-gray-400/30',
    },
    rose: {
        label: 'Rose',
        gradient: 'from-pink-500/20 via-rose-400/10 to-pink-600/5',
        text: 'text-pink-400',
        accent: 'bg-pink-500',
        border: 'border-pink-500/30',
    },
    dark: {
        label: 'Dark',
        gradient: 'from-zinc-700/30 via-neutral-800/20 to-black/10',
        text: 'text-zinc-300',
        accent: 'bg-zinc-500',
        border: 'border-zinc-600/30',
    },
    gemz: {
        label: 'GEM Z',
        gradient: 'from-[var(--color-primary)]/20 via-purple-500/10 to-[var(--color-primary)]/5',
        text: 'text-[var(--color-primary)]',
        accent: 'bg-[var(--color-primary)]',
        border: 'border-[var(--color-primary)]/30',
    },
    neon: {
        label: 'Neon',
        gradient: 'from-emerald-500/20 via-lime-400/10 to-green-600/5',
        text: 'text-emerald-400',
        accent: 'bg-emerald-500',
        border: 'border-emerald-500/30',
    },
};

// ─── Gift Card Preview ────────────────────────────────────────────

function GiftCardPreview({
    theme, amount, currency, recipientName, recipientEmail, message, giftType, code,
}: {
    theme: string;
    amount?: number;
    currency: string;
    recipientName?: string;
    recipientEmail: string;
    message?: string;
    giftType: string;
    code?: string;
}) {
    const themeConfig = THEMES[theme] || THEMES.gold;
    const displayAmount = amount ? `$${amount} ${currency}` : 'Subscription Gift';

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${themeConfig.gradient} border ${themeConfig.border} p-6`}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.02] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/[0.02] translate-y-1/2 -translate-x-1/2" />

            <div className="relative space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className={themeConfig.text} />
                        <span className={`text-xs font-bold ${themeConfig.text} tracking-wider uppercase`}>GEM Z Gift</span>
                    </div>
                    {giftType === 'subscription' ? (
                        <Crown size={16} className={themeConfig.text} />
                    ) : (
                        <DollarSign size={16} className={themeConfig.text} />
                    )}
                </div>

                {/* Amount */}
                <div className="text-center py-3">
                    <p className={`text-3xl font-bold ${themeConfig.text}`}>
                        {giftType === 'balance' ? displayAmount : 'Premium Subscription'}
                    </p>
                    {giftType === 'subscription' && (
                        <p className="text-white/40 text-xs mt-1">1 month membership</p>
                    )}
                </div>

                {/* Recipient */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                        <User size={12} />
                        <span>To</span>
                    </div>
                    <p className="text-white font-semibold text-sm">
                        {recipientName || recipientEmail || 'Recipient Name'}
                    </p>
                    {recipientEmail && <p className="text-white/30 text-xs">{recipientEmail}</p>}
                </div>

                {/* Message */}
                {message && (
                    <div className="p-3 bg-black/20 rounded-xl">
                        <p className="text-white/50 text-xs italic">&ldquo;{message}&rdquo;</p>
                    </div>
                )}

                {/* QR Code area */}
                {code ? (
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                            <QrCode size={28} className="text-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white/30 text-[10px] uppercase tracking-wider">Redeem Code</p>
                            <p className="text-white/60 text-sm font-mono tracking-wider">{code}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 opacity-30">
                        <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
                            <QrCode size={28} className="text-white/30" />
                        </div>
                        <p className="text-white/20 text-xs">QR code will be generated</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-white/20 text-[10px]">Powered by GEM Z</span>
                    <span className="text-white/20 text-[10px]">Valid for 1 year</span>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export default function GiftCardCreator() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [giftType, setGiftType] = useState<'balance' | 'subscription'>('balance');
    const [amount, setAmount] = useState<number>(50);
    const [customAmount, setCustomAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [message, setMessage] = useState('');
    const [designTheme, setDesignTheme] = useState('gemz');
    const [step, setStep] = useState<'create' | 'preview' | 'success'>('create');
    const [createdGift, setCreatedGift] = useState<GiftCard | null>(null);
    const [sentGifts, setSentGifts] = useState<GiftCard[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    // ─── Fetch Sent Gifts ───────────────────────────────────────────

    const fetchSentGifts = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/gift/sent`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setSentGifts(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchSentGifts();
    }, [fetchSentGifts]);

    // ─── Create Gift Card ───────────────────────────────────────────

    const handleCreate = async () => {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            setError(t('Please enter a valid recipient email', 'يرجى إدخال بريد إلكتروني صالح'));
            return;
        }

        if (giftType === 'balance' && (!amount || amount <= 0)) {
            setError(t('Please enter a valid amount', 'يرجى إدخال مبلغ صالح'));
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/gift/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    recipientEmail,
                    recipientName: recipientName || undefined,
                    recipientPhone: recipientPhone || undefined,
                    message: message || undefined,
                    giftType,
                    amount: giftType === 'balance' ? amount : undefined,
                    currency,
                    designTheme,
                    expiryDays: 365,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setCreatedGift(data.giftCard);
                setStep('success');
                await fetchSentGifts();
            } else {
                setError(data.message || 'Failed to create gift card');
            }
        } catch {
            setError(t('Failed to create gift card', 'فشل إنشاء بطاقة الهدايا'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyCode = () => {
        if (createdGift?.code) {
            navigator.clipboard.writeText(createdGift.code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 3000);
        }
    };

    const resetForm = () => {
        setStep('create');
        setCreatedGift(null);
        setRecipientEmail('');
        setRecipientName('');
        setRecipientPhone('');
        setMessage('');
        setAmount(50);
        setCustomAmount('');
        setError(null);
    };

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <Gift className="text-[var(--color-primary)]" size={28} />
                    {t('Gift Cards', 'بطاقات الهدايا')}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                    {t('Create beautiful digital gift cards for friends & family', 'أنشئ بطاقات هدايا رقمية جميلة للأصدقاء والعائلة')}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">&times;</button>
                </div>
            )}

            {/* Step: Create */}
            {step === 'create' && (
                <div className="space-y-6">
                    {/* Gift Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setGiftType('balance')}
                            className={`p-4 rounded-xl border transition-all text-center ${
                                giftType === 'balance'
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                        >
                            <DollarSign size={24} className="mx-auto mb-2" />
                            <span className="text-sm font-semibold">{t('Balance Gift', 'هدية رصيد')}</span>
                        </button>
                        <button
                            onClick={() => setGiftType('subscription')}
                            className={`p-4 rounded-xl border transition-all text-center ${
                                giftType === 'subscription'
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                        >
                            <Crown size={24} className="mx-auto mb-2" />
                            <span className="text-sm font-semibold">{t('Subscription', 'اشتراك')}</span>
                        </button>
                    </div>

                    {/* Amount Selection */}
                    {giftType === 'balance' && (
                        <div className="space-y-3">
                            <label className="text-white/60 text-sm font-semibold">{t('Amount', 'المبلغ')}</label>
                            <div className="grid grid-cols-6 gap-2">
                                {AMOUNT_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => { setAmount(preset); setCustomAmount(''); }}
                                        className={`p-2 rounded-xl text-sm font-semibold transition-all ${
                                            amount === preset && !customAmount
                                                ? 'bg-[var(--color-primary)] text-black'
                                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        ${preset}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => { setCustomAmount(e.target.value); setAmount(parseFloat(e.target.value) || 0); }}
                                placeholder={t('Custom amount', 'مبلغ مخصص')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                        </div>
                    )}

                    {/* Recipient Details */}
                    <div className="space-y-3">
                        <label className="text-white/60 text-sm font-semibold">{t('Recipient', 'المستلم')}</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder={t('Recipient email', 'البريد الإلكتروني')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                        </div>
                        <div className="relative">
                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder={t('Recipient name (optional)', 'اسم المستلم (اختياري)')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-3">
                        <label className="text-white/60 text-sm font-semibold">{t('Message', 'الرسالة')}</label>
                        <div className="relative">
                            <MessageSquare size={16} className="absolute left-4 top-3.5 text-white/30" />
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('Write a personal message...', 'اكتب رسالة شخصية...')}
                                rows={3}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30 resize-none"
                            />
                        </div>
                    </div>

                    {/* Theme Selection */}
                    <div className="space-y-3">
                        <label className="text-white/60 text-sm font-semibold flex items-center gap-2">
                            <Palette size={16} />
                            {t('Design Theme', 'تصميم البطاقة')}
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {Object.entries(THEMES).map(([key, theme]) => (
                                <button
                                    key={key}
                                    onClick={() => setDesignTheme(key)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                                        designTheme === key
                                            ? `${theme.border} ${theme.text} ${theme.bg}`
                                            : 'border-white/5 text-white/30 hover:border-white/20 hover:text-white/60'
                                    }`}
                                >
                                    <div className={`w-3 h-3 rounded-full ${theme.accent}`} />
                                    {theme.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-3">
                        <label className="text-white/60 text-sm font-semibold">{t('Preview', 'معاينة')}</label>
                        <GiftCardPreview
                            theme={designTheme}
                            amount={amount}
                            currency={currency}
                            recipientName={recipientName}
                            recipientEmail={recipientEmail}
                            message={message}
                            giftType={giftType}
                        />
                    </div>

                    <ApiButton onClick={handleCreate} loading={isCreating} icon={<Send size={18} />} variant="primary" fullWidth>
                        {isCreating ? t('Creating...', 'جاري الإنشاء...') : t('Create Gift Card', 'إنشاء بطاقة هدية')}
                    </ApiButton>

                    {/* Sent Gift History */}
                    {sentGifts.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h3 className="text-white/60 text-sm font-semibold">{t('Sent Gifts', 'الهدايا المرسلة')}</h3>
                            <div className="space-y-2">
                                {sentGifts.slice(0, 5).map((gift) => {
                                    const theme = THEMES[gift.designTheme] || THEMES.gold;
                                    return (
                                        <div key={gift.id} className={`flex items-center gap-3 p-3 rounded-xl border ${theme.border} ${theme.bg}`}>
                                            <div className={`w-2 h-2 rounded-full ${theme.accent}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{gift.recipientEmail}</p>
                                                <p className="text-white/40 text-xs">
                                                    {gift.giftType === 'balance' ? `$${gift.amount} ${gift.currency}` : 'Subscription'} — {gift.status}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step: Success */}
            {step === 'success' && createdGift && (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle size={32} className="text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                            {t('Gift Card Created!', 'تم إنشاء بطاقة الهدية!')}
                        </h3>
                        <p className="text-white/50 text-sm mt-1">
                            {t('Share the code or QR with your recipient', 'شارك الرمز أو QR مع المستلم')}
                        </p>
                    </div>

                    <GiftCardPreview
                        theme={createdGift.designTheme}
                        amount={createdGift.amount}
                        currency={createdGift.currency}
                        recipientName={createdGift.recipientName}
                        recipientEmail={createdGift.recipientEmail}
                        message={createdGift.message}
                        giftType={createdGift.giftType}
                        code={createdGift.code}
                    />

                    <div className="flex gap-2">
                        <ApiButton onClick={handleCopyCode} icon={<Copy size={18} />} variant="primary" fullWidth>
                            {copiedCode ? t('Copied!', 'تم النسخ!') : t('Copy Code', 'نسخ الرمز')}
                        </ApiButton>
                        <ApiButton onClick={resetForm} icon={<Gift size={18} />} variant="secondary">
                            {t('New Gift', 'هدية جديدة')}
                        </ApiButton>
                    </div>
                </div>
            )}
        </div>
    );
}
