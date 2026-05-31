'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Users,
  Activity,
  Award,
  Database,
  TrendingUp,
  RefreshCw,
  Search,
  UserCheck,
  CheckCircle,
} from 'lucide-react';

interface EmployeeWellnessMock {
  id: string;
  nameKey: string;
  participationRate: number;
  completionRate: number;
  wellnessKpi: number;
  lastSyncKey: 'now' | 'min' | '5' | '10';
  jointAccuracy: string;
}

export default function HRDashboard() {
  const { lang, theme } = useAuthStore();
  const [sourceDb, setSourceDb] = useState<'clickhouse' | 'postgresql_fallback'>('clickhouse');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAr = lang === 'ar';

  // Bilingual translation dictionary for HR Analytics
  const hrDict = {
    ar: {
      title: 'لوحة تحكم الشركات وقياسات الموظفين (Corporate B2B HR Analytics)',
      subtitle: 'تحليلات صحية وتفاعلية مجهلة لمديري الـ HR مستقاة من منصة تتبع الهواتف والمستشعرات الحيوية.',
      dbClickhouse: 'الاستعلام من CLICKHOUSE (نشط)',
      dbPostgres: 'الاستعلام من POSTGRESQL (تراجع تلقائي)',
      btnSimulate: 'محاكاة تعطل ClickHouse',
      btnRestore: 'الرجوع لمحرك ClickHouse',
      statParticipation: 'متوسط مشاركة الموظفين',
      statParticipationDesc: 'متوسط تفاعل الموظفين في التحديات والأنشطة',
      statCompletion: 'نسبة إتمام التحديات',
      statCompletionDesc: 'نسبة إتمام وتخطي مستويات التحدي اللياقي',
      statKpi: 'مؤشر صحة الشركات البيومتري',
      statKpiDesc: 'مؤشر بيومتري مدمج متكامل لتقييم صحة الشبكة',
      statIndexed: 'إجمالي الموظفين الموثقين',
      statIndexedDesc: 'عدد حسابات موظفي الشركة المتعاقدة',
      employeesUnit: 'موظف نشط',
      chartTitle: 'منحنى تقدم النشاط والتفاعل البيومتري الأسبوعي (ClickHouse Analytics)',
      chartSubtitle: 'تتبع النشاط والأداء الحركي اللحظي',
      tableTitle: 'سجلات قياسات الموظفين المجهلة وتوافق الحركات (Skeletal Joint Forms)',
      searchPlaceholder: 'البحث عن موظف مجهول...',
      empName: 'موظف مجهول - ',
      lastSync: 'آخر فحص وتحديث: ',
      lastSyncNow: 'منذ ثوان',
      lastSyncMin: 'منذ دقيقة',
      lastSync5: 'منذ 5 دقائق',
      lastSync10: 'منذ 10 دقائق',
      weeklyTrend: 'منحنى التفاعل والتقدم البيومتري الأسبوعي',
      scaleWeek: 'أسبوع ',
      liveLabel: 'نشط مباشر',
    },
    en: {
      title: 'Corporate HR Telemetry (Corporate B2B HR Analytics)',
      subtitle: 'Anonymized wellness statistics and biometric insights aggregated for company HR supervisors.',
      dbClickhouse: 'SOURCE: CLICKHOUSE (LIVE)',
      dbPostgres: 'SOURCE: POSTGRES (FALLBACK)',
      btnSimulate: 'Simulate ClickHouse Offline',
      btnRestore: 'Reconnect ClickHouse Analytics',
      statParticipation: 'Active Participation Rate',
      statParticipationDesc: 'Average participation rate in challenges and fitness steps',
      statCompletion: 'Challenge Completion Rate',
      statCompletionDesc: 'Ratio of fully finalized and unlocked wellness tasks',
      statKpi: 'Corporate Wellness KPI Index',
      statKpiDesc: 'Aggregated poses accuracy and sensor index rating',
      statIndexed: 'Total Employees Indexed',
      statIndexedDesc: 'Count of employee profiles registered under company client',
      employeesUnit: 'active employees',
      chartTitle: 'Weekly Biometric Progress Trend Curve (ClickHouse Analytics)',
      chartSubtitle: 'Real-time telemetry and movement checks',
      tableTitle: 'Anonymized Employee Telemetry & Joint Accuracies (Skeletal Joint Forms)',
      searchPlaceholder: 'Search anonymous employee...',
      empName: 'Anonymous Employee - ',
      lastSync: 'Last synced: ',
      lastSyncNow: 'seconds ago',
      lastSyncMin: '1 min ago',
      lastSync5: '5 mins ago',
      lastSync10: '10 mins ago',
      weeklyTrend: 'Weekly Activity & Biometric Trend Poses Progress',
      scaleWeek: 'Week ',
      liveLabel: 'LIVE',
    }
  } as const;

  const t = hrDict[lang];

  // Anonymized telemetry logs
  const employees: EmployeeWellnessMock[] = [
    {
      id: 'emp-1',
      nameKey: 'A192',
      participationRate: 92,
      completionRate: 85,
      wellnessKpi: 89.9,
      lastSyncKey: 'min',
      jointAccuracy: '98% Accuracy (Form Checked)',
    },
    {
      id: 'emp-2',
      nameKey: 'B331',
      participationRate: 78,
      completionRate: 60,
      wellnessKpi: 72.6,
      lastSyncKey: '5',
      jointAccuracy: '94% Accuracy (Form Checked)',
    },
    {
      id: 'emp-3',
      nameKey: 'C882',
      participationRate: 85,
      completionRate: 80,
      wellnessKpi: 83.5,
      lastSyncKey: '10',
      jointAccuracy: '96% Accuracy (Form Checked)',
    },
    {
      id: 'emp-4',
      nameKey: 'D901',
      participationRate: 95,
      completionRate: 90,
      wellnessKpi: 93.5,
      lastSyncKey: 'now',
      jointAccuracy: '99% Accuracy (Form Checked)',
    },
  ];

  const handleSourceFallbackToggle = () => {
    setLoading(true);
    setTimeout(() => {
      setSourceDb((prev) => (prev === 'clickhouse' ? 'postgresql_fallback' : 'clickhouse'));
      setLoading(false);
    }, 1000);
  };

  const getSyncLabel = (key: EmployeeWellnessMock['lastSyncKey']) => {
    if (key === 'now') return t.lastSyncNow;
    if (key === 'min') return t.lastSyncMin;
    if (key === '5') return t.lastSync5;
    return t.lastSync10;
  };

  const filteredEmployees = employees.filter((e) =>
    e.nameKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* منتقي قواعد الاستعلام وقاعدة البيانات Fallback */}
        <div className="flex flex-wrap gap-2 items-center">
          <NeonButton
            variant="glass"
            disabled={loading}
            onClick={handleSourceFallbackToggle}
            className="text-xs py-2 flex items-center gap-2 border-border-custom text-text-primary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {sourceDb === 'clickhouse' ? t.btnSimulate : t.btnRestore}
            </span>
          </NeonButton>

          <div className={`glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border ${
            sourceDb === 'clickhouse' ? 'border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan' : 'border-premium-gold/20 bg-premium-gold/5 text-premium-gold'
          }`}>
            <Database className="w-4 h-4" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">
              {sourceDb === 'clickhouse' ? t.dbClickhouse : t.dbPostgres}
            </span>
          </div>
        </div>
      </div>

      {/* العدادات التفاعلية للـ HR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {/* معدل المشاركة */}
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-text-muted font-bold uppercase">{t.statParticipation}</span>
            <Activity className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-xl font-black text-text-primary tracking-wider">
            {sourceDb === 'clickhouse' ? '87.5%' : '84.2%'}
          </p>
          <BodyText className="text-[9px] pt-1">{t.statParticipationDesc}</BodyText>
        </div>

        {/* نسبة إتمام التحديات */}
        <div className="glass-panel p-5 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-text-muted font-bold uppercase">{t.statCompletion}</span>
            <CheckCircle className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-xl font-black text-text-primary tracking-wider">
            {sourceDb === 'clickhouse' ? '78.8%' : '76.0%'}
          </p>
          <BodyText className="text-[9px] pt-1">{t.statCompletionDesc}</BodyText>
        </div>

        {/* مؤشر صحة الشركات */}
        <div className="glass-panel p-5 rounded-2xl border-premium-gold/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-text-muted font-bold uppercase">{t.statKpi}</span>
            <Award className="w-4 h-4 text-premium-gold" />
          </div>
          <p className="text-xl font-black text-text-primary tracking-wider">
            {sourceDb === 'clickhouse' ? '84.89' : '81.74'}
          </p>
          <BodyText className="text-[9px] pt-1">{t.statKpiDesc}</BodyText>
        </div>

        {/* عدد الموظفين المستفيدين */}
        <div className="glass-panel p-5 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-text-muted font-bold uppercase">{t.statIndexed}</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-text-primary tracking-wider">
            420 <span className="text-xs text-purple-400">{isAr ? 'موظف نشط' : 'employees'}</span>
          </p>
          <BodyText className="text-[9px] pt-1">{t.statIndexedDesc}</BodyText>
        </div>
      </div>

      {/* الرسوم البيانية المتوهجة (Vector Dynamic Simulated Charts) */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.chartTitle}</Heading2>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <span>{t.chartSubtitle}</span>
          </div>
        </div>

        {/* لوحة الرسم البياني باستخدام متجهات SVG متوهجة */}
        <div className="w-full h-48 bg-card-dark/20 rounded-2xl border border-border-custom p-4 flex items-end relative overflow-hidden">
          {/* خط توهج خلفي نيون */}
          <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/5 to-transparent pointer-events-none" />

          {/* متجهات الرسم البياني */}
          <svg className="absolute inset-0 w-full h-full p-6 overflow-visible" preserveAspectRatio="none">
            {/* شبكة الخطوط الأفقية */}
            <line x1="0" y1="25%" x2="100%" y2="25%" stroke="var(--border-color)" strokeWidth="1" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--border-color)" strokeWidth="1" />
            <line x1="0" y1="75%" x2="100%" y2="75%" stroke="var(--border-color)" strokeWidth="1" />

            {/* خط التفاعل والتقدم المتوهج */}
            <path
              d="M 0,120 Q 150,40 300,90 T 600,30 T 900,100 T 1200,60"
              fill="none"
              stroke="url(#chartCyberGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
            />

            <defs>
              <linearGradient id="chartCyberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#39FF14" />
              </linearGradient>
            </defs>
          </svg>

          {/* محاور وعلامات الرسم التوضيحية */}
          <div className="absolute bottom-2 left-6 right-6 flex justify-between text-[8px] text-text-muted font-mono" style={{ direction: 'ltr' }}>
            <span>{t.scaleWeek}1</span>
            <span>{t.scaleWeek}2</span>
            <span>{t.scaleWeek}3</span>
            <span>{t.scaleWeek}4</span>
            <span>{t.scaleWeek}5</span>
            <span>{t.scaleWeek}6</span>
            <span>{t.scaleWeek}7</span>
            <span>{t.scaleWeek}8 ({t.liveLabel})</span>
          </div>
        </div>
      </section>

      {/* قائمة الموظفين وتفاصيل الحركات الحيوية */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.tableTitle}</Heading2>
          
          {/* شريط البحث المدمج */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-cyber-dark text-text-primary pl-4 pr-10 py-2 rounded-xl border border-border-custom outline-none text-xs focus:border-volt-green transition-all"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-text-muted" />
          </div>
        </div>

        {/* عرض الموظفين وتدفق البيانات الحيوية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.map((e, index) => (
            <div key={index} className="glass-panel p-4 rounded-xl flex items-center justify-between hover:border-volt-green/20 transition-all border-border-custom">
              <div className="space-y-1 text-right">
                <h4 className={`text-xs font-bold text-text-primary flex items-center gap-1.5 ${isAr ? 'justify-end' : 'justify-start'}`}>
                  <span>{t.empName}{e.nameKey}</span>
                  <UserCheck className="w-3.5 h-3.5 text-neon-cyan" />
                </h4>
                <p className="text-[9px] text-volt-green font-mono">{e.jointAccuracy}</p>
                <p className="text-[8px] text-text-muted">{t.lastSync}{getSyncLabel(e.lastSyncKey)}</p>
              </div>

              {/* دائرة تفاعل الأداء */}
              <div className="flex gap-4 items-center" style={{ direction: 'ltr' }}>
                <div className="text-center">
                  <span className="text-[8px] text-text-muted font-bold block">WELLNESS KPI</span>
                  <span className="text-sm font-black text-text-primary">{e.wellnessKpi}</span>
                </div>
                
                <div className="text-center border-l border-border-custom pl-4">
                  <span className="text-[8px] text-text-muted font-bold block">PARTICIPATE</span>
                  <span className="text-sm font-black text-neon-cyan">{e.participationRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
