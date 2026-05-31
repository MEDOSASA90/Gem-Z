'use client';

import React from 'react';
import { PlatformSealService } from './platform-seal.service';
import { Heading2, BodyText } from '../theme/design-tokens';
import { FileText, Calendar, CheckSquare } from 'lucide-react';
import { useAuthStore } from '../store/use-store';

interface ContractTemplateProps {
  masterHqName: string;
  branchName: string;
  regionalTaxId: string;
  effectiveDate: string;
  tenantId: string;
  isRtl?: boolean;
}

export const ContractTemplate: React.FC<ContractTemplateProps> = ({
  masterHqName,
  branchName,
  regionalTaxId,
  effectiveDate,
  tenantId,
  isRtl = true,
}) => {
  const { lang, theme } = useAuthStore();
  
  // Dynamic rotated platform secure seal SVG in Base64
  const platformSealBase64 = PlatformSealService.generatePlatformSealBase64(tenantId, effectiveDate, lang);

  // Bilingual translation dictionary for B2B Contract Agreement
  const contractDict = {
    ar: {
      badge: 'اتفاقية مستندات جيم زد الموثقة',
      title: 'عقد اتفاقية تشغيل واستغلال فرع رياضى للفرنشايز',
      tenantLabel: 'المستأجر الموثق',
      licensor: 'المقر الرئيسي (المرخِّص)',
      licensee: 'الفرع الإقليمي (المرخَّص له)',
      taxId: 'الرقم الضريبي الإقليمي',
      article1Title: 'البند الأول: موضوع رخصة التشغيل',
      article1Desc: `بموجب هذا العقد، يمنح المقر الرئيسي [${masterHqName || 'شركة جيم زد العالمية المحدودة'}] للفرع الإقليمي [${branchName || 'فرع القاهرة الرياضي الإقليمي'}] رخصة تشغيل واستخدام التطبيقات التقدمية (PWA) للمنصة، وإحصائيات تتبع الموظفين، وتقاسم الأرباح بنسبة توزيع إيرادات تلقائية تبلغ (20.00% للمقر و 80.00% للفرع).`,
      article2Title: 'البند الثاني: الامتثال الضريبي والفوترة الإلكترونية',
      article2Desc: 'يلتزم الطرف الثاني بتطبيق نظام الفوترة الضريبية الإلكترونية للمنصة، وتوثيق المعاملات المالية الموزعة ببصمة تشفيرية رقمية SHA-256 معتمدة محلياً (EG-ETA / SA-ZATCA) ومسجلة في الدفتر المحاسبي المقسم شهرياً.',
      dateLabel: 'تاريخ النفاذ والتشغيل المعتمد:',
      sigLicensor: 'توقيع واعتماد المنصة والمقر الرئيسي',
      sigLicensee: 'توقيع واعتماد مشغل الفرع الإقليمي',
      licNo: 'رقم ترخيص النظام الموحد: Z-LIC-9092',
      taxCert: 'الرقم الضريبي الموثق للفرنشايز: ',
    },
    en: {
      badge: 'GEM Z SECURE DIGITAL AGREEMENT',
      title: 'Franchise & Branch Operations Service Level Agreement',
      tenantLabel: 'Verified Tenant Account',
      licensor: 'Master Gym HQ (Licensor)',
      licensee: 'Regional Gym Branch (Licensee)',
      taxId: 'Regional Tax Registry ID',
      article1Title: 'Article 1: Scope of Operational License',
      article1Desc: `Under this contract, the Master Gym HQ [${masterHqName || 'GEM Z Global Ltd'}] grants the regional branch [${branchName || 'Cairo Regional Gym'}] a strict operational license to deploy GEM Z PWA dashboard services, utilize trainee biometric sensor tracking models, and route automated franchise splits of 80% directly to available merchant assets.`,
      article2Title: 'Article 2: Fiscal Compliance & Ledger Signatures',
      article2Desc: 'The Licensee commits to absolute fiscal compliance, validating trainee checkout receipts with Egypt ETA-compliant billing envelopes and signing ledger transactions with SHA-256 cryptographic footprints locked in monthly partitioned database tables.',
      dateLabel: 'Commencement Effective Date:',
      sigLicensor: 'Licensor Authorized Seal & Signature',
      sigLicensee: 'Licensee Authorized Seal & Signature',
      licNo: 'Unified Ecosystem License ID: Z-LIC-9092',
      taxCert: 'Tax Registration Certificate: ',
    }
  } as const;

  const t = contractDict[lang];
  const isRtlLayout = lang === 'ar';

  return (
    <div
      dir={isRtlLayout ? 'rtl' : 'ltr'}
      className={`glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden max-w-4xl mx-auto shadow-2xl border border-border-custom text-gray-200 transition-all duration-300 ${isRtlLayout ? 'text-right' : 'text-left bg-card-dark'}`}
    >
      {/* 1. شعار خلفي مائي خافت جداً */}
      <div className="absolute -right-24 -bottom-24 w-96 h-96 opacity-[0.02] pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none" stroke="#00F0FF" strokeWidth="8">
          <path d="M 100,100 L 200,100 L 100,200 L 200,200" />
        </svg>
      </div>

      {/* 2. ترويسة العقد الفنية */}
      <div className="border-b border-border-custom pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neon-cyan">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">{t.badge}</span>
          </div>
          <Heading2 className="text-text-primary text-xl md:text-2xl font-extrabold text-glow-cyan">
            {t.title}
          </Heading2>
        </div>
        
        <div className="glass-panel px-4 py-2 rounded-xl text-center border-volt-green/20">
          <p className="text-[10px] text-text-muted font-semibold">{t.tenantLabel}</p>
          <p className="text-xs font-bold text-volt-green tracking-wide">{tenantId}</p>
        </div>
      </div>

      {/* 3. بيانات العقد والمتغيرات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-[#0B0B0F]/45 border border-border-custom rounded-2xl p-4 text-xs">
        <div className="space-y-1">
          <span className="text-text-muted font-semibold">{t.licensor}</span>
          <p className="text-text-primary font-bold">{masterHqName || 'شركة جيم زد العالمية المحدودة'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-text-muted font-semibold">{t.licensee}</span>
          <p className="text-volt-green font-bold">{branchName || 'فرع القاهرة الرياضي الإقليمي'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-text-muted font-semibold">{t.taxId}</span>
          <p className="text-neon-cyan font-bold tracking-wider">{regionalTaxId || '300998822100003'}</p>
        </div>
      </div>

      {/* 4. البنود القانونية والتشغيلية الموحدة */}
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed mb-8">
        <div className="space-y-2">
          <h4 className="text-text-primary font-bold text-xs flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-neon-cyan" />
            <span>{t.article1Title}</span>
          </h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t.article1Desc}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-text-primary font-bold text-xs flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-volt-green" />
            <span>{t.article2Title}</span>
          </h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t.article2Desc}
          </p>
        </div>
      </div>

      {/* 5. تواريخ التعاقد */}
      <div className="flex items-center gap-2 bg-text-muted/5 border border-border-custom rounded-xl px-4 py-2.5 w-fit mb-10 text-xs">
        <Calendar className="w-4 h-4 text-neon-cyan" />
        <span>{t.dateLabel}</span>
        <strong className="text-text-primary font-mono tracking-wider">{effectiveDate}</strong>
      </div>

      {/* 6. كتل التوقيع والأختام الرقمية (Digital Signatures & Rotated Stamp Overlay) */}
      <div className="border-t border-border-custom pt-8 grid grid-cols-2 gap-8 items-end relative" style={{ direction: isRtlLayout ? 'rtl' : 'ltr' }}>
        
        {/* التوقيع الأول: المقر الرئيسي والمنصة */}
        <div className={`space-y-2 ${isRtlLayout ? 'text-right' : 'text-left'}`}>
          <span className="text-[10px] text-text-muted font-bold block">{t.sigLicensor}</span>
          <div className="h-16 border-b border-dashed border-border-custom flex items-center justify-center font-serif text-neon-cyan text-[10px] sm:text-xs italic tracking-widest relative">
            GEM Z SECURE DIGITAL SIGNATURE
            
            {/* ختم التحقق المتوهج والمائل بـ 12 درجة مطبوع فوق حقل التوقيع */}
            <div className={`absolute w-24 h-24 opacity-85 pointer-events-none transform hover:scale-110 transition-transform ${
              isRtlLayout ? 'rotate-12 -top-6 -right-6' : 'rotate-12 -top-6 -left-6'
            }`}>
              <img src={platformSealBase64} alt="Platform Secure Seal" className="w-full h-full" />
            </div>
          </div>
          <span className="text-[8px] text-text-muted font-semibold">{t.licNo}</span>
        </div>

        {/* التوقيع الثاني: الفرع الإقليمي */}
        <div className={`space-y-2 ${isRtlLayout ? 'text-right' : 'text-left'}`}>
          <span className="text-[10px] text-text-muted font-bold block">{t.sigLicensee}</span>
          <div className="h-16 border-b border-dashed border-border-custom flex items-center justify-center font-serif text-volt-green text-[10px] sm:text-xs italic tracking-widest">
            {branchName.toUpperCase()}
          </div>
          <span className="text-[8px] text-text-muted font-semibold">
            {t.taxCert}{regionalTaxId.substring(0, 7)}...
          </span>
        </div>
      </div>
    </div>
  );
};
