'use client';

import React from 'react';
import { Heading2, BodyText } from '../theme/design-tokens';
import { ShieldAlert, Cpu, Database, Check } from 'lucide-react';

interface LetterheadTemplateProps {
  recipientName: string;
  referenceNumber: string;
  date: string;
  subject: string;
  messageContent: string;
  sha256Footprint: string;
  isRtl?: boolean;
}

export const LetterheadTemplate: React.FC<LetterheadTemplateProps> = ({
  recipientName,
  referenceNumber,
  date,
  subject,
  messageContent,
  sha256Footprint,
  isRtl = true,
}) => {
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden max-w-4xl mx-auto shadow-2xl border border-white/10 text-right transition-all duration-300 text-gray-200"
    >
      {/* نيون خفيف أعلى المروحة */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-neon-cyan via-premium-gold to-volt-green" />

      {/* 1. الترويسة العليا المنقسمة (Split Header) */}
      <header className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* الجانب الأيمن: شعار الجيم زد والمعرفات الرقمية للنظام */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan to-volt-green p-[1px] shadow-glow-cyan flex items-center justify-center font-black text-neon-cyan text-xl">
            Z
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black tracking-wider text-white">GEM Z GLOBAL</h1>
            <p className="text-[9px] text-gray-500 font-mono tracking-widest">ENTERPRISE CORE NETWORK</p>
          </div>
        </div>

        {/* الجانب الأيسر: بيانات المقر الضريبية والموقع الجغرافي */}
        <div className="text-right space-y-1 text-xs">
          <p className="text-white font-bold">{isRtl ? 'المقر الرئيسي العالمي - جيم زد' : 'Global Master HQ - GEM Z'}</p>
          <p className="text-gray-400">{isRtl ? 'برج نيون، حي المال والتقنية، الرياض' : 'Neon Tower, Tech District, Riyadh'}</p>
          <p className="text-gray-500 font-mono text-[10px]">{isRtl ? 'س.ت: 1010899221 * مصلحة الضرائب' : 'CR: 1010899221 * SA VAT'}</p>
        </div>
      </header>

      {/* 2. مؤشرات التحقق التقني الفوري (Live validation indicators) */}
      <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-4 mb-8 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-volt-green animate-pulse" />
          <span className="text-gray-300 font-bold">
            {isRtl ? 'رقم الإشارة:' : 'Reference ID:'}{' '}
            <span className="text-neon-cyan font-mono tracking-wider">{referenceNumber || 'GEMZ-SEC-2026'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span>{isRtl ? 'تاريخ الاعتماد:' : 'Authorized:'}</span>
          <span className="font-mono text-white font-semibold">{date}</span>
        </div>
      </div>

      {/* 3. بيانات الخطاب والموضوع */}
      <div className="space-y-6 mb-10 text-right">
        <div className="space-y-1">
          <span className="text-xs text-gray-500 font-bold block">{isRtl ? 'إلى الجهة المعنية:' : 'Recipient:'}</span>
          <p className="text-sm font-bold text-white">{recipientName || 'إدارة الصالات والتشغيل الإقليمي لفرع الفرنشايز'}</p>
        </div>

        <div className="space-y-1 border-r-2 border-volt-green pr-4">
          <span className="text-[10px] text-volt-green font-bold block">{isRtl ? 'الموضوع الفني:' : 'Subject:'}</span>
          <Heading2 className="text-white text-base md:text-lg font-bold">
            {subject || 'مزامنة المعاملات المالية الموزعة وتقارير الامتثال الضريبي'}
          </Heading2>
        </div>

        {/* جسم الخطاب وعبارات المحتوى */}
        <div className="text-xs md:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap space-y-4">
          {messageContent || (isRtl 
            ? 'نود إفادتكم بأنه تم احتساب المعاملة المالية وتوزيع نسب الأرباح المقررة (20/80) ذرياً تحت قفل موزع من Redis بنجاح، وجرى تحويل الأرصدة القابلة للسحب لمحفظة الفرع مباشرة. نرفق لكم في الأسفل هاش التوقيع التشفيري المعتمد للفاتورة الضريبية المحلية للامتثال لمتطلبات ZATCA و ETA.'
            : 'Please be advised that the regional revenue split transaction (20/80) has been processed atomically under the strict Redis lock session. All withdrawable merchant funds have been released. Below is the dynamic SHA-256 digital signature footprint verifying the tax compliance ledger registration.')}
        </div>
      </div>

      {/* 4. تفاصيل المزامنة والأنظمة النشطة */}
      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 mb-10 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-neon-cyan" />
          <span className="text-gray-400">{isRtl ? 'محرك الحوكمة: Platform-HQ' : 'Governance: Platform-HQ'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-volt-green" />
          <span className="text-gray-400">{isRtl ? 'الشبكة: PostgreSQL DB / Clickhouse' : 'Network: PostgreSQL & Clickhouse'}</span>
        </div>
      </div>

      {/* 5. تذييل المعبر الآمن والهاش الضريبي (Encrypted Transaction Hash Footprint) */}
      <footer className="border-t border-volt-green/20 bg-volt-green/5 rounded-2xl p-4 text-right space-y-2 relative">
        <div className="flex items-center justify-between text-[10px] text-volt-green font-bold">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SECURE SYSTEM SHA-256 FOOTPRINT FOOTER</span>
          </div>
          <span className="bg-volt-green/10 border border-volt-green/20 px-2 py-0.5 rounded text-[8px]">
            E-INVOICE GENERATED
          </span>
        </div>
        
        <div className="font-mono text-[9px] text-gray-500 tracking-wider break-all bg-black/40 p-2 rounded-lg border border-white/5">
          {sha256Footprint || '5a9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c'}
        </div>
        
        <p className="text-[8px] text-gray-500 text-center">
          {isRtl 
            ? 'تم توقيع وتوثيق هذا المستند تشفيرياً بواسطة خوادم GEM Z اللامركزية. التعديل عليه باطل قانوناً.'
            : 'This document is cryptographically signed and immutable. Any modification invalidates verification.'}
        </p>
      </footer>
    </div>
  );
};
