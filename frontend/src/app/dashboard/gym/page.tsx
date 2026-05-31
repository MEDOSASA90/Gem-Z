'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Dumbbell,
  Shield,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRightLeft,
  DollarSign,
  PlusCircle,
  Lock,
  Unlock,
} from 'lucide-react';

interface GymBranchMock {
  id: string;
  name: string;
  location: string;
  splitRatio: string;
  operatorId: string;
  activeMembers: number;
}

export default function GymDashboard() {
  const { user, wallet, updateWalletBalance } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [lockActive, setLockActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // فروع الفرنشايز المعتمدة للمستأجر
  const branches: GymBranchMock[] = [
    {
      id: 'branch-uuid-cairo',
      name: 'فرع القاهرة الرياضي الإقليمي',
      location: 'التجمع الخامس، القاهرة، مصر',
      splitRatio: '20% HQ / 80% Branch',
      operatorId: 'operator-cairo-892',
      activeMembers: 1450,
    },
    {
      id: 'branch-uuid-riyadh',
      name: 'فرع الرياض السليمانية الرئيسي',
      location: 'شارع التحلية، الرياض، السعودية',
      splitRatio: '15% HQ / 85% Branch',
      operatorId: 'operator-riyadh-771',
      activeMembers: 2890,
    },
    {
      id: 'branch-uuid-dubai',
      name: 'فرع دبي مارينا الفخم',
      location: 'المرسى، دبي، الإمارات',
      splitRatio: '20% HQ / 80% Branch',
      operatorId: 'operator-dubai-303',
      activeMembers: 1980,
    },
  ];

  // قيود دفتر الأستاذ المالي المزدوجة المتولدة
  const [ledgerEntries, setLedgerEntries] = useState([
    {
      id: 'led-1',
      txId: 'tx-8092-cairo',
      type: 'DEBIT',
      account: 'wallet:trainee-uuid-992',
      amount: 250.00,
      description: 'Deduction for franchise Cairo slot checkout',
      timestamp: '2026-05-31 09:22:15',
    },
    {
      id: 'led-2',
      txId: 'tx-8092-cairo',
      type: 'CREDIT',
      account: 'wallet:hq:master-owner',
      amount: 50.00, // 20%
      description: 'Franchise Master HQ 20.00% split',
      timestamp: '2026-05-31 09:22:15',
    },
    {
      id: 'led-3',
      txId: 'tx-8092-cairo',
      type: 'CREDIT',
      account: 'wallet:branch:operator-cairo-892',
      amount: 200.00, // 80%
      description: 'Regional branch share credited directly to available',
      timestamp: '2026-05-31 09:22:15',
    },
  ]);

  // محاكاة إطلاق واحتساب تقسيم الأرباح الفوري تحت قفل Redis
  const triggerSimulation = async (branchName: string, ratio: number, gross: number) => {
    setLoading(true);
    setLockActive(true);
    setSuccessMsg(null);

    // 1. محاكاة قفل Redis الموزع لمدة ثانيتين
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLockActive(false);

    // 2. حساب تقسيم الإيرادات
    const hqShare = (gross * ratio) / 100;
    const branchShare = gross - hqShare;

    // 3. تحديث الأرصدة في Zustand
    const newBalance = wallet.balance + hqShare;
    updateWalletBalance(newBalance, wallet.withdrawableBalance + hqShare, wallet.heldBalance);

    // 4. إدراج قيود الدفتر المالي المزدوج
    const txId = `tx-sim-${Math.floor(Math.random() * 9000) + 1000}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newEntries = [
      {
        id: `led-sim-${Date.now()}-1`,
        txId,
        type: 'DEBIT',
        account: 'wallet:trainee-test-uuid',
        amount: gross,
        description: `Deduction for franchise membership purchase at ${branchName}`,
        timestamp: now,
      },
      {
        id: `led-sim-${Date.now()}-2`,
        txId,
        type: 'CREDIT',
        account: 'wallet:hq:master-owner',
        amount: hqShare,
        description: `Franchise Master HQ ${ratio}% split calculated`,
        timestamp: now,
      },
      {
        id: `led-sim-${Date.now()}-3`,
        txId,
        type: 'CREDIT',
        account: 'wallet:branch:operator-cairo-892',
        amount: branchShare,
        description: `Regional branch share credited directly to available balance`,
        timestamp: now,
      },
    ];

    setLedgerEntries((prev) => [newEntries[0], newEntries[1], newEntries[2], ...prev]);
    setSuccessMsg(`✅ تم تقسيم الدخل بنجاح تحت قفل Redis! حصة المقر الرئيسي (${ratio}%): +${hqShare.toFixed(2)} ${wallet.currency} | حصة الفرع: +${branchShare.toFixed(2)} ${wallet.currency}`);
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            لوحة إدارة صالات الفرنشايز وتقسيم الإيرادات (Gym SaaS)
          </h1>
          <BodyText className="text-xs">
            حوكمة وتوزيع الموارد المالية للفروع الرياضية ذرياً تحت قفل موزع من Redis.
          </BodyText>
        </div>

        {/* مؤشر قفل Redis التفاعلي */}
        <div className={`glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border transition-all ${
          lockActive ? 'border-red-500/30 bg-red-500/5 text-red-400' : 'border-volt-green/20 bg-volt-green/5 text-volt-green'
        }`}>
          {lockActive ? <Lock className="w-4 h-4 animate-bounce" /> : <Unlock className="w-4 h-4" />}
          <span className="text-xs font-bold font-mono tracking-wider">
            {lockActive ? 'REDIS DISTRIBUTED LOCK: ACTIVE' : 'REDIS LOCK: READY'}
          </span>
        </div>
      </div>

      {/* العدادات التفاعلية للأرباح */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">HQ SHARE REVENUE</span>
            <DollarSign className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {wallet.balance.toFixed(2)} <span className="text-neon-cyan text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">إجمالي الإيداعات المتراكمة للمقر الرئيسي</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">WITHDRAWABLE ASSETS</span>
            <DollarSign className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {wallet.withdrawableBalance.toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">رصيد الشركاء والفرنشايز الجاهز للسحب</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">TOTAL ACTIVE BRANCHES</span>
            <MapPin className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {branches.length} <span className="text-purple-400 text-xs">أندية مرخصة</span>
          </p>
          <BodyText className="text-[10px] pt-1">تغطية الصالات الإقليمية النشطة للعلامة التجارية</BodyText>
        </div>
      </div>

      {/* استعراض الفروع وإطلاق العمليات */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">توزيع وإدارة الفروع الإقليمية النشطة</Heading2>
          <span className="text-[10px] text-gray-500">انقر لتشغيل عملية شراء ومحاكاة القفل الموزع</span>
        </div>

        {/* إشعار النجاح */}
        {successMsg && (
          <div className="bg-volt-green/10 border border-volt-green/20 text-volt-green text-xs rounded-xl p-4 text-right shadow-[0_0_10px_rgba(57,255,20,0.05)] animate-fade-in">
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
                <h3 className="text-sm font-bold text-white">{b.name}</h3>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span>{b.location}</span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">نسبة التقسيم المالي</span>
                  <span className="text-white font-bold">{b.splitRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">اللاعبين النشطين</span>
                  <span className="text-volt-green font-bold tracking-wider">{b.activeMembers} لاعب</span>
                </div>
                
                <NeonButton
                  variant="cyan"
                  glow={true}
                  disabled={loading}
                  onClick={() => triggerSimulation(b.name, 20.00, 300.00)}
                  className="w-full text-xs py-2 mt-2"
                >
                  محاكاة شراء اشتراك بـ 300 {wallet.currency}
                </NeonButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* دفتر أستاذ قيود الحسابات المزدوجة المتوازنة */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">دفتر قيد أستاذ الحسابات المزدوجة الموزعة (Double-Entry Ledger)</Heading2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-4 h-4" />
            <span>تحديث فوري قياسي</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-500">
                <th className="py-3 px-2">معرف الحركة</th>
                <th className="py-3 px-2">النوع</th>
                <th className="py-3 px-2">الحساب الدفتري المرتبط</th>
                <th className="py-3 px-2 text-left">قيمة المعاملة</th>
                <th className="py-3 px-2">تفاصيل المعاملة والتقسيم</th>
                <th className="py-3 px-2 text-left">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((e, index) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2 font-mono text-gray-400">{e.txId}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded font-extrabold ${
                      e.type === 'DEBIT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-volt-green/10 text-volt-green border border-volt-green/20'
                    }`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-white">{e.account}</td>
                  <td className="py-3 px-2 text-left font-bold font-mono text-white">
                    {e.type === 'DEBIT' ? '-' : '+'}{e.amount.toFixed(2)} {wallet.currency}
                  </td>
                  <td className="py-3 px-2 text-gray-400">{e.description}</td>
                  <td className="py-3 px-2 text-left text-gray-500 font-mono">{e.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
