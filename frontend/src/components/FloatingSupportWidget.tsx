'use client';
import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FloatingSupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { isArabic } = useLanguage();

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-50 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-secondary-rgb), 0.3] hover:scale-110 transition-transform ${isOpen ? 'scale-0' : 'scale-100'}`}
            >
                <MessageCircle size={24} />
            </button>

            <div className={`fixed bottom-24 ${isArabic ? 'left-6' : 'right-6'} z-50 w-80 bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-300 origin-bottom ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] p-4 flex justify-between items-center">
                    <h3 className="text-black font-bold font-heading">{isArabic ? 'الدعم الفني المباشر' : 'Live Support'}</h3>
                    <button onClick={() => setIsOpen(false)} className="text-black/70 hover:text-black">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 flex-1 h-72 overflow-y-auto bg-black/50 text-sm flex flex-col gap-4">
                    <div className="bg-white/10 p-3 rounded-xl rounded-tl-sm w-[85%] self-start border border-white/5">
                        <p className="text-gray-200">
                            {isArabic
                                ? 'مرحباً! كيف يمكننا مساعدتك اليوم في نظام GEM Z؟ أدخل سؤالك وسيقوم أحد ممثلي الدعم الفني بالرد فوراً.'
                                : 'Hello! How can we help you with the GEM Z ecosystem today? Drop your question here.'}
                        </p>
                    </div>
                </div>
                <div className="p-3 border-t border-white/10 bg-[#141414] flex gap-2">
                    <input
                        type="text"
                        placeholder={isArabic ? 'اكتب رسالتك...' : 'Type your message...'}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
                    />
                    <button className="bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] p-2 rounded-xl hover:bg-[var(--color-secondary)]/30 transition-colors">
                        <Send size={18} className={isArabic ? '-scale-x-100' : ''} />
                    </button>
                </div>
            </div>
        </>
    );
}
