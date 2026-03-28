'use client';
import React from "react";
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t } = useLanguage();
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      <header className="bg-black/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0_8px_24px_rgba(255,123,0,0.12)] flex justify-between items-center px-6 py-4 w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20">
            <img
              className="w-full h-full object-cover"
              data-alt="Close up portrait of a professional athlete with intense focus and dramatic lighting on face"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAdpiYV3ucdXvnoNFr95OBmkyMcVw91V5rKl6tmKQpmmz9shpFY28EkTIrcqio8tKmKH8bmqoBi2xGaW44apI5pJ9S4qdt2_FaHlK0hSvw4Wir1igDT98SzjHo0bTQXPR2L-dOVjoPw1iGr_NpHvYIVo0bqz8TKOgBA-ieLPy7oKj0ZW5SFLw6-mJRF2r64gKI3oHSjt4rZ8SMRkDsFFjtzf9B1AewcdQcyhgZPDbMGt8F-vkohX1gK8qohxbHc5rt26JD22tMCbDB"
            />
          </div>
          <a href="https://gem-z.shop/"><h1 className="text-2xl font-black italic text-[#ff7b00] tracking-tighter font-headline">{t("GEM Z")}</h1></a>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 text-gray-400 font-headline font-bold tracking-tight">
            <Link className="hover:text-[#ff7b00] transition-colors" href="/ai-coach">{t("Coach")}</Link>
            <Link className="hover:text-[#ff7b00] transition-colors" href="/shop">{t("Shop")}</Link>
            <Link className="hover:text-[#ff7b00] transition-colors" href="/social">{t("Feed")}</Link>
            <Link className="hover:text-[#ff7b00] transition-colors" href="/wallet">{t("Wallet")}</Link>
          </div>
          <button className="text-[#ff7b00] p-2 hover:bg-surface-variant/20 rounded-full transition-all active:scale-95">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="mb-12">
          <span className="text-primary font-headline font-black text-sm uppercase tracking-[0.3em] mb-2 block">{t("Performance Intelligence")}</span>
          <h2 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-none mb-4">{t("AI FORM")}<br />
            <span className="text-primary italic">{t("ANALYSIS")}</span>
          </h2>
          <p className="text-on-surface-variant max-w-xl text-lg">
            Harness the power of neural tracking to perfect your mechanics.
            Upload your set and let the AI find your kinetic leaks.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="relative rounded-lg overflow-hidden bg-surface-container-low aspect-video border border-outline-variant/10 shadow-2xl group">
              <img
                className="w-full h-full object-cover opacity-60"
                data-alt="Muscular athlete performing a heavy barbell back squat in a dark, atmospheric industrial gym environment"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHs1S57tuGcPB1FN1ahoOmPiz-kN_NUkxgoORlXtun2f3qx7ZzoEyfA7DMfr5e1HiNLdohA6ghrzT0oQUTyDByXKrpukLOZmSYSkA6boOLrau7wzMIQ84RSv5BRf-2-Qjroag7I-saLxEKAbGcLkCla3vigEIuOLtYrXZ-q71pIiW__baByX4fz9aQ6xU-a0d9oA2wlHFm17cRkZiz1zy9IwCDUp5F1feWQ3II2eE--UwjhNrWSdClyivuslqkAePeqgxWHFP0qgmQ"
              />

              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 800 450"
              >
                <circle
                  className="skeleton-joint"
                  cx="400"
                  cy="80"
                  r="12"
                ></circle>
                <line
                  className="skeleton-line"
                  x1="400"
                  x2="400"
                  y1="92"
                  y2="240"
                ></line>

                <line
                  className="skeleton-line"
                  x1="340"
                  x2="460"
                  y1="130"
                  y2="130"
                ></line>
                <circle
                  className="skeleton-joint"
                  cx="340"
                  cy="130"
                  r="8"
                ></circle>
                <circle
                  className="skeleton-joint"
                  cx="460"
                  cy="130"
                  r="8"
                ></circle>

                <line
                  className="skeleton-line"
                  x1="340"
                  x2="300"
                  y1="130"
                  y2="200"
                ></line>
                <line
                  className="skeleton-line"
                  x1="460"
                  x2="500"
                  y1="130"
                  y2="200"
                ></line>

                <circle
                  className="skeleton-joint"
                  cx="400"
                  cy="240"
                  r="10"
                ></circle>
                <line
                  className="skeleton-line"
                  x1="400"
                  x2="330"
                  y1="240"
                  y2="300"
                ></line>
                <line
                  className="skeleton-line"
                  x1="400"
                  x2="470"
                  y1="240"
                  y2="300"
                ></line>
                <line
                  className="skeleton-line"
                  x1="330"
                  x2="350"
                  y1="300"
                  y2="400"
                ></line>
                <line
                  className="skeleton-line"
                  x1="470"
                  x2="450"
                  y1="300"
                  y2="400"
                ></line>
                <circle
                  className="skeleton-joint"
                  cx="330"
                  cy="300"
                  r="8"
                ></circle>
                <circle
                  className="skeleton-joint"
                  cx="470"
                  cy="300"
                  r="8"
                ></circle>
              </svg>

              <div className="absolute inset-0 glass-panel flex flex-col items-center justify-center border-2 border-dashed border-primary/40 rounded-lg group-hover:bg-surface-container-highest/20 transition-all">
                <span className="material-symbols-outlined text-6xl text-primary mb-4">{t("cloud_upload")}</span>
                <h3 className="text-2xl font-bold text-white mb-2">{t("Drop Video to Analyze")}</h3>
                <p className="text-on-surface-variant mb-8 text-sm uppercase tracking-widest">{t("MP4, MOV up to 250MB")}</p>
                <div className="flex gap-4">
                  <button className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">{t("video_camera_back")}</span>{t("Camera Access")}</button>
                  <button className="bg-surface-container-highest/80 backdrop-blur-md border border-outline-variant/30 text-white px-8 py-3 rounded-full font-bold hover:bg-surface-container-highest transition-all active:scale-95">{t("Browse Files")}</button>
                </div>
              </div>

              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <div className="bg-black/80 px-4 py-2 rounded-md border-l-4 border-primary">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-tighter">{t("Hip Angle")}</p>
                  <p className="text-xl font-black font-headline">78.4°</p>
                </div>
                <div className="bg-black/80 px-4 py-2 rounded-md border-l-4 border-secondary">
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-tighter">{t("Stability")}</p>
                  <p className="text-xl font-black font-headline">94%</p>
                </div>
              </div>
            </div>

            <Link href="/ai-coach" className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed py-6 rounded-lg font-headline font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-4 hover:shadow-[0_0_30px_rgba(255,146,71,0.3)] transition-all active:scale-[0.98]">{t("Analyze Form")}<span className="material-symbols-outlined text-3xl">
                psychology
              </span>
            </Link>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-low rounded-lg p-6 border border-outline-variant/10">
              <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-6">{t("Detection Params")}</h4>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="text-on-surface-variant">{t("Joint Sensitivity")}</span>
                    <span className="text-primary">{t("High")}</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-4/5"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-surface-container rounded-md hover:bg-surface-container-high transition-colors cursor-pointer">
                    <input
                      defaultChecked
                      className="rounded bg-surface-container-highest border-outline-variant text-primary focus:ring-primary"
                      type="checkbox"
                    />
                    <span className="text-sm font-bold">{t("Auto-detect Reps")}</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-surface-container rounded-md hover:bg-surface-container-high transition-colors cursor-pointer">
                    <input
                      className="rounded bg-surface-container-highest border-outline-variant text-primary focus:ring-primary"
                      type="checkbox"
                    />
                    <span className="text-sm font-bold">{t("Kinematic Heatmap")}</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-surface-container rounded-md hover:bg-surface-container-high transition-colors cursor-pointer">
                    <input
                      defaultChecked
                      className="rounded bg-surface-container-highest border-outline-variant text-primary focus:ring-primary"
                      type="checkbox"
                    />
                    <span className="text-sm font-bold">{t("Voice Feedback")}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high p-4 rounded-lg flex flex-col justify-between aspect-square">
                <span className="material-symbols-outlined text-primary text-3xl">
                  bolt
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">{t("Processing")}</p>
                  <p className="text-lg font-black font-headline">
                    0.4s Latency
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-high p-4 rounded-lg flex flex-col justify-between aspect-square">
                <span className="material-symbols-outlined text-secondary text-3xl">{t("precision_manufacturing")}</span>
                <div>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">{t("Precision")}</p>
                  <p className="text-lg font-black font-headline">{t("MM-Level")}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-tertiary/20 to-transparent p-6 rounded-lg border border-tertiary/10">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  military_tech
                </span>
                <span className="text-tertiary font-bold text-xs uppercase tracking-widest">{t("Elite Feature")}</span>
              </div>
              <h5 className="text-xl font-bold mb-2">3D Depth Modeling</h5>
              <p className="text-xs text-on-surface-variant mb-4">
                Unlock multi-angle skeleton tracking with pro-level
                biomechanical insights.
              </p>
              <button className="text-tertiary font-black text-xs uppercase tracking-tighter border-b border-tertiary pb-1 hover:text-tertiary-fixed transition-colors">{t("Upgrade to Elite")}</button>
            </div>
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-4 bg-[#1f1f1f]/70 backdrop-blur-2xl rounded-t-[2rem] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center justify-center text-[#cf7502] drop-shadow-[0_0_8px_rgba(207,117,2,0.6)]">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            psychology
          </span>
          <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Coach")}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <span className="material-symbols-outlined">shopping_bag</span>
          <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Shop")}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <span className="material-symbols-outlined">{t("dynamic_feed")}</span>
          <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Feed")}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <span className="material-symbols-outlined">
            account_balance_wallet
          </span>
          <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Wallet")}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <span className="material-symbols-outlined">{t("groups")}</span>
          <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">{t("Squads")}</span>
        </div>
      </nav>

      <Link href="/squads" className="fixed bottom-40 right-6 md:bottom-24 w-16 h-16 rounded-full glass-fab neon-glow-orange flex items-center justify-center text-primary z-50 transition-all hover:scale-110 active:scale-95 group shadow-2xl">
        <span className="material-symbols-outlined text-4xl font-bold group-hover:rotate-90 transition-transform duration-300">{t("add")}</span>
      </Link>
      <button className="fixed bottom-60 right-6 bg-surface-container-highest/80 backdrop-blur-xl w-12 h-12 rounded-full flex items-center justify-center border border-outline-variant/30 text-white font-black z-40 md:bottom-44">
        AR
      </button>
    </div>
  );
}
