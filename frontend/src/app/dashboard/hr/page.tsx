'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import {
  Users,
  Activity,
  Award,
  Database,
  TrendingUp,
  Cpu,
  RefreshCw,
  Search,
  UserCheck,
  CheckCircle,
} from 'lucide-react';

interface EmployeeWellnessMock {
  id: string;
  name: string;
  participationRate: number;
  completionRate: number;
  wellnessKpi: number;
  lastSync: string;
  jointAccuracy: string;
}

export default function HRDashboard() {
  const [sourceDb, setSourceDb] = useState<'clickhouse' | 'postgresql_fallback'>('clickhouse');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // تفاصيل التفاعل البيومتري للموظفين (Anonymized telemetry logs)
  const employees: EmployeeWellnessMock[] = [
    {
      id: 'emp-1',
      name: 'موظف مجهول - A192',
      participationRate: 92,
      completionRate: 85,
      wellnessKpi: 89.9,
      lastSync: 'منذ دقيقة',
      jointAccuracy: '98% Accuracy (Form Checked)',
    },
    {
      id: 'emp-2',
      name: 'موظف مجهول - B331',
      participationRate: 78,
      completionRate: 60,
      wellnessKpi: 72.6,
      lastSync: 'منذ 5 دقائق',
      jointAccuracy: '94% Accuracy (Form Checked)',
    },
    {
      id: 'emp-3',
      name: 'موظف مجهول - C882',
      participationRate: 85,
      completionRate: 80,
      wellnessKpi: 83.5,
      lastSync: 'منذ 10 دقائق',
      jointAccuracy: '96% Accuracy (Form Checked)',
    },
    {
      id: 'emp-4',
      name: 'موظف مجهول - D901',
      participationRate: 95,
      completionRate: 90,
      wellnessKpi: 93.5,
      lastSync: 'منذ ثانيتين',
      jointAccuracy: '99% Accuracy (Form Checked)',
    },
  ];

  // محاكاة تحويل واستدعاء التراجع التلقائي بين قواعد البيانات Clickhouse و Postgres
  const handleSourceFallbackToggle = () => {
    setLoading(true);
    setTimeout(() => {
      setSourceDb((prev) => (prev === 'clickhouse' ? 'postgresql_fallback' : 'clickhouse'));
      setLoading(false);
    }, 1000);
  };

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            لوحة تحكم الشركات وقياسات الموظفين (Corporate B2B HR Analytics)
          </h1>
          <BodyText className="text-xs">
            تحليلات صحية وتفاعلية مجهلة لمديري الـ HR مستقاة من منصة تتبع الهواتف والمستشعرات الحيوية.
          </BodyText>
        </div>

        {/* منتقي قواعد الاستعلام وقاعدة البيانات Fallback */}
        <div className="flex gap-2">
          <NeonButton
            variant="glass"
            disabled={loading}
            onClick={handleSourceFallbackToggle}
            className="text-xs py-2 flex items-center gap-2 border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {sourceDb === 'clickhouse' ? 'محاكاة تعطل ClickHouse' : 'الرجوع لمحرك ClickHouse'}
            </span>
          </NeonButton>

          <div className={`glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border ${
            sourceDb === 'clickhouse' ? 'border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan' : 'border-premium-gold/20 bg-premium-gold/5 text-premium-gold'
          }`}>
            <Database className="w-4 h-4" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">
              {sourceDb === 'clickhouse' ? 'SOURCE: CLICKHOUSE (LIVE)' : 'SOURCE: POSTGRES (FALLBACK)'}
            </span>
          </div>
        </div>
      </div>

      {/* العدادات التفاعلية للـ HR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* معدل المشاركة */}
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-gray-500 font-bold">ACTIVE PARTICIPATION RATE</span>
            <Activity className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-xl font-black text-white tracking-wider">
            {sourceDb === 'clickhouse' ? '87.5%' : '84.2%'}
          </p>
          <BodyText className="text-[9px] pt-1">متوسط مشاركة الموظفين في التحديات والأنشطة</BodyText>
        </div>

        {/* نسبة إتمام التحديات */}
        <div className="glass-panel p-5 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-gray-500 font-bold">CHALLENGE COMPLETION</span>
            <CheckCircle className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-xl font-black text-white tracking-wider">
            {sourceDb === 'clickhouse' ? '78.8%' : '76.0%'}
          </p>
          <BodyText className="text-[9px] pt-1">نسبة إتمام وتخطي مستويات التحدي اللياقي</BodyText>
        </div>

        {/* مؤشر صحة الشركات */}
        <div className="glass-panel p-5 rounded-2xl border-premium-gold/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-gray-500 font-bold">CORPORATE WELLNESS KPI</span>
            <Award className="w-4 h-4 text-premium-gold" />
          </div>
          <p className="text-xl font-black text-white tracking-wider">
            {sourceDb === 'clickhouse' ? '84.89' : '81.74'}
          </p>
          <BodyText className="text-[9px] pt-1">مؤشر بيومتري مدمج متكامل لتقييم صحة الشبكة</BodyText>
        </div>

        {/* عدد الموظفين المستفيدين */}
        <div className="glass-panel p-5 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-gray-500 font-bold">TOTAL EMPLOYEES INDEXED</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-white tracking-wider">
            420 <span className="text-xs text-purple-400">موظف نشط</span>
          </p>
          <BodyText className="text-[9px] pt-1">عدد حسابات موظفي الشركة المتعاقدة</BodyText>
        </div>
      </div>

      {/* الرسوم البيانية المتوهجة (Vector Dynamic Simulated Charts) */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">منحنى تقدم النشاط والتفاعل البيومتري الأسبوعي (ClickHouse Analytics)</Heading2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <span>عرض التوهج اللحظي</span>
          </div>
        </div>

        {/* لوحة الرسم البياني باستخدام متجهات SVG متوهجة */}
        <div className="w-full h-48 bg-cyber-dark/40 rounded-2xl border border-white/5 p-4 flex items-end relative overflow-hidden">
          
          {/* خط توهج خلفي نيون */}
          <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/5 to-transparent pointer-events-none" />

          {/* متجهات الرسم البياني */}
          <svg className="absolute inset-0 w-full h-full p-6 overflow-visible" preserveAspectRatio="none">
            {/* شبكة الخطوط الأفقية */}
            <line x1="0" y1="25%" x2="100%" y2="25%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="75%" x2="100%" y2="75%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

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
          <div className="absolute bottom-2 left-6 right-6 flex justify-between text-[8px] text-gray-500 font-mono">
            <span>WEEK 1</span>
            <span>WEEK 2</span>
            <span>WEEK 3</span>
            <span>WEEK 4</span>
            <span>WEEK 5</span>
            <span>WEEK 6</span>
            <span>WEEK 7</span>
            <span>WEEK 8 (LIVE)</span>
          </div>
        </div>
      </section>

      {/* قائمة الموظفين وتفاصيل الحركات الحيوية */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">سجلات قياسات الموظفين المجهلة وتوافق الحركات (Skeletal Joint Forms)</Heading2>
          
          {/* شريط البحث المدمج */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="البحث عن موظف مجهول..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card-dark text-white pl-4 pr-10 py-2 rounded-xl border border-white/10 outline-none text-xs focus:border-volt-green transition-all"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* عرض الموظفين وتدفق البيانات الحيوية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.map((e, index) => (
            <div key={index} className="glass-panel p-4 rounded-xl flex items-center justify-between hover:border-volt-green/20 transition-all">
              <div className="space-y-1 text-right">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                  <span>{e.name}</span>
                  <UserCheck className="w-3.5 h-3.5 text-neon-cyan" />
                </h4>
                <p className="text-[9px] text-volt-green font-mono">{e.jointAccuracy}</p>
                <p className="text-[8px] text-gray-500">آخر فحص وتحديث: {e.lastSync}</p>
              </div>

              {/* دائرة تفاعل الأداء */}
              <div className="flex gap-4 items-center">
                <div className="text-center">
                  <span className="text-[8px] text-gray-500 font-bold block">WELLNESS KPI</span>
                  <span className="text-sm font-black text-white">{e.wellnessKpi}</span>
                </div>
                
                <div className="text-center border-r border-white/5 pr-4">
                  <span className="text-[8px] text-gray-500 font-bold block">PARTICIPATE</span>
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
