'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const metadata = {
  title: '404 - Page Not Found | GEM Z',
  description: 'The page you are looking for does not exist.',
};

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-lg text-center"
      >
        {/* 404 Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-40 h-40 rounded-full border border-dashed border-white/[0.06] flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="w-32 h-32 rounded-full border border-dotted border-[#ff7b00]/20 flex items-center justify-center"
            >
              <div className="w-24 h-24 rounded-full bg-[#ff7b00]/5 border border-[#ff7b00]/20 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-5xl text-[#ff7b00]/60"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                >
                  fitness_center
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* 404 Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            className="absolute -top-2 -right-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1.5"
          >
            <span className="text-sm font-black text-red-400">404</span>
          </motion.div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h1 className="text-3xl font-black text-white">Page Not Found</h1>
          <p className="text-sm text-white/50 max-w-sm leading-relaxed">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </motion.div>

        {/* Search Suggestion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search for pages..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff7b00]/50 focus:ring-2 focus:ring-[#ff7b00]/20 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = (e.target as HTMLInputElement).value;
                  if (query.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                  }
                }
              }}
            />
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2 justify-center pt-2"
        >
          <QuickLink href="/" icon="home" label="Home" />
          <QuickLink href="/profile" icon="person" label="Profile" />
          <QuickLink href="/wallet" icon="account_balance_wallet" label="Wallet" />
          <QuickLink href="/support" icon="support_agent" label="Support" />
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-4"
        >
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#ff7b00] text-black font-bold text-sm shadow-[0_0_20px_rgba(255,123,0,0.3)] hover:shadow-[0_0_30px_rgba(255,123,0,0.4)] transition-shadow"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
              arrow_back
            </span>
            Back to Home
          </motion.a>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-white/20 pt-4"
        >
          GEM Z Fitness Ecosystem &copy; {new Date().getFullYear()}
        </motion.p>
      </motion.div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <motion.a
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/60 font-medium text-xs border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
    >
      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
        {icon}
      </span>
      {label}
    </motion.a>
  );
}
