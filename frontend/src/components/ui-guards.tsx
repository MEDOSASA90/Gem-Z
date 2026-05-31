'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { NeonButton, Heading2, BodyText } from '../core/theme/design-tokens';

interface SkeletonProps {
  className?: string;
}

/**
 * هيكل شبكي متوهج ومتحرك (Shimmering Skeleton Loader)
 */
export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`glass-panel p-6 rounded-2xl animate-pulse space-y-4 ${className}`}>
      {/* رأس الهيكل */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-700/50" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-700/50 rounded-md w-1/3" />
          <div className="h-3 bg-gray-700/30 rounded-md w-1/4" />
        </div>
      </div>
      
      {/* محتوى المحفظة أو الأرقام */}
      <div className="space-y-2 pt-2">
        <div className="h-8 bg-gray-700/50 rounded-lg w-1/2" />
        <div className="h-3 bg-gray-700/30 rounded-md w-full" />
        <div className="h-3 bg-gray-700/30 rounded-md w-5/6" />
      </div>
      
      {/* أزرار أو تفاصيل مؤقتة */}
      <div className="flex gap-2 pt-2">
        <div className="h-10 bg-gray-700/50 rounded-xl w-24" />
        <div className="h-10 bg-gray-700/30 rounded-xl w-24" />
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  loading?: boolean;
}

/**
 * مكوّن الحالة الفارغة التفاعلي (Interactive EmptyState)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  onRetry,
  loading = false,
}) => {
  return (
    <div className="glass-panel-glow p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
      {/* أيقونة الحالة الفارغة المحاطة بدائرة نيون */}
      <div className="w-16 h-16 rounded-full bg-neon-cyan/10 border border-neon-cyan/25 flex items-center justify-center text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]">
        <AlertCircle className="w-8 h-8" />
      </div>
      
      {/* النصوص والتحذير */}
      <div className="space-y-2">
        <Heading2 className="text-glow-cyan text-neon-cyan">{title}</Heading2>
        <BodyText className="text-gray-400 px-4">{description}</BodyText>
      </div>
      
      {/* زر المحاولة المتكررة */}
      {onRetry && (
        <NeonButton
          variant="cyan"
          glow={true}
          onClick={onRetry}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'جاري التحديث...' : 'إعادة المحاولة'}
        </NeonButton>
      )}
    </div>
  );
};
