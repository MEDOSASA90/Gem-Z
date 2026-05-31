/**
 * =============================================================================
 * DesignSystemModule - نظام المظهر البصري لـ GEM Z
 * =============================================================================
 * - يصدّر جميع ثوابت الألوان والتدرجات والظلال البصرية لضمان المطابقة الكاملة.
 * - يحتوي على الشعار المبتكر الاستثنائي GEM Z Logo المصمم بالمتجهات والنسب الذهبية.
 * - يوفّر مكوّنات خطوط متجاوبة ومقيدة ومصممة لدعم اللغتين العربية والإنجليزية بفونت Arial.
 */

import React, { ReactNode } from 'react';

// ثوابت الألوان غير القابلة للتعديل (Immutable Design Tokens)
export const COLORS = {
  cyberDark: '#0B0B0F',
  cardDark: '#12121A',
  neonCyan: '#00F0FF',
  voltGreen: '#39FF14',
  premiumGold: '#FFD700',
  textGray: '#9CA3AF',
  textLight: '#F3F4F6',
} as const;

interface TypographyProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * عنوان المستوى الأول الرئيسي - مع تباعد متناسق ودعم RTL وفونت Arial
 */
export const Heading1: React.FC<TypographyProps> = ({ children, className = '', id }) => {
  return (
    <h1
      id={id}
      className={`text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary leading-tight md:leading-none transition-colors duration-300 ${className}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {children}
    </h1>
  );
};

/**
 * عنوان المستوى الثاني للأقسام
 */
export const Heading2: React.FC<TypographyProps> = ({ children, className = '', id }) => {
  return (
    <h2
      id={id}
      className={`text-xl md:text-2xl font-bold tracking-tight text-text-primary leading-snug transition-colors duration-300 ${className}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {children}
    </h2>
  );
};

/**
 * نصوص المتن العادية
 */
export const BodyText: React.FC<TypographyProps> = ({ children, className = '', id }) => {
  return (
    <p
      id={id}
      className={`text-sm md:text-base text-text-secondary font-normal leading-relaxed transition-colors duration-300 ${className}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {children}
    </p>
  );
};

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'cyan' | 'green' | 'premium' | 'glass';
  glow?: boolean;
}

/**
 * زر تفاعلي متوهج النيون السيبراني مع مؤثرات الحركة والـ Hover
 */
export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'cyan',
  glow = true,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2';
  
  let variantStyles = '';
  if (variant === 'cyan') {
    variantStyles = 'bg-neon-cyan text-black hover:bg-text-primary hover:text-white ' + (glow ? 'shadow-glow-cyan' : '');
  } else if (variant === 'green') {
    variantStyles = 'bg-volt-green text-black hover:bg-text-primary hover:text-white ' + (glow ? 'shadow-glow-green' : '');
  } else if (variant === 'premium') {
    variantStyles = 'bg-gradient-to-r from-premium-gold to-amber-500 text-white hover:from-text-primary hover:to-text-primary shadow-[0_0_15px_rgba(255,215,0,0.35)]';
  } else {
    variantStyles = 'glass-panel text-text-primary border-border-custom hover:border-neon-cyan/50 hover:text-neon-cyan';
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
      {...props}
    >
      {children}
    </button>
  );
};

interface GemZLogoProps {
  size?: number;
  glow?: boolean;
}

/**
 * شعار الشعلة الهندسية المبتكر الفاخر GEM Z (شعار متجهات SVG يدمج G و Z)
 */
export const GemZLogo: React.FC<GemZLogoProps> = ({ size = 48, glow = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={glow ? 'drop-shadow-[0_0_8px_rgba(0,240,255,0.45)]' : ''}
    >
      <defs>
        {/* تدرج الألوان المتوهج */}
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="100%" stopColor="#39FF14" />
        </linearGradient>
        
        {/* تأثير التظليل والوهج */}
        <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. درع الحماية السداسي المتوهج */}
      <polygon
        points="50,5 90,25 90,75 50,95 10,75 10,25"
        stroke="url(#logoGradient)"
        strokeWidth="3.5"
        fill="rgba(18, 18, 26, 0.4)"
        strokeLinejoin="round"
      />
      <polygon
        points="50,12 84,29 84,71 50,88 16,71 16,29"
        stroke="rgba(0, 240, 255, 0.1)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />

      {/* 2. المتجه الخلاط الذي يدمج حرفي G و Z بنسب جمالية */}
      <g filter="url(#glowEffect)">
        {/* مسار يمثل القوس الخارجي لحرف G ومضلع الـ Z */}
        <path
          d="M 70,35 Q 50,20 30,35 T 30,65 Q 50,80 70,65"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 45,50 L 70,50 L 45,72 L 70,72"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* النقطة المركزية الفاقعة */}
        <circle cx="50" cy="50" r="4" fill="#39FF14" />
      </g>
    </svg>
  );
};
