'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type LanguageContextType = {
    isArabic: boolean;
    toggleLanguage: () => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
    isArabic: false,
    toggleLanguage: () => { },
    t: (key: string) => key,
});

import arTranslations from '../lib/ar.json';

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [isArabic, setIsArabic] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLang = localStorage.getItem('gemz_lang');
        if (savedLang === 'ar') {
            setIsArabic(true);
        }
    }, []);

    const toggleLanguage = () => {
        setIsArabic((prev) => {
            const newLang = !prev;
            localStorage.setItem('gemz_lang', newLang ? 'ar' : 'en');
            return newLang;
        });
    };

    const t = (key: string): string => {
        if (isArabic && (arTranslations as any)[key]) {
            return (arTranslations as any)[key];
        }
        return key;
    };

    // Prevent hydration mismatch by returning a plain wrapper until mounted
    if (!mounted) {
        return <div className="w-full h-full min-h-screen opacity-0">{children}</div>;
    }

    return (
        <LanguageContext.Provider value={{ isArabic, toggleLanguage, t }}>
            <div dir={isArabic ? 'rtl' : 'ltr'} className={`w-full h-full min-h-screen transition-opacity duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                {children}
            </div>
        </LanguageContext.Provider>
    );
};
