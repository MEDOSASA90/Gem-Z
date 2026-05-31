'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { ContractTemplate } from '../../../core/templates/contract-template';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Award,
  ShieldCheck,
  CheckCircle,
  FileText,
  Printer,
  Calendar,
  X,
  MapPin,
  TrendingUp,
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
  const { wallet } = useAuthStore();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceMock | null>(null);
  const [activeRegion, setActiveRegion] = useState<'ALL' | 'EG' | 'SA' | 'UAE'>('ALL');

  // سجل المعاملات المالية الموثقة رقمياً
  const invoices: InvoiceMock[] = [
    {
      id: 'tx-uuid-8891-zatca',
      region: 'SA',
      baseAmount: 300.00,
      taxAmount: 45.00, // 15%
      totalAmount: 345.00,
      vatRate: 15,
      productType: 'MEMBERSHIP',
      sha256Hash: 'e62bbbfb3c10a298bf7e6d5c4b3a2f1e0d9ca3f9d8c7b6a5e4d3c2b1a0f9e8d7',
      date: '2026-05-31',
      hqName: 'شركة جيم زد العالمية المحدودة - الرياض',
      branchName: 'فرع الرياض السليمانية الرئيسي للفرنشايز',
      taxId: '300998822100003',
    },
    {
      id: 'tx-uuid-9902-eta',
      region: 'EG',
      baseAmount: 500.00,
      taxAmount: 70.00, // 14%
      totalAmount: 570.00,
      vatRate: 14,
      productType: 'SESSION',
      sha256Hash: 'a900ed5b6a5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c',
      date: '2026-05-30',
      hqName: 'شركة جيم زد القابضة للاستثمار الرياضي - القاهرة',
      branchName: 'فرع القاهرة التجمع الخامس الإقليمي للفرنشايز',
      taxId: '123456789',
    },
    {
      id: 'tx-uuid-7712-fta',
      region: 'UAE',
      baseAmount: 800.00,
      taxAmount: 40.00, // 5%
      totalAmount: 840.00,
      vatRate: 5,
      productType: 'MEMBERSHIP',
      sha256Hash: 'bb77524f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9ca3f9d8c7b6a5e4d3c2b1a0f9e8',
      date: '2026-05-28',
      hqName: 'شركة جيم زد إنتربرايز - دبي',
      branchName: 'فرع دبي مارينا الفخم للفرنشايز',
      taxId: '100123456700003',
    },
  ];

  const filteredInvoices = activeRegion === 'ALL'
    ? invoices
    : invoices.filter((inv) => inv.region === activeRegion);

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            لوحة الاقتصاد والامتثال الضريبي الإقليمي (Cross-Border VAT Ledger)
          </h1>
          <BodyText className="text-xs">
            مراقبة واحتساب ضريبة القيمة المضافة الإقليمية وتوليد الفواتير الإلكترونية الموقعة تشفيرياً بـ SHA-256.
          </BodyText>
        </div>

        {/* منتقي النطاق الجغرافي */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
          {(['ALL', 'SA', 'EG', 'UAE'] as const).map((r, index) => (
            <button
              key={index}
              onClick={() => setActiveRegion(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeRegion === r ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'الكل' : r === 'SA' ? 'السعودية' : r === 'EG' ? 'مصر' : 'الإمارات'}
            </button>
          ))}
        </div>
      </div>

      {/* مؤشرات الأداء الضريبي وعلامات التوافق */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">TOTAL VAT COLLECTED</span>
            <Award className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            155.00 <span className="text-neon-cyan text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">إجمالي الضرائب المحصلة والمحولة لدفاتر الهيئات</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">ZATCA & ETA COMPLIANCE</span>
            <ShieldCheck className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            100% <span className="text-volt-green text-xs">مطابق رقمياً</span>
          </p>
          <BodyText className="text-[10px] pt-1">سلامة الهيكل الضريبي والتوقيع تشفيرياً</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-premium-gold/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">PARTITIONED LEDGER RECORDS</span>
            <Calendar className="w-4 h-4 text-premium-gold" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            3 <span className="text-premium-gold text-xs">فواتير نشطة</span>
          </p>
          <BodyText className="text-[10px] pt-1">إيداعات الدفاتر الدورية المقسمة شهرياً</BodyText>
        </div>
      </div>

      {/* جدول الفواتير الضريبية ورموز الـ SHA-256 */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">سجل الفواتير والضرائب الإلكترونية عابرة الحدود (E-Invoicing Logs)</Heading2>
          <span className="text-[10px] text-neon-cyan font-bold tracking-wider">انقر على الفاتورة لاستعراض العقد والختم الرقمي مائلاً</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-500">
                <th className="py-3 px-2">رقم الفاتورة</th>
                <th className="py-3 px-2 text-center">المنطقة</th>
                <th className="py-3 px-2 text-center">نوع الخدمة</th>
                <th className="py-3 px-2 text-left">مبلغ الشراء</th>
                <th className="py-3 px-2 text-left">الضريبة المقتطعة</th>
                <th className="py-3 px-2 text-left">الإجمالي الشامل</th>
                <th className="py-3 px-2">بصمة التوقيع SHA-256 (Footprint)</th>
                <th className="py-3 px-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, index) => (
                <tr
                  key={index}
                  onClick={() => setSelectedInvoice(inv)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-2 font-mono text-neon-cyan font-semibold">{inv.id}</td>
                  <td className="py-3 px-2 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      inv.region === 'SA' ? 'bg-green-500/10 text-green-400' : inv.region === 'EG' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {inv.region}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-gray-400">{inv.productType}</td>
                  <td className="py-3 px-2 text-left font-mono">{inv.baseAmount.toFixed(2)}</td>
                  <td className="py-3 px-2 text-left text-volt-green font-bold font-mono">+{inv.taxAmount.toFixed(2)} ({inv.vatRate}%)</td>
                  <td className="py-3 px-2 text-left text-white font-bold font-mono">{inv.totalAmount.toFixed(2)}</td>
                  <td className="py-3 px-2 font-mono text-gray-500">{inv.sha256Hash.substring(0, 16)}...</td>
                  <td className="py-3 px-2 text-gray-400">{inv.date}</td>
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
          
          {/* نافذة استعراض العقد */}
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0B0B0F] border border-white/10 rounded-3xl z-10 shadow-2xl p-2 md:p-4">
            
            {/* أزرار التحكم في نافذة العقد */}
            <div className="absolute top-6 left-6 flex gap-2 z-20">
              <button
                onClick={() => window.print()}
                className="p-2 rounded-xl glass-panel text-gray-400 hover:text-white cursor-pointer"
                title="Print Document"
              >
                <Printer className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 rounded-xl glass-panel text-red-400 hover:bg-red-500/10 cursor-pointer"
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
              isRtl={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
