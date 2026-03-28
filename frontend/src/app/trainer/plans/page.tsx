'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { Loader2 } from 'lucide-react';

const PLAN_TYPES = ['Single Session', 'Monthly', 'Quarterly', 'Custom'];

export default function TrainerPlansPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const [plans, setPlans] = useState([
        { id: 1, name: 'Starter Pack', type: 'Monthly', sessions: 8, price: 1200, description: 'Perfect for beginners starting their fitness journey', active: true },
        { id: 2, name: 'Transform Elite', type: 'Monthly', sessions: 16, price: 2200, description: 'Intensive 4x/week program for serious transformation', active: true },
        { id: 3, name: 'Athletic Performance', type: 'Quarterly', sessions: 48, price: 5500, description: 'Sport-specific training for athletes', active: true },
        { id: 4, name: 'Single Session', type: 'Single Session', sessions: 1, price: 300, description: 'One-off consultation or training session', active: true },
    ]);
    const [showModal, setShowModal] = useState(false);
    const [editPlan, setEditPlan] = useState<any>(null);
    const [form, setForm] = useState({ name: '', type: 'Monthly', sessions: '', price: '', description: '' });
    const [saving, setSaving] = useState(false);

    const openNew = () => { setEditPlan(null); setForm({ name: '', type: 'Monthly', sessions: '', price: '', description: '' }); setShowModal(true); };
    const openEdit = (plan: any) => { setEditPlan(plan); setForm({ name: plan.name, type: plan.type, sessions: String(plan.sessions), price: String(plan.price), description: plan.description }); setShowModal(true); };

    const savePlan = async () => {
        if (!form.name || !form.price) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        if (editPlan) {
            setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...p, ...form, sessions: Number(form.sessions), price: Number(form.price) } : p));
        } else {
            setPlans(prev => [...prev, { id: Date.now(), ...form, sessions: Number(form.sessions), price: Number(form.price), active: true }]);
        }
        setSaving(false);
        setShowModal(false);
    };

    const toggleActive = (id: number) => setPlans(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));

    return (
        <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">

<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
<div className="flex items-center gap-4">
<Link href="/trainer" className="text-on-surface-variant hover:text-white transition-colors">
<span className="material-symbols-outlined">arrow_back</span>
</Link>
<h1 className="font-headline font-black italic text-[#ff7b00] tracking-tighter text-2xl uppercase">GEM Z</h1>
</div>
<div className="flex items-center gap-4">
<button onClick={openNew} className="flex items-center gap-2 bg-[#ff7b00] text-black font-black px-4 py-2 rounded-full text-sm hover:scale-105 active:scale-95 transition-all">
<span className="material-symbols-outlined text-sm">add</span>
{isArabic ? 'خطة جديدة' : 'New Plan'}
</button>
<button onClick={toggleLanguage} className="text-[#ff7b00] font-bold bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">{isArabic ? 'EN' : 'عربي'}</button>
</div>
</header>

<main className="pt-24 pb-32 px-6 max-w-5xl mx-auto">

<div className="mb-10">
<span className="text-[#ff7b00] text-xs uppercase tracking-[0.3em] font-bold">{isArabic ? 'إدارة الأسعار' : 'Pricing Management'}</span>
<h2 className="text-5xl font-black font-headline tracking-tighter text-white mt-1">{isArabic ? 'خططي التدريبية' : 'MY PLANS'}</h2>
<p className="text-on-surface-variant mt-2 text-sm">{isArabic ? `${plans.filter(p=>p.active).length} خطة نشطة من ${plans.length}` : `${plans.filter(p=>p.active).length} of ${plans.length} plans active`}</p>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{plans.map(plan => (
<div key={plan.id} className={`bg-surface-container-low rounded-2xl p-6 border transition-all ${plan.active ? 'border-white/10 hover:border-[#ff7b00]/30' : 'border-white/5 opacity-50'}`}>
<div className="flex items-start justify-between mb-4">
<div>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mb-2 inline-block ${plan.type === 'Monthly' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : plan.type === 'Quarterly' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>{plan.type}</span>
<h3 className="text-xl font-black font-headline text-white">{plan.name}</h3>
</div>
<div className="text-right">
<p className="text-3xl font-black font-headline text-[#ff7b00]">{plan.price.toLocaleString()}</p>
<p className="text-xs text-on-surface-variant">EGP</p>
</div>
</div>
<p className="text-on-surface-variant text-sm mb-4">{plan.description}</p>
<div className="flex items-center justify-between">
<div className="flex items-center gap-2 text-xs text-on-surface-variant">
<span className="material-symbols-outlined text-sm text-[#ff7b00]">fitness_center</span>
<span>{plan.sessions} {isArabic ? 'جلسة' : 'session(s)'}</span>
</div>
<div className="flex items-center gap-2">
<button onClick={() => toggleActive(plan.id)} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${plan.active ? 'bg-green-500/10 text-green-500 hover:bg-red-500/10 hover:text-red-400' : 'bg-white/5 text-on-surface-variant hover:bg-green-500/10 hover:text-green-500'}`}>
{plan.active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Paused')}
</button>
<button onClick={() => openEdit(plan)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
<span className="material-symbols-outlined text-sm">edit</span>
</button>
</div>
</div>
</div>
))}

{/* Add New Plan Card */}
<button onClick={openNew} className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#ff7b00]/40 hover:bg-[#ff7b00]/5 transition-all group min-h-[200px]">
<span className="material-symbols-outlined text-4xl text-on-surface-variant group-hover:text-[#ff7b00] transition-colors">add_circle</span>
<p className="font-bold text-on-surface-variant group-hover:text-white transition-colors">{isArabic ? 'إضافة خطة جديدة' : 'Add New Plan'}</p>
</button>
</div>

</main>

{/* Bottom Nav */}
<nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#262626]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
<Link href="/trainer" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all"><span className="material-symbols-outlined">home</span></Link>
<Link href="/trainer/clients" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all"><span className="material-symbols-outlined">group</span></Link>
<Link href="/trainer/ai-generator" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all"><span className="material-symbols-outlined">smart_toy</span></Link>
<Link href="/trainer/plans" className="flex flex-col items-center justify-center bg-[#ff7b00]/20 text-[#ff7b00] rounded-full p-3 shadow-[0_0_15px_rgba(255,123,0,0.4)]"><span className="material-symbols-outlined">receipt_long</span></Link>
<Link href="/trainer/revenue" className="flex flex-col items-center justify-center text-gray-500 p-3 hover:text-white transition-all"><span className="material-symbols-outlined">account_balance_wallet</span></Link>
</nav>

{/* Add/Edit Plan Modal */}
{showModal && (
<div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
<div className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl p-8 shadow-[0_-20px_60px_rgba(255,123,0,0.2)]" onClick={e => e.stopPropagation()}>
<div className="flex items-center justify-between mb-6">
<h3 className="text-2xl font-black font-headline text-[#ff7b00] italic">{editPlan ? (isArabic ? 'تعديل الخطة' : 'Edit Plan') : (isArabic ? 'خطة جديدة' : 'New Plan')}</h3>
<button onClick={() => setShowModal(false)} className="material-symbols-outlined text-on-surface-variant">close</button>
</div>
<div className="space-y-4">
<input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={isArabic ? 'اسم الخطة' : 'Plan Name'} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#ff7b00] transition-all" />
<select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#ff7b00] transition-all text-white">
{PLAN_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
</select>
<div className="grid grid-cols-2 gap-4">
<input value={form.sessions} onChange={e => setForm(p => ({...p, sessions: e.target.value}))} type="number" placeholder={isArabic ? 'عدد الجلسات' : 'Sessions'} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#ff7b00] transition-all" />
<input value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} type="number" placeholder={isArabic ? 'السعر (EGP)' : 'Price (EGP)'} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#ff7b00] transition-all" />
</div>
<textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder={isArabic ? 'وصف الخطة' : 'Plan description'} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-[#ff7b00] transition-all resize-none" />
<button onClick={savePlan} disabled={saving || !form.name || !form.price} className="w-full py-4 rounded-xl bg-[#ff7b00] text-black font-black flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
{saving ? <Loader2 className="animate-spin" /> : <span className="material-symbols-outlined">save</span>}
{isArabic ? 'حفظ الخطة' : 'Save Plan'}
</button>
</div>
</div>
</div>
)}

<div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ff7b00]/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        </div>
    );
}
