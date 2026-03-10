'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Search, Filter, ShieldCheck, Flame, Clock, Navigation } from 'lucide-react';

const MOCK_REQUESTS = [
    {
        id: 'req_101',
        traineeName: 'Ahmed Mahmoud',
        avatar: 'A',
        title: 'Need Post-Surgery Shoulder Rehab',
        titleAr: 'تأهيل الكتف بعد عملية جراحية',
        description: 'Looking for a certified trainer to help me regain shoulder mobility after rotator cuff surgery. Need 3 days/week near Heliopolis.',
        descriptionAr: 'أبحث عن مدرب معتمد لتأهيل الكتف بعد العملية. أحتاج ٣ أيام في الأسبوع بالقرب من مصر الجديدة.',
        budget: '2000 - 3000 EGP / month',
        durationWeeks: 8,
        bidsCount: 3,
        postedAt: '2 hours ago',
        postedAtAr: 'منذ ساعتين'
    },
    {
        id: 'req_102',
        traineeName: 'Sara K.',
        avatar: 'S',
        title: 'Wedding Prep - 12 Weeks to shred',
        titleAr: 'تجهيز الفرح - تنشيف في ١٢ أسبوع',
        description: 'Need an aggressive diet and HIIT plan to lose 8kg before my wedding in 3 months. Online tracking is fine.',
        descriptionAr: 'أحتاج نظام غذائي وهيت مكثف لخسارة ٨ كيلو قبل فرحي. التدريب أونلاين مناسب.',
        budget: '1500 - 2500 EGP / month',
        durationWeeks: 12,
        bidsCount: 5,
        postedAt: '5 hours ago',
        postedAtAr: 'منذ ٥ ساعات'
    },
    {
        id: 'req_103',
        traineeName: 'Khaled Hassan',
        avatar: 'K',
        title: 'Powerlifting Meet Prep (Beginner)',
        titleAr: 'تجهيز لبطولة قوة بدنية (مبتدئ)',
        description: 'Never competed before. Want to hit 100/140/180 kg S/B/D. Need programming and form checks twice a week.',
        descriptionAr: 'أول بطولة ليا. عاوز أوصل لأرقام محددة. أحتاج متابعة وتقييم للأداء مرتين أسبوعياً.',
        budget: '3500 - 5000 EGP / month',
        durationWeeks: 16,
        bidsCount: 1,
        postedAt: '1 day ago',
        postedAtAr: 'منذ يوم'
    }
];

export default function BiddingMarketplace() {
    const { isArabic } = useLanguage();
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen p-4 md:p-8 font-sans pb-28" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-heading mb-1">{isArabic ? 'سوق المدربين' : 'Trainer Marketplace'}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {isArabic ? 'استعرض طلبات المتدربين وقدم عروضك.' : 'Browse trainee custom requests and submit bids.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <Search size={18} />
                    </button>
                    <button className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <Filter size={18} />
                        <span className="hidden md:inline font-bold text-sm">{isArabic ? 'تصفية' : 'Filters'}</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {MOCK_REQUESTS.map((req) => (
                    <div key={req.id} onClick={() => setSelectedRequest(req)}
                        className="rounded-2xl p-5 cursor-pointer transition-transform hover:-translate-y-1 relative overflow-hidden"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00B8FF]/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black" style={{ background: 'linear-gradient(to right, #00FFA3, #00B8FF)' }}>
                                    {req.avatar}
                                </div>
                                <div>
                                    <h3 className="font-bold">{isArabic ? req.titleAr : req.title}</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {req.traineeName} • {isArabic ? req.postedAtAr : req.postedAt}
                                    </p>
                                </div>
                            </div>
                            <div className="text-center px-3 py-1 rounded-lg" style={{ background: 'rgba(0,184,255,0.1)', border: '1px solid rgba(0,184,255,0.2)' }}>
                                <span className="text-xs font-bold text-[#00B8FF]">{req.bidsCount} {isArabic ? 'عروض' : 'bids'}</span>
                            </div>
                        </div>

                        <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                            {isArabic ? req.descriptionAr : req.description}
                        </p>

                        <div className="flex flex-wrap gap-3 mt-4">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--bg-input)' }}>
                                <ShieldCheck size={14} className="text-[#00FFA3]" />
                                <span>{isArabic ? 'حساب موثق' : 'Verified Profile'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--bg-input)' }}>
                                <Clock size={14} className="text-[#A78BFA]" />
                                <span>{req.durationWeeks} {isArabic ? 'أسبوع' : 'weeks'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold w-full md:w-auto" style={{ background: 'var(--bg-input)' }}>
                                <span className="text-green-500">💰</span>
                                <span className="font-mono text-[#00FFA3]">{req.budget}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Application Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedRequest(null)}>
                    <div className="rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-w-md w-full relative" style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,255,163,0.3)' }} onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFA3]/10 rounded-full blur-3xl" />

                        <div>
                            <h2 className="text-xl font-bold font-heading mb-2">{isArabic ? selectedRequest.titleAr : selectedRequest.title}</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isArabic ? selectedRequest.descriptionAr : selectedRequest.description}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold mb-2 block tracking-wider uppercase text-gray-400">{isArabic ? 'عرض السعر (ر.س/ج.م)' : 'Your Bid (Monthly)'}</label>
                                <input type="number" placeholder="e.g. 2500" className="w-full bg-[#1A1A1A] p-4 flex-1 outline-none text-white font-mono rounded-xl border border-[#333] focus:border-[#00FFA3] transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-bold mb-2 block tracking-wider uppercase text-gray-400">{isArabic ? 'رسالة للمتدرب' : 'Message to Trainee'}</label>
                                <textarea placeholder={isArabic ? 'اشرح خطتك ولماذا أنت الأنسب...' : 'Explain your approach...'} rows={4} className="w-full bg-[#1A1A1A] p-4 flex-1 outline-none text-white rounded-xl border border-[#333] focus:border-[#00FFA3] transition-colors resize-none" />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setSelectedRequest(null)} className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-colors hover:bg-white/10" style={{ border: '1px solid var(--border-subtle)' }}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={() => setSelectedRequest(null)} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-black neon-glow transition-transform hover:scale-95" style={{ background: '#00FFA3' }}>
                                {isArabic ? 'تقديم العرض 🚀' : 'Submit Bid 🚀'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
