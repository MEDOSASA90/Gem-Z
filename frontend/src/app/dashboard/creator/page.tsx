'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Sparkles,
  Lock,
  Unlock,
  DollarSign,
  Clock,
  CheckCircle,
  Play,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface CourseMock {
  id: string;
  title: string;
  price: number;
  subscribersCount: number;
  locked: boolean;
  commission: number;
}

export default function CreatorDashboard() {
  const { wallet, updateWalletBalance } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // الكورسات الرياضية المميزة المقفلة
  const courses: CourseMock[] = [
    {
      id: 'course-1',
      title: 'برنامج حرق الدهون المكثف للمبتدئين',
      price: 150.00,
      subscribersCount: 84,
      locked: true,
      commission: 10, // 10% Platform fee
    },
    {
      id: 'course-2',
      title: 'دليل محاذاة skeletal مفاصل السكوات والرفعة الميتة',
      price: 250.00,
      subscribersCount: 128,
      locked: true,
      commission: 10,
    },
    {
      id: 'course-3',
      title: 'تحدي اللياقة البدنية والتحول الجسدي 30 يوماً',
      price: 300.00,
      subscribersCount: 92,
      locked: false,
      commission: 12, // VIP premium commission
    },
  ];

  // تسويات الأرباح المقيدة المجدولة (7-Day Escrow Payouts)
  const [settlements, setSettlements] = useState([
    {
      id: 'set-901',
      amount: 170.00,
      currency: 'SAR',
      daysLeft: 2,
      status: 'HELD_IN_ESCROW',
      date: '2026-06-02',
    },
    {
      id: 'set-902',
      amount: 80.00,
      currency: 'SAR',
      daysLeft: 5,
      status: 'HELD_IN_ESCROW',
      date: '2026-06-05',
    },
  ]);

  // محاكاة انتهاء وإطلاق التسوية المالية بعد 7 أيام
  const releasePayout = async (id: string, amount: number) => {
    setLoading(true);
    // محاكاة تحرير القفل الموزع payout lock
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // تحديث المحفظة في Zustand (نقل الأموال من heldBalance إلى withdrawableBalance)
    const newHeld = Math.max(0, wallet.heldBalance - amount);
    const newWithdrawable = wallet.withdrawableBalance + amount;
    // المحافظة على نفس الرصيد الكلي
    updateWalletBalance(wallet.balance, newWithdrawable, newHeld);

    // تصفية وحذف التسوية المصروفة
    setSettlements((prev) => prev.filter((s) => s.id !== id));
    setSuccessMsg(`✅ تم فك الضمان المالي والإفراج عن تسوية الأرباح المجدولة بقيمة +${amount.toFixed(2)} ${wallet.currency} بنجاح! الأرصدة الآن قابلة للسحب الفوري.`);
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            بوابة صناع المحتوى وتسوية الضمان المالي المجدول (Creator Payouts)
          </h1>
          <BodyText className="text-xs">
            إدارة كورسات اللياقة البدنية المقفلة ومراقبة تسويات الأرصدة المجدولة للإفراج التلقائي بعد 7 أيام.
          </BodyText>
        </div>
      </div>

      {/* العدادات التفاعلية لأرباح المنشئين */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">CREATOR ESCROW WALLET</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {wallet.balance.toFixed(2)} <span className="text-purple-400 text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">الرصيد الكلي لأرباح كورساتك الموثقة</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-red-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">HELD BALANCE (ESCROW)</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {wallet.heldBalance.toFixed(2)} <span className="text-red-400 text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">رصيد الضمان المالي المجمد قيد المراجعة لمدة 7 أيام</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">AVAILABLE (WITHDRAWABLE)</span>
            <CheckCircle className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {wallet.withdrawableBalance.toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">رصيد الأرباح المتاح والقابل للسحب الفوري للمصرف</BodyText>
        </div>
      </div>

      {/* خط التسويات المجدولة للضمان المالي (7-Day Scheduler) */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">مؤقت إطلاق وجدولة الضمان المالي (7-Day Escrow Payouts Timer)</Heading2>
          <span className="text-[10px] text-gray-500">مراقبة ونضج العمليات المجدولة في خادم الـ ZSET والـ Cron</span>
        </div>

        {/* رسائل النجاح التفاعلية */}
        {successMsg && (
          <div className="bg-volt-green/10 border border-volt-green/20 text-volt-green text-xs rounded-xl p-4 text-right shadow-[0_0_10px_rgba(57,255,20,0.05)] animate-fade-in">
            {successMsg}
          </div>
        )}

        {settlements.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-gray-500 text-xs">
            🎉 لا توجد تسويات مالية مجمدة قيد الانتظار حالياً. تم تحرير وتسييل كامل المحفظة!
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((s, index) => (
              <div key={index} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-red-500/50">
                <div className="space-y-2 text-right flex-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[8px] text-red-400 font-bold font-mono">
                      {s.id}
                    </span>
                    <h3 className="text-sm font-bold text-white">تسوية مستحقات كورس رياضي رقمي</h3>
                  </div>
                  <BodyText className="text-xs">
                    مبلغ الضمان: <strong className="text-white font-mono">{s.amount.toFixed(2)} {s.currency}</strong> | تاريخ الصرف التلقائي المجدول: <strong className="text-neon-cyan font-mono">{s.date}</strong>
                  </BodyText>
                  
                  {/* خط تقدم نضج العملية */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-red-500 to-volt-green h-full rounded-full transition-all duration-300"
                      style={{ width: `${((7 - s.daysLeft) / 7) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 block font-semibold">
                    مرور {7 - s.daysLeft} أيام من أصل 7 أيام (متبقي {s.daysLeft} أيام للإفراج التلقائي)
                  </span>
                </div>

                <NeonButton
                  variant="green"
                  glow={true}
                  disabled={loading}
                  onClick={() => releasePayout(s.id, s.amount)}
                  className="text-xs py-2 px-4 flex items-center gap-2 whitespace-nowrap self-stretch md:self-auto justify-center"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>محاكاة صرف وتحرير الأرصدة الآن</span>
                </NeonButton>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* إدارة الكورسات والاشتراكات المقفلة (Premium Lock Guard) */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">إدارة برامج اللياقة المقفلة ونسب الاشتراكات (Premium Content Lockout)</Heading2>
          <span className="text-[10px] text-purple-400 font-bold">بوابة حراسة المحتوى الأمني النشط</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((c, index) => (
            <div key={index} className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition-colors">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                    c.locked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-volt-green/10 text-volt-green border border-volt-green/20'
                  }`}>
                    {c.locked ? 'LOCKED CONTENT' : 'UNLOCKED / PUBLIC'}
                  </span>
                  {c.locked ? <Lock className="w-4 h-4 text-red-400" /> : <Unlock className="w-4 h-4 text-volt-green" />}
                </div>
                <h3 className="text-xs font-bold text-white leading-normal h-8">{c.title}</h3>
                <p className="text-[9px] text-gray-500 font-bold">{c.subscribersCount} مشترك مسجل حالياً</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">سعر الدخول والكورس</span>
                  <span className="text-white font-extrabold font-mono">{c.price.toFixed(2)} {wallet.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">عمولة المنصة المقتطعة</span>
                  <span className="text-purple-400 font-bold font-mono">{c.commission}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
