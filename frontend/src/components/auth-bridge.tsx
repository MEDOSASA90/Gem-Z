'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../core/store/use-store';
import { Heading2, BodyText, NeonButton } from '../core/theme/design-tokens';
import { Phone, Lock, CheckCircle, AlertTriangle, ArrowLeft, Shield, Sparkles } from 'lucide-react';

interface AuthBridgeProps {
  onSuccessClose?: () => void;
}

export const AuthBridge: React.FC<AuthBridgeProps> = ({ onSuccessClose }) => {
  const {
    loginPhone,
    otpSent,
    verificationLoading,
    verificationError,
    isAuthenticated,
    user,
    wallet,
    lang,
    setLoginPhone,
    triggerOtpSend,
    verifyOtp,
    logout,
    clearError,
  } = useAuthStore();

  const [otpCode, setOtpCode] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<'EG' | 'SA' | 'UAE'>('EG'); // Default strictly to Egypt (EG)

  const isAr = lang === 'ar';

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) return;
    
    // Prefix formatting locked strictly to regional parameters
    const prefix = selectedCountry === 'SA' ? '+966' : selectedCountry === 'EG' ? '+20' : '+971';
    const fullPhone = `${prefix}${phoneInput}`;
    setLoginPhone(fullPhone);
    
    const sent = await triggerOtpSend();
    if (sent) {
      setOtpCode('');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    
    const success = await verifyOtp(otpCode);
    if (success && onSuccessClose) {
      setTimeout(onSuccessClose, 1200);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 1. حالة تسجيل الدخول الناجح (Success Authenticated State) */}
      {isAuthenticated && user ? (
        <div className="glass-panel-glow p-8 rounded-3xl text-center space-y-6 animate-fade-in border-border-custom">
          <div className="w-16 h-16 rounded-full bg-volt-green/10 border border-volt-green/30 flex items-center justify-center text-volt-green mx-auto shadow-[0_0_20px_rgba(57,255,20,0.15)]">
            <CheckCircle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <Heading2 className="text-volt-green text-glow-green">
              {isAr ? 'تم تسجيل الدخول بنجاح' : 'Authentication Success'}
            </Heading2>
            <BodyText className="text-xs">
              {isAr ? 'أهلاً بك مجدداً في بوابة التطبيقات الرياضية لـ GEM Z' : 'Welcome back to the GEM Z Progressive OS'}
            </BodyText>
          </div>

          {/* تفاصيل الملف الشخصي والمحفظة بالجنيه المصري */}
          <div className="bg-cyber-dark/40 border border-border-custom rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <span className="text-text-secondary text-xs">{isAr ? 'الاسم المستأجر' : 'Active Tenant Account'}</span>
              <span className="text-text-primary text-xs font-semibold">{user.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <span className="text-text-secondary text-xs">{isAr ? 'الدور الوظيفي' : 'Governance Role'}</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-premium-gold/15 text-premium-gold border border-premium-gold/20">
                {user.role}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-xs">{isAr ? 'رصيد المحفظة النشط' : 'Egyptian Wallet Balance'}</span>
              <span className="text-neon-cyan font-bold text-xs tracking-wider">
                {wallet.balance.toFixed(2)} {wallet.currency}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <NeonButton variant="glass" onClick={logout} className="flex-1 text-xs py-2.5">
              {isAr ? 'تسجيل الخروج' : 'Log Out Account'}
            </NeonButton>
          </div>
        </div>
      ) : (
        /* 2. واجهة طلب الدخول وإرسال الـ OTP ببطاقة نيون سيبرانية */
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden shadow-2xl border-border-custom">
          {/* خط نيون جمالي متوهج بالأعلى */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan" />
          
          <div className="flex justify-between items-center mb-6">
            <Shield className="w-5 h-5 text-neon-cyan" />
            <span className="text-[8px] uppercase font-bold tracking-wider text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-1 rounded">
              {isAr ? 'معبر التحقق OTP' : 'GEM Z SECURE PWA'}
            </span>
          </div>

          {/* الخطوة الأولى: إدخال رقم الهاتف الجوال */}
          {!otpSent ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="space-y-2">
                <Heading2 className="font-extrabold flex items-center gap-2">
                  <span>{isAr ? 'بوابة الدخول السريع' : 'Low-Barrier PWA Gate'}</span>
                  <Sparkles className="w-5 h-5 text-neon-cyan" />
                </Heading2>
                <BodyText className="text-xs text-text-secondary">
                  {isAr 
                    ? 'سجل دخولك بنظام خطوة واحدة بدون تثبيت شاق لتشغيل المنصة كـ PWA معتمدة بمصر' 
                    : 'Access your secure dashboard with one-time verification. No complex installation required.'}
                </BodyText>
              </div>

              {/* اختيار الدولة ورقم الهاتف */}
              <div className="space-y-2">
                <label className="text-xs text-text-primary font-semibold block">{isAr ? 'رقم الجوال الخلوي' : 'Mobile Number'}</label>
                <div className="flex gap-2" style={{ direction: 'ltr' }}>
                  {/* منتقي كود الدولة */}
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value as any)}
                    className="bg-cyber-dark text-text-primary text-xs border border-border-custom rounded-xl px-2 outline-none focus:border-neon-cyan transition-colors"
                  >
                    <option value="EG">🇪🇬 +20</option>
                    <option value="SA">🇸🇦 +966</option>
                    <option value="UAE">🇦🇪 +971</option>
                  </select>
                  
                  {/* مدخل الرقم */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      required
                      placeholder={selectedCountry === 'EG' ? '1012345678' : '512345678'}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-cyber-dark text-text-primary pl-10 pr-4 py-3 rounded-xl border border-border-custom outline-none text-xs focus:border-neon-cyan transition-all tracking-widest font-mono"
                    />
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
                  </div>
                </div>
              </div>

              {/* معالجة الأخطاء */}
              {verificationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <NeonButton
                type="submit"
                variant="cyan"
                disabled={verificationLoading}
                className="w-full text-xs py-3"
              >
                {verificationLoading 
                  ? (isAr ? 'جاري إرسال الكود...' : 'Sending SMS...') 
                  : (isAr ? 'إرسال رمز التحقق (SMS)' : 'Send Verification Code')}
              </NeonButton>
            </form>
          ) : (
            /* الخطوة الثانية: إدخال رمز التحقق OTP */
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-xs text-neon-cyan hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3 rtl-flip" />
                    <span>{isAr ? 'تعديل الرقم' : 'Edit Number'}</span>
                  </button>
                  <Heading2>{isAr ? 'أدخل كود التحقق' : 'Enter Secure OTP'}</Heading2>
                </div>
                <BodyText className="text-xs">
                  {isAr 
                    ? `أدخل الكود المكون من 6 أرقام المرسل إلى الرقم: ` 
                    : `Enter 6-digit code dispatched to `}
                  <span className="text-neon-cyan tracking-wider font-mono font-bold">{loginPhone}</span>
                </BodyText>
              </div>

              {/* مدخل رمز التحقق OTP */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-cyber-dark text-text-primary text-center py-3 rounded-xl border border-border-custom outline-none tracking-[0.5em] text-lg font-bold focus:border-volt-green transition-all"
                  />
                  <Lock className="absolute left-3 top-4 w-4 h-4 text-text-muted" />
                </div>
                <span className="text-[10px] text-text-secondary block text-center">
                  {isAr 
                    ? `الرمز التجريبي الافتراضي للمطابقة هو: ` 
                    : `Demo testing bypass code is: `}
                  <b className="text-volt-green font-mono">123456</b>
                </span>
              </div>

              {/* معالجة الأخطاء */}
              {verificationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <NeonButton
                type="submit"
                variant="green"
                disabled={verificationLoading || otpCode.length < 6}
                className="w-full text-xs py-3"
              >
                {verificationLoading 
                  ? (isAr ? 'جاري مطابقة الكود...' : 'Verifying...') 
                  : (isAr ? 'التحقق والمتابعة' : 'Verify & Access')}
              </NeonButton>
            </form>
          )}

          {/* إرشاد PWA للمستخدم */}
          <div className="mt-6 pt-6 border-t border-border-custom text-center">
            <span className="text-[10px] text-text-muted">
              {isAr 
                ? '💡 يدعم هذا المعبر وضع ملء الشاشة الفوري عند التثبيت كـ PWA على الهاتف.' 
                : '💡 This portal automatically optimizes for fullscreen when installed as a PWA.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
