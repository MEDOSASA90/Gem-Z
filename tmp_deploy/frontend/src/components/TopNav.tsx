'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import GemZLogo from './GemZLogo';

export default function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isArabic, toggleLanguage } = useLanguage();
  const pathname = usePathname();
  
  const isDark = theme === 'dark';
  const isHome = pathname === '/';
  
  // Custom auth pages or hidden nav pages can be excluded here if desired, 
  // but standard practice is solid background for inner pages, transparent top for Home.
  const isSolid = !isHome || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const T_nav = {
    features: isArabic ? 'المميزات' : 'Features',
    partners: isArabic ? 'الشراكات' : 'Partners',
    pricing: isArabic ? 'الأسعار' : 'Pricing',
    login: isArabic ? 'تسجيل الدخول' : 'Login',
    getStarted: isArabic ? 'ابدأ الآن' : 'Get Started',
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${isSolid ? 'border-b py-3 md:py-4' : 'py-5 md:py-6'}`}
        style={{ 
            backgroundColor: isSolid ? 'var(--bg-card)' : 'transparent', 
            borderColor: isSolid ? 'var(--border-subtle)' : 'transparent', 
            backdropFilter: isSolid ? 'blur(16px)' : 'none' 
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity">
            <GemZLogo size={32} variant="full" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {isHome ? (
              <>
                <a href="#ecosystem" className="hover:text-[var(--color-primary)] transition-colors">{T_nav.features}</a>
                <a href="#partners" className="hover:text-[var(--color-primary)] transition-colors">{T_nav.partners}</a>
              </>
            ) : null}
            <Link href="/pricing" className="hover:text-[var(--color-primary)] transition-colors">{T_nav.pricing}</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="flex items-center justify-center p-2 rounded-xl transition-colors shrink-0 hover:bg-white/5 active:scale-95" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              {isDark ? <Sun size={18} className="text-[#F59E0B]" /> : <Moon size={18} />}
            </button>
            <button onClick={toggleLanguage} className="flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors font-medium shrink-0 hover:bg-white/5 active:scale-95" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              <span className="hidden sm:inline font-bold mt-0.5">{!isArabic ? 'EN' : 'عربي'}</span>
              <Globe size={16} /> 
            </button>
            <Link href="/login" className="hidden lg:block text-sm font-bold transition-colors px-4 py-2 border rounded-xl hover:bg-white/5 active:scale-95" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              {T_nav.login}
            </Link>
            <Link href="/register" className="text-black font-bold text-xs sm:text-sm px-4 lg:px-5 py-2 sm:py-2.5 rounded-xl hover:opacity-90 transition-opacity neon-glow font-heading shrink-0" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
              {T_nav.getStarted}
            </Link>
            {isHome && (
              <button className="md:hidden ml-1" style={{ color: 'var(--text-primary)' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>
        {mobileMenuOpen && isHome && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4 text-sm font-medium mt-3 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition-colors py-2">{T_nav.features}</a>
            <a href="#partners" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition-colors py-2">{T_nav.partners}</a>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--color-primary)] transition-colors py-2">{T_nav.pricing}</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="hover:text-white transition-colors py-2">{T_nav.login}</Link>
          </div>
        )}
      </nav>
      {/* Spacer for inner pages so content doesn't slip permanently under the fixed nav */}
      {!isHome && <div className="h-16 md:h-20" />}
    </>
  );
}
