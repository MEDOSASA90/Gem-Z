'use client';
import React, { useState } from "react";
import Link from 'next/link';
import { 
  Bell, 
  PlusCircle, 
  Zap, 
  Users, 
  Award, 
  Wallet, 
  ChevronRight, 
  Brain, 
  Utensils, 
  Footprints, 
  ShoppingBag, 
  LayoutList, 
  UserPlus,
  Send,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useLanguage } from '../../context/LanguageContext';

const SQUAD_MESSAGES = [
  { id: 1, author: 'Ahmed', avatar: 'AH', text: 'يلا شباب من مشارك في تحدي الـ 30 يوم? 💪', time: '09:10', sent: false },
  { id: 2, author: 'Sara', avatar: 'SA', text: 'أنا! بدأت من أول الشهر 🔥', time: '09:11', sent: false },
  { id: 3, author: 'Me', avatar: 'ME', text: "Let's go! Day 12 done ✅", time: '09:15', sent: true },
  { id: 4, author: 'Omar', avatar: 'OM', text: 'النتيجة الجديدة نزلت في الليدربورد 🏆', time: '09:20', sent: false },
];

const VOTES = [
  { id: 1, question: 'ما أفضل وقت للتمرين الجماعي القادم؟', options: ['الصبح 7AM', 'الظهر 1PM', 'المساء 6PM', 'الليل 9PM'], votes: [8, 3, 15, 6] },
];

export default function SquadsPage() {
    const { t, isArabic } = useLanguage();
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState(SQUAD_MESSAGES);
    const [activeSection, setActiveSection] = useState<'squads' | 'chat' | 'vote' | 'support'>('squads');
    const [userVotes, setUserVotes] = useState<Record<number, number>>({});
    const [supportAmount, setSupportAmount] = useState('');
    const [supported, setSupported] = useState(false);

    const sendMessage = () => {
        if (!chatInput.trim()) return;
        setMessages(prev => [...prev, { id: Date.now(), author: 'Me', avatar: 'ME', text: chatInput, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), sent: true }]);
        setChatInput('');
    };

    const vote = (pollId: number, optIdx: number) => {
        setUserVotes(prev => ({ ...prev, [pollId]: optIdx }));
    };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      {/* TopAppBar */}
      <header className="bg-black/60 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full sticky z-50 tonal-transition-bg shadow-[0_8px_24px_rgba(255,123,0,0.12)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-primary-fixed overflow-hidden">
            <a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img 
              className="w-full h-full object-cover" 
              alt="Profile" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqnC1i4w_DbtyJTJ6v-MekCy65UL5wyKSuE_Pv-UA2DzVpVvVgoqFd7YxrpznNESjnLuH6CFjyzEPkaqOND_Z2M_9OUqJnDrjKzQ7hNHXAl-EuzcicDedWK8ttZZaqK5DAX8EwF5dJhlqh9SjEcz3B-5lQ4rBNsKfTacAlJ4gSzg8qjQDU9JUepOjTGypXQ6BMquPZtL78_lWrcb8qCOTYBdhIvb4dWleAtSabdnrM87F-NFF_1EoZfT3SNPB0r3HsSPysnRYQVFFE" 
            /></a>
          </div>
          <a href="https://gem-z.shop/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline uppercase">{t("GEM Z")}</h1></a>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 font-headline font-bold tracking-tight">
            <Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/ai-coach">{t("Coach")}</Link>
            <Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/shop">{t("Shop")}</Link>
            <Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/social">{t("Feed")}</Link>
            <Link className="text-gray-400 hover:text-[#ff7b00] transition-colors" href="/wallet">{t("Wallet")}</Link>
            <Link className="text-[#ff7b00]" href="/squads">{t("Squads")}</Link>
          </nav>
          <button className="text-[#ff7b00] scale-95 active:duration-150">
            <Bell className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-32">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-primary-fixed font-headline font-bold tracking-[0.2em] uppercase text-xs mb-2 block">{t("Team Dynamics")}</span>
              <h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-none text-on-surface">{t("YOUR")}<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed to-tertiary-fixed">{t("SQUADS")}</span>
              </h2>
            </div>
            <Link href="/squads/create" className="group relative flex items-center gap-3 bg-primary-fixed text-on-primary-fixed px-8 py-4 rounded-full font-headline font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,123,0,0.4)] hover:shadow-[0_0_30px_rgba(255,123,0,0.6)] hover:scale-105 active:scale-95 transition-all">
              <PlusCircle className="w-5 h-5" />{t("Create New Squad")}<div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-active:opacity-100 transition-opacity"></div>
            </Link>
          </div>
        </section>

        {/* Bento Grid for Squads */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Active Challenge Squad (Large) */}
          <div className="md:col-span-8 group relative overflow-hidden rounded-lg bg-surface-container-low p-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/20 to-transparent"></div>
            <div className="relative glass-card h-full rounded-[1.8rem] p-8 flex flex-col justify-between min-h-[400px]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-primary-fixed text-on-primary-fixed text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">{t("Active Challenge")}</span>
                    <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                      Global Rank #12
                    </span>
                  </div>
                  <h3 className="text-4xl font-black font-headline text-on-surface mb-2">{t("NEON RUNNERS")}</h3>
                  <p className="text-on-surface-variant max-w-md">{t("Dominating the night streets. Currently on a 14-day streak for the Midnight Marathon challenge.")}</p>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black font-headline text-primary-fixed block">4,820</span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t("Weekly Gems")}</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex -space-x-4">
                  <img className="w-14 h-14 rounded-full border-4 border-surface-container-highest object-cover" alt="Athlete" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDKZiFZF_WFYGQYr4XYlblWHfz4xh_lp2i9pLl57i1aOg2qOrLpIfUza53V4e9lVaQdBCWekcNSZFHroeztMyQWvoVQ3kNI2BEydrPvpTMdnYvbriY8ZHeCYx0o1GC0SgWta7D2J5xfxft-hN5i_zJsvvGuLFR7ZqBF54xsj7z3ZrIl_icKTDviEFbguGj7SeqvNT4OspE7uBP3R7A4XwgmGWBTl8yjzl9wOk1SfkKUKGG1CowtrdsVbywNkoCrCNWpW25VKnvKTkZ"/>
                  <img className="w-14 h-14 rounded-full border-4 border-surface-container-highest object-cover" alt="Athlete" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR7H5T_-DzWLY1z9srQ0HGeSlsUzahPYQa0jP2hgrAe3kQoTufaTK3cYPbWKpiB6Z0XahBYBMXOEs4R9i4w-HWfnbqvmhoTbwZMrQ1moM9o52oKxgmz2QuypIsQ0yhDmm8BQYMmxvGz5rrvDm32liOYDA4p4OxdOMqwv-Waf8tsp0QMWJmRSP-u_CjaN70nTK1qi-5So5HfITRczEuSkmO_UFHoJE3pbFeGLNbSuXZTSIBReggDB88Nuo8IYClFihe6n21publX9Xk"/>
                  <img className="w-14 h-14 rounded-full border-4 border-surface-container-highest object-cover" alt="Athlete" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCYE-yG9SXUmLSv8qDrWB_7FWeiemNMQT7-tSvdpB9b31X_OVuhn7QzDj6ARS8L5TSsldFPiZVZ0FXeojY5BomzgR8Ihw2skaiQhAbKStrngz5ZjY3KOPHj4ZYfJyXpBQHv7bWJ6ydVZdlE_CuU_Fyx1gKijyErmlLAW1L2MagkgLey7BLmjPC5x7gRlk1ShrfgoMfWGoi0eIduzwlA8-D_i2crIS43V1M3f1kY0f77KmNj-lLvN2gkOUGWMG4sBCEakaHoPGCLHFq"/>
                  <div className="w-14 h-14 rounded-full border-4 border-surface-container-highest bg-surface-container-highest flex items-center justify-center text-primary-fixed font-bold">+18</div>
                </div>
                <div className="flex gap-2">
                  <Zap className="w-6 h-6 text-primary-fixed fill-primary-fixed" />
                  <Zap className="w-6 h-6 text-primary-fixed fill-primary-fixed" />
                  <Zap className="w-6 h-6 text-primary-fixed" />
                </div>
              </div>
            </div>
          </div>

          {/* Squad Stats (Medium) */}
          <div className="md:col-span-4 glass-card rounded-lg p-8 flex flex-col justify-center border border-white/5">
            <h4 className="text-on-surface-variant text-xs font-bold uppercase tracking-[0.2em] mb-6">{t("Squad Performance")}</h4>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary-fixed/10">
                    <Users className="w-6 h-6 text-primary-fixed" />
                  </div>
                  <span className="font-headline font-bold text-lg">{t("Total Members")}</span>
                </div>
                <span className="text-2xl font-black font-headline">142</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-secondary/10">
                    <Award className="w-6 h-6 text-secondary" />
                  </div>
                  <span className="font-headline font-bold text-lg">{t("Trophies")}</span>
                </div>
                <span className="text-2xl font-black font-headline">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-tertiary/10">
                    <Wallet className="w-6 h-6 text-tertiary" />
                  </div>
                  <span className="font-headline font-bold text-lg">{t("Treasury")}</span>
                </div>
                <span className="text-2xl font-black font-headline">4.2k</span>
              </div>
            </div>
          </div>

          {/* Squad Item 2 (Medium) */}
          <div className="md:col-span-6 bg-surface-container-high rounded-lg p-6 hover:bg-surface-container-highest transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                  <img className="w-full h-full object-cover" alt="Gym" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTbAUNB5f5RmxzPtV0Ekz8MLNpKS1dxigZt0f5-Inn1eLVGT7T5mazkUx0R9eNALPJ3h8qyDnYB0QXaW0_zQLDVsyISHVKV4lDS6FtZODKwygBYpCAqpos9UA_7d8jmpPCeUnMS8gB5ppkKh1dKGUuLkZMGwSLt2KaiKXrQfD4lg3BoYS_Fo3kHQ8oJh3__zQpKMEY6BRnf1jSq4G2tyc3Vy5WujO0QB1IQSOP_tZ5WpxoyUHnUqSd2A8mZhGGSLzWz2v6cPkjWFpW"/>
                </div>
                <div>
                  <h3 className="text-2xl font-black font-headline text-on-surface">{t("IRON TITANS")}</h3>
                  <p className="text-on-surface-variant text-sm">{t("Heavy lifting & hypertrophy")}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary-fixed transition-colors" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex -space-x-2">
                <a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img className="w-8 h-8 rounded-full border-2 border-surface-container-high object-cover" alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2pieAjHtxZpdpzPspiMUXcCZAMwO-HKFJgby71-6HE_U5e12lCm7qhuJiZuWxZccIR4DnYSmDlAr59DzeSo6UErflrRVHOGaa1aSODAXgOi8o-uCURsZNYzyAstkZCVVZft_H0btISmBN2QmLwj4XWoBfUcXdetIrrGdwlBRLk8AmCwWGjz_XpGtHd7a4p_kmQasG8LxycgXtg3JQKipY9-ccU8MHyyCfyj-aJM53D83uuZeaI-BKlnf8KZeFBJaYN8mnd4lvV19s"/></a>
                <a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img className="w-8 h-8 rounded-full border-2 border-surface-container-high object-cover" alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCL925k-OTdxCMo2g_ddYirPRIfzhC3JGhzwz9BMLvrJf18eArGupKp7JL92EF7OgtzmIXm07CaiXliIdV1EwWbJPH4f8Z840anKc9nH5_TRP9vlUqPgJgkBGWc1uk2HhVb8j46omYNt0qgjjtYlMhxS7AXFab8txOOwSZaNf93shGWL7WqvgiUirW9oxFXOeuxgAVfqW8hO81jq55XsLYx0-UJ29sm6wZcD4Mm7Z5Wx56ZNvtozNGCIi11XoP6--7so2B1pGXDYWLn"/></a>
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-high bg-surface-container-low flex items-center justify-center text-[10px] font-bold">+5</div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">8 Members Active Now</span>
            </div>
          </div>

          {/* Squad Item 3 (Medium) */}
          <div className="md:col-span-6 bg-surface-container-high rounded-lg p-6 hover:bg-surface-container-highest transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                  <img className="w-full h-full object-cover" alt="Gym" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkSJQ2XKCiWaSC5fgLaAgDfTcw9j-2VliA_S-0V7N0-Vhwt6h9CssBblrh5xVxQ0rNLG0jDaizhHlBHKdwoMXS4XnMNibZqty9xI6xm2qqOv9K-fGaLnRi9QSlwJl5evxKmeA_d1iBb45tPxnUlmIjgB0aYGYHTY8gojp6vy7VLnwVFb6cVJISvjWAmx_FlQNULyzFou7z1AtLgrbWt1DuHiBRzdIQ_FW1LrdKzTSVxHfUtbeApXRR0Cgej2oqPU_sDyomBMAGtKZP"/>
                </div>
                <div>
                  <h3 className="text-2xl font-black font-headline text-on-surface">{t("ZEN COLLECTIVE")}</h3>
                  <p className="text-on-surface-variant text-sm">{t("Mindfulness & active recovery")}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary-fixed transition-colors" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex -space-x-2">
                <a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img className="w-8 h-8 rounded-full border-2 border-surface-container-high object-cover" alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDP9uzrG00w-PzcFraliP5OR2L9KdeP2ZI0KBA8ve1QpbyQRdt5wfIFngHRKNDhzFNXN1L420v4Z0vwjgLDIZ0uHEh9RZFKgdj5bHifEsblUCL_cVz2iXkW3MeF_Sz80_37dciIiIezvr8RDeW_DFgL2PlVe-OjRq0SHZ4vg843j3oD_dqfErzuBjRpgHLfEAxfo3Pfcp-EmHt-7pGk-Wa7jZX_v0aZDhcY_NDbvog296PsHf4RMSE6ekap1Jrga-nGt5qGyZDc_Umu"/></a>
                <a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}><img className="w-8 h-8 rounded-full border-2 border-surface-container-high object-cover" alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCFBSHCZScpdIGmRR_nhZb-KClrFDp7-1yu8PFSgNSIDZks7LdGaDVY5L2-UI0Wx20QAxQnY6GVItsHx6Hm5QDX8vq6voEY_JlcY0Qkwt_ORJPI5pjCIcPKOVifvCQp_pmrNd6xEXkDavWwWsw1RHjm__jVXMQSLOcQJBc1TvoGQYO915byWRk05AcOCSZ56JWNyeHEm8Rl2QDugTsrgsFwXYqvyxkqJR5DTEGfmonkwk96alVxLwV6dfo7jBgx-s8klbb7rMBvX1p"/></a>
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-high bg-surface-container-low flex items-center justify-center text-[10px] font-bold">+24</div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">2 Members Active Now</span>
            </div>
          </div>
        </div>

        {/* Featured Suggestions */}
        <section className="mt-16">
          <h3 className="text-2xl font-black font-headline text-on-surface mb-8 uppercase tracking-tighter">{t("Recommended Squads")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-low rounded-lg p-4 border border-white/5 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-surface-container-highest mb-4 flex items-center justify-center border border-primary-fixed/30">
                <Zap className="w-8 h-8 text-primary-fixed" />
              </div>
              <h5 className="font-black font-headline text-lg mb-1">{t("STRIKE TEAM")}</h5>
              <p className="text-xs text-on-surface-variant mb-4">{t("Fast-paced HIIT group")}</p>
              <Link href="/register" className="w-full py-2 bg-surface-container-highest text-primary-fixed rounded-full text-xs font-black uppercase tracking-widest hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors">{t("Join")}</Link>
            </div>
            
            <div className="bg-surface-container-low rounded-lg p-4 border border-white/5 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-surface-container-highest mb-4 flex items-center justify-center border border-secondary/30">
                <Utensils className="w-8 h-8 text-secondary" />
              </div>
              <h5 className="font-black font-headline text-lg mb-1">{t("KETO KINGS")}</h5>
              <p className="text-xs text-on-surface-variant mb-4">{t("Nutrition & meal prep")}</p>
              <Link href="/register" className="w-full py-2 bg-surface-container-highest text-secondary rounded-full text-xs font-black uppercase tracking-widest hover:bg-secondary hover:text-[hsl(24,100%,7%)] transition-colors">{t("Join")}</Link>
            </div>
            
            <div className="bg-surface-container-low rounded-lg p-4 border border-white/5 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-surface-container-highest mb-4 flex items-center justify-center border border-tertiary/30">
                <Brain className="w-8 h-8 text-tertiary" />
              </div>
              <h5 className="font-black font-headline text-lg mb-1">{t("MIND SET")}</h5>
              <p className="text-xs text-on-surface-variant mb-4">{t("Focus & meditation")}</p>
              <Link href="/register" className="w-full py-2 bg-surface-container-highest text-tertiary rounded-full text-xs font-black uppercase tracking-widest hover:bg-tertiary hover:text-[hsl(44,100%,15%)] transition-colors">{t("Join")}</Link>
            </div>
            
            <div className="bg-surface-container-low rounded-lg p-4 border border-white/5 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-surface-container-highest mb-4 flex items-center justify-center border border-primary-dim/30">
                <Footprints className="w-8 h-8 text-primary-dim" />
              </div>
              <h5 className="font-black font-headline text-lg mb-1">{t("ROAD ELITE")}</h5>
              <p className="text-xs text-on-surface-variant mb-4">{t("Pro marathon prep")}</p>
              <Link href="/register" className="w-full py-2 bg-surface-container-highest text-primary-dim rounded-full text-xs font-black uppercase tracking-widest hover:bg-primary-dim hover:text-on-primary-fixed transition-colors">{t("Join")}</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Squad Internal Feature Tabs */}
      <section className="max-w-7xl mx-auto px-6 pb-40">
        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
          {[
            { id: 'squads', icon: 'groups', label: isArabic ? 'السكواد' : 'Squads' },
            { id: 'chat', icon: 'chat', label: isArabic ? 'شات السكواد' : 'Squad Chat' },
            { id: 'vote', icon: 'how_to_vote', label: isArabic ? 'تصويت' : 'Vote' },
            { id: 'support', icon: 'volunteer_activism', label: isArabic ? 'دعم مالي' : 'Support' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id as any)} className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${activeSection === tab.id ? 'bg-[#ff7b00] text-black shadow-[0_0_16px_rgba(255,123,0,0.4)]' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-white/5'}`}>
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Squad Chat */}
        {activeSection === 'chat' && (
          <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-white/5">
            <div className="p-4 bg-[#ff7b00]/10 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ff7b00]/20 flex items-center justify-center font-black text-[#ff7b00]">NR</div>
              <div><p className="font-black">{t('NEON RUNNERS')}</p><p className="text-xs text-on-surface-variant">21 {isArabic ? 'عضو نشط' : 'active members'}</p></div>
            </div>
            <div className="h-72 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!msg.sent && <div className="w-7 h-7 rounded-full bg-[#ff7b00]/20 flex items-center justify-center text-[10px] font-bold shrink-0">{msg.avatar}</div>}
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${msg.sent ? 'bg-[#ff7b00] text-black rounded-br-sm' : 'bg-surface-container-high rounded-bl-sm'}`}>
                    {!msg.sent && <p className="text-[10px] font-bold text-[#ff7b00] mb-0.5">{msg.author}</p>}
                    {msg.text}
                    <p className={`text-[10px] mt-1 ${msg.sent ? 'text-black/50 text-right' : 'text-on-surface-variant'}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/5 flex gap-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-surface-container-high rounded-full px-4 py-2 text-sm outline-none placeholder:text-on-surface-variant" placeholder={isArabic ? 'اكتب رسالة...' : 'Type a message...'} />
              <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-10 h-10 rounded-full bg-[#ff7b00] text-black flex items-center justify-center disabled:opacity-40 hover:scale-110 active:scale-95 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Squad Voting */}
        {activeSection === 'vote' && (
          <div className="space-y-6">
            {VOTES.map(poll => {
              const total = poll.votes.reduce((a, b) => a + b, 0);
              const voted = userVotes[poll.id] !== undefined;
              return (
                <div key={poll.id} className="bg-surface-container-low rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#ff7b00]">how_to_vote</span>
                    <h4 className="font-black font-headline">{poll.question}</h4>
                  </div>
                  <div className="space-y-3">
                    {poll.options.map((opt, i) => {
                      const pct = total > 0 ? Math.round((poll.votes[i] / total) * 100) : 0;
                      return (
                        <button key={i} onClick={() => vote(poll.id, i)} disabled={voted} className={`w-full text-left rounded-xl overflow-hidden border transition-all ${userVotes[poll.id] === i ? 'border-[#ff7b00]' : 'border-white/10 hover:border-[#ff7b00]/50'}`}>
                          <div className="relative px-4 py-3">
                            {voted && <div className="absolute inset-0 rounded-xl" style={{ width: `${pct}%`, background: userVotes[poll.id] === i ? 'rgba(255,123,0,0.15)' : 'rgba(255,255,255,0.03)' }} />}
                            <div className="relative flex justify-between items-center">
                              <span className="font-medium text-sm">{opt}</span>
                              {voted && <span className={`text-sm font-black ${userVotes[poll.id] === i ? 'text-[#ff7b00]' : 'text-on-surface-variant'}`}>{pct}%</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-3">{total} {isArabic ? 'تصويت' : 'votes'}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Financial Support */}
        {activeSection === 'support' && (
          <div className="bg-surface-container-low rounded-2xl p-6 border border-white/5 max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#ff7b00]/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[#ff7b00] text-3xl">volunteer_activism</span>
              </div>
              <h3 className="font-black text-2xl font-headline">{isArabic ? 'ادعم فريق NEON RUNNERS' : 'Support NEON RUNNERS'}</h3>
              <p className="text-on-surface-variant text-sm mt-2">{isArabic ? 'ساعد فريقك على الوصول للقمة! الدعم المالي يغطي تكاليف التحدي والمعدات.' : "Help your squad reach the top! Financial support covers challenge fees and equipment."}</p>
            </div>
            {!supported ? (
              <>
                <div className="flex gap-3 flex-wrap justify-center mb-6">
                  {['25', '50', '100', '200'].map(amt => (
                    <button key={amt} onClick={() => setSupportAmount(amt)} className={`px-6 py-2.5 rounded-full font-black text-sm transition-all ${supportAmount === amt ? 'bg-[#ff7b00] text-black shadow-[0_0_16px_rgba(255,123,0,0.4)]' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-white/5'}`}>EGP {amt}</button>
                  ))}
                </div>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-bold">EGP</span>
                  <input value={supportAmount} onChange={e => setSupportAmount(e.target.value)} className="w-full bg-surface-container-high rounded-full px-4 py-3 pl-14 text-sm outline-none focus:ring-1 focus:ring-[#ff7b00] border border-white/10 text-on-surface" placeholder={isArabic ? 'مبلغ مخصص...' : 'Custom amount...'} type="number" />
                </div>
                <button onClick={() => { if (supportAmount) setSupported(true); }} disabled={!supportAmount} className="w-full py-4 rounded-full bg-[#ff7b00] text-black font-black text-lg disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_24px_rgba(255,123,0,0.3)]">
                  {isArabic ? `ادعم بـ EGP ${supportAmount || '...'} 💪` : `Support with EGP ${supportAmount || '...'} 💪`}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                </div>
                <p className="font-black text-xl text-green-500">{isArabic ? 'شكراً لدعمك! 🙌' : 'Thanks for your support! 🙌'}</p>
                <p className="text-on-surface-variant text-sm mt-1">{isArabic ? `تم خصم EGP ${supportAmount} من محفظتك` : `EGP ${supportAmount} deducted from your wallet`}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 glass-card shadow-[0_-10px_30px_rgba(0,0,0,0.5)] md:hidden border-t border-white/5">
        <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/ai-coach">
          <Brain className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/shop">
          <ShoppingBag className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/social">
          <LayoutList className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-gray-500 hover:scale-110 transition-transform" href="/wallet">
          <Wallet className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)] hover:scale-110 transition-transform" href="/squads">
          <Users className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
        </Link>
      </nav>

      {/* Floating Action Button */}
      <Link href="/squads/create" className="fixed bottom-24 right-6 w-16 h-16 bg-black/80 backdrop-blur-xl border border-primary-fixed/30 text-primary-fixed rounded-2xl shadow-[0_0_25px_rgba(255,123,0,0.5)] flex items-center justify-center group hover:scale-110 active:scale-95 transition-all duration-300 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <UserPlus className="w-8 h-8 relative z-10" />
      </Link>

    </div>
  );
}
