'use client';

import React from 'react';
import { useAuthStore } from '../store/use-store';
import { Heading2, BodyText } from '../theme/design-tokens';
import { PlatformSealService } from './platform-seal.service';
import { Award, Cpu, ShieldAlert, Sparkles } from 'lucide-react';

interface LetterheadTemplateProps {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sha256Hash: string;
  tenantId: string;
  date: string;
}

export const LetterheadTemplate: React.FC<LetterheadTemplateProps> = ({
  titleAr,
  titleEn,
  bodyAr,
  bodyEn,
  sha256Hash,
  tenantId,
  date,
}) => {
  const { lang, theme } = useAuthStore();
  const isAr = lang === 'ar';

  const sealBase64 = PlatformSealService.generatePlatformSealBase64(tenantId, date, lang);

  // Bilingual translation dictionary for Letterhead
  const letterDict = {
    ar: {
      enterprise: 'مؤسسة جيم زد الرياضية العالمية',
      subTitle: 'بوابات الأنظمة المشتركة وحوكمة صالات الفرنشايز بمصر',
      verifyBadge: 'ختم وثيقة معتمد',
      hashLabel: 'بصمة التحقق التشفيرية المعتمدة (SHA-256 Monthly Ledger Signature):',
      warning: 'تنبيه أمني: هذه الوثيقة الموقعة إلكترونياً غير قابلة للتعديل أو المسح من قواعد البيانات بموجب قوانين الحوكمة الضريبية.',
    },
    en: {
      enterprise: 'GEM Z Global Fitness Corporation',
      subTitle: 'Multi-Branch SaaS Fitness Systems & Fiscal Compliance OS',
      verifyBadge: 'OFFICIAL DOCUMENT VERIFIED',
      hashLabel: 'Cryptographic Transaction Ledger Signature Footprint (SHA-256):',
      warning: 'Security Alert: This dynamic B2B ledger template is signed under immutable database rules and cannot be mutated.',
    }
  } as const;

  const t = letterDict[lang];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`glass-panel p-8 rounded-3xl border border-border-custom relative overflow-hidden transition-all duration-300 max-w-4xl mx-auto ${isAr ? 'text-right' : 'text-left bg-card-dark'}`}
    >
      {/* 1. الترويسة العلوية للشركة */}
      <div className="border-b border-border-custom pb-6 mb-6 flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">{t.enterprise}</h2>
          <p className="text-[10px] text-text-muted">{t.subTitle}</p>
        </div>
        
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-border-custom bg-cyber-dark p-1">
          <img src={sealBase64} alt="Validation Seal" className="w-full h-full" />
        </div>
      </div>

      {/* 2. محتوى الخطاب */}
      <div className="space-y-6 min-h-[120px] py-4">
        <Heading2 className="text-text-primary text-base font-black flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-premium-gold" />
          <span>{isAr ? titleAr : titleEn}</span>
        </Heading2>
        
        <BodyText className="text-xs leading-relaxed text-text-secondary">
          {isAr ? bodyAr : bodyEn}
        </BodyText>
      </div>

      {/* 3. تنبيه أمني */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] rounded-xl p-3 flex items-center gap-2 mt-8">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span>{t.warning}</span>
      </div>

      {/* 4. تذييل الوثيقة المحمي */}
      <div className="border-t border-border-custom pt-4 mt-6 text-[8px] font-mono text-text-muted space-y-1.5 leading-normal">
        <p className="font-bold">{t.hashLabel}</p>
        <p className="bg-[#0B0B0F]/30 p-2 rounded border border-border-custom text-neon-cyan select-all break-all tracking-wider text-center">
          {sha256Hash}
        </p>
      </div>
    </div>
  );
};
