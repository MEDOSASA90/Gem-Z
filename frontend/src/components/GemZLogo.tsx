import React from 'react';

interface GemZLogoProps {
    size?: number;
    className?: string;
    /** 'full' = icon + text, 'icon' = gem only */
    variant?: 'full' | 'icon';
}

export default function GemZLogo({ size = 40, className = '', variant = 'full' }: GemZLogoProps) {
    const GemSVG = (
        <svg
            width={size}
            height={size}
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
        >
            <defs>
                <linearGradient id="gFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
                <linearGradient id="gStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
                <linearGradient id="gZ" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-secondary)" />
                    <stop offset="100%" stopColor="var(--color-primary)" />
                </linearGradient>
                <linearGradient id="gFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* Hexagon body */}
            <polygon
                points="22,2 40,11 40,30 22,42 4,30 4,11"
                fill="url(#gFill)"
                fillOpacity="0.08"
                stroke="url(#gStroke)"
                strokeWidth="1.5"
            />

            {/* Upper facet shine */}
            <polygon
                points="22,2 40,11 22,16 4,11"
                fill="url(#gFacet)"
            />

            {/* Z letterform */}
            <path
                d="M14.5 14.5 H29.5 L14.5 25.5 H29.5"
                stroke="url(#gZ)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    if (variant === 'icon') {
        return <span className={className}>{GemSVG}</span>;
    }

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`} style={{ lineHeight: 1 }}>
            {GemSVG}
            <span
                style={{
                    fontFamily: 'var(--font-outfit, Outfit, Inter, sans-serif)',
                    fontWeight: 800,
                    fontSize: size * 0.7,
                    letterSpacing: '-0.03em',
                    background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1,
                    userSelect: 'none',
                }}
            >
                GEM Z
            </span>
        </span>
    );
}
