'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type ThemeContextType = { theme: Theme; toggleTheme: () => void; };

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => { } });
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const saved = localStorage.getItem('gemz_theme') as Theme;
        if (saved) setTheme(saved);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gemz_theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
