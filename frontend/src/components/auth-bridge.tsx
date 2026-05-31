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
    setLoginPhone,
    triggerOtpSend,
    verifyOtp,
    logout,
    clearError,
  } = useAuthStore();

  const [otpCode, setOtpCode] = useState('');
  const [phoneInput, setPhoneInput] = useState(loginPhone || '');
  const [selectedCountry, setSelectedCountry] = useState<'SA' | 'EG' | 'UAE'>('SA');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) return;
    
    // تنسيق رقم الهاتف مسبقاً بناءً على كود الدولة
    const fullPhone = `${selectedCountry === 'SA' ? '+966' : selectedCountry === 'EG' ? '+20' : '+971'}${phoneInput}`;
    setLoginPhone(fullPhone);
    await triggerOtpSend();
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    
    const success = await verifyOtp(otpCode);
    if (success && onSuccessClose) {
      setTimeout(onSuccessClose, 1500);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 1. حالة تسجيل الدخول الناجح (Success Authenticated State) */}
      {isAuthenticated && user ? (
        <div className="glass-panel-glow p-8 rounded-3xl text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-volt-green/10 border-2 border-volt-green/30 flex items-center justify-center text-volt-green mx-auto shadow-[0_0_20px_rgba(57,255,20,0.2)]">
            <CheckCircle className="w-12 h-12" />
          </div>
          
          <div className="space-y-2">
            <Heading2 className="text-volt-green text-glow-green">تم تسجيل الدخول بنجاح</Heading2>
            <BodyText>أهلاً بك مجدداً في بوابة التطبيقات التقدمية (PWA)</BodyText>
          </div>

          {/* تفاصيل الملف الشخصي والمحفظة */}
          <div className="bg-cyber-dark/60 border border-white/5 rounded-2xl p-4 text-right space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-gray-400 text-xs">الاسم المستأجر</span>
              <span className="text-white text-sm font-semibold">{user.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-gray-400 text-xs">الدور الإداري</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-premium-gold/10 text-premium-gold border border-premium-gold/20">
                {user.role}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">الرصيد المتاح (Withdrawable)</span>
              <span className="text-neon-cyan font-bold text-sm tracking-wide">
                {wallet.balance.toFixed(2)} {wallet.currency}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <NeonButton variant="glass" onClick={logout} className="flex-1">
              تسجيل الخروج
            </NeonButton>
          </div>
        </div>
      ) : (
        /* 2. واجهة طلب الدخول وإرسال الـ OTP */
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/10">
          {/* خط نيون جمالي متوهج بالأعلى */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-cyan via-volt-green to-neon-cyan" />
          
          <div className="flex justify-between items-center mb-6">
            <Shield className="w-6 h-6 text-neon-cyan" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-1 rounded">
              GEM Z AUTH BRIDGE
            </span>
          </div>

          {/* الخطوة الأولى: إدخال رقم الهاتف الجوال */}
          {!otpSent ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6 text-right">
              <div className="space-y-2">
                <Heading2 className="text-left md:text-right font-extrabold text-white flex items-center justify-end gap-2">
                  <span>بوابة الدخول السريع</span>
                  <Sparkles className="w-5 h-5 text-neon-cyan" />
                </Heading2>
                <BodyText className="text-xs text-gray-400">
                  سجل دخولك بنظام خطوة واحدة (OTP) بدون تثبيت شاق لتشغيل المنصة كـ PWA
                </BodyText>
              </div>

              {/* اختيار الدولة ورقم الهاتف */}
              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-semibold block">رقم الجوال</label>
                <div className="flex gap-2 direction-ltr" style={{ direction: 'ltr' }}>
                  {/* منتقي كود الدولة */}
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value as any)}
                    className="bg-card-dark text-white text-xs border border-white/10 rounded-xl px-3 outline-none focus:border-neon-cyan transition-colors"
                  >
                    <option value="SA">🇸🇦 +966</option>
                    <option value="EG">🇪🇬 +20</option>
                    <option value="UAE">🇦🇪 +971</option>
                  </select>
                  
                  {/* مدخل الرقم */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      required
                      placeholder="512345678"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-card-dark text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 outline-none text-sm focus:border-neon-cyan transition-all tracking-wider"
                    />
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* معالجة الأخطاء */}
              {verificationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <NeonButton
                type="submit"
                variant="cyan"
                disabled={verificationLoading}
                className="w-full"
              >
                {verificationLoading ? 'جاري إرسال الكود...' : 'إرسال رمز التحقق (SMS)'}
              </NeonButton>
            </form>
          ) : (
            /* الخطوة الثانية: إدخال رمز التحقق OTP */
            <form onSubmit={handleOtpSubmit} className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-xs text-neon-cyan hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3 rtl-flip" />
                    <span>تعديل الرقم</span>
                  </button>
                  <Heading2 className="text-white">أدخل كود التحقق</Heading2>
                </div>
                <BodyText className="text-xs">
                  أدخل الكود المكون من 6 أرقام المرسل إلى الرقم: <span className="text-neon-cyan tracking-wider font-mono">{loginPhone}</span>
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
                    className="w-full bg-card-dark text-white text-center py-3 rounded-xl border border-white/10 outline-none tracking-[0.5em] text-lg font-bold focus:border-volt-green transition-all"
                  />
                  <Lock className="absolute left-3 top-4 w-4 h-4 text-gray-500" />
                </div>
                <span className="text-[10px] text-gray-500 block text-center">
                  الرمز التجريبي الافتراضي للمطابقة هو: <b className="text-volt-green">123456</b>
                </span>
              </div>

              {/* معالجة الأخطاء */}
              {verificationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <NeonButton
                type="submit"
                variant="green"
                disabled={verificationLoading || otpCode.length < 6}
                className="w-full"
              >
                {verificationLoading ? 'جاري مطابقة الكود...' : 'التحقق والمتابعة'}
              </NeonButton>
            </form>
          )}

          {/* إرشاد PWA للمستخدم */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <span className="text-[10px] text-gray-500">
              💡 يدعم هذا المعبر وضع ملء الشاشة الفوري عند التثبيت كـ PWA.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
