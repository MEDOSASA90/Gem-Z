/**
 * =============================================================================
 * DesignSystemModule - نظام المظهر البصري لـ GEM Z
 * =============================================================================
 * - يصدّر جميع ثوابت الألوان والتدرجات والظلال البصرية لضمان المطابقة الكاملة.
 * - يوفّر مكوّنات خطوط متجاوبة ومقيدة ومصممة لدعم اللغتين العربية والإنجليزية.
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

// تدرجات الألوان للنيون السيبراني والوهج الداخلي
export const GRADIENTS = {
  cyber: 'bg-gradient-to-r from-neon-cyan to-volt-green',
  darkGlow: 'bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.8)_0%,_rgba(11,11,15,1)_100%)]',
  premium: 'bg-gradient-to-r from-premium-gold to-yellow-500',
  textCyber: 'bg-gradient-to-r from-neon-cyan to-volt-green bg-clip-text text-transparent',
} as const;

interface TypographyProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * عنوان المستوى الأول الرئيسي - مع تباعد متناسق ودعم RTL
 */
export const Heading1: React.FC<TypographyProps> = ({ children, className = '', id }) => {
  return (
    <h1
      id={id}
      className={`text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight md:leading-none ${className}`}
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
      className={`text-xl md:text-2xl font-bold tracking-tight text-white leading-snug ${className}`}
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
      className={`text-sm md:text-base text-gray-400 font-normal leading-relaxed ${className}`}
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
    variantStyles = 'bg-neon-cyan text-black hover:bg-white hover:text-black ' + (glow ? 'shadow-glow-cyan' : '');
  } else if (variant === 'green') {
    variantStyles = 'bg-volt-green text-black hover:bg-white hover:text-black ' + (glow ? 'shadow-glow-green' : '');
  } else if (variant === 'premium') {
    variantStyles = 'bg-gradient-to-r from-premium-gold to-yellow-500 text-black hover:from-white hover:to-white hover:text-black shadow-[0_0_15px_rgba(255,215,0,0.35)]';
  } else {
    variantStyles = 'glass-panel text-white hover:border-neon-cyan/50 hover:text-neon-cyan';
  }

  return (
    <button className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </button>
  );
};
