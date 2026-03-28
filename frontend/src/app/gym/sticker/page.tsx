'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';

// Unique gym QR sticker page — generates a static QR for the gym entrance
export default function GymStickerPage() {
    const { isArabic } = useLanguage();
    const [gymId, setGymId] = useState('GYM-001');
    const [gymName, setGymName] = useState('Gem Z Gym');
    const [entries, setEntries] = useState<any[]>([]);
    const [scanSuccess, setScanSuccess] = useState<string | null>(null);

    // Simulate loading existing check-ins
    useEffect(() => {
        const demoEntries = [
            { id: 1, trainee: 'Ahmed Hassan', type: 'monthly', daysLeft: 18, time: '09:14 AM', date: '2026-03-28' },
            { id: 2, trainee: 'Sara Mohamed', type: 'daily', daysLeft: 0, time: '09:02 AM', date: '2026-03-28' },
            { id: 3, trainee: 'Omar Ali', type: 'annual', daysLeft: 245, time: '08:48 AM', date: '2026-03-28' },
            { id: 4, trainee: 'Nour Youssef', type: 'monthly', daysLeft: 5, time: '08:33 AM', date: '2026-03-28' },
        ];
        setEntries(demoEntries);
    }, []);

    // Simulate a QR scan
    const simulateScan = () => {
        const names = ['Youssef T.', 'Layla A.', 'Khaled R.', 'Mona S.'];
        const types = ['monthly', 'daily', 'annual'];
        const name = names[Math.floor(Math.random() * names.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        setScanSuccess(name);
        const newEntry = {
            id: Date.now(),
            trainee: name,
            type,
            daysLeft: type === 'daily' ? 0 : type === 'monthly' ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 365),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString().slice(0, 10),
        };
        setEntries(prev => [newEntry, ...prev]);
        setTimeout(() => setScanSuccess(null), 3000);
    };

    const typeColor = (t: string) => t === 'daily' ? 'text-yellow-400 bg-yellow-400/10' : t === 'monthly' ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 bg-green-400/10';
    const typeLabel = (t: string, ar: boolean) => t === 'daily' ? (ar ? 'يومى' : 'Daily') : t === 'monthly' ? (ar ? 'شهري' : 'Monthly') : (ar ? 'سنوي' : 'Annual');

    // SVG QR code placeholder (real app would use a QR library)
    const QR_COLOR = '#ff7b00';

    return (
        <div className="bg-surface-container-lowest text-on-surface min-h-screen font-body pb-32">

<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16">
<div className="flex items-center gap-4">
<Link href="/gym" className="text-on-surface-variant hover:text-white transition-colors"><span className="material-symbols-outlined">arrow_back</span></Link>
<h1 className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-xl uppercase">GEM Z</h1>
</div>
<button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold text-[#ff7b00] bg-[#ff7b00]/10 border border-[#ff7b00]/30 px-4 py-1.5 rounded-full hover:bg-[#ff7b00]/20 transition-all">
<span className="material-symbols-outlined text-sm">print</span>
{isArabic ? 'طباعة الملصق' : 'Print Sticker'}
</button>
</header>

<main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-10">

<div className="text-center mb-4">
<span className="text-[#ff7b00] text-xs uppercase tracking-[0.3em] font-bold">{isArabic ? 'ملصق مدخل الصالة' : 'Gym Entrance Sticker'}</span>
<h2 className="text-5xl font-black font-headline tracking-tighter text-white mt-1">{isArabic ? 'QR الثابت' : 'STATIC QR'}</h2>
</div>

{/* QR Sticker Preview */}
<div className="flex flex-col items-center">
<div className="bg-white p-8 rounded-3xl shadow-[0_0_60px_rgba(255,123,0,0.4)] max-w-sm w-full text-center print:shadow-none">
<p className="text-black font-black font-headline text-2xl tracking-tight mb-1">{gymName}</p>
<p className="text-gray-500 text-xs mb-6 uppercase tracking-widest">Scan to Check In</p>
{/* QR SVG placeholder — 21x21 grid pattern */}
<svg viewBox="0 0 210 210" className="w-48 h-48 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
<rect width="210" height="210" fill="white"/>
{/* Finder patterns */}
<rect x="0" y="0" width="60" height="60" fill="black" rx="4"/>
<rect x="6" y="6" width="48" height="48" fill="white" rx="2"/>
<rect x="12" y="12" width="36" height="36" fill="black" rx="2"/>
<rect x="150" y="0" width="60" height="60" fill="black" rx="4"/>
<rect x="156" y="6" width="48" height="48" fill="white" rx="2"/>
<rect x="162" y="12" width="36" height="36" fill="black" rx="2"/>
<rect x="0" y="150" width="60" height="60" fill="black" rx="4"/>
<rect x="6" y="156" width="48" height="48" fill="white" rx="2"/>
<rect x="12" y="162" width="36" height="36" fill="black" rx="2"/>
{/* Data area pattern */}
{[80,90,100,110,120,130].map(x => [80,90,100,110,120,130].map(y => (Math.sin(x*y) > 0.2) && <rect key={`${x}${y}`} x={x} y={y} width="8" height="8" fill="black"/>))}
{[70,80].map(y => <rect key={y} x="70" y={y} width="8" height="8" fill="black"/>)}
{/* GYM ID text area */}
<text x="105" y="200" textAnchor="middle" fontSize="8" fill="#666" fontFamily="monospace">{gymId}</text>
</svg>
<p className="text-black font-bold text-lg">{gymId}</p>
<p className="text-gray-400 text-xs mt-1">Powered by GEM Z</p>
</div>

<p className="text-on-surface-variant text-sm mt-4 max-w-sm text-center">{isArabic ? 'اطبع هذا الملصق وضعه على مدخل الصالة. لما أي متدرب يمسحه، هيتسجل دخوله تلقائياً.' : 'Print this sticker and fix it at the gym entrance. When a trainee scans it, their check-in is recorded automatically.'}</p>

<button onClick={simulateScan} className="mt-6 flex items-center gap-2 bg-[#ff7b00] text-black font-black px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_24px_rgba(255,123,0,0.3)]">
<span className="material-symbols-outlined">qr_code_scanner</span>
{isArabic ? 'محاكاة مسح QR' : 'Simulate Scan'}
</button>

{scanSuccess && (
<div className="mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/30 px-6 py-3 rounded-full animate-pulse">
<span className="material-symbols-outlined text-green-500">check_circle</span>
<span className="font-bold text-green-500">{isArabic ? `تم تسجيل دخول ${scanSuccess} ✓` : `${scanSuccess} checked in ✓`}</span>
</div>
)}
</div>

{/* Today's Check-Ins */}
<div>
<div className="flex items-center justify-between mb-6">
<h3 className="text-3xl font-black font-headline italic">{isArabic ? 'سجل الدخول اليوم' : "TODAY'S CHECK-INS"}</h3>
<span className="text-sm text-on-surface-variant font-bold">{entries.length} {isArabic ? 'مسجل' : 'total'}</span>
</div>
<div className="space-y-3">
{entries.map(e => (
<div key={e.id} className="bg-surface-container-low rounded-2xl p-5 flex items-center justify-between gap-4">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-[#ff7b00]/10 flex items-center justify-center text-[#ff7b00] font-black text-sm shrink-0">
{e.trainee.split(' ').map((n: string) => n[0]).join('')}
</div>
<div>
<p className="font-bold text-white">{e.trainee}</p>
<div className="flex items-center gap-2 mt-0.5">
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor(e.type)}`}>{typeLabel(e.type, isArabic)}</span>
{e.type !== 'daily' && (
<span className={`text-[10px] font-bold ${e.daysLeft <= 5 ? 'text-red-400' : 'text-on-surface-variant'}`}>
{e.daysLeft} {isArabic ? 'يوم متبقي' : 'days left'}
</span>
)}
</div>
</div>
</div>
<div className="text-right shrink-0">
<p className="font-bold text-white text-sm">{e.time}</p>
<p className="text-xs text-on-surface-variant">{e.date}</p>
</div>
</div>
))}
</div>
</div>

</main>

        </div>
    );
}
