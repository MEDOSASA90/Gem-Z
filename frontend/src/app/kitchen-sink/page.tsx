'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../core/store/use-store';
import { Heading2, BodyText, NeonButton, GemZLogo } from '../../core/theme/design-tokens';
import { PlatformSealService } from '../../core/templates/platform-seal.service';
import { ContractTemplate } from '../../core/templates/contract-template';
import { LetterheadTemplate } from '../../core/templates/letterhead-template';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Sliders,
  ChevronLeft,
  Languages,
  Sun,
  Moon,
  Sparkles,
  Award,
} from 'lucide-react';

export default function KitchenSinkPage() {
  const { lang, theme, toggleLang, toggleTheme } = useAuthStore();
  const router = useRouter();

  const isAr = lang === 'ar';

  // Bilingual translation dictionary for Kitchen Sink
  const sinkDict = {
    ar: {
      title: 'منصة حوكمة الوثائق والمخططات الفنية (Document & Verification Engine)',
      subtitle: 'لوحة تفاعلية موحدة لاستعراض الهوية الفنية، معايير التصميم، وعقود الفرنشايز الموقعة رقمياً.',
      sealTitle: 'مولد أختام التحقق الرقمي المبرمج (Platform Seal Service)',
      sealDesc: 'توليد أختام متجهة (SVG) مشفرة وموقعة برقم المستأجر وتاريخ الفحص الحقيقي.',
      contractTitle: 'معاينة عقد اتفاقية تشغيل الصالات والفروع (Franchise B2B Contract)',
      letterheadTitle: 'معاينة الخطابات الرسمية الموثقة بـ SHA-256 (Corporate Letterhead)',
      langToggle: 'تبديل اتجاه القراءة واللغة',
      themeToggle: 'تبديل المظهر البصري',
      btnHome: 'الرجوع للرئيسية',
      adjustTitle: 'لوحة التحكم في متغيرات العقود والوثائق الرسمية',
      hqLabel: 'اسم المقر الرئيسي',
      branchLabel: 'اسم الفرع الرياضي',
      taxLabel: 'الرقم الضريبي الإقليمي',
      dateLabel: 'تاريخ الفحص والتعاقد',
      tenantLabel: 'رقم المستأجر الموثق',
      letterSubject: 'موضوع الخطاب الرسمي',
      letterContent: 'تفاصيل ومضمون الخطاب',
      subjectVal: 'الموافقة على تسييل تسويات أرباح فروع القاهرة الرياضية',
      bodyVal: 'بموجب هذا الإقرار الصادر من المقر الرئيسي لـ GEM Z بالقاهرة، يتم اعتماد وتسييل كافة أرصدة الضمان المالي المجدولة للفرع الإقليمي بالتجمع الخامس فور التحقق من مطابقة حركة خطوات المتدربين النشطين (Cadence Index) مع الـ GPS وخلوها من الغش.',
    },
    en: {
      title: 'Document & Verification Engine (Kitchen Sink)',
      subtitle: 'Unified interactive checkboard showcasing dynamic brand identities, B2B operational templates, and SVG platform stamps.',
      sealTitle: 'Programmatic SVG Circular Stamp Generator (Platform Seal Service)',
      sealDesc: 'Generate secure Base64 vector seals with customized verified timestamps and tenant scopes.',
      contractTitle: 'B2B Franchise & Branch Agreement Overlay Mock',
      letterheadTitle: 'Cryptographic Corporate Letterhead Audit Mock',
      langToggle: 'Toggle Direction & Language',
      themeToggle: 'Toggle Theme Style',
      btnHome: 'Return to Landing',
      adjustTitle: 'Live Template Variables Controller Board',
      hqLabel: 'Master Gym HQ Name',
      branchLabel: 'Regional Branch Name',
      taxLabel: 'Tax Registration ID',
      dateLabel: 'Verified Date',
      tenantLabel: 'Active Tenant ID',
      letterSubject: 'Official Subject Title',
      letterContent: 'Letterhead Body Copy',
      subjectVal: 'Reconciliation approval for Cairo regional franchise payouts',
      bodyVal: 'Under this B2B certification issued by GEM Z Master Gym HQ, all locked escrow balances registered under Cairo Fifth Settlement branch are cleared for liquidation upon verified Cadence stepper velocity checks.',
    }
  } as const;

  const t = sinkDict[lang];

  // Editable parameters state
  const [hqName, setHqName] = useState(isAr ? 'شركة جيم زد القابضة للاستثمار الرياضي - القاهرة' : 'GEM Z Egypt Holding - Cairo');
  const [branchName, setBranchName] = useState(isAr ? 'فرع القاهرة التجمع الخامس الإقليمي' : 'Cairo Fifth Settlement Gym');
  const [taxId, setTaxId] = useState('123456789');
  const [dateVal, setDateVal] = useState('2026-05-31');
  const [tenantId, setTenantId] = useState('GEMZ-EG-CAIRO-902');
  const [subject, setSubject] = useState<string>(t.subjectVal);
  const [body, setBody] = useState<string>(t.bodyVal);

  const sealBase64 = PlatformSealService.generatePlatformSealBase64(tenantId, dateVal, lang);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-cyber-dark text-text-primary p-4 sm:p-6 lg:p-8 space-y-12 transition-all duration-300"
    >
      
      {/* 1. رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom pb-4">
        <div className="flex items-center gap-3">
          <GemZLogo size={42} glow={theme === 'dark'} />
          <div className={isAr ? 'text-right' : 'text-left'}>
            <h1 className="text-lg md:text-xl font-black text-text-primary">{t.title}</h1>
            <BodyText className="text-xs">{t.subtitle}</BodyText>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* تبديل اللغة */}
          <button
            onClick={toggleLang}
            className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 hover:border-neon-cyan/50 text-xs font-bold transition-all cursor-pointer text-text-primary"
          >
            <Languages className="w-4 h-4 text-neon-cyan" />
            <span>{t.langToggle}</span>
          </button>

          {/* تبديل السيم */}
          <button
            onClick={toggleTheme}
            className="glass-panel p-2 rounded-xl flex items-center justify-center hover:border-neon-cyan/50 transition-all cursor-pointer text-text-primary"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-premium-gold" /> : <Moon className="w-4 h-4 text-purple-600" />}
          </button>

          <NeonButton variant="glass" onClick={() => router.push('/')} className="text-xs py-2 px-4">
            <ChevronLeft className="w-4 h-4 rtl-flip" />
            <span>{t.btnHome}</span>
          </NeonButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* العمود الأول: لوحة التحكم الجانبية بالمتغيرات */}
        <div className="lg:col-span-4 space-y-6">
          <section className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 border-b border-border-custom pb-3 text-neon-cyan">
              <Sliders className="w-5 h-5" />
              <Heading2 className="text-xs text-text-primary font-bold">{t.adjustTitle}</Heading2>
            </div>

            <div className="space-y-4 text-xs">
              {/* المقر الرئيسي */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.hqLabel}</label>
                <input
                  type="text"
                  value={hqName}
                  onChange={(e) => setHqName(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>

              {/* الفرع الإقليمي */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.branchLabel}</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>

              {/* الرقم الضريبي */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.taxLabel}</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>

              {/* تاريخ التعاقد */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.dateLabel}</label>
                <input
                  type="date"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>

              {/* رقم المستأجر */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.tenantLabel}</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>

              {/* عنوان الخطاب */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.letterSubject}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>

              {/* محتوى الخطاب */}
              <div className="space-y-1">
                <label className="text-text-muted font-bold block">{t.letterContent}</label>
                <textarea
                  value={body}
                  rows={4}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-[#0B0B0F]/45 text-text-primary border border-border-custom rounded-xl px-3 py-2 outline-none focus:border-neon-cyan"
                />
              </div>
            </div>
          </section>
        </div>

        {/* العمود الثاني: لوحة استعراض قوالب الأختام والمستندات وعقود الفروع */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* ختم المنصة الدائري المبرمج */}
          <section className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 border-b border-border-custom pb-3 text-volt-green">
              <Award className="w-5 h-5" />
              <Heading2 className="text-base">{t.sealTitle}</Heading2>
            </div>
            <BodyText className="text-xs">{t.sealDesc}</BodyText>

            <div className="flex items-center justify-center py-6 bg-card-dark/20 rounded-2xl border border-border-custom">
              <div className="w-48 h-48 transition-transform transform hover:scale-105 duration-300">
                <img src={sealBase64} alt="Platform Seal" className="w-full h-full" />
              </div>
            </div>
          </section>

          {/* معاينة العقد B2B مع الختم المائل المطبوع */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-2">{t.contractTitle}</h3>
            <ContractTemplate
              tenantId={tenantId}
              masterHqName={hqName}
              branchName={branchName}
              regionalTaxId={taxId}
              effectiveDate={dateVal}
              isRtl={isAr}
            />
          </section>

          {/* معاينة الخطاب المحمي بـ SHA-256 */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-2">{t.letterheadTitle}</h3>
            <LetterheadTemplate
              titleAr={subject}
              titleEn={subject}
              bodyAr={body}
              bodyEn={body}
              sha256Hash="98bb77f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9ca3f9d8c7b6a5e4d3c2b1a0f9e8dc"
              tenantId={tenantId}
              date={dateVal}
            />
          </section>

        </div>

      </div>
    </div>
  );
}
