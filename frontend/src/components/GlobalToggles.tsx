'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Globe, Moon, Sun } from 'lucide-react';

export default function GlobalToggles() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className={`fixed bottom-6 ${isArabic ? 'right-6' : 'left-6'} z-[9999] flex flex-col items-center gap-3`}>
            <button 
                onClick={toggleLanguage}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-highest/80 border border-white/10 backdrop-blur-xl text-primary font-bold hover:bg-primary-fixed hover:text-black hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,123,0,0.15)]"
                title={isArabic ? 'Switch to English' : 'التبديل للعربية'}
            >
                <div className="flex flex-col items-center justify-center">
                    <Globe size={16} className="mb-0.5 opacity-80" />
                    <span className="text-[10px] leading-none uppercase tracking-widest">{isArabic ? 'EN' : 'عربي'}</span>
                </div>
            </button>
        </div>
    );
}
