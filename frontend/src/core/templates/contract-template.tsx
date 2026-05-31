'use client';

import React from 'react';
import { PlatformSealService } from './platform-seal.service';
import { Heading2, BodyText, COLORS } from '../theme/design-tokens';
import { ShieldCheck, FileText, Calendar, CheckSquare } from 'lucide-react';

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
  // توليد الختم الرقمي المتوهج للمنصة بصيغة Base64 وتدويره بـ 45 درجة فوق حقل التوقيع
  const platformSealBase64 = PlatformSealService.generatePlatformSealBase64(tenantId, effectiveDate);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden max-w-4xl mx-auto shadow-2xl border border-white/10 text-right transition-all duration-300 text-gray-200"
    >
      {/* 1. شعار خلفي مائي خافت جداً */}
      <div className="absolute -right-24 -bottom-24 w-96 h-96 opacity-[0.02] pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none" stroke="#00F0FF" strokeWidth="8">
          <path d="M 100,100 L 200,100 L 100,200 L 200,200" />
        </svg>
      </div>

      {/* 2. ترويسة العقد الفنية (Volt Green header accent) */}
      <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-neon-cyan">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">GEM Z ENTERPRISE CONTRACT</span>
          </div>
          <Heading2 className="text-white text-xl md:text-2xl font-extrabold text-glow-cyan">
            {isRtl ? 'عقد اتفاقية تشغيل واستغلال فرع رياضى' : 'B2B Franchise & Branch Operations Agreement'}
          </Heading2>
        </div>
        
        <div className="glass-panel px-4 py-2 rounded-xl text-center border-volt-green/20">
          <p className="text-[10px] text-gray-400 font-semibold">{isRtl ? 'المستأجر النشط' : 'Active Tenant'}</p>
          <p className="text-xs font-bold text-volt-green tracking-wide">{tenantId}</p>
        </div>
      </div>

      {/* 3. بيانات العقد والمتغيرات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-cyber-dark/40 border border-white/5 rounded-2xl p-4 text-xs">
        <div className="space-y-1">
          <span className="text-gray-500 font-semibold">{isRtl ? 'المقر الرئيسي (المرخِّص)' : 'Master Gym HQ (Licensor)'}</span>
          <p className="text-white font-bold">{masterHqName || 'شركة جيم زد العالمية المحدودة'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-gray-500 font-semibold">{isRtl ? 'الفرع الإقليمي (المرخَّص له)' : 'Regional Branch (Licensee)'}</span>
          <p className="text-volt-green font-bold">{branchName || 'فرع القاهرة الرياضي الإقليمي'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-gray-500 font-semibold">{isRtl ? 'الرقم الضريبي الإقليمي' : 'Regional Tax Registration ID'}</span>
          <p className="text-neon-cyan font-bold tracking-wider">{regionalTaxId || '300998822100003'}</p>
        </div>
      </div>

      {/* 4. البنود القانونية والتشغيلية الموحدة */}
      <div className="space-y-6 text-sm text-gray-300 leading-relaxed mb-8">
        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-neon-cyan" />
            <span>{isRtl ? 'البند الأول: موضوع الاتفاقية' : 'Article 1: Scope of License'}</span>
          </h4>
          <p className="text-xs text-gray-400">
            {isRtl 
              ? `بموجب هذا العقد، يمنح المقر الرئيسي [${masterHqName}] للفرع الإقليمي [${branchName}] رخصة تشغيل واستخدام التطبيقات التقدمية (PWA) للمنصة، وإحصائيات تتبع الموظفين، وتقاسم الأرباح بنسبة توزيع إيرادات تلقائية تبلغ (20.00% للمقر و 80.00% للفرع).`
              : `Under this contract, the Master Gym HQ [${masterHqName}] grants the regional branch [${branchName}] a strict operational license to deploy GEM Z PWA dashboard services and receive automated revenue splits of 80% directly to withdrawable merchant assets.`}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-volt-green" />
            <span>{isRtl ? 'البند الثاني: الامتثال الضريبي والفوترة الإلكترونية' : 'Article 2: Fiscal Compliance & Signatures'}</span>
          </h4>
          <p className="text-xs text-gray-400">
            {isRtl 
              ? `يلتزم الطرف الثاني بتطبيق نظام الفوترة الضريبية الإلكترونية للمنصة، وتوثيق المعاملات المالية الموزعة ببصمة تشفيرية رقمية SHA-256 معتمدة محلياً (EG-ETA / SA-ZATCA) ومسجلة في الدفتر المحاسبي المقسم شهرياً.`
              : `The Licensee commits to absolute fiscal compliance, validating checkout receipts with localized digital signatures (SHA-256) locked in monthly range-partitioned ledger tables.`}
          </p>
        </div>
      </div>

      {/* 5. تواريخ التعاقد */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 w-fit mb-10 text-xs">
        <Calendar className="w-4 h-4 text-neon-cyan" />
        <span>{isRtl ? 'تاريخ النفاذ والتشغيل المعتمد:' : 'Effective Commencement Date:'}</span>
        <strong className="text-white font-mono tracking-wider">{effectiveDate}</strong>
      </div>

      {/* 6. كتل التوقيع والأختام الرقمية (Digital Signatures & Rotated Stamp Overlay) */}
      <div className="border-t border-white/10 pt-8 grid grid-cols-2 gap-8 items-end relative">
        
        {/* التوقيع الأول: المقر الرئيسي والمنصة */}
        <div className="space-y-2 text-right">
          <span className="text-[10px] text-gray-500 font-bold block">{isRtl ? 'توقيع واعتماد المنصة' : 'Licensor Authorized Signature'}</span>
          <div className="h-16 border-b border-dashed border-white/20 flex items-center justify-center font-serif text-neon-cyan text-sm italic tracking-widest relative">
            GEM Z SECURE DIGITAL SIGNATURE
            
            {/* ختم التحقق المتوهج والمائل بـ 45 درجة مطبوع فوق حقل التوقيع */}
            <div className="absolute w-28 h-28 opacity-80 rotate-12 -top-6 -right-6 pointer-events-none transform hover:scale-110 transition-transform">
              <img src={platformSealBase64} alt="Platform Secure Seal" className="w-full h-full" />
            </div>
          </div>
          <span className="text-[9px] text-gray-400 font-semibold">{isRtl ? 'رقم ترخيص النظام: Z-LIC-9092' : 'Ecosystem license: Z-LIC-9092'}</span>
        </div>

        {/* التوقيع الثاني: الفرع الإقليمي */}
        <div className="space-y-2 text-right">
          <span className="text-[10px] text-gray-500 font-bold block">{isRtl ? 'توقيع واعتماد مشغل الفرع' : 'Licensee Authorized Signature'}</span>
          <div className="h-16 border-b border-dashed border-white/20 flex items-center justify-center font-serif text-volt-green text-sm italic tracking-widest">
            {branchName.toUpperCase()}
          </div>
          <span className="text-[9px] text-gray-400 font-semibold">
            {isRtl ? `الرقم الضريبي الموثق: ${regionalTaxId.substring(0, 7)}...` : `Tax Registration: ${regionalTaxId.substring(0, 7)}...`}
          </span>
        </div>
      </div>
    </div>
  );
};
