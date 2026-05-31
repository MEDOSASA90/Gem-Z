'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { ContractTemplate } from '../../../core/templates/contract-template';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Award,
  ShieldCheck,
  FileText,
  Printer,
  Calendar,
  X,
  MapPin,
} from 'lucide-react';

interface InvoiceMock {
  id: string;
  region: 'EG' | 'SA' | 'UAE';
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  vatRate: number;
  productType: string;
  sha256Hash: string;
  date: string;
  hqName: string;
  branchName: string;
  taxId: string;
}

export default function EconomyDashboard() {
  const { wallet, lang, theme } = useAuthStore();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceMock | null>(null);
  const [activeRegion, setActiveRegion] = useState<'ALL' | 'EG' | 'SA' | 'UAE'>('EG'); // Default strictly to Egypt (EG)

  const isAr = lang === 'ar';

  // Bilingual translation dictionary for Economy Ledger
  const econDict = {
    ar: {
      title: 'لوحة الاقتصاد والامتثال الضريبي الإقليمي (Cross-Border VAT Ledger)',
      subtitle: 'مراقبة واحتساب ضريبة القيمة المضافة الإقليمية وتوليد الفواتير الإلكترونية الموقعة تشفيرياً بـ SHA-256.',
      vatEG: 'مصر',
      vatSA: 'السعودية',
      vatUAE: 'الإمارات',
      vatALL: 'الكل',
      statVat: 'إجمالي الضرائب المحصلة',
      statVatDesc: 'إجمالي الضرائب المحصلة والمحولة لدفاتر الهيئات',
      statStatus: 'الامتثال للأنظمة الضريبية',
      statStatusDesc: 'سلامة الهيكل الضريبي والتوقيع تشفيرياً (ZATCA / ETA)',
      statInvoices: 'دفاتر القيود النشطة',
      statInvoicesDesc: 'إجمالي المعاملات المقسمة شهرياً بالمنصة',
      tableTitle: 'سجل الفواتير والضرائب الإلكترونية عابرة الحدود (E-Invoicing Logs)',
      tableSubtitle: 'انقر على الفاتورة لاستعراض العقد والختم الرقمي مائلاً',
      thId: 'رقم الفاتورة',
      thRegion: 'المنطقة',
      thType: 'نوع الخدمة',
      thBase: 'مبلغ الشراء',
      thTax: 'الضريبة المقتطعة',
      thTotal: 'الإجمالي الشامل',
      thHash: 'بصمة التوقيع SHA-256',
      thDate: 'التاريخ',
      closeModal: 'إغلاق المعاينة',
      printModal: 'طباعة المستند',
      invoiceCount: 'فواتير نشطة',
      auditLabel: 'مطابق رقمياً',
      membershipAr: 'اشتراك صالة',
      sessionAr: 'جلسة تدريب',
      membershipEn: 'MEMBERSHIP',
      sessionEn: 'SESSION',
      cairoHq: 'شركة جيم زد القابضة للاستثمار الرياضي - القاهرة',
      cairoBranch: 'فرع القاهرة التجمع الخامس الإقليمي للفرنشايز',
      riyadhHq: 'شركة جيم زد العالمية المحدودة - الرياض',
      riyadhBranch: 'فرع الرياض السليمانية الرئيسي للفرنشايز',
      dubaiHq: 'شركة جيم زد إنتربرايز - دبي',
      dubaiBranch: 'فرع دبي مارينا الفخم للفرنشايز',
    },
    en: {
      title: 'Economy & Cross-Border Tax Ledger (Economy & Tax)',
      subtitle: 'Track regional VAT collections and audit dynamic e-invoices secured under SHA-256 cryptographic hashes.',
      vatEG: 'Egypt',
      vatSA: 'Saudi Arabia',
      vatUAE: 'UAE',
      vatALL: 'All Regions',
      statVat: 'Total VAT Collected',
      statVatDesc: 'Accumulated tax assets reconciled to tax authority books',
      statStatus: 'ETA & ZATCA Reconciled',
      statStatusDesc: 'Absolute cryptographic verification and schema validation status',
      statInvoices: 'Active Ledger Segments',
      statInvoicesDesc: 'Monthly partition ranges indexed in database tables',
      tableTitle: 'Localized E-Invoicing Ledger Logs',
      tableSubtitle: 'Click on any ledger entry to inspect agreement contract overlay & seal',
      thId: 'Invoice ID',
      thRegion: 'Geo Scope',
      thType: 'Product Class',
      thBase: 'Base Amount',
      thTax: 'VAT Charged',
      thTotal: 'Grand Total',
      thHash: 'SHA-256 Footprint',
      thDate: 'Effective Date',
      closeModal: 'Close Agreement',
      printModal: 'Print Document',
      invoiceCount: 'invoices active',
      auditLabel: 'COMPLIANT',
      membershipAr: 'اشتراك صالة',
      sessionAr: 'جلسة تدريب',
      membershipEn: 'MEMBERSHIP',
      sessionEn: 'SESSION',
      cairoHq: 'GEM Z Egypt Holding for Sports Investment - Cairo',
      cairoBranch: 'Cairo Fifth Settlement Regional Franchise Gym',
      riyadhHq: 'GEM Z Global Ltd - Riyadh',
      riyadhBranch: 'Riyadh Sulaimaniyah Primary Gym Branch',
      dubaiHq: 'GEM Z Enterprises - Dubai',
      dubaiBranch: 'Dubai Marina Luxury Franchise Gym',
    }
  } as const;

  const t = econDict[lang];

  const invoices: InvoiceMock[] = [
    {
      id: 'tx-uuid-9902-eta',
      region: 'EG',
      baseAmount: 500.00,
      taxAmount: 70.00, // Egypt 14% VAT
      totalAmount: 570.00,
      vatRate: 14,
      productType: isAr ? t.sessionAr : t.sessionEn,
      sha256Hash: 'a900ed5b6a5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c',
      date: '2026-05-30',
      hqName: t.cairoHq,
      branchName: t.cairoBranch,
      taxId: '123456789',
    },
    {
      id: 'tx-uuid-8891-zatca',
      region: 'SA',
      baseAmount: 300.00,
      taxAmount: 45.00, // Saudi 15% VAT
      totalAmount: 345.00,
      vatRate: 15,
      productType: isAr ? t.membershipAr : t.membershipEn,
      sha256Hash: 'e62bbbfb3c10a298bf7e6d5c4b3a2f1e0d9ca3f9d8c7b6a5e4d3c2b1a0f9e8d7',
      date: '2026-05-31',
      hqName: t.riyadhHq,
      branchName: t.riyadhBranch,
      taxId: '300998822100003',
    },
    {
      id: 'tx-uuid-7712-fta',
      region: 'UAE',
      baseAmount: 800.00,
      taxAmount: 40.00, // UAE 5% VAT
      totalAmount: 840.00,
      vatRate: 5,
      productType: isAr ? t.membershipAr : t.membershipEn,
      sha256Hash: 'bb77524f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9ca3f9d8c7b6a5e4d3c2b1a0f9e8',
      date: '2026-05-28',
      hqName: t.dubaiHq,
      branchName: t.dubaiBranch,
      taxId: '100123456700003',
    },
  ];

  const filteredInvoices = activeRegion === 'ALL'
    ? invoices
    : invoices.filter((inv) => inv.region === activeRegion);

  return (
    <div className={`space-y-8 animate-fade-in ${isAr ? 'text-right' : 'text-left'}`}>
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom pb-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-text-primary">
            {t.title}
          </h1>
          <BodyText className="text-xs">
            {t.subtitle}
          </BodyText>
        </div>

        {/* منتقي النطاق الجغرافي */}
        <div className="flex gap-2 bg-cyber-dark p-1 rounded-xl border border-border-custom">
          {([ 'EG', 'SA', 'UAE', 'ALL'] as const).map((r, index) => (
            <button
              key={index}
              onClick={() => setActiveRegion(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeRegion === r ? 'bg-neon-cyan text-black' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r === 'ALL' ? t.vatALL : r === 'SA' ? t.vatSA : r === 'EG' ? t.vatEG : t.vatUAE}
            </button>
          ))}
        </div>
      </div>

      {/* مؤشرات الأداء الضريبي وعلامات التوافق */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/25">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statVat}</span>
            <Award className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider font-mono">
            155.00 <span className="text-neon-cyan text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statVatDesc}</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-volt-green/25">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statStatus}</span>
            <ShieldCheck className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-volt-green tracking-wider">
            100% <span className="text-volt-green text-xs">{t.auditLabel}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statStatusDesc}</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-premium-gold/25">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statInvoices}</span>
            <Calendar className="w-4 h-4 text-premium-gold" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider font-mono">
            {invoices.length} <span className="text-premium-gold text-xs">{t.invoiceCount}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statInvoicesDesc}</BodyText>
        </div>
      </div>

      {/* جدول الفواتير الضريبية ورموز الـ SHA-256 */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.tableTitle}</Heading2>
          <span className="text-[10px] text-neon-cyan font-bold tracking-wider">{t.tableSubtitle}</span>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-xs border-collapse ${isAr ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="border-b border-border-custom text-text-muted">
                <th className="py-3 px-2">{t.thId}</th>
                <th className="py-3 px-2 text-center">{t.thRegion}</th>
                <th className="py-3 px-2 text-center">{t.thType}</th>
                <th className={`py-3 px-2 ${isAr ? 'text-left' : 'text-right'}`}>{t.thBase}</th>
                <th className={`py-3 px-2 ${isAr ? 'text-left' : 'text-right'}`}>{t.thTax}</th>
                <th className={`py-3 px-2 ${isAr ? 'text-left' : 'text-right'}`}>{t.thTotal}</th>
                <th className="py-3 px-2">{t.thHash}</th>
                <th className={`py-3 px-2 ${isAr ? 'text-left' : 'text-right'}`}>{t.thDate}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, index) => (
                <tr
                  key={index}
                  onClick={() => setSelectedInvoice(inv)}
                  className="border-b border-border-custom hover:bg-card-dark/20 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-2 font-mono text-neon-cyan font-semibold">{inv.id}</td>
                  <td className="py-3 px-2 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      inv.region === 'SA' 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : inv.region === 'EG' 
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {inv.region}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-text-secondary">{inv.productType}</td>
                  <td className={`py-3 px-2 font-mono ${isAr ? 'text-left' : 'text-right'}`}>{inv.baseAmount.toFixed(2)} EGP</td>
                  <td className={`py-3 px-2 text-volt-green font-bold font-mono ${isAr ? 'text-left' : 'text-right'}`}>+{inv.taxAmount.toFixed(2)} ({inv.vatRate}%)</td>
                  <td className={`py-3 px-2 text-text-primary font-bold font-mono ${isAr ? 'text-left' : 'text-right'}`}>{inv.totalAmount.toFixed(2)} EGP</td>
                  <td className="py-3 px-2 font-mono text-text-muted">{inv.sha256Hash.substring(0, 16)}...</td>
                  <td className={`py-3 px-2 text-text-muted font-mono ${isAr ? 'text-left' : 'text-right'}`}>{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. المعاينة المنبثقة للعقد مع ختم المنصة الدائري المائل بـ 45 درجة (Dynamic E-Invoice Modal Overlay) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* غطاء خلفي معتم زجاجي مضبب */}
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelectedInvoice(null)} />
          
          {/* ventana de visualización */}
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-cyber-dark border border-border-custom rounded-3xl z-10 shadow-2xl p-2 md:p-4 transition-all">
            
            {/* أزرار التحكم في نافذة العقد */}
            <div className={`absolute top-6 flex gap-2 z-20 ${isAr ? 'left-6' : 'right-6'}`}>
              <button
                onClick={() => window.print()}
                className="p-2 rounded-xl glass-panel text-text-secondary hover:text-text-primary cursor-pointer"
                title={t.printModal}
              >
                <Printer className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 rounded-xl glass-panel text-red-500 hover:bg-red-500/10 cursor-pointer"
                title={t.closeModal}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* قالب العقد المعتمد والختم المائل المتراكب */}
            <ContractTemplate
              tenantId={selectedInvoice.id}
              masterHqName={selectedInvoice.hqName}
              branchName={selectedInvoice.branchName}
              regionalTaxId={selectedInvoice.taxId}
              effectiveDate={selectedInvoice.date}
              isRtl={isAr}
            />
          </div>
        </div>
      )}
    </div>
  );
}
