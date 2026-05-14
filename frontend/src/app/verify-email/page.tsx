'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';

const T = {
    en: {
        verifying: 'Verifying your email...',
        successTitle: 'Email Verified! 🎉',
        successMsg: 'Welcome to Gem Z! Your account is now fully active.',
        loginBtn: 'Go to Dashboard',
        errorTitle: 'Verification Failed',
        errorExpired: 'This verification link has expired. Please request a new one.',
        errorInvalid: 'Invalid verification link.',
        resendBtn: 'Resend Verification Email',
        resendSuccess: 'A new verification email has been sent.',
        noToken: 'No verification token found in the URL.',
    },
    ar: {
        verifying: 'جارِ التحقق من بريدك...',
        successTitle: 'تم التحقق! 🎉',
        successMsg: 'مرحباً في Gem Z! حسابك الآن مفعّل بالكامل.',
        loginBtn: 'انتقل إلى لوحتك',
        errorTitle: 'فشل التحقق',
        errorExpired: 'انتهت صلاحية رابط التحقق. يرجى طلب رابط جديد.',
        errorInvalid: 'رابط التحقق غير صالح.',
        resendBtn: 'إعادة إرسال بريد التحقق',
        resendSuccess: 'تم إرسال بريد التحقق الجديد.',
        noToken: 'لم يتم العثور على رمز التحقق في الرابط.',
    },
};

type Status = 'loading' | 'success' | 'expired' | 'invalid' | 'no-token';

function VerifyEmailContent() {
    const { isArabic } = useLanguage();
    const t = isArabic ? T.ar : T.en;
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSent, setResendSent] = useState(false);

    useEffect(() => {
        if (!token) { setStatus('no-token'); return; }

        const verify = async () => {
            try {
                await GemZApi.Auth.verifyEmail(token);
                setStatus('success');
            } catch (err: any) {
                const msg = err?.message?.toLowerCase() || '';
                if (msg.includes('expired')) setStatus('expired');
                else setStatus('invalid');
            }
        };

        verify();
    }, [token]);

    const handleResend = async () => {
        setResendLoading(true);
        try {
            await GemZApi.Auth.resendVerification();
            setResendSent(true);
        } catch {
            // fail silently
        } finally {
            setResendLoading(false);
        }
    };

    // ── Loading State ──
    if (status === 'loading') {
        return (
            <div className="text-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#ff7b00] mx-auto" />
                <p className="text-white/50 font-bold uppercase tracking-widest text-sm">
                    {t.verifying}
                </p>
            </div>
        );
    }

    // ── Success State ──
    if (status === 'success') {
        return (
            <div className="text-center space-y-5 py-4">
                {/* Animated check */}
                <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mx-auto">
                    <span
                        className="material-symbols-outlined text-5xl text-green-400"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        verified
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-white">{t.successTitle}</h1>
                <p className="text-white/50 text-sm leading-relaxed">{t.successMsg}</p>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#ff7b00] text-black font-bold text-sm shadow-[0_0_25px_rgba(255,123,0,0.3)] hover:opacity-90 transition mt-2"
                >
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                    {t.loginBtn}
                </Link>
            </div>
        );
    }

    // ── Error / Expired / No Token States ──
    const errorMsg =
        status === 'expired'
            ? t.errorExpired
            : status === 'no-token'
            ? t.noToken
            : t.errorInvalid;

    const showResend = status === 'expired' || status === 'invalid';

    return (
        <div className="text-center space-y-5 py-4">
            <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto">
                <span
                    className="material-symbols-outlined text-5xl text-red-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    {status === 'expired' ? 'schedule' : 'link_off'}
                </span>
            </div>
            <h2 className="text-2xl font-bold text-white">{t.errorTitle}</h2>
            <p className="text-white/50 text-sm leading-relaxed">{errorMsg}</p>

            {showResend && !resendSent && (
                <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition disabled:opacity-50 mt-2"
                >
                    {resendLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <span className="material-symbols-outlined text-base">mail</span>
                    )}
                    {t.resendBtn}
                </button>
            )}

            {resendSent && (
                <p className="text-green-400 text-sm font-semibold">{t.resendSuccess}</p>
            )}

            <Link
                href="/forgot-password"
                className="inline-block text-[#ff7b00] text-sm font-semibold hover:underline mt-2"
            >
                {isArabic ? 'طلب رابط جديد' : 'Request New Link'}
            </Link>
        </div>
    );
}

export default function VerifyEmailPage() {
    const { isArabic } = useLanguage();

    return (
        <div
            dir={isArabic ? 'rtl' : 'ltr'}
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0a]"
        >
            <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[200px] pointer-events-none opacity-20 bg-[#ff7b00]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[180px] pointer-events-none opacity-10 bg-[#ffb300]" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link href="/">
                        <span className="text-4xl font-black italic text-[#ff7b00] tracking-tighter drop-shadow-[0_0_15px_rgba(255,123,0,0.3)]">
                            Gem Z
                        </span>
                    </Link>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                    <Suspense
                        fallback={
                            <div className="text-center py-12">
                                <Loader2 className="w-10 h-10 animate-spin text-[#ff7b00] mx-auto" />
                            </div>
                        }
                    >
                        <VerifyEmailContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
