'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function GlobalLangToggle() {
    const { isArabic, toggleLanguage } = useLanguage();
    
    return (
        <button
            onClick={toggleLanguage}
            className="fixed top-6 right-6 z-[9999] w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform backdrop-blur-md"
            style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)'
            }}
            title={isArabic ? 'Switch to English' : 'التبديل للعربية'}
        >
            <div className="flex flex-col items-center justify-center">
                <Globe size={18} className="text-[#00E5FF]" />
                <span className="text-[10px] font-bold mt-0.5">{isArabic ? 'EN' : 'عربي'}</span>
            </div>
        </button>
    );
}
