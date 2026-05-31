'use client';

import React, { useState } from 'react';
import { Heading1, Heading2, BodyText, NeonButton } from '../../core/theme/design-tokens';
import { SkeletonCard, EmptyState } from '../../components/ui-guards';
import { PlatformSealService } from '../../core/templates/platform-seal.service';
import { ContractTemplate } from '../../core/templates/contract-template';
import { LetterheadTemplate } from '../../core/templates/letterhead-template';
import {
  Languages,
  Layout,
  FileText,
  ShieldAlert,
  User,
  Info,
  Calendar,
  Layers,
  Award,
  Database,
  Sliders,
} from 'lucide-react';

type TabType = 'tokens' | 'seal' | 'contract' | 'letterhead';

export default function KitchenSinkPage() {
  const [isRtl, setIsRtl] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('tokens');
  
  // حقول التحكم الديناميكي للفحص والتحقق
  const [tenantId, setTenantId] = useState('GEMZ-EG-CAIRO-902');
  const [hqName, setHqName] = useState('شركة جيم زد العالمية المحدودة - الرياض');
  const [branchName, setBranchName] = useState('فرع القاهرة الرياضي الإقليمي للفرنشايز');
  const [taxId, setTaxId] = useState('300998822100003');
  const [commenceDate, setCommenceDate] = useState('2026-05-31');
  const [subjectText, setSubjectText] = useState('مخطط تتبع النشاط والموافقة على الفاتورة الضريبية عابرة الحدود');
  const [hashText, setHashText] = useState('a3f9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9');

  const [emptyStateLoading, setEmptyStateLoading] = useState(false);
  const [emptyStateRetries, setEmptyStateRetries] = useState(0);

  const handleEmptyStateRetry = () => {
    setEmptyStateLoading(true);
    setTimeout(() => {
      setEmptyStateLoading(false);
      setEmptyStateRetries((prev) => prev + 1);
    }, 1200);
  };

  // توليد الختم الفوري بصيغة SVG كأكواد خام للعرض
  const rawSealSvg = PlatformSealService.generatePlatformSeal(tenantId, commenceDate);
  const sealBase64 = PlatformSealService.generatePlatformSealBase64(tenantId, commenceDate);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0B0B0F] bg-[radial-gradient(circle_at_center,_rgba(18,18,26,0.65)_0%,_rgba(11,11,15,1)_100%)] text-white p-4 md:p-10 font-sans transition-all duration-500"
    >
      {/* رأس الصفحة */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-white/5 pb-6 text-right">
        <div className="space-y-2 text-right">
          <div className="inline-flex items-center gap-2 bg-volt-green/10 border border-volt-green/20 px-3 py-1 rounded-full text-xs font-bold text-volt-green">
            <Layout className="w-3.5 h-3.5" />
            <span>GEM Z VERIFICATION BOARD & TEMPLATE ENGINE</span>
          </div>
          <Heading1 className="text-glow-cyan text-transparent bg-gradient-to-r from-neon-cyan to-volt-green bg-clip-text">
            {isRtl ? 'لوحة فحص رموز الهوية البصرية ومحرك المستندات' : 'Branding Identity & Automated Document Engine'}
          </Heading1>
          <BodyText>
            {isRtl
              ? 'مساحة الفحص المرئي الشاملة والامتثال للهوية البصرية لمشروع GEM Z لتصميم أختام التحقق الرقمية والعقود ومستندات الفروع.'
              : 'Enterprise playground for checking color tokens, responsive dynamic SVG seals, B2B contract agreements, and letters under LTR & RTL flows.'}
          </BodyText>
        </div>

        {/* أزرار لغة التوجيه والتحكم */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsRtl(!isRtl)}
            className="px-4 py-2 bg-neon-cyan text-black font-extrabold text-xs rounded-xl flex items-center gap-2 hover:bg-white transition-colors cursor-pointer"
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

      {/* لوحة تحكم الفحص الجانبية والخطوط */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* عمود التحكم والمعايير (المدخلات الحية) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-neon-cyan">
              <Sliders className="w-4 h-4" />
              <Heading2 className="text-sm font-bold text-white">
                {isRtl ? 'لوحة التحكم الفورية' : 'Live Document Controller'}
              </Heading2>
            </div>

            <div className="space-y-3 text-right">
              {/* مدخل معرف المستأجر */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Tenant ID</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
                />
              </div>

              {/* مدخل المقر الرئيسي */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Licensor HQ Name</label>
                <input
                  type="text"
                  value={hqName}
                  onChange={(e) => setHqName(e.target.value)}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
                />
              </div>

              {/* مدخل اسم الفرع */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Licensee Branch Name</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
                />
              </div>

              {/* مدخل الرقم الضريبي */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Branch Tax ID</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
                />
              </div>

              {/* مدخل تاريخ التشغيل */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Commence Date</label>
                <input
                  type="date"
                  value={commenceDate}
                  onChange={(e) => setCommenceDate(e.target.value)}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
                />
              </div>

              {/* مدخل موضوع الخطاب */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Subject Text</label>
                <input
                  type="text"
                  value={subjectText}
                  onChange={(e) => setSubjectText(e.target.value)}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan"
                />
              </div>
            </div>
          </div>
        </div>

        {/* عمود عرض النماذج والأختام المتجاوبة */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* شريط التنقل بين التبويبات الفنية */}
          <div className="glass-panel p-2 rounded-2xl flex flex-wrap gap-2">
            
            <button
              onClick={() => setActiveTab('tokens')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tokens' ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isRtl ? 'رموز التصميم' : 'Design Tokens'}
            </button>

            <button
              onClick={() => setActiveTab('seal')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'seal' ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isRtl ? 'الختم الرقمي (SVG)' : 'Platform Seal'}
            </button>

            <button
              onClick={() => setActiveTab('contract')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'contract' ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isRtl ? 'عقد الفرنشايز (B2B)' : 'B2B Contract'}
            </button>

            <button
              onClick={() => setActiveTab('letterhead')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'letterhead' ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isRtl ? 'خطاب الترويسة' : 'Formal Letterhead'}
            </button>
          </div>

          {/* محتويات عرض التبويبات النشطة */}
          <div className="transition-all duration-300">
            
            {/* التبويب الأول: رموز التصميم الأساسية */}
            {activeTab === 'tokens' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* رموز الألوان والأزرار */}
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl space-y-4">
                    <Heading2 className="border-b border-white/5 pb-2">{isRtl ? 'ثوابت النيون والألوان' : 'Branding Tokens'}</Heading2>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-[#0B0B0F] border border-white/10 text-center">Cyber Dark</div>
                      <div className="p-2 rounded bg-[#12121A] border border-white/10 text-center">Card Dark</div>
                      <div className="p-2 rounded bg-neon-cyan text-black font-bold text-center">Neon Cyan</div>
                      <div className="p-2 rounded bg-volt-green text-black font-bold text-center">Volt Green</div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl space-y-4">
                    <Heading2 className="border-b border-white/5 pb-2">{isRtl ? 'المظهر التفاعلي للأزرار' : 'Buttons check'}</Heading2>
                    <div className="flex flex-col gap-2">
                      <NeonButton variant="cyan">CYBER GLOW BUTTON</NeonButton>
                      <NeonButton variant="green">VOLT GLOW BUTTON</NeonButton>
                      <NeonButton variant="premium">VIP PREMIUM ACCESS</NeonButton>
                    </div>
                  </div>
                </div>

                {/* هياكل Skeletons و EmptyState */}
                <div className="space-y-6">
                  <SkeletonCard />
                  
                  <EmptyState
                    title={isRtl ? 'جاري التحقق من أصول الدفتر' : 'Zero Assets Logged'}
                    description={
                      isRtl 
                        ? `محاولات مزامنة محرك الحسابات الجارية: ${emptyStateRetries}`
                        : `Simulated secure ledger empty boundary. Attempts: ${emptyStateRetries}`
                    }
                    onRetry={handleEmptyStateRetry}
                    loading={emptyStateLoading}
                  />
                </div>
              </div>
            )}

            {/* التبويب الثاني: معاينة وشفرة الختم الرقمي */}
            {activeTab === 'seal' && (
              <div className="glass-panel p-6 rounded-3xl space-y-6 flex flex-col md:flex-row items-center gap-6">
                
                {/* استعراض الختم بحجم كبير */}
                <div className="w-56 h-56 bg-cyber-dark rounded-3xl border border-white/10 p-4 shadow-2xl flex items-center justify-center">
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: rawSealSvg }} />
                </div>

                <div className="space-y-4 flex-1 text-right">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neon-cyan font-bold tracking-wider block">DYNAMIC PROGRAMMATIC SVG SEAL</span>
                    <Heading2 className="text-white">{isRtl ? 'ختم التحقق المولد برمجياً' : 'Programmatic Vector Seal'}</Heading2>
                  </div>
                  <BodyText className="text-xs">
                    {isRtl 
                      ? 'يتم صياغة الختم ناقلياً بالكامل من خلال دمج الأكواد، ويتفاعل تلقائياً مع مدخلات المقر وتواريخ النفاذ المحددة في لوحة التحكم.'
                      : 'The vector seal uses circular XML textPath nodes to wrap dynamic metadata (such as Tenant ID and dates) inside the glowing borders.'}
                  </BodyText>
                  
                  {/* كود Base64 المولد */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-500 block font-mono">BASE64 DATA-URI OUTPUT (PREVIEW)</span>
                    <textarea
                      readOnly
                      value={sealBase64}
                      className="w-full h-16 bg-black/60 border border-white/5 rounded-xl p-2 font-mono text-[8px] text-gray-500 break-all resize-none outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* التبويب الثالث: معاينة العقد المتغير بالختم المائل */}
            {activeTab === 'contract' && (
              <div className="animate-fade-in">
                <ContractTemplate
                  tenantId={tenantId}
                  masterHqName={hqName}
                  branchName={branchName}
                  regionalTaxId={taxId}
                  effectiveDate={commenceDate}
                  isRtl={isRtl}
                />
              </div>
            )}

            {/* التبويب الرابع: معاينة ترويسة الخطاب الرسمي والهاش */}
            {activeTab === 'letterhead' && (
              <div className="animate-fade-in">
                <LetterheadTemplate
                  recipientName={isRtl ? 'لجنة الفروع الإقليمية والامتثال الضريبي' : 'Regional Compliance Committee'}
                  referenceNumber={`GEMZ-REF-${tenantId.substring(0, 8)}`}
                  date={commenceDate}
                  subject={subjectText}
                  sha256Footprint={hashText}
                  messageContent={isRtl 
                    ? `بناءً على طلبكم المسجل للمستأجر [${tenantId}]، نفيدكم بموجب هذا الخطاب بأنه تم جدولة تحصيل إيرادات الفرنشايز لفرع [${branchName}] وإجراء تصفية الحسابات تحت القفل الموزع رقمياً بنجاح.

تجدون في الأسفل هاش التوقيع التشفيري المعتمد للامتثال لمتطلبات الفوترة عابرة الحدود.`
                    : `In reference to the B2B operations under tenant [${tenantId}], we hereby authenticate the ledger distributions for [${branchName}]. All multi-branch split metrics are certified.

Below is the verified transaction footprint locked in Postgres monthly range partitions.`
                  }
                  isRtl={isRtl}
                />
              </div>
            )}

          </div>

        </div>

      </div>

      <footer className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/5 text-center text-xs text-gray-500 font-mono">
        GEM Z DOCUMENT & BRAND CHECKBOARD MODULE V5
      </footer>
    </div>
  );
}
