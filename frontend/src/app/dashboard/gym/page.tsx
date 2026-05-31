'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Dumbbell,
  Shield,
  MapPin,
  Clock,
  Lock,
  Unlock,
  Users,
  Wallet,
} from 'lucide-react';

interface GymBranchMock {
  id: string;
  nameAr: string;
  nameEn: string;
  locationAr: string;
  locationEn: string;
  splitRatio: string;
  operatorId: string;
  activeMembers: number;
}

export default function GymDashboard() {
  const { wallet, lang, theme, updateWalletBalance } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [lockActive, setLockActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAr = lang === 'ar';

  // Bilingual translation dictionary for Gym SaaS
  const gymDict = {
    ar: {
      title: 'لوحة إدارة صالات الفرنشايز وتقسيم الإيرادات (Gym SaaS)',
      subtitle: 'حوكمة وتوزيع الموارد المالية للفروع الرياضية ذرياً تحت قفل موزع من Redis.',
      redisReady: 'قفل الـ REDIS جاهز',
      redisActive: 'قفل الـ REDIS نشط',
      hqRevenue: 'حصة المقر الرئيسي',
      hqDesc: 'إجمالي الإيداعات المتراكمة للمقر الرئيسي',
      withdrawable: 'الرصيد المتاح للسحب',
      withdrawableDesc: 'رصيد الشركاء والفرنشايز الجاهز للسحب',
      branchesCount: 'الأندية المرخصة نشطة',
      branchesDesc: 'تغطية الصالات الإقليمية النشطة للعلامة التجارية',
      branchesSection: 'توزيع وإدارة الفروع الإقليمية النشطة',
      branchClick: 'انقر لتشغيل عملية شراء ومحاكاة القفل الموزع',
      splitLabel: 'نسبة التقسيم المالي',
      membersLabel: 'اللاعبين النشطين',
      activeMembers: 'لاعب نشط',
      btnSimulate: 'محاكاة شراء اشتراك بـ 300 جنيه',
      ledgerTitle: 'دفتر قيد أستاذ الحسابات المزدوجة الموزعة (Double-Entry Ledger)',
      ledgerSubtitle: 'تحديث فوري محاسبي قياسي',
      thTx: 'معرف الحركة',
      thType: 'النوع',
      thAccount: 'الحساب الدفتري',
      thAmount: 'قيمة المعاملة',
      thDesc: 'تفاصيل المعاملة والتقسيم',
      thDate: 'التاريخ والوقت',
      successPrefix: 'تم تقسيم الدخل بنجاح تحت قفل Redis! حصة المقر الرئيسي (20%): ',
      successSuffix: ' | حصة الفرع الإقليمي: ',
      cairoName: 'فرع القاهرة الرياضي الإقليمي',
      cairoLoc: 'التجمع الخامس، القاهرة، مصر',
      riyadhName: 'فرع الرياض السليمانية الرئيسي',
      riyadhLoc: 'شارع التحلية، الرياض، السعودية',
      dubaiName: 'فرع دبي مارينا الفخم',
      dubaiLoc: 'المرسى، دبي، الإمارات',
    },
    en: {
      title: 'Gym Franchise & Revenue Splits (Gym SaaS)',
      subtitle: 'Govern and distribute regional branches revenue splits atomically under distributed Redis locks.',
      redisReady: 'REDIS LOCK: READY',
      redisActive: 'REDIS LOCK: ACTIVE',
      hqRevenue: 'Master HQ Treasury',
      hqDesc: 'Cumulative operational deposits credited to master wallet',
      withdrawable: 'Withdrawable Merchant Balance',
      withdrawableDesc: 'Regional operators available funds cleared for payout',
      branchesCount: 'Licensed Active Branches',
      branchesDesc: 'Active branches registered under platform tenant',
      branchesSection: 'Active Regional Gym Branches',
      branchClick: 'Simulate purchase checkout to execute distributed locks',
      splitLabel: 'Revenue Split Ratio',
      membersLabel: 'Active Members',
      activeMembers: 'active members',
      btnSimulate: 'Checkout Membership (300 EGP)',
      ledgerTitle: 'Double-Entry Accounting Ledger Projections',
      ledgerSubtitle: 'Real-time ledger audit logs',
      thTx: 'Transaction ID',
      thType: 'Type',
      thAccount: 'Ledger Account',
      thAmount: 'Debit / Credit',
      thDesc: 'Transaction Details',
      thDate: 'Timestamp',
      successPrefix: 'Revenue split completed under Redis Lock! Master HQ share (20%): +',
      successSuffix: ' EGP | Operator share: +',
      cairoName: 'Cairo Regional Fitness Center',
      cairoLoc: 'Fifth Settlement, Cairo, Egypt',
      riyadhName: 'Riyadh Sulaimaniyah Gym Branch',
      riyadhLoc: 'Tahlia Street, Riyadh, Saudi Arabia',
      dubaiName: 'Dubai Marina Luxury Branch',
      dubaiLoc: 'Marina, Dubai, UAE',
    }
  } as const;

  const t = gymDict[lang];

  const branches: GymBranchMock[] = [
    {
      id: 'branch-uuid-cairo',
      nameAr: t.cairoName,
      nameEn: t.cairoName,
      locationAr: t.cairoLoc,
      locationEn: t.cairoLoc,
      splitRatio: '20% HQ / 80% Branch',
      operatorId: 'operator-cairo-892',
      activeMembers: 1450,
    },
    {
      id: 'branch-uuid-riyadh',
      nameAr: t.riyadhName,
      nameEn: t.riyadhName,
      locationAr: t.riyadhLoc,
      locationEn: t.riyadhLoc,
      splitRatio: '15% HQ / 85% Branch',
      operatorId: 'operator-riyadh-771',
      activeMembers: 2890,
    },
    {
      id: 'branch-uuid-dubai',
      nameAr: t.dubaiName,
      nameEn: t.dubaiName,
      locationAr: t.dubaiLoc,
      locationEn: t.dubaiLoc,
      splitRatio: '20% HQ / 80% Branch',
      operatorId: 'operator-dubai-303',
      activeMembers: 1980,
    },
  ];

  // Dynamic double entry ledger array
  const [ledgerEntries, setLedgerEntries] = useState([
    {
      id: 'led-1',
      txId: 'tx-8092-cairo',
      type: 'DEBIT',
      account: 'wallet:trainee-uuid-992',
      amount: 250.00,
      descriptionAr: 'خصم لشراء اشتراك صالة القاهرة الرياضية الفرنشايز',
      descriptionEn: 'Deduction for franchise Cairo slot checkout',
      timestamp: '2026-05-31 09:22:15',
    },
    {
      id: 'led-2',
      txId: 'tx-8092-cairo',
      type: 'CREDIT',
      account: 'wallet:hq:master-owner',
      amount: 50.00, // 20%
      descriptionAr: 'قيد إيداع حصة المقر الرئيسي بنسبة 20.00%',
      descriptionEn: 'Franchise Master HQ 20.00% split',
      timestamp: '2026-05-31 09:22:15',
    },
    {
      id: 'led-3',
      txId: 'tx-8092-cairo',
      type: 'CREDIT',
      account: 'wallet:branch:operator-cairo-892',
      amount: 200.00, // 80%
      descriptionAr: 'إيداع حصة الفرع الإقليمي بالقاهرة مباشرة للرصيد المتاح',
      descriptionEn: 'Regional branch share credited directly to available',
      timestamp: '2026-05-31 09:22:15',
    },
  ]);

  const triggerSimulation = async (branchName: string, ratio: number, gross: number) => {
    setLoading(true);
    setLockActive(true);
    setSuccessMsg(null);

    // 1. Simulate Redis lock delay (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLockActive(false);

    // 2. Compute Splits
    const hqShare = (gross * ratio) / 100;
    const branchShare = gross - hqShare;

    // 3. Update Zustand Store Wallet Projections
    const newBalance = wallet.balance + hqShare;
    updateWalletBalance(newBalance, wallet.withdrawableBalance + hqShare, wallet.heldBalance);

    // 4. Generate new Double-Entry accounting items
    const txId = `tx-sim-${Math.floor(Math.random() * 9000) + 1000}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newEntries = [
      {
        id: `led-sim-${Date.now()}-1`,
        txId,
        type: 'DEBIT',
        account: 'wallet:trainee-test-uuid',
        amount: gross,
        descriptionAr: `خصم للاشتراك في عضوية الفرنشايز بـ ${branchName}`,
        descriptionEn: `Deduction for franchise membership purchase at ${branchName}`,
        timestamp: now,
      },
      {
        id: `led-sim-${Date.now()}-2`,
        txId,
        type: 'CREDIT',
        account: 'wallet:hq:master-owner',
        amount: hqShare,
        descriptionAr: `إيداع حصة المقر الرئيسي بنسبة ${ratio}%`,
        descriptionEn: `Franchise Master HQ ${ratio}% split calculated`,
        timestamp: now,
      },
      {
        id: `led-sim-${Date.now()}-3`,
        txId,
        type: 'CREDIT',
        account: 'wallet:branch:operator-cairo-892',
        amount: branchShare,
        descriptionAr: `إيداع حصة المشغل الإقليمي للفرع بالكامل للرصيد القابل للسحب`,
        descriptionEn: `Regional branch share credited directly to available balance`,
        timestamp: now,
      },
    ];

    setLedgerEntries((prev) => [newEntries[0], newEntries[1], newEntries[2], ...prev]);
    
    // Set bilingual message
    const msg = isAr
      ? `${t.successPrefix}${hqShare.toFixed(2)} ${wallet.currency}${t.successSuffix}${branchShare.toFixed(2)} ${wallet.currency}`
      : `${t.successPrefix}${hqShare.toFixed(2)} EGP${t.successSuffix}${branchShare.toFixed(2)} EGP`;
      
    setSuccessMsg(msg);
    setLoading(false);
  };

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

        {/* مؤشر قفل Redis التفاعلي */}
        <div className={`glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border transition-all ${
          lockActive ? 'border-red-500/30 bg-red-500/5 text-red-500 dark:text-red-400' : 'border-volt-green/20 bg-volt-green/5 text-volt-green'
        }`}>
          {lockActive ? <Lock className="w-4 h-4 animate-bounce" /> : <Unlock className="w-4 h-4" />}
          <span className="text-xs font-bold font-mono tracking-wider">
            {lockActive ? t.redisActive : t.redisReady}
          </span>
        </div>
      </div>

      {/* العدادات التفاعلية للأرباح */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.hqRevenue}</span>
            <Wallet className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider">
            {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.hqDesc}</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.withdrawable}</span>
            <Wallet className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-volt-green tracking-wider">
            {wallet.withdrawableBalance.toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.withdrawableDesc}</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.branchesCount}</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider">
            {branches.length} <span className="text-purple-400 text-xs">{isAr ? 'أندية' : 'Gyms'}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.branchesDesc}</BodyText>
        </div>
      </div>

      {/* استعراض الفروع وإطلاق العمليات */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.branchesSection}</Heading2>
          <span className="text-[10px] text-text-muted">{t.branchClick}</span>
        </div>

        {/* إشعار النجاح */}
        {successMsg && (
          <div className="bg-volt-green/10 border border-volt-green/20 text-volt-green text-xs rounded-xl p-4 shadow-[0_0_10px_rgba(57,255,20,0.05)] animate-fade-in">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((b, index) => (
            <div key={index} className="glass-panel-glow p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:scale-[1.02] transition-transform">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded text-[8px] text-neon-cyan font-bold font-mono">
                    {b.id.toUpperCase()}
                  </span>
                  <Dumbbell className="w-4 h-4 text-neon-cyan" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">{isAr ? b.nameAr : b.nameEn}</h3>
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                  <span>{isAr ? b.locationAr : b.locationEn}</span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-border-custom text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t.splitLabel}</span>
                  <span className="text-text-primary font-bold">{b.splitRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t.membersLabel}</span>
                  <span className="text-volt-green font-bold tracking-wider">{b.activeMembers} {isAr ? 'لاعب' : 'members'}</span>
                </div>
                
                <NeonButton
                  variant="cyan"
                  glow={true}
                  disabled={loading}
                  onClick={() => triggerSimulation(isAr ? b.nameAr : b.nameEn, 20.00, 300.00)}
                  className="w-full text-xs py-2 mt-2"
                >
                  {isAr ? t.btnSimulate : t.btnSimulate}
                </NeonButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* دفتر أستاذ قيود الحسابات المزدوجة المتوازنة */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.ledgerTitle}</Heading2>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock className="w-4 h-4" />
            <span>{t.ledgerSubtitle}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-xs border-collapse ${isAr ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="border-b border-border-custom text-text-muted">
                <th className="py-3 px-2">{t.thTx}</th>
                <th className="py-3 px-2">{t.thType}</th>
                <th className="py-3 px-2">{t.thAccount}</th>
                <th className={`py-3 px-2 ${isAr ? 'text-left' : 'text-right'}`}>{t.thAmount}</th>
                <th className="py-3 px-2">{t.thDesc}</th>
                <th className={`py-3 px-2 ${isAr ? 'text-left' : 'text-right'}`}>{t.thDate}</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((e, index) => (
                <tr key={index} className="border-b border-border-custom hover:bg-card-dark/20 transition-colors">
                  <td className="py-3 px-2 font-mono text-text-muted">{e.txId}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] ${
                      e.type === 'DEBIT' 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                        : 'bg-volt-green/10 text-volt-green border border-volt-green/20'
                    }`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-text-primary">{e.account}</td>
                  <td className={`py-3 px-2 font-bold font-mono text-text-primary ${isAr ? 'text-left' : 'text-right'}`}>
                    {e.type === 'DEBIT' ? '-' : '+'}{e.amount.toFixed(2)} EGP
                  </td>
                  <td className="py-3 px-2 text-text-secondary">{isAr ? e.descriptionAr : e.descriptionEn}</td>
                  <td className={`py-3 px-2 text-text-muted font-mono ${isAr ? 'text-left' : 'text-right'}`}>{e.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
