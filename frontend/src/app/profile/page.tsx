'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Camera, Mail, Phone, User, Loader2,
    AlertCircle, CheckCircle2, Lock
} from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

// ─── Types ───────────────────────────────────────────────────

interface ProfileForm {
    full_name: string;
    email: string;
    phone: string;
    bio: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const tabs = ['info', 'security'] as const;
type Tab = typeof tabs[number];

function Field({ label, id, error, hint, required, children }: {
    label: string; id: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-bold text-white/45 uppercase tracking-widest block">
                {label}{required && <span className="text-[#ff7b00] ms-1">*</span>}
            </label>

            {children}
            {error && <p className="flex items-center gap-1 text-red-400 text-xs font-semibold"><AlertCircle size={11} />{error}</p>}
            {hint && !error && <p className="text-white/30 text-xs">{hint}</p>}
        </div>
    );
}

// ─── Avatar Upload ────────────────────────────────────────────

function AvatarUpload({ avatar, uploading, onFile }: {
    avatar: string | null; uploading: boolean; onFile: (f: File) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col items-center gap-3 mb-8">
            <button type="button" onClick={() => ref.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#ff7b00]/40 hover:border-[#ff7b00] transition-colors group">
                {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-[#ff7b00]/15 flex items-center justify-center">
                        <User size={36} className="text-[#ff7b00]/60" />
                    </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading ? <Loader2 size={20} className="animate-spin text-white" /> : <Camera size={20} className="text-white" />}
                </div>
            </button>
            <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <button type="button" onClick={() => ref.current?.click()}
                className="text-xs text-[#ff7b00] font-bold hover:underline flex items-center gap-1">
                <Camera size={12} />
                {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
            <p className="text-white/25 text-[11px]">JPG, PNG · Max 5MB</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function ProfilePage() {
    const { isArabic } = useLanguage();
    const router = useRouter();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<Partial<ProfileForm>>({});
    const [pwVisible, setPwVisible] = useState({ curr: false, new: false, conf: false });

    const [avatar, setAvatar] = useState<string | null>(null);
    const [form, setForm] = useState<ProfileForm>({
        full_name: '', email: '', phone: '', bio: '',
        currentPassword: '', newPassword: '', confirmNewPassword: '',
    });

    // Load user from localStorage
    useEffect(() => {
        const raw = localStorage.getItem('gemz_user');
        if (!raw) { router.replace('/login'); return; }
        try {
            const u = JSON.parse(raw);
            setForm(prev => ({ ...prev, full_name: u.full_name ?? '', email: u.email ?? '', phone: u.phone ?? '' }));
            setAvatar(u.avatar_url ?? null);
        } catch { router.replace('/login'); }
    }, [router]);

    const set = (k: keyof ProfileForm, v: string) => {
        setForm(prev => ({ ...prev, [k]: v }));
        setErrors(prev => ({ ...prev, [k]: undefined }));
    };

    // ── Avatar Upload ──
    const handleAvatarUpload = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        setUploading(true);
        try {
            const res = await GemZApi.Upload.image(file);
            setAvatar(res.url);
            // Update localStorage
            const raw = localStorage.getItem('gemz_user');
            if (raw) {
                const u = JSON.parse(raw);
                u.avatar_url = res.url;
                localStorage.setItem('gemz_user', JSON.stringify(u));
            }
            toast.success(isArabic ? 'تم تحديث الصورة' : 'Photo updated!');
        } catch {
            toast.error(isArabic ? 'فشل رفع الصورة' : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    // ── Info Validation & Submit ──
    const validateInfo = () => {
        const e: Partial<ProfileForm> = {};
        if (!form.full_name.trim()) e.full_name = isArabic ? 'الاسم مطلوب' : 'Name is required';
        if (form.phone && !/^\+?[0-9\s\-]{8,15}$/.test(form.phone)) e.phone = isArabic ? 'رقم غير صالح' : 'Invalid phone number';
        if (form.bio && form.bio.length > 200) e.bio = isArabic ? '200 حرف كحد أقصى' : 'Max 200 characters';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateInfo()) return;
        setLoading(true);
        try {
            await GemZApi.request('/user/profile', {
                method: 'PUT',
                body: JSON.stringify({ full_name: form.full_name, phone: form.phone, bio: form.bio }),
            });
            // Update localStorage
            const raw = localStorage.getItem('gemz_user');
            if (raw) {
                const u = JSON.parse(raw);
                u.full_name = form.full_name;
                localStorage.setItem('gemz_user', JSON.stringify(u));
            }
            toast.success(isArabic ? 'تم حفظ التغييرات' : 'Profile updated!');
        } catch (err: any) {
            toast.error(err.message || (isArabic ? 'فشل التحديث' : 'Update failed'));
        } finally {
            setLoading(false);
        }
    };

    // ── Password Validation & Submit ──
    const validatePassword = () => {
        const e: Partial<ProfileForm> = {};
        if (!form.currentPassword) e.currentPassword = isArabic ? 'أدخل كلمة المرور الحالية' : 'Enter current password';
        if (!form.newPassword) e.newPassword = isArabic ? 'أدخل كلمة المرور الجديدة' : 'Enter new password';
        else if (form.newPassword.length < 8) e.newPassword = isArabic ? '8 أحرف كحد أدنى' : 'Min 8 characters';
        if (form.newPassword !== form.confirmNewPassword) e.confirmNewPassword = isArabic ? 'كلمتا المرور غير متطابقتان' : 'Passwords do not match';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePassword()) return;
        setLoading(true);
        try {
            await GemZApi.request('/user/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
            });
            setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
            toast.success(isArabic ? 'تم تحديث كلمة المرور' : 'Password changed!');
        } catch (err: any) {
            toast.error(err.message || (isArabic ? 'فشل تحديث كلمة المرور' : 'Password change failed'));
        } finally {
            setLoading(false);
        }
    };

    const tabLabels: Record<Tab, string> = {
        info: isArabic ? 'المعلومات الشخصية' : 'Personal Info',
        security: isArabic ? 'الأمان' : 'Security',
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0a0a0a] text-white pb-16">
            {/* Glow */}
            <div className="fixed top-0 left-1/3 w-96 h-72 bg-[#ff7b00]/8 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/5 px-5 py-4">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors">
                        <ArrowLeft size={16} />
                    </Link>
                    <h1 className="font-black text-lg">{isArabic ? 'ملفي الشخصي' : 'My Profile'}</h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-5 pt-8 relative z-10">
                {/* Avatar */}
                <AvatarUpload avatar={avatar} uploading={uploading} onFile={handleAvatarUpload} />

                {/* Tabs */}
                <div className="flex bg-white/[0.04] border border-white/8 rounded-2xl p-1 mb-8">
                    {tabs.map(t => (
                        <button key={t} onClick={() => setActiveTab(t)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activeTab === t ? 'bg-[#ff7b00] text-black shadow-lg' : 'text-white/40 hover:text-white/70'
                            }`}>
                            {tabLabels[t]}
                        </button>
                    ))}
                </div>

                {/* ── INFO TAB ── */}
                {activeTab === 'info' && (
                    <form onSubmit={handleSaveInfo} className="space-y-5" noValidate>
                        <Field label={isArabic ? 'الاسم الكامل' : 'Full Name'} id="profile-name" error={errors.full_name} required>
                            <div className="relative">
                                <User size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                <input id="profile-name" type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 text-sm text-white placeholder-white/20 outline-none transition-colors ${errors.full_name ? 'border-red-500/50' : 'border-white/10 focus:border-[#ff7b00]'}`} />
                            </div>
                        </Field>

                        <Field label={isArabic ? 'البريد الإلكتروني' : 'Email'} id="profile-email">
                            <div className="relative">
                                <Mail size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                <input id="profile-email" type="email" value={form.email} disabled
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 ps-10 text-sm text-white/40 cursor-not-allowed" />
                            </div>
                            <p className="text-white/25 text-[11px]">{isArabic ? 'لا يمكن تغيير البريد' : 'Email cannot be changed'}</p>
                        </Field>

                        <Field label={isArabic ? 'رقم الهاتف' : 'Phone Number'} id="profile-phone" error={errors.phone}>
                            <div className="relative">
                                <Phone size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                <input id="profile-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                                    placeholder="+20 1xx xxx xxxx"
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 text-sm text-white placeholder-white/20 outline-none transition-colors ${errors.phone ? 'border-red-500/50' : 'border-white/10 focus:border-[#ff7b00]'}`} />
                            </div>
                        </Field>

                        <Field label={isArabic ? 'نبذة شخصية' : 'Bio'} id="profile-bio" error={errors.bio}
                            hint={`${form.bio.length}/200`}>
                            <textarea id="profile-bio" value={form.bio} onChange={e => set('bio', e.target.value)}
                                rows={3} maxLength={200}
                                placeholder={isArabic ? 'اكتب شيئاً عنك...' : 'Write something about yourself...'}
                                className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-colors resize-none ${errors.bio ? 'border-red-500/50' : 'border-white/10 focus:border-[#ff7b00]'}`} />
                        </Field>

                        <button type="submit" disabled={loading}
                            className="w-full py-4 rounded-xl bg-[#ff7b00] text-black font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                        </button>
                    </form>
                )}

                {/* ── SECURITY TAB ── */}
                {activeTab === 'security' && (
                    <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 mb-2">
                            <h3 className="text-sm font-bold text-white mb-1">
                                {isArabic ? 'تغيير كلمة المرور' : 'Change Password'}
                            </h3>
                            <p className="text-white/35 text-xs">
                                {isArabic ? 'يجب أن تكون 8 أحرف على الأقل' : 'Must be at least 8 characters'}
                            </p>
                        </div>

                        {[
                            { id: 'prof-curr-pw', key: 'currentPassword', label: isArabic ? 'كلمة المرور الحالية' : 'Current Password', vk: 'curr' as const },
                            { id: 'prof-new-pw', key: 'newPassword', label: isArabic ? 'كلمة المرور الجديدة' : 'New Password', vk: 'new' as const },
                            { id: 'prof-conf-pw', key: 'confirmNewPassword', label: isArabic ? 'تأكيد كلمة المرور' : 'Confirm New Password', vk: 'conf' as const },
                        ].map(({ id, key, label, vk }) => (
                            <Field key={id} label={label} id={id} error={errors[key as keyof ProfileForm]} required>
                                <div className="relative">
                                    <Lock size={15} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/25 pointer-events-none" />
                                    <input id={id} type={pwVisible[vk] ? 'text' : 'password'} value={form[key as keyof ProfileForm]}
                                        onChange={e => set(key as keyof ProfileForm, e.target.value)} placeholder="••••••••"
                                        autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 ps-10 pe-11 text-sm text-white placeholder-white/20 outline-none transition-colors ${errors[key as keyof ProfileForm] ? 'border-red-500/50' : 'border-white/10 focus:border-[#ff7b00]'}`} />
                                    <button type="button" onClick={() => setPwVisible(prev => ({ ...prev, [vk]: !prev[vk] }))}
                                        className="absolute top-1/2 -translate-y-1/2 end-4 text-white/30 hover:text-white/60">
                                        <span className="material-symbols-outlined text-base">{pwVisible[vk] ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </Field>
                        ))}

                        <button type="submit" disabled={loading}
                            className="w-full py-4 rounded-xl bg-[#ff7b00] text-black font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                            {isArabic ? 'تحديث كلمة المرور' : 'Update Password'}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}
