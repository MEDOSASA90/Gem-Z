'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import {
  Sparkles,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Tv,
  Users,
  Flame,
  Lock,
  Unlock,
  Eye,
  TrendingUp,
  Cpu,
} from 'lucide-react';

interface ReelMock {
  id: string;
  title: string;
  creatorName: string;
  views: string;
  likes: string;
  locked: boolean;
  videoPlaceholder: string;
}

export default function SocialDashboard() {
  const [isRtl] = useState(true); // افتراضياً باللغة العربية
  const [reels, setReels] = useState<ReelMock[]>([
    {
      id: 'reel-1',
      title: 'أسرع طريقة لضبط وضعية السكوات (Squat Angle Form Checked)',
      creatorName: 'الكابتن علي رجب',
      views: '45.2K',
      likes: '12K',
      locked: false,
      videoPlaceholder: '🏋️‍♂️ Squats Form Check Pose Landmark Grid 🏋️‍♂️',
    },
    {
      id: 'reel-2',
      title: 'تمارين القوة المتقدمة لحرق الدهون وكسب العضل (Premium Lock)',
      creatorName: 'المدربة مروة شريف',
      views: '98K',
      likes: '34K',
      locked: true,
      videoPlaceholder: '🔒 PREMIUM CONTENT LOCKED - SUBSCRIPTION REQUIRED 🔒',
    },
  ]);

  const [comments, setComments] = useState([
    { user: 'أحمد كمال', text: 'شرح عظيم يا كابتن! زوايا السكوات عندي بقت مضبوطة فعلاً' },
    { user: 'مي سامي', text: 'اللايف ممتاز، الكاميرا بتعمل تتبع حركي ممتاز للظهر' },
    { user: 'حازم عادل', text: 'هل مستشعر الجوال الممرر كافي لقياس الكادينس؟' },
  ]);
  
  const [newComment, setNewComment] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment) return;
    setComments((prev) => [...prev, { user: 'محمود عبد العزيز (أنت)', text: newComment }]);
    setNewComment('');
  };

  const unlockReel = (id: string) => {
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, locked: false } : r)));
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            منصة صناع المحتوى والبث الرياضي المباشر (GEM Z Live & Reels)
          </h1>
          <BodyText className="text-xs">
            بوابة تفاعلية فائقة تشمل البث الحي للتمارين، مقاطع الريلز القصيرة، وتتبع مفاصل المتدربين بكاميرا الذكاء الاصطناعي.
          </BodyText>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* العمود الأول: شاشة البث المباشر الفائقة والتعليقات الحية (Live Stream) */}
        <div className="lg:col-span-8 space-y-6">
          <section className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <Tv className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">{isRtl ? 'بث تجريبي مباشر نشط' : 'LIVE STREAM ACTIVE'}</span>
              </div>
              
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-[10px] text-red-400 font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>3,480 {isRtl ? 'متفرج بمصر' : 'Live Trainees'}</span>
              </div>
            </div>

            {/* شاشة البث الحي نيون فائقة الجمال */}
            <div className="w-full aspect-video rounded-2xl bg-zinc-950 border border-red-500/20 relative overflow-hidden flex flex-col justify-between p-6 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
              
              {/* تراكب القياسات الحيوية للذكاء الاصطناعي للمدرب في البث المباشر (AI Joint Overlay) */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0)_60%,_rgba(0,0,0,0.85)_100%)] pointer-events-none z-0" />
              
              {/* مجسم هيكلي خفيف للتمثيل البصري للـ Skeletal Landmarks */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-0">
                <svg className="w-80 h-80 text-neon-cyan" viewBox="0 0 100 100">
                  <circle cx="50" cy="20" r="4" fill="#00F0FF" />
                  <line x1="50" y1="20" x2="50" y2="50" stroke="#00F0FF" strokeWidth="2" />
                  <line x1="50" y1="30" x2="25" y2="40" stroke="#39FF14" strokeWidth="2" />
                  <line x1="50" y1="30" x2="75" y2="40" stroke="#39FF14" strokeWidth="2" />
                  <line x1="50" y1="50" x2="35" y2="75" stroke="#39FF14" strokeWidth="2" />
                  <line x1="50" y1="50" x2="65" y2="75" stroke="#39FF14" strokeWidth="2" />
                </svg>
              </div>

              {/* شريط الإحصائيات المتراكبة بالأعلى */}
              <div className="flex justify-between items-start z-10 w-full">
                <div className="glass-panel px-3 py-1.5 rounded-xl text-center border-volt-green/20 text-xs">
                  <p className="text-[7px] text-gray-400 font-bold">TRAINER CADENCE</p>
                  <p className="text-volt-green font-extrabold tracking-wider font-mono">112 SPM</p>
                </div>
                
                <div className="glass-panel px-3 py-1.5 rounded-xl text-center border-neon-cyan/20 text-xs">
                  <p className="text-[7px] text-gray-400 font-bold">KNEE FLEXION ANGLE</p>
                  <p className="text-neon-cyan font-extrabold tracking-wider font-mono">82° (FORM PERFECT)</p>
                </div>
              </div>

              {/* شاشة التحكم والمشاهدة للبث في الأسفل */}
              <div className="flex justify-between items-end z-10 w-full pt-20">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                    <span>البث المباشر للكابتن علي رجب</span>
                    <span className="w-2 h-2 rounded-full bg-volt-green animate-ping" />
                  </h3>
                  <p className="text-[9px] text-gray-400">تحدي ضبط زوايا المفاصل الفوري للمتدربين بمصر</p>
                </div>

                <div className="flex gap-2">
                  <span className="bg-red-600 px-3 py-1 rounded-lg text-[9px] font-black text-white tracking-widest animate-pulse">
                    LIVE
                  </span>
                </div>
              </div>
            </div>

            {/* صندوق التعليقات الحية أسفل البث */}
            <div className="space-y-4 text-right">
              <Heading2 className="text-xs text-gray-400 font-bold">التفاعل والتعليقات الحية في البث</Heading2>
              
              <div className="glass-panel p-4 rounded-2xl h-44 overflow-y-auto space-y-3">
                {comments.map((c, index) => (
                  <div key={index} className="text-xs space-y-0.5 border-b border-white/5 pb-1.5">
                    <span className="text-neon-cyan font-bold block">{c.user}</span>
                    <span className="text-gray-300 block">{c.text}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={addComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="أكتب تعليقك الآن..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-card-dark border border-white/10 rounded-xl px-4 py-2.5 outline-none text-xs text-white focus:border-neon-cyan"
                />
                <NeonButton type="submit" variant="cyan" className="text-xs py-2 px-4">
                  إرسال
                </NeonButton>
              </form>
            </div>
          </section>
        </div>

        {/* العمود الثاني: مشغل الريلز العمودي وخوارزمية الترشيح (Reels Player) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* مشغل الريلز المبتكر */}
          <section className="glass-panel p-6 rounded-3xl space-y-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center border-b border-white/5 pb-2">
              <Heading2 className="text-xs text-white">مقاطع الريلز الرياضية التفاعلية</Heading2>
              <Flame className="w-4 h-4 text-volt-green" />
            </div>

            {/* مشغل ريلز عمودي بمحاكاة نيون */}
            <div className="w-full max-w-[260px] aspect-[9/16] rounded-3xl bg-zinc-950 border border-white/10 relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
              
              <div className="flex justify-between items-center z-10 w-full">
                <span className="text-[7px] text-gray-500 font-mono">REELS PLAYER</span>
                <Eye className="w-3.5 h-3.5 text-neon-cyan" />
              </div>

              {/* شاشة الفيديو و حارس حظر محتوى الصناع Premium Lock */}
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-0">
                {reels[activeReelIndex].locked ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto shadow-glow-cyan">
                      <Lock className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-white leading-normal">
                      محتوى مخصص ومحمي للأعضاء المشتركين
                    </p>
                    <NeonButton
                      variant="green"
                      glow={true}
                      onClick={() => unlockReel(reels[activeReelIndex].id)}
                      className="text-[9px] py-1.5 px-3 mx-auto"
                    >
                      تفعيل الاشتراك والفتح الفوري
                    </NeonButton>
                  </div>
                ) : (
                  <div className="space-y-2 text-neon-cyan text-[10px] font-mono leading-relaxed animate-pulse">
                    {reels[activeReelIndex].videoPlaceholder}
                  </div>
                )}
              </div>

              {/* عناصر تفاعل المطور في الجانب السفلي من الريلز */}
              <div className="flex justify-between items-end z-10 w-full">
                <div className="space-y-1 text-right flex-1 pr-2">
                  <p className="text-[9px] font-bold text-white">{reels[activeReelIndex].creatorName}</p>
                  <p className="text-[8px] text-gray-400 leading-normal line-clamp-2">{reels[activeReelIndex].title}</p>
                </div>

                <div className="flex flex-col gap-2.5 text-center text-[8px] text-gray-400">
                  <div className="flex flex-col items-center gap-0.5 cursor-pointer">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    <span>{reels[activeReelIndex].likes}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span>{reels[activeReelIndex].views}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* أزرار الانتقال بين الريلز */}
            <div className="flex gap-2 w-full pt-2">
              <button
                disabled={activeReelIndex === 0}
                onClick={() => setActiveReelIndex(0)}
                className="flex-1 py-1.5 rounded-lg glass-panel text-[9px] font-bold text-gray-400 hover:text-white"
              >
                السابق
              </button>
              <button
                disabled={activeReelIndex === reels.length - 1}
                onClick={() => setActiveReelIndex(reels.length - 1)}
                className="flex-1 py-1.5 rounded-lg glass-panel text-[9px] font-bold text-gray-400 hover:text-white"
              >
                التالي
              </button>
            </div>
          </section>

          {/* خوارزمية الترشيح وتوزانات الأداء (AI Recommendation Weights) */}
          <section className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <Heading2 className="text-xs text-white">خوارزميات AI الترشيح الذكي (ClickHouse Optimized)</Heading2>
              <Cpu className="w-4 h-4 text-neon-cyan" />
            </div>

            <div className="space-y-3 text-right text-[10px]">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">معدل المشاهدة الفعال (Watch Time)</span>
                  <span className="text-neon-cyan font-bold">60%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-neon-cyan h-full rounded-full" style={{ width: '60%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">التفاعل الحركي والإعجاب (Engagement)</span>
                  <span className="text-volt-green font-bold">20%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-volt-green h-full rounded-full" style={{ width: '20%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">تطابق الاهتمامات والصالات (Fitness Graph)</span>
                  <span className="text-premium-gold font-bold">10%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-premium-gold h-full rounded-full" style={{ width: '10%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">تفاعل ومشاركات الأصدقاء (Social Graph)</span>
                  <span className="text-purple-400 font-bold">10%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
