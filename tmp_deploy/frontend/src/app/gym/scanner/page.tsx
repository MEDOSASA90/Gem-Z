'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { GemZApi } from '../../../lib/api';
import { Scan, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function GymScannerPage() {
    const { isArabic } = useLanguage();
    const [qrCode, setQrCode] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep focus on the input field for USB physical barcode scanners
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
        const interval = setInterval(() => {
            if (inputRef.current && document.activeElement !== inputRef.current) {
                inputRef.current.focus();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = qrCode.trim();
        if (!code) return;

        setStatus('SCANNING');
        setQrCode(''); // clear for next scan immediately

        try {
            const res = await GemZApi.Gym.scanPass(code);
            if (res.success) {
                setStatus('SUCCESS');
                setMessage(isArabic ? 'تم تأكيد الدخول بنجاح!' : 'Access Granted!');
            } else {
                setStatus('ERROR');
                setMessage(res.message || (isArabic ? 'تذكرة غير صالحة' : 'Invalid Pass'));
            }
        } catch (error: any) {
            setStatus('ERROR');
            setMessage(error.message || (isArabic ? 'تذكرة غير صالحة' : 'Invalid Pass'));
        }

        // Auto reset after 3 seconds
        setTimeout(() => {
            setStatus('IDLE');
            setMessage('');
        }, 3000);
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-24 flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="max-w-md w-full p-8 rounded-3xl shadow-2xl glass-panel text-center relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {status === 'SUCCESS' && <div className="absolute inset-0 bg-[var(--color-primary)]/20 animate-pulse z-0 pointer-events-none"></div>}
                {status === 'ERROR' && <div className="absolute inset-0 bg-red-500/20 animate-pulse z-0 pointer-events-none"></div>}

                <div className="relative z-10">
                    <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl" style={{ background: 'var(--bg-input)', border: '2px solid var(--border-medium)' }}>
                        {status === 'IDLE' && <Scan size={48} className="text-[var(--color-secondary)]" />}
                        {status === 'SCANNING' && <Loader2 size={48} className="animate-spin text-[var(--color-secondary)]" />}
                        {status === 'SUCCESS' && <CheckCircle2 size={56} className="text-[var(--color-primary)]" />}
                        {status === 'ERROR' && <XCircle size={56} className="text-red-500" />}
                    </div>

                    <h1 className="text-3xl font-black mb-2">{isArabic ? 'ماسح الدخول' : 'Access Scanner'}</h1>
                    <p className="text-gray-400 mb-8 font-bold text-sm h-6 transition-all duration-300">
                        {status === 'SUCCESS' && <span className="text-[var(--color-primary)] text-lg">{message}</span>}
                        {status === 'ERROR' && <span className="text-red-500 text-lg">{message}</span>}
                        {status === 'IDLE' && (isArabic ? 'وجّه الماسح الضوئي للتذكرة، أو أدخل الكود' : 'Point barcode scanner at pass, or type code')}
                    </p>

                    <form onSubmit={handleScan} className="relative">
                        <input
                            ref={inputRef}
                            value={qrCode}
                            onChange={e => setQrCode(e.target.value)}
                            placeholder={isArabic ? 'رمز الـ QR...' : 'QR Code...'}
                            className="w-full text-center text-xl font-mono tracking-widest p-4 rounded-2xl outline-none border-2 focus:border-[var(--color-primary)] transition-colors"
                            style={{ background: 'var(--bg-input)', borderColor: status === 'SUCCESS' ? 'var(--color-primary)' : status === 'ERROR' ? '#ef4444' : 'var(--border-medium)' }}
                            autoFocus
                        />
                        <button type="submit" className="hidden">Submit</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
