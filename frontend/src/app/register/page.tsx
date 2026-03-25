'use client';
import GemZLogo from '../../components/GemZLogo';
import React from 'react';
import Link from 'next/link';
import { Users, Dumbbell, Building2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const roles = [
    { icon: Users, key: 'trainee', color: 'var(--color-primary)', en: { title: 'Trainee', desc: 'Track your workouts, diet, and gym memberships with AI-powered coaching.' }, ar: { title: 'متدرب', desc: 'تتبع تمارينك، نظامك الغذائي، وعضوياتك في الجيم بتدريب مدعوم بالذكاء الاصطناعي.' } },
    { icon: Dumbbell, key: 'trainer', color: 'var(--color-secondary)', en: { title: 'Personal Trainer', desc: 'Manage clients, assign programs, and grow your income through our ecosystem.' }, ar: { title: 'مدرب شخصي', desc: 'أدر عملاءك، خصص البرامج، ونمِّ دخلك من خلال منظومتنا.' } },
    { icon: Building2, key: 'gym', color: 'var(--color-purple)', en: { title: 'Gym / Branch', desc: 'Onboard members, manage attendance with QR codes, and track revenue in real time.' }, ar: { title: 'صالة رياضية', desc: 'استقطب الأعضاء، أدر الحضور برمز QR، وتتبع إيراداتك فورياً.' } },
    { icon: ShoppingBag, key: 'store', color: '#F59E0B', en: { title: 'Store / Brand', desc: 'Sell supplements and gear to a targeted fitness audience. Automated revenue splits.' }, ar: { title: 'متجر / علامة تجارية', desc: 'بع المكملات والمعدات لجمهور لياقة مستهدف. تقسيم إيرادات تلقائي.' } },
];

export default function RegisterPage() {
    const { isArabic } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="absolute top-0 start-0 w-[500px] h-[500px] rounded-full blur-[200px] pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }} />
            <div className="absolute bottom-0 end-0 w-[400px] h-[400px] rounded-full blur-[160px] pointer-events-none opacity-15" style={{ background: 'radial-gradient(circle, var(--color-purple), transparent)' }} />

            <div className="text-center mb-12 z-10">
                <Link href="/">
                    <div className="flex justify-center w-full"><GemZLogo size={60} variant="full" /></div>
                </Link>
                <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {isArabic ? 'اختر نوع حسابك' : 'Choose Your Account Type'}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {isArabic ? 'كل دور يمتلك لوحة تحكم وخصائص مصممة خصيصاً له.' : 'Each role has a dedicated dashboard and tailored features.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl z-10">
                {roles.map(role => {
                    const t = isArabic ? role.ar : role.en;
                    return (
                        <Link
                            key={role.key}
                            href={`/register/${role.key}`}
                            className="group p-7 rounded-3xl flex items-start gap-5 transition-all hover:scale-[1.02] relative overflow-hidden"
                            style={{ background: 'var(--bg-card)', border: `1px solid var(--border-subtle)` }}
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle at top left, ${role.color}10, transparent 60%)` }} />
                            <div className="p-4 rounded-2xl shrink-0 transition-colors" style={{ background: `${role.color}15`, color: role.color }}>
                                <role.icon size={28} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t.title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.desc}</p>
                            </div>
                            <ArrowRight size={20} className={`shrink-0 mt-1 transition-transform group-hover:translate-x-1 ${isArabic ? 'rotate-180 group-hover:-translate-x-1' : ''}`} style={{ color: role.color }} />
                        </Link>
                    );
                })}
            </div>

            <p className="text-center mt-8 text-sm z-10" style={{ color: 'var(--text-secondary)' }}>
                {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                <Link href="/login" className="font-bold hover:underline" style={{ color: 'var(--color-primary)' }}>
                    {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
            </p>
        </div>
    );
}
