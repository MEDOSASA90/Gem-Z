'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Sparkles,
  Lock,
  Unlock,
  Wallet,
  Clock,
  CheckCircle,
} from 'lucide-react';

interface CourseMock {
  id: string;
  titleAr: string;
  titleEn: string;
  price: number;
  subscribersCount: number;
  locked: boolean;
  commission: number;
}

export default function CreatorDashboard() {
  const { wallet, lang, updateWalletBalance } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAr = lang === 'ar';

  // Bilingual translation dictionary for Creator Payouts
  const creatorDict = {
    ar: {
      title: 'بوابة صناع المحتوى وتسوية الضمان المالي المجدول (Creator Payouts)',
      subtitle: 'إدارة كورسات اللياقة البدنية المقفلة ومراقبة تسويات الأرصدة المجدولة للإفراج التلقائي بعد 7 أيام.',
      statTotal: 'الرصيد الكلي للأرباح',
      statTotalDesc: 'الرصيد الكلي لأرباح كورساتك الموثقة بالجنيه المصري',
      statHeld: 'الأرصدة المقيدة للضمان',
      statHeldDesc: 'رصيد الضمان المالي المجمد قيد المراجعة لمدة 7 أيام',
      statAvail: 'رصيد الأرباح المتاح للسحب',
      statAvailDesc: 'رصيد الأرباح المتاح والقابل للسحب الفوري للمصرف',
      timerTitle: 'مؤقت إطلاق وجدولة الضمان المالي (7-Day Escrow Payouts Timer)',
      timerSubtitle: 'مراقبة ونضج العمليات المجدولة في خادم الـ ZSET والـ Cron',
      timerEmpty: '🎉 لا توجد تسويات مالية مجمدة قيد الانتظار حالياً. تم تحرير وتسييل كامل المحفظة!',
      timerReleaseBtn: 'محاكاة صرف وتحرير الأرصدة الآن',
      timerReleasedMsg: '✅ تم فك الضمان المالي والإفراج عن تسوية الأرباح المجدولة بنجاح! الأرصدة الآن قابلة للسحب الفوري.',
      lockTitle: 'إدارة برامج اللياقة المقفلة ونسب الاشتراكات (Premium Content Lockout)',
      lockSubtitle: 'بوابة حراسة المحتوى الأمني النشط',
      courseLabelLocked: 'محتوى مغلق للأعضاء',
      courseLabelPublic: 'محتوى عام ومتاح',
      courseSubscribers: 'مشترك مسجل حالياً',
      coursePrice: 'سعر الدخول والكورس',
      coursePlatformFee: 'عمولة المنصة المقتطعة',
      course1Title: 'برنامج حرق الدهون المكثف للمبتدئين',
      course2Title: 'دليل محاذاة skeletal مفاصل السكوات والرفعة الميتة',
      course3Title: 'تحدي اللياقة البدنية والتحول الجسدي 30 يوماً',
      heldLabel: 'مرور {days} أيام من أصل 7 أيام (متبقي {left} أيام للإفراج التلقائي)',
      settlementPrefix: 'تسوية مستحقات كورس رياضي رقمي',
      settlementDetails: 'مبلغ الضمان: {amount} EGP | تاريخ الصرف التلقائي: {date}',
    },
    en: {
      title: 'Creator Economy & Protected Payouts (Creator Payouts)',
      subtitle: 'Manage locked premium training courses and track 7-day scheduled payouts maturating in Redis queues.',
      statTotal: 'Total Creator Revenue',
      statTotalDesc: 'Aggregated lifetime course sales credited to creator',
      statHeld: 'Held Balance (Escrow)',
      statHeldDesc: 'Locked funds undergoing 7-day refund warranty period',
      statAvail: 'Available (Withdrawable)',
      statAvailDesc: 'Withdrawable funds cleared for bank payout transfer',
      timerTitle: 'Escrow Scheduled Payouts Timer (7-Day Escrow Payouts Timer)',
      timerSubtitle: 'Scan epoch mature keys registered in Redis ZSET & Cron schedulers',
      timerEmpty: '🎉 No locked payouts currently pending maturity. Wallet is fully liquidated!',
      timerReleaseBtn: 'Bypass Payout Hold & Clear Balance',
      timerReleasedMsg: '✅ Escrow release successfully bypassed! Held assets have been instantly liquidated to withdrawable EGP.',
      lockTitle: 'Protected Premium Training Courses (Premium Content Lockout)',
      lockSubtitle: 'Active ContentLockGuard gatekeeper configurations',
      courseLabelLocked: 'LOCKED PREMIUM',
      courseLabelPublic: 'PUBLIC / OPEN',
      courseSubscribers: 'subscribers registered',
      coursePrice: 'Course Purchase Price',
      coursePlatformFee: 'Platform Commission Fee',
      course1Title: 'Weight Burn Intensive for Beginners',
      course2Title: 'Squats & Deadlifts 33-Joint Poses Alignment',
      course3Title: '30-Day Heavy Body Transform Challenge',
      heldLabel: 'Elapsed {days} of 7 days ({left} days remaining until auto release)',
      settlementPrefix: 'E-Course Purchase Payout Reconcile',
      settlementDetails: 'Settlement Amount: {amount} EGP | Release Date: {date}',
    }
  } as const;

  const t = creatorDict[lang];

  const courses: CourseMock[] = [
    {
      id: 'course-1',
      titleAr: t.course1Title,
      titleEn: t.course1Title,
      price: 150.00,
      subscribersCount: 84,
      locked: true,
      commission: 10,
    },
    {
      id: 'course-2',
      titleAr: t.course2Title,
      titleEn: t.course2Title,
      price: 250.00,
      subscribersCount: 128,
      locked: true,
      commission: 10,
    },
    {
      id: 'course-3',
      titleAr: t.course3Title,
      titleEn: t.course3Title,
      price: 300.00,
      subscribersCount: 92,
      locked: false,
      commission: 12,
    },
  ];

  const [settlements, setSettlements] = useState([
    {
      id: 'set-901',
      amount: 170.00,
      currency: 'EGP',
      daysLeft: 2,
      status: 'HELD_IN_ESCROW',
      date: '2026-06-02',
    },
    {
      id: 'set-902',
      amount: 80.00,
      currency: 'EGP',
      daysLeft: 5,
      status: 'HELD_IN_ESCROW',
      date: '2026-06-05',
    },
  ]);

  const releasePayout = async (id: string, amount: number) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Update Zustand Store Wallet Projections (routing HELD to AVAILABLE)
    const newHeld = Math.max(0, wallet.heldBalance - amount);
    const newWithdrawable = wallet.withdrawableBalance + amount;
    updateWalletBalance(wallet.balance, newWithdrawable, newHeld);

    // Delete released payouts
    setSettlements((prev) => prev.filter((s) => s.id !== id));
    
    // Set success message
    const msg = isAr 
      ? `✅ تم فك الضمان المالي والإفراج عن تسوية الأرباح المجدولة بقيمة +${amount.toFixed(2)} جنيه مصري بنجاح! الأرصدة الآن قابلة للسحب الفوري.`
      : `✅ Escrow release successfully bypassed! +${amount.toFixed(2)} EGP cleared and routed to your available balance.`;
      
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
      </div>

      {/* العدادات التفاعلية لأرباح المنشئين */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statTotal}</span>
            <Wallet className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider font-mono">
            {wallet.balance.toFixed(2)} <span className="text-purple-400 text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statTotalDesc}</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-red-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statHeld}</span>
            <Clock className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider font-mono">
            {wallet.heldBalance.toFixed(2)} <span className="text-red-500 dark:text-red-400 text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statHeldDesc}</BodyText>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statAvail}</span>
            <CheckCircle className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-volt-green tracking-wider font-mono">
            {wallet.withdrawableBalance.toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statAvailDesc}</BodyText>
        </div>
      </div>

      {/* خط التسويات المجدولة للضمان المالي (7-Day Scheduler) */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.timerTitle}</Heading2>
          <span className="text-[10px] text-text-muted">{t.timerSubtitle}</span>
        </div>

        {/* رسائل النجاح التفاعلية */}
        {successMsg && (
          <div className="bg-volt-green/10 border border-volt-green/20 text-volt-green text-xs rounded-xl p-4 shadow-[0_0_10px_rgba(57,255,20,0.05)] animate-fade-in">
            {successMsg}
          </div>
        )}

        {settlements.length === 0 ? (
          <div className="bg-card-dark/20 border border-border-custom rounded-2xl p-6 text-center text-text-muted text-xs">
            {t.timerEmpty}
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((s, index) => (
              <div key={index} className={`glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 border-border-custom ${isAr ? 'border-r-4 border-red-500/50' : 'border-l-4 border-red-500/50'}`}>
                <div className="space-y-2 flex-1 w-full">
                  <div className={`flex items-center gap-2 ${isAr ? 'justify-end' : 'justify-start'}`}>
                    <span className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[8px] text-red-500 dark:text-red-400 font-bold font-mono">
                      {s.id}
                    </span>
                    <h3 className="text-sm font-bold text-text-primary">{t.settlementPrefix}</h3>
                  </div>
                  <BodyText className="text-xs">
                    {t.settlementDetails.replace('{amount}', s.amount.toFixed(2)).replace('{date}', s.date)}
                  </BodyText>
                  
                  {/* خط تقدم نضج العملية */}
                  <div className="w-full bg-text-muted/10 h-1.5 rounded-full overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-red-500 to-volt-green h-full rounded-full transition-all duration-300"
                      style={{ width: `${((7 - s.daysLeft) / 7) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-text-secondary block font-semibold">
                    {t.heldLabel.replace('{days}', (7 - s.daysLeft).toString()).replace('{left}', s.daysLeft.toString())}
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
                  <span>{t.timerReleaseBtn}</span>
                </NeonButton>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* إدارة الكورسات والاشتراكات المقفلة (Premium Lock Guard) */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.lockTitle}</Heading2>
          <span className="text-[10px] text-purple-500 dark:text-purple-400 font-bold">{t.lockSubtitle}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((c, index) => (
            <div key={index} className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition-colors border-border-custom">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                    c.locked 
                      ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20' 
                      : 'bg-volt-green/10 text-volt-green border border-volt-green/20'
                  }`}>
                    {c.locked ? t.courseLabelLocked : t.courseLabelPublic}
                  </span>
                  {c.locked ? <Lock className="w-4 h-4 text-red-500 dark:text-red-400" /> : <Unlock className="w-4 h-4 text-volt-green" />}
                </div>
                <h3 className="text-xs font-bold text-text-primary leading-normal h-8">{isAr ? c.titleAr : c.titleEn}</h3>
                <p className="text-[9px] text-text-secondary font-bold">{c.subscribersCount} {t.courseSubscribers}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border-custom text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t.coursePrice}</span>
                  <span className="text-text-primary font-extrabold font-mono">{c.price.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t.coursePlatformFee}</span>
                  <span className="text-purple-500 dark:text-purple-400 font-bold font-mono">{c.commission}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
