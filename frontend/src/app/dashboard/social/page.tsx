'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  Sparkles,
  Play,
  Heart,
  MessageCircle,
  Tv,
  Users,
  Flame,
  Lock,
  Eye,
  Cpu,
} from 'lucide-react';

interface ReelMock {
  id: string;
  titleAr: string;
  titleEn: string;
  creatorNameAr: string;
  creatorNameEn: string;
  views: string;
  likes: string;
  locked: boolean;
  videoPlaceholder: string;
}

export default function SocialDashboard() {
  const { lang, theme } = useAuthStore();
  const isAr = lang === 'ar';

  // Bilingual translation dictionary for Social Hub
  const socialDict = {
    ar: {
      title: 'بوابة صناع المحتوى والبث الرياضي المباشر (GEM Z Live & Reels)',
      subtitle: 'بوابة تفاعلية فائقة تشمل البث الحي للتمارين، مقاطع الريلز القصيرة، وتتبع مفاصل المتدربين بكاميرا الذكاء الاصطناعي.',
      liveDemo: 'بث تجريبي مباشر نشط',
      liveTrainees: 'متفرج نشط بمصر',
      trainerCadence: 'معدل وتيرة المدرب',
      kneeFlexion: 'زاوية انحناء الركبة',
      formPerfect: 'الوضعية مثالية',
      liveTitle: 'البث المباشر الموثق للكابتن علي رجب',
      liveSubtitle: 'تحدي ضبط زوايا المفاصل الفوري للمتدربين بمصر',
      liveBadge: 'مباشر',
      chatTitle: 'التفاعل والتعليقات الحية في البث',
      commentPlaceholder: 'أكتب تعليقك الآن...',
      btnSend: 'إرسال',
      reelsSection: 'مقاطع الريلز الرياضية التفاعلية',
      lockedTitle: 'محتوى مخصص ومحمي للأعضاء المشتركين',
      unlockBtn: 'تفعيل الاشتراك والفتح الفوري',
      prevBtn: 'السابق',
      nextBtn: 'التالي',
      aiAlgorithm: 'خوارزميات AI الترشيح الذكي (ClickHouse Optimized)',
      watchTime: 'معدل المشاهدة الفعال (Watch Time)',
      engagement: 'التفاعل الحركي والإعجاب (Engagement)',
      fitnessGraph: 'تطابق الاهتمامات والصالات (Fitness Graph)',
      socialGraph: 'تفاعل ومشاركات الأصدقاء (Social Graph)',
      userMe: 'محمود عبد العزيز (أنت)',
      comment1: 'شرح عظيم يا كابتن! زوايا السكوات عندي بقت مضبوطة فعلاً',
      comment2: 'اللايف ممتاز، الكاميرا بتعمل تتبع حركي ممتاز للظهر',
      comment3: 'هل مستشعر الجوال الممرر كافي لقياس الكادينس؟',
      reel1Title: 'أسرع طريقة لضبط وضعية السكوات (Squat Angle Form Checked)',
      reel1Creator: 'الكابتن علي رجب',
      reel2Title: 'تمارين القوة المتقدمة لحرق الدهون وكسب العضل (Premium Lock)',
      reel2Creator: 'المدربة مروة شريف',
    },
    en: {
      title: 'Creator Platform & Livestreaming (GEM Z Live & Reels)',
      subtitle: 'High-fidelity interactive social feed hosting live workout coaching, vertical reels, and pose check models.',
      liveDemo: 'LIVE STREAM ACTIVE',
      liveTrainees: 'live trainees in Egypt',
      trainerCadence: 'TRAINER CADENCE',
      kneeFlexion: 'KNEE FLEXION ANGLE',
      formPerfect: 'FORM PERFECT',
      liveTitle: 'Captain Ali Ragab Live Stream',
      liveSubtitle: 'Real-time joint angle calibration challenge in Cairo',
      liveBadge: 'LIVE',
      chatTitle: 'Live Audience Stream Comments',
      commentPlaceholder: 'Write your comment...',
      btnSend: 'Send',
      reelsSection: 'Interactive Fitness Reels',
      lockedTitle: 'Locked premium creator video content',
      unlockBtn: 'Unlock Premium Subscription',
      prevBtn: 'Prev Video',
      nextBtn: 'Next Video',
      aiAlgorithm: 'AI Recommendation Feed Weights (ClickHouse Analytics)',
      watchTime: 'Effective Watch Time (60%)',
      engagement: 'Pose Engagement & Likes (20%)',
      fitnessGraph: 'Franchise Gym Affinity (10%)',
      socialGraph: 'Friend Shares & Circle (10%)',
      userMe: 'Mahmoud Abdelaziz (You)',
      comment1: 'Amazing breakdown coach! Corrected my squat angles immediately.',
      comment2: 'Excellent session, computer vision tracks lower back perfectly.',
      comment3: 'Is the phone accelerometer enough to calibrate cadence check?',
      reel1Title: 'Speedrun Squats Form check Pose landmarks check',
      reel1Creator: 'Captain Ali Ragab',
      reel2Title: 'Heavy compound lifts for weight loss (Premium Lock)',
      reel2Creator: 'Coach Marwa Sherif',
    }
  } as const;

  const t = socialDict[lang];

  const [reels, setReels] = useState<ReelMock[]>([
    {
      id: 'reel-1',
      titleAr: t.reel1Title,
      titleEn: t.reel1Title,
      creatorNameAr: t.reel1Creator,
      creatorNameEn: t.reel1Creator,
      views: '45.2K',
      likes: '12K',
      locked: false,
      videoPlaceholder: '🏋️‍♂️ Squats Form Check Pose Landmark Grid 🏋️‍♂️',
    },
    {
      id: 'reel-2',
      titleAr: t.reel2Title,
      titleEn: t.reel2Title,
      creatorNameAr: t.reel2Creator,
      creatorNameEn: t.reel2Creator,
      views: '98K',
      likes: '34K',
      locked: true,
      videoPlaceholder: '🔒 PREMIUM CONTENT LOCKED - SUBSCRIPTION REQUIRED 🔒',
    },
  ]);

  const [comments, setComments] = useState<Array<{ user: string; text: string }>>([
    { user: 'أحمد كمال', text: t.comment1 },
    { user: 'مي سامي', text: t.comment2 },
    { user: 'حازم عادل', text: t.comment3 },
  ]);
  
  const [newComment, setNewComment] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment) return;
    setComments((prev) => [...prev, { user: t.userMe, text: newComment }]);
    setNewComment('');
  };

  const unlockReel = (id: string) => {
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, locked: false } : r)));
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* العمود الأول: شاشة البث المباشر الفائقة والتعليقات الحية (Live Stream) */}
        <div className="lg:col-span-8 space-y-6">
          <section className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-border-custom pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <Tv className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">{t.liveDemo}</span>
              </div>
              
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-[10px] text-red-500 dark:text-red-400 font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>3,480 {t.liveTrainees}</span>
              </div>
            </div>

            {/* شاشة البث الحي نيون فائقة الجمال */}
            <div className="w-full aspect-video rounded-2xl bg-black border border-red-500/20 relative overflow-hidden flex flex-col justify-between p-6 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
              
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
              <div className="flex justify-between items-start z-10 w-full" style={{ direction: 'ltr' }}>
                <div className="glass-panel px-3 py-1.5 rounded-xl text-center border-volt-green/20 text-xs bg-black/60">
                  <p className="text-[7px] text-gray-400 font-bold">{t.trainerCadence}</p>
                  <p className="text-volt-green font-extrabold tracking-wider font-mono">112 SPM</p>
                </div>
                
                <div className="glass-panel px-3 py-1.5 rounded-xl text-center border-neon-cyan/20 text-xs bg-black/60">
                  <p className="text-[7px] text-gray-400 font-bold">{t.kneeFlexion}</p>
                  <p className="text-neon-cyan font-extrabold tracking-wider font-mono">82° ({t.formPerfect})</p>
                </div>
              </div>

              {/* شاشة التحكم والمشاهدة للبث في الأسفل */}
              <div className="flex justify-between items-end z-10 w-full pt-20">
                <div className="space-y-1">
                  <h3 className={`text-xs font-bold text-white flex items-center gap-1.5 ${isAr ? 'justify-end' : 'justify-start'}`}>
                    <span>{t.liveTitle}</span>
                    <span className="w-2 h-2 rounded-full bg-volt-green animate-ping" />
                  </h3>
                  <p className="text-[9px] text-gray-400">{t.liveSubtitle}</p>
                </div>

                <div className="flex gap-2">
                  <span className="bg-red-600 px-3 py-1 rounded-lg text-[9px] font-black text-white tracking-widest animate-pulse">
                    {t.liveBadge}
                  </span>
                </div>
              </div>
            </div>

            {/* صندوق التعليقات الحية أسفل البث */}
            <div className="space-y-4">
              <Heading2 className="text-xs text-text-secondary font-bold">{t.chatTitle}</Heading2>
              
              <div className="glass-panel p-4 rounded-2xl h-44 overflow-y-auto space-y-3">
                {comments.map((c, index) => (
                  <div key={index} className="text-xs space-y-0.5 border-b border-border-custom pb-1.5">
                    <span className="text-neon-cyan font-bold block">{c.user}</span>
                    <span className="text-text-primary block">{c.text}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={addComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.commentPlaceholder}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-cyber-dark text-text-primary border border-border-custom rounded-xl px-4 py-2.5 outline-none text-xs focus:border-neon-cyan"
                />
                <NeonButton type="submit" variant="cyan" className="text-xs py-2 px-4">
                  {t.btnSend}
                </NeonButton>
              </form>
            </div>
          </section>
        </div>

        {/* العمود الثاني: مشغل الريلز العمودي وخوارزمية الترشيح (Reels Player) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* مشغل الريلز المبتكر */}
          <section className="glass-panel p-6 rounded-3xl space-y-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center border-b border-border-custom pb-2">
              <Heading2 className="text-xs">{t.reelsSection}</Heading2>
              <Flame className="w-4 h-4 text-volt-green" />
            </div>

            {/* مشغل ريلز عمودي بمحاكاة نيون */}
            <div className="w-full max-w-[260px] aspect-[9/16] rounded-3xl bg-black border border-border-custom relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
              
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
                      {t.lockedTitle}
                    </p>
                    <NeonButton
                      variant="green"
                      glow={true}
                      onClick={() => unlockReel(reels[activeReelIndex].id)}
                      className="text-[9px] py-1.5 px-3 mx-auto"
                    >
                      {t.unlockBtn}
                    </NeonButton>
                  </div>
                ) : (
                  <div className="space-y-2 text-neon-cyan text-[10px] font-mono leading-relaxed animate-pulse">
                    {reels[activeReelIndex].videoPlaceholder}
                  </div>
                )}
              </div>

              {/* عناصر تفاعل المطور في الجانب السفلي من الريلز */}
              <div className="flex justify-between items-end z-10 w-full" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
                <div className={`space-y-1 flex-1 ${isAr ? 'text-right pr-2' : 'text-left pl-2'}`}>
                  <p className="text-[9px] font-bold text-white">{isAr ? reels[activeReelIndex].creatorNameAr : reels[activeReelIndex].creatorNameEn}</p>
                  <p className="text-[8px] text-gray-400 leading-normal line-clamp-2">{isAr ? reels[activeReelIndex].titleAr : reels[activeReelIndex].titleEn}</p>
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
                className="flex-1 py-1.5 rounded-lg glass-panel text-[9px] font-bold text-text-secondary hover:text-text-primary"
              >
                {t.prevBtn}
              </button>
              <button
                disabled={activeReelIndex === reels.length - 1}
                onClick={() => setActiveReelIndex(reels.length - 1)}
                className="flex-1 py-1.5 rounded-lg glass-panel text-[9px] font-bold text-text-secondary hover:text-text-primary"
              >
                {t.nextBtn}
              </button>
            </div>
          </section>

          {/* خوارزمية الترشيح وتوزانات الأداء (AI Recommendation Weights) */}
          <section className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <Heading2 className="text-xs">{t.aiAlgorithm}</Heading2>
              <Cpu className="w-4 h-4 text-neon-cyan" />
            </div>

            <div className="space-y-3 text-[10px]">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t.watchTime}</span>
                  <span className="text-neon-cyan font-bold">60%</span>
                </div>
                <div className="w-full bg-text-muted/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-neon-cyan h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t.engagement}</span>
                  <span className="text-volt-green font-bold">20%</span>
                </div>
                <div className="w-full bg-text-muted/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-volt-green h-full rounded-full animate-pulse" style={{ width: '20%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t.fitnessGraph}</span>
                  <span className="text-premium-gold font-bold">10%</span>
                </div>
                <div className="w-full bg-text-muted/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-premium-gold h-full rounded-full animate-pulse" style={{ width: '10%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t.socialGraph}</span>
                  <span className="text-purple-400 font-bold">10%</span>
                </div>
                <div className="w-full bg-text-muted/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full rounded-full animate-pulse" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
