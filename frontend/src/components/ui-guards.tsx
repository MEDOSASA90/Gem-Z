'use client';

import React from 'react';
import { useAuthStore } from '../core/store/use-store';
import { BodyText, Heading2, NeonButton } from '../core/theme/design-tokens';
import { Sparkles, RefreshCw } from 'lucide-react';

/**
 * بطاقة الهياكل العظمية اللامعة لمؤشرات الانتظار (Skeleton Loading Card)
 */
export const SkeletonCard: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-3xl space-y-4 border-border-custom relative overflow-hidden">
      <div className="absolute inset-0 animate-shimmer" />
      <div className="flex justify-between items-center">
        <div className="w-12 h-12 bg-text-muted/15 rounded-2xl" />
        <div className="w-16 h-4 bg-text-muted/15 rounded-md" />
      </div>
      <div className="h-6 w-3/4 bg-text-muted/15 rounded-md" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-text-muted/10 rounded-md" />
        <div className="h-4 w-5/6 bg-text-muted/10 rounded-md" />
      </div>
      <div className="pt-4 border-t border-border-custom flex justify-between">
        <div className="w-16 h-4 bg-text-muted/15 rounded-md" />
        <div className="w-24 h-6 bg-text-muted/20 rounded-md" />
      </div>
    </div>
  );
};

interface EmptyStateProps {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  actionTextAr?: string;
  actionTextEn?: string;
  onAction?: () => void;
}

/**
 * حالة المحتوى الفارغ الفاخرة للوحات مع دعم كامل للغتين (Bilingual EmptyState Overlay)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  titleAr,
  titleEn,
  descAr,
  descEn,
  actionTextAr,
  actionTextEn,
  onAction,
}) => {
  const { lang } = useAuthStore();
  const isAr = lang === 'ar';

  return (
    <div className="glass-panel p-12 rounded-3xl text-center border-border-custom space-y-6 max-w-lg mx-auto flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.08)]">
        <Sparkles className="w-8 h-8" />
      </div>
      
      <div className="space-y-2">
        <Heading2>{isAr ? titleAr : titleEn}</Heading2>
        <BodyText className="text-xs text-text-secondary max-w-sm">
          {isAr ? descAr : descEn}
        </BodyText>
      </div>

      {onAction && actionTextAr && actionTextEn && (
        <NeonButton variant="glass" onClick={onAction} className="text-xs py-2 px-4 flex items-center gap-2 mt-2">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isAr ? actionTextAr : actionTextEn}</span>
        </NeonButton>
      )}
    </div>
  );
};
