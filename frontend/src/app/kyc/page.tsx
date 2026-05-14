'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle2, Loader2, AlertCircle, X, FileImage, Shield } from 'lucide-react';
import { GemZApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

// ─── Types ───────────────────────────────────────────────────

type DocType = 'national_id' | 'passport' | 'drivers_license';
type KYCStatus = 'idle' | 'uploading' | 'submitted' | 'error';

interface FileItem {
    file: File;
    preview: string;
    label: string;
    progress: number;
    url?: string;
    error?: string;
}

// ─── Document type config ─────────────────────────────────────

const DOC_TYPES: { key: DocType; icon: string; label: string; labelAr: string; sides: string[]; sidesAr: string[] }[] = [
    {
        key: 'national_id',
        icon: '🪪',
        label: 'National ID',
        labelAr: 'بطاقة الرقم القومي',
        sides: ['Front Side', 'Back Side'],
        sidesAr: ['الوجه الأمامي', 'الوجه الخلفي'],
    },
    {
        key: 'passport',
        icon: '📘',
        label: 'Passport',
        labelAr: 'جواز السفر',
        sides: ['Photo Page'],
        sidesAr: ['صفحة الصورة'],
    },
    {
        key: 'drivers_license',
        icon: '🚗',
        label: 'Driver\'s License',
        labelAr: 'رخصة القيادة',
        sides: ['Front Side', 'Back Side'],
        sidesAr: ['الوجه الأمامي', 'الوجه الخلفي'],
    },
];

// ─── Upload Drop Zone ─────────────────────────────────────────

function DropZone({
    label, file, onFile, uploading,
}: { label: string; file: FileItem | null; onFile: (f: File) => void; uploading: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith('image/')) onFile(f);
    }, [onFile]);

    return (
        <div className="space-y-2">
            <p className="text-xs font-bold text-white/45 uppercase tracking-widest">{label}</p>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`w-full min-h-[140px] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                    dragging
                        ? 'border-[#ff7b00] bg-[#ff7b00]/10 scale-[1.01]'
                        : file
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                }`}
            >
                {file ? (
                    <>
                        {/* Preview */}
                        <img src={file.preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            {uploading && file.progress < 100 ? (
                                <>
                                    <Loader2 size={28} className="animate-spin text-[#ff7b00]" />
                                    <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#ff7b00] rounded-full transition-all"
                                            style={{ width: `${file.progress}%` }} />
                                    </div>
                                    <p className="text-xs text-white/60 font-bold">{file.progress}%</p>
                                </>
                            ) : file.error ? (
                                <>
                                    <AlertCircle size={28} className="text-red-400" />
                                    <p className="text-xs text-red-400 font-bold">{file.error}</p>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={28} className="text-green-400" />
                                    <p className="text-xs text-green-400 font-bold">{file.file.name}</p>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-3 p-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <FileImage size={24} className="text-white/30" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-white/60">Drop image here</p>
                            <p className="text-xs text-white/30 mt-0.5">or click to browse · JPG, PNG · Max 10MB</p>
                        </div>
                        {dragging && (
                            <div className="absolute inset-0 bg-[#ff7b00]/10 flex items-center justify-center">
                                <Upload size={32} className="text-[#ff7b00]" />
                            </div>
                        )}
                    </div>
                )}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function KYCPage() {
    const { isArabic } = useLanguage();
    const toast = useToast();

    const [docType, setDocType] = useState<DocType>('national_id');
    const [files, setFiles] = useState<(FileItem | null)[]>([null, null]);
    const [status, setStatus] = useState<KYCStatus>('idle');
    const [formData, setFormData] = useState({ fullName: '', dob: '', idNumber: '' });
    const [formErrors, setFormErrors] = useState<typeof formData>({ fullName: '', dob: '', idNumber: '' });

    const selectedDoc = DOC_TYPES.find(d => d.key === docType)!;
    const requiredSides = isArabic ? selectedDoc.sidesAr : selectedDoc.sides;

    // Change doc type — reset files
    const changeDocType = (t: DocType) => {
        setDocType(t);
        setFiles([null, null]);
        setStatus('idle');
    };

    // Upload a single file → simulate progress → call API
    const uploadFile = async (file: File, index: number): Promise<string | null> => {
        // Simulate progress
        const item: FileItem = { file, preview: URL.createObjectURL(file), label: requiredSides[index], progress: 0 };
        setFiles(prev => { const next = [...prev]; next[index] = item; return next; });

        // Progress animation
        for (let p = 10; p <= 80; p += 20) {
            await new Promise(r => setTimeout(r, 200));
            setFiles(prev => { const next = [...prev]; if (next[index]) next[index]!.progress = p; return next; });
        }

        try {
            const res = await GemZApi.Upload.document(file);
            setFiles(prev => {
                const next = [...prev];
                if (next[index]) { next[index]!.progress = 100; next[index]!.url = res.url; }
                return next;
            });
            return res.url;
        } catch {
            setFiles(prev => {
                const next = [...prev];
                if (next[index]) next[index]!.error = 'Upload failed';
                return next;
            });
            return null;
        }
    };

    const handleFileSelected = async (file: File, index: number) => {
        if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
        await uploadFile(file, index);
    };

    // ── Form Validation ──
    const validateForm = () => {
        const e = { fullName: '', dob: '', idNumber: '' };
        if (!formData.fullName.trim()) e.fullName = isArabic ? 'الاسم مطلوب' : 'Full name required';
        if (!formData.dob) e.dob = isArabic ? 'تاريخ الميلاد مطلوب' : 'Date of birth required';
        if (!formData.idNumber.trim()) e.idNumber = isArabic ? 'الرقم مطلوب' : 'Document number required';
        setFormErrors(e);
        return !Object.values(e).some(Boolean);
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const uploadedUrls = files.slice(0, requiredSides.length).map(f => f?.url).filter(Boolean);
        if (uploadedUrls.length < requiredSides.length) {
            toast.error(isArabic ? `يرجى رفع كل الصور المطلوبة (${requiredSides.length})` : `Please upload all ${requiredSides.length} required image(s)`);
            return;
        }

        setStatus('uploading');
        try {
            await GemZApi.request('/user/kyc', {
                method: 'POST',
                body: JSON.stringify({
                    doc_type: docType,
                    doc_urls: uploadedUrls,
                    full_name: formData.fullName,
                    dob: formData.dob,
                    id_number: formData.idNumber,
                }),
            });
            setStatus('submitted');
        } catch (err: any) {
            setStatus('error');
            toast.error(err.message || (isArabic ? 'فشل إرسال الطلب' : 'Submission failed'));
        }
    };

    // ── Success State ──
    if (status === 'submitted') {
        return (
            <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
                <div className="max-w-sm w-full text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto">
                        <Shield size={40} className="text-green-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white">
                        {isArabic ? 'تم استلام طلبك!' : 'Submission Received!'}
                    </h1>
                    <p className="text-white/50 text-sm leading-relaxed">
                        {isArabic
                            ? 'جارٍ مراجعة مستنداتك. ستتلقى إشعاراً خلال 24-48 ساعة.'
                            : 'Your documents are under review. You\'ll receive a notification within 24–48 hours.'}
                    </p>
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-2 text-sm text-start">
                        {[
                            { icon: '📋', text: isArabic ? 'نوع المستند: ' + selectedDoc.labelAr : 'Document: ' + selectedDoc.label },
                            { icon: '📅', text: isArabic ? 'رُفع في: ' + new Date().toLocaleDateString('ar') : 'Submitted: ' + new Date().toLocaleDateString() },
                        ].map((r, i) => (
                            <div key={i} className="flex items-center gap-3 text-white/60">
                                <span>{r.icon}</span><span>{r.text}</span>
                            </div>
                        ))}
                    </div>
                    <Link href="/dashboard"
                        className="block w-full py-4 rounded-xl bg-[#ff7b00] text-black font-black hover:opacity-90 transition-all">
                        {isArabic ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0a0a0a] text-white pb-16">
            {/* Glow */}
            <div className="fixed top-0 right-1/3 w-96 h-72 bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/5 px-5 py-4">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="font-black text-base leading-tight">{isArabic ? 'التوثيق الرسمي' : 'Identity Verification'}</h1>
                        <p className="text-white/35 text-xs">{isArabic ? 'KYC — اعرف عميلك' : 'KYC — Know Your Customer'}</p>
                    </div>
                    <div className="ms-auto">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                            <Shield size={12} />
                            {isArabic ? 'مشفّر' : 'Encrypted'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-5 pt-8 space-y-8 relative z-10">

                {/* Info banner */}
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">🔒</span>
                    <div>
                        <p className="text-blue-300 font-bold text-sm">
                            {isArabic ? 'بياناتك محمية وآمنة' : 'Your data is encrypted & secure'}
                        </p>
                        <p className="text-blue-400/60 text-xs mt-0.5 leading-relaxed">
                            {isArabic
                                ? 'نستخدم تشفيراً من نهاية إلى نهاية. لن تُشارَك بياناتك مع أطراف خارجية.'
                                : 'End-to-end encrypted. Your documents will never be shared with third parties.'}
                        </p>
                    </div>
                </div>

                {/* ── Step 1: Doc Type ── */}
                <section>
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">
                        {isArabic ? '1. نوع المستند' : '1. Document Type'}
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        {DOC_TYPES.map(dt => (
                            <button key={dt.key} type="button" onClick={() => changeDocType(dt.key)}
                                className={`p-4 rounded-2xl border text-center transition-all ${
                                    docType === dt.key
                                        ? 'bg-[#ff7b00]/15 border-[#ff7b00]/50'
                                        : 'bg-white/[0.03] border-white/8 hover:border-white/20'
                                }`}>
                                <span className="text-2xl block mb-1.5">{dt.icon}</span>
                                <span className={`text-[11px] font-bold leading-tight block ${docType === dt.key ? 'text-[#ff7b00]' : 'text-white/50'}`}>
                                    {isArabic ? dt.labelAr : dt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* ── Step 2: Personal Info ── */}
                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                    <section className="space-y-5">
                        <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">
                            {isArabic ? '2. البيانات الشخصية' : '2. Personal Information'}
                        </h2>

                        {[
                            { id: 'kyc-fullname', key: 'fullName', type: 'text', label: isArabic ? 'الاسم كما في المستند' : 'Full Name (as on document)', ph: isArabic ? 'الاسم الرباعي' : 'e.g. John Michael Smith' },
                            { id: 'kyc-dob',      key: 'dob',      type: 'date', label: isArabic ? 'تاريخ الميلاد' : 'Date of Birth', ph: '' },
                            { id: 'kyc-idnum',    key: 'idNumber', type: 'text', label: isArabic ? 'رقم المستند' : 'Document Number', ph: isArabic ? '29xxxxxxxxxx' : 'AB1234567' },
                        ].map(({ id, key, type, label, ph }) => (
                            <div key={id} className="space-y-1.5">
                                <label htmlFor={id} className="text-xs font-bold text-white/45 uppercase tracking-widest block">{label}</label>
                                <input id={id} type={type} value={formData[key as keyof typeof formData]}
                                    onChange={e => {
                                        setFormData(prev => ({ ...prev, [key]: e.target.value }));
                                        setFormErrors(prev => ({ ...prev, [key]: '' }));
                                    }}
                                    placeholder={ph}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-colors ${formErrors[key as keyof typeof formErrors] ? 'border-red-500/50' : 'border-white/10 focus:border-[#ff7b00]'}`} />
                                {formErrors[key as keyof typeof formErrors] && (
                                    <p className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                                        <AlertCircle size={11} />{formErrors[key as keyof typeof formErrors]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* ── Step 3: Document Upload ── */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">
                            {isArabic ? '3. رفع الصور' : '3. Document Photos'}
                        </h2>
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-3xl">{selectedDoc.icon}</span>
                                <div>
                                    <p className="font-black text-white">{isArabic ? selectedDoc.labelAr : selectedDoc.label}</p>
                                    <p className="text-white/35 text-xs">{requiredSides.length} {isArabic ? 'صور مطلوبة' : 'photo(s) required'}</p>
                                </div>
                            </div>
                            <div className={`grid gap-4 ${requiredSides.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {requiredSides.map((side, i) => (
                                    <DropZone key={i} label={side} file={files[i] ?? null}
                                        onFile={f => handleFileSelected(f, i)} uploading={!!files[i] && files[i]!.progress < 100} />
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── Declaration ── */}
                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 text-xs text-white/40 leading-relaxed">
                        <span className="material-symbols-outlined text-sm text-[#ff7b00] me-1" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                        {isArabic
                            ? 'بإرسالك هذا الطلب، تؤكد أن المعلومات والمستندات المقدمة صحيحة وتخصك شخصياً.'
                            : 'By submitting, you confirm that all information and documents provided are accurate and belong to you.'}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={status === 'uploading'}
                        id="kyc-submit"
                        className="w-full py-5 rounded-xl bg-[#ff7b00] text-black font-black flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_0_35px_rgba(255,123,0,0.30)]">
                        {status === 'uploading'
                            ? <><Loader2 size={20} className="animate-spin" /> {isArabic ? 'جارٍ الإرسال...' : 'Submitting...'}</>
                            : <><Shield size={20} /> {isArabic ? 'إرسال للمراجعة' : 'Submit for Review'}</>}
                    </button>
                </form>
            </main>
        </div>
    );
}
