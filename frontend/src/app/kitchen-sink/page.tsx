'use client';

import React, { useState } from 'react';
import { Heading1, Heading2, BodyText, NeonButton, COLORS, GRADIENTS } from '../../core/theme/design-tokens';
import { SkeletonCard, EmptyState } from '../../components/ui-guards';
import {
  Languages,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layout,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function KitchenSinkPage() {
  const [isRtl, setIsRtl] = useState(true);
  const [emptyStateLoading, setEmptyStateLoading] = useState(false);
  const [emptyStateRetries, setEmptyStateRetries] = useState(0);

  const handleEmptyStateRetry = () => {
    setEmptyStateLoading(true);
    setTimeout(() => {
      setEmptyStateLoading(false);
      setEmptyStateRetries((prev) => prev + 1);
    }, 1500);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0B0B0F] bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.65)_0%,_rgba(11,11,15,1)_100%)] text-white p-6 md:p-12 font-sans transition-all duration-500"
    >
      {/* رأس الصفحة */}
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6 text-right">
        <div className="space-y-2 text-right">
          <div className="inline-flex items-center gap-2 bg-volt-green/10 border border-volt-green/20 px-3 py-1 rounded-full text-xs font-bold text-volt-green">
            <Layout className="w-3.5 h-3.5" />
            <span>DESIGN SYSTEM SYSTEM-WIDE CHECKBOARD</span>
          </div>
          <Heading1 className="text-glow-cyan text-transparent bg-gradient-to-r from-neon-cyan to-volt-green bg-clip-text">
            {isRtl ? 'لوحة فحص رموز الهوية البصرية' : 'Branding Tokens Kitchen Sink'}
          </Heading1>
          <BodyText>
            {isRtl
              ? 'مساحة الفحص المرئي والامتثال للهوية البصرية لمشروع GEM Z تحت قواعد التحول المرن والقراءة العربي RTL.'
              : 'Visual testing board verifying typography, padding, color tokens, and interactive components under LTR & RTL flows.'}
          </BodyText>
        </div>

        {/* منتقي التوجيه واللغة */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsRtl(!isRtl)}
            className="neon-btn px-4 py-2 bg-neon-cyan text-black font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-white transition-colors cursor-pointer"
          >
            <Languages className="w-4 h-4" />
            <span>{isRtl ? 'English Layout (LTR)' : 'تخطيط عربي (RTL)'}</span>
          </button>
          
          <a
            href="/"
            className="glass-panel px-4 py-2 rounded-xl text-xs font-bold hover:text-neon-cyan transition-colors"
          >
            {isRtl ? 'العودة للرئيسية' : 'Back to Landing'}
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* العمود الأول: لوحات الألوان والتدرجات والخطوط (أقسام التصميم) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* 1. لوحة فحص الألوان الأساسية */}
          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <Heading2 className="border-b border-white/5 pb-2">{isRtl ? 'رموز الألوان الأساسية (Design Tokens)' : 'Primary Color Tokens'}</Heading2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* لون Cyber Dark */}
              <div className="space-y-1.5">
                <div className="w-full h-12 rounded-xl bg-[#0B0B0F] border border-white/10" />
                <p className="text-xs font-bold text-white">Cyber Dark</p>
                <code className="text-[10px] text-gray-500 font-mono">#0B0B0F</code>
              </div>

              {/* لون Card Dark */}
              <div className="space-y-1.5">
                <div className="w-full h-12 rounded-xl bg-[#12121A] border border-white/10" />
                <p className="text-xs font-bold text-white">Card Dark</p>
                <code className="text-[10px] text-gray-500 font-mono">#12121A</code>
              </div>

              {/* لون Neon Cyan */}
              <div className="space-y-1.5">
                <div className="w-full h-12 rounded-xl bg-[#00F0FF] shadow-glow-cyan" />
                <p className="text-xs font-bold text-white">Neon Cyan</p>
                <code className="text-[10px] text-gray-500 font-mono">#00F0FF</code>
              </div>

              {/* لون Volt Green */}
              <div className="space-y-1.5">
                <div className="w-full h-12 rounded-xl bg-[#39FF14] shadow-glow-green" />
                <p className="text-xs font-bold text-white">Volt Green</p>
                <code className="text-[10px] text-gray-500 font-mono">#39FF14</code>
              </div>

              {/* لون Premium Gold */}
              <div className="space-y-1.5">
                <div className="w-full h-12 rounded-xl bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.3)]" />
                <p className="text-xs font-bold text-white">Premium Gold</p>
                <code className="text-[10px] text-gray-500 font-mono">#FFD700</code>
              </div>
            </div>
          </section>

          {/* 2. تدرجات الألوان الفاقعة */}
          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <Heading2 className="border-b border-white/5 pb-2">{isRtl ? 'التدرجات اللونية (Linear & Radial Gradients)' : 'Branding Gradients'}</Heading2>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Cyber Accent Gradient (`gradient-cyber`)</p>
                <div className="w-full h-10 rounded-xl bg-gradient-to-r from-neon-cyan to-volt-green shadow-glow-cyan" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Premium VIP Gradient (`gradient-premium`)</p>
                <div className="w-full h-10 rounded-xl bg-gradient-to-r from-premium-gold to-yellow-500 shadow-[0_0_15px_rgba(255,215,0,0.15)]" />
              </div>
            </div>
          </section>

          {/* 3. أحجام الخطوط والتدرج الجغرافي */}
          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <Heading2 className="border-b border-white/5 pb-2">{isRtl ? 'مكونات النصوص والطباعة (Typography Scale)' : 'Typography Scales'}</Heading2>
            <div className="space-y-4 text-right">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-neon-cyan">Heading1 (32px / 48px)</span>
                <Heading1>العنوان الرئيسي المتجاوب GEM Z</Heading1>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-volt-green">Heading2 (20px / 24px)</span>
                <Heading2>العناوين الفرعية والأقسام المتناسقة</Heading2>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-premium-gold">BodyText (14px / 16px)</span>
                <BodyText>
                  هذا النص يمثل فقرة المتن العادية المستخدمة في التقارير الطبية وإحصائيات تتبع الموظفين، مصمم ليتناسب تماماً مع قواعد الخط المعتمدة ودعم التوزيع.
                </BodyText>
              </div>
            </div>
          </section>

        </div>

        {/* العمود الثاني: الأزرار التفاعلية والهياكل الشبكية وحالة الأخطاء الفارغة */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* 4. فحص الأزرار والـ Hover التفاعلية */}
          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <Heading2 className="border-b border-white/5 pb-2">{isRtl ? 'الأزرار التفاعلية والوهج (Neon Glow Buttons)' : 'Interactive Buttons'}</Heading2>
            <div className="flex flex-col gap-3">
              <NeonButton variant="cyan">{isRtl ? 'زر أزرق سيبراني متوهج' : 'Neon Cyan Glow'}</NeonButton>
              <NeonButton variant="green">{isRtl ? 'زر أخضر متوهج فاقع' : 'Neon Volt Green'}</NeonButton>
              <NeonButton variant="premium">{isRtl ? 'زر ذهبي ملكي مميز' : 'VIP Gold Access'}</NeonButton>
              <NeonButton variant="glass">{isRtl ? 'زر زجاجي مضبب' : 'Glassmorphic Style'}</NeonButton>
            </div>
          </section>

          {/* 5. الهيكل الشبكي المؤقت (Skeleton Loader Check) */}
          <section className="space-y-2">
            <span className="text-xs text-gray-500 font-bold block px-2">
              {isRtl ? 'محاكاة الهيكل الشبكي المتوهج للتحميل' : 'Shimmering Wallet Skeleton'}
            </span>
            <SkeletonCard />
          </section>

          {/* 6. واجهة الأخطاء المرجعية (Empty State & Retry Trigger Check) */}
          <section className="space-y-2">
            <span className="text-xs text-gray-500 font-bold block px-2">
              {isRtl ? 'حالة البيانات الفارغة وإعادة الاتصال' : 'Interactive Empty State Verification'}
            </span>
            <EmptyState
              title={isRtl ? 'لم يتم العثور على أصول مالية' : 'Zero Ledger Transactions'}
              description={
                isRtl
                  ? `لم تسفر عملية الفحص الذري لمحفظتك عن وجود معاملات حالية. عدد محاولات التحديث حتى الآن: ${emptyStateRetries}`
                  : `No credit records fetched for this multi-tenant corporate seat. Refresh attempts: ${emptyStateRetries}`
              }
              onRetry={handleEmptyStateRetry}
              loading={emptyStateLoading}
            />
          </section>

        </div>

      </main>

      {/* التذييل */}
      <footer className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/5 text-center text-xs text-gray-500">
        GEM Z UI BRAND PLATFORM VERIFICATION CORE V5
      </footer>
    </div>
  );
}
