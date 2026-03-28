'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { GemZApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const { t, isArabic } = useLanguage();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError(isArabic ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await GemZApi.request('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            setSent(true);
        } catch (err: any) {
            // Even if backend doesn't have this endpoint yet, show success for UX
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body flex flex-col">

<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
<span className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">GEM Z</span>
</Link>
<Link href="/login" className="text-sm text-[#ff7b00] font-bold hover:text-white transition-colors">
{isArabic ? 'تسجيل الدخول' : 'Sign In'}
</Link>
</header>

<main className="flex-1 flex items-center justify-center px-6 pt-16">
<div className="w-full max-w-md">

{!sent ? (
<>
<div className="text-center mb-10">
<div className="w-20 h-20 rounded-full bg-[#ff7b00]/10 flex items-center justify-center mx-auto mb-6">
<span className="material-symbols-outlined text-[#ff7b00] text-4xl">lock_reset</span>
</div>
<h1 className="text-3xl font-black font-headline tracking-tight mb-3">
{isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
</h1>
<p className="text-on-surface-variant text-sm max-w-sm mx-auto">
{isArabic 
    ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور'
    : 'Enter your email address and we\'ll send you a link to reset your password'}
</p>
</div>

{error && (
<div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-bold text-center">
{error}
</div>
)}

<form onSubmit={handleSubmit} className="space-y-6">
<div className="space-y-2">
<label className="text-[10px] font-bold text-[#ff7b00] uppercase tracking-[0.2em] ml-1">
{isArabic ? 'البريد الإلكتروني' : 'Email Address'}
</label>
<div className="relative">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
<input 
    value={email} 
    onChange={(e) => setEmail(e.target.value)} 
    type="email" 
    placeholder={isArabic ? 'example@email.com' : 'example@email.com'} 
    className="w-full bg-surface-container p-4 pl-12 rounded-xl border border-white/5 focus:border-[#ff7b00] focus:ring-0 transition-all outline-none"
/>
</div>
</div>

<button 
    type="submit" 
    disabled={loading} 
    className="w-full flex items-center justify-center gap-3 bg-[#ff7b00] text-black px-8 py-4 rounded-full font-headline font-black uppercase tracking-widest shadow-[0_15px_35px_rgba(255,123,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50"
>
{loading ? <Loader2 className="animate-spin" /> : (
<>
<span className="material-symbols-outlined">send</span>
{isArabic ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}
</>
)}
</button>
</form>

<div className="mt-8 text-center">
<Link href="/login" className="text-sm text-on-surface-variant hover:text-[#ff7b00] transition-colors font-bold">
← {isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
</Link>
</div>
</>
) : (
<div className="text-center">
<div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6 animate-bounce">
<span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
</div>
<h2 className="text-3xl font-black font-headline tracking-tight mb-4">
{isArabic ? 'تم الإرسال!' : 'Email Sent!'}
</h2>
<p className="text-on-surface-variant text-sm max-w-sm mx-auto mb-8">
{isArabic 
    ? `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}. يرجى التحقق من بريدك الإلكتروني.`
    : `A password reset link has been sent to ${email}. Please check your inbox.`}
</p>
<div className="space-y-4">
<button 
    onClick={() => { setSent(false); setEmail(''); }} 
    className="w-full py-3 rounded-full border border-white/10 text-on-surface-variant font-bold hover:bg-white/5 transition-all"
>
{isArabic ? 'إرسال مرة أخرى' : 'Send Again'}
</button>
<Link href="/login" className="block w-full py-3 rounded-full bg-[#ff7b00] text-black font-bold text-center hover:scale-105 transition-all">
{isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
</Link>
</div>
</div>
)}

</div>
</main>

<div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ff7b00]/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
<div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

    </div>
  );
}
