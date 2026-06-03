/**
 * =============================================================================
 * GEM Z — Unified Global Design System Core
 * =============================================================================
 * - Unified design token registry conforming strictly to Apple/Nike-level polish.
 * - Responsive typography scaled strictly under the Arial font family wrapper.
 * - Dynamic light/dark styling components leveraging CSS variables globally.
 * - Implements premium glassmorphism, glowing micro-animations, and RTL/LTR helpers.
 */

import React, { ReactNode } from 'react';

// Design spacing and border tokens mapping standard scales
export const DESIGN_TOKENS = {
  radius: {
    lg: 'rounded-2xl',     // 16px
    xl: 'rounded-3xl',     // 24px
    full: 'rounded-full',
  },
  shadow: {
    cyan: 'shadow-[0_0_15px_rgba(0,240,255,0.25)]',
    green: 'shadow-[0_0_15px_rgba(57,255,20,0.25)]',
    gold: 'shadow-[0_0_15px_rgba(218,165,32,0.25)]',
    glass: 'shadow-[0_8px_32px_0_rgba(0,0,0,0.15)]',
  }
} as const;

interface UIProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * 1. Apple-Polish Dynamic Glassmorphism Card (GlassCard)
 * Supports dynamic Light/Dark variables, smooth hover borders, and glowing shadows.
 */
export const GlassCard: React.FC<UIProps & { hoverGlow?: boolean; glowColor?: 'cyan' | 'green' | 'gold' | 'none' }> = ({
  children,
  className = '',
  hoverGlow = true,
  glowColor = 'none',
  id
}) => {
  let glowStyle = '';
  if (glowColor === 'cyan') glowStyle = 'border-neon-cyan/25 shadow-[0_4px_24px_rgba(0,240,255,0.06)]';
  else if (glowColor === 'green') glowStyle = 'border-volt-green/25 shadow-[0_4px_24px_rgba(57,255,20,0.06)]';
  else if (glowColor === 'gold') glowStyle = 'border-premium-gold/25 shadow-[0_4px_24px_rgba(218,165,32,0.06)]';
  else glowStyle = 'border-border-custom shadow-sm';

  const hoverStyle = hoverGlow 
    ? 'hover:border-neon-cyan/40 hover:shadow-[0_8px_32px_rgba(0,240,255,0.12)] hover:scale-[1.01]' 
    : '';

  return (
    <div
      id={id}
      className={`glass-panel p-6 rounded-3xl transition-all duration-300 ${glowStyle} ${hoverStyle} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * 2. Premium Status Badge Chips (StatusBadge)
 * Visually displays states (KYC, Escrow, Transactions) with corresponding colors.
 */
export const StatusBadge: React.FC<{
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'PROCESSING' | 'PENDING' | 'ACTIVE';
  labelAr: string;
  labelEn: string;
  isAr?: boolean;
}> = ({ status, labelAr, labelEn, isAr = true }) => {
  const label = isAr ? labelAr : labelEn;
  
  let styles = '';
  if (status === 'SUCCESS' || status === 'ACTIVE') {
    styles = 'bg-volt-green/10 border-volt-green/30 text-volt-green';
  } else if (status === 'WARNING' || status === 'PROCESSING') {
    styles = 'bg-premium-gold/10 border-premium-gold/30 text-premium-gold';
  } else if (status === 'ERROR') {
    styles = 'bg-red-500/10 border-red-500/30 text-red-500';
  } else {
    styles = 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border ${styles} transition-colors duration-300`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 rtl:ml-1.5 rtl:mr-0 animate-pulse" />
      {label}
    </span>
  );
};

/**
 * 3. Egypt-gated Input Layout Wrapper (InputWrapper)
 * Clean validated input field layout for phone inputs and SMS codes.
 */
export const InputWrapper: React.FC<{
  label: string;
  error?: string | null;
  prefix?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  maxLength?: number;
  dir?: 'rtl' | 'ltr';
}> = ({
  label,
  error,
  prefix,
  placeholder,
  value,
  onChange,
  type = 'text',
  maxLength,
  dir = 'rtl'
}) => {
  return (
    <div className={`space-y-1.5 text-right w-full ${dir === 'ltr' ? 'text-left' : 'text-right'}`}>
      <label className="text-xs font-bold text-text-secondary block">
        {label}
      </label>
      <div className="relative flex items-center w-full rounded-2xl overflow-hidden border border-border-custom bg-card-bg/40 focus-within:border-neon-cyan focus-within:shadow-[0_0_10px_rgba(0,240,255,0.08)] transition-all duration-300">
        {prefix && (
          <span className="bg-border-color text-text-primary px-4 py-3 text-sm font-bold font-mono border-r border-border-custom rtl:border-r-0 rtl:border-l">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          className="w-full bg-transparent px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-muted outline-none border-none"
          style={{ fontFamily: 'Arial, sans-serif' }}
        />
      </div>
      {error && (
        <p className="text-[10px] text-red-500 font-bold block pt-0.5 leading-none">
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * 4. Micro-Animation Motion Wrapper
 * Applies hardware-accelerated fluid CSS transitions to child components upon hover.
 */
export const MotionWrapper: React.FC<UIProps> = ({ children, className = '' }) => {
  return (
    <div className={`transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] ${className}`}>
      {children}
    </div>
  );
};

/**
 * 5. Premium Theme Toggle Switch (ToggleSwitch)
 * Visually engaging sliding switch for Light/Dark toggling with animated vector nodes.
 */
export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  labelAr: string;
  labelEn: string;
  isAr?: boolean;
}> = ({ checked, onChange, labelAr, labelEn, isAr = true }) => {
  const label = isAr ? labelAr : labelEn;

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-2xl glass-panel border-border-custom bg-card-bg/30">
      <span className="text-xs font-bold text-text-primary" style={{ fontFamily: 'Arial, sans-serif' }}>
        {label}
      </span>
      <button
        onClick={onChange}
        className="w-12 h-6 rounded-full bg-border-color p-0.5 relative transition-colors duration-300 outline-none cursor-pointer"
      >
        <div
          className={`w-5 h-5 rounded-full bg-neon-cyan shadow-[0_2px_8px_rgba(0,240,255,0.45)] transform transition-transform duration-300 flex items-center justify-center text-[10px] text-black font-black ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        >
          {checked ? 'Z' : 'G'}
        </div>
      </button>
    </div>
  );
};
