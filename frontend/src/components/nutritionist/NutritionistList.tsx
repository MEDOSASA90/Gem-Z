'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Stethoscope,
    Star,
    Clock,
    Globe,
    Calendar,
    Video,
    ChevronRight,
    ChevronLeft,
    AlertTriangle,
    CheckCircle,
    Loader2,
    Search,
    Filter,
    Award,
    Users,
    DollarSign,
    MapPin,
    X,
    ArrowRight,
    MessageSquare,
} from 'lucide-react';
import { ApiButton, ApiCard } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface Nutritionist {
    id: string;
    fullName: string;
    avatarUrl?: string;
    bio?: string;
    specialties: string[];
    certifications: Array<{ name: string; year: number; issuer: string }>;
    yearsExperience: number;
    languages: string[];
    hourlyRate: number;
    currency: string;
    rating: number;
    reviewCount: number;
    totalSessions: number;
    isVerified: boolean;
    isAvailable: boolean;
    videoCallProvider: string;
    availabilitySchedule: Record<string, any>;
}

interface NutritionistSession {
    id: string;
    nutritionistId: string;
    nutritionistName?: string;
    nutritionistAvatar?: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    videoCallUrl?: string;
    amountPaid?: number;
    currency: string;
    paymentStatus: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const SPECIALTY_LABELS: Record<string, { en: string; ar: string }> = {
    sports_nutrition: { en: 'Sports Nutrition', ar: 'تغذية رياضية' },
    weight_loss: { en: 'Weight Loss', ar: 'إنقاص الوزن' },
    muscle_gain: { en: 'Muscle Gain', ar: 'زيادة العضلات' },
    clinical_nutrition: { en: 'Clinical', ar: 'سريري' },
    vegan: { en: 'Vegan', ar: 'نباتي' },
    keto: { en: 'Keto', ar: 'كيتو' },
    diabetes: { en: 'Diabetes', ar: 'سكري' },
    pregnancy: { en: 'Pregnancy', ar: 'حمل' },
    pediatric: { en: 'Pediatric', ar: 'أطفال' },
    senior_nutrition: { en: 'Senior', ar: 'كبار السن' },
    meal_planning: { en: 'Meal Planning', ar: 'تخطيط الوجبات' },
    supplement_guidance: { en: 'Supplements', ar: 'مكملات' },
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

// ─── Booking Calendar Component ───────────────────────────────────

function BookingCalendar({
    availability,
    onSelectSlot,
    selectedSlot,
}: {
    availability: Record<string, any>;
    onSelectSlot: (day: string, hour: number) => void;
    selectedSlot: { day: string; hour: number } | null;
}) {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const today = new Date().getDay();

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day, i) => (
                    <div key={day} className="text-center">
                        <div className={`text-[10px] font-semibold mb-1 ${i === today ? 'text-[var(--color-primary)]' : 'text-white/30'}`}>
                            {isArabic ? DAYS_AR[i] : day.slice(0, 3)}
                        </div>
                        <div className="space-y-1">
                            {HOURS.map((hour) => {
                                const isAvailable = availability?.[day]?.hours?.includes(hour) ?? Math.random() > 0.3;
                                const isSelected = selectedSlot?.day === day && selectedSlot?.hour === hour;
                                const isPast = i < today;

                                return (
                                    <button
                                        key={hour}
                                        onClick={() => isAvailable && !isPast && onSelectSlot(day, hour)}
                                        disabled={!isAvailable || isPast}
                                        className={`w-full text-[10px] py-0.5 rounded transition-all ${
                                            isSelected
                                                ? 'bg-[var(--color-primary)] text-black font-bold'
                                                : isPast
                                                    ? 'text-white/10 cursor-not-allowed'
                                                    : isAvailable
                                                        ? 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        : 'text-white/10 cursor-not-allowed'
                                        }`}
                                    >
                                        {hour}:00
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export default function NutritionistList() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [nutritionists, setNutritionists] = useState<Nutritionist[]>([]);
    const [selectedNutritionist, setSelectedNutritionist] = useState<Nutritionist | null>(null);
    const [sessions, setSessions] = useState<NutritionistSession[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<{ day: string; hour: number } | null>(null);
    const [bookingNotes, setBookingNotes] = useState('');
    const [bookingGoals, setBookingGoals] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('');

    // ─── Fetch Data ─────────────────────────────────────────────────

    const fetchNutritionists = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const url = new URL(`${API_BASE}/nutritionists`);
            if (specialtyFilter) url.searchParams.set('specialty', specialtyFilter);

            const response = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setNutritionists(data.data);
            }
        } catch {
            setError(t('Failed to load nutritionists', 'فشل تحميل أخصائيي التغذية'));
        } finally {
            setIsLoading(false);
        }
    }, [specialtyFilter, t]);

    const fetchSessions = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/nutritionists/sessions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setSessions(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchNutritionists();
        fetchSessions();
    }, [fetchNutritionists, fetchSessions]);

    // ─── Booking ──────────────────────────────────────────────────────

    const handleBook = async () => {
        if (!selectedNutritionist || !selectedSlot) {
            setError(t('Please select a time slot', 'يرجى اختيار وقت'));
            return;
        }

        setIsBooking(true);
        setError(null);

        try {
            // Calculate scheduled date from selected slot
            const now = new Date();
            const targetDay = DAYS.indexOf(selectedSlot.day);
            const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
            const scheduledDate = new Date(now);
            scheduledDate.setDate(now.getDate() + daysUntilTarget);
            scheduledDate.setHours(selectedSlot.hour, 0, 0, 0);

            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/nutritionists/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nutritionistId: selectedNutritionist.id,
                    scheduledAt: scheduledDate.toISOString(),
                    durationMinutes: 60,
                    notes: bookingNotes || undefined,
                    clientGoals: bookingGoals || undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setBookingSuccess(true);
                await fetchSessions();
            } else {
                setError(data.message || 'Booking failed');
            }
        } catch {
            setError(t('Failed to book session', 'فشل حجز الجلسة'));
        } finally {
            setIsBooking(false);
        }
    };

    const filteredNutritionists = nutritionists.filter((n) => {
        const matchesSearch = !searchQuery ||
            n.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.bio || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSpecialty = !specialtyFilter || n.specialties.includes(specialtyFilter);
        return matchesSearch && matchesSpecialty;
    });

    // ─── Nutritionist Card ──────────────────────────────────────────

    const NutritionistCard = ({ n }: { n: Nutritionist }) => (
        <div
            className="bg-white/[0.03] rounded-xl border border-white/10 hover:border-[var(--color-primary)]/30 transition-all p-4 cursor-pointer group"
            onClick={() => { setSelectedNutritionist(n); setBookingSuccess(false); setError(null); }}
        >
            <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {n.avatarUrl ? (
                        <img src={n.avatarUrl} alt={n.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <Stethoscope size={24} className="text-white/40" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-white text-sm font-semibold truncate">{n.fullName}</h4>
                        {n.isVerified && (
                            <CheckCircle size={14} className="text-blue-400 shrink-0" />
                        )}
                        {!n.isAvailable && (
                            <span className="px-1.5 py-0.5 bg-red-500/10 rounded text-[10px] text-red-400 shrink-0">{t('Unavailable', 'غير متاح')}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-white/60 text-xs">{n.rating.toFixed(1)}</span>
                        <span className="text-white/20 text-xs">({n.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {n.specialties.slice(0, 3).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-white/5 rounded text-white/30 text-[10px]">
                                {SPECIALTY_LABELS[s]?.[isArabic ? 'ar' : 'en'] || s}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="text-right shrink-0 self-center">
                    <p className="text-[var(--color-primary)] font-bold text-sm">${n.hourlyRate}</p>
                    <p className="text-white/20 text-[10px]">/{t('hr', 'س')}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3 text-white/20 text-[10px]">
                    <span className="flex items-center gap-0.5">
                        <Users size={10} />
                        {n.totalSessions} sessions
                    </span>
                    <span className="flex items-center gap-0.5">
                        <Clock size={10} />
                        {n.yearsExperience}y exp
                    </span>
                </div>
                <ChevronRight size={14} className="text-white/20 group-hover:text-[var(--color-primary)] transition-colors" />
            </div>
        </div>
    );

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <Stethoscope className="text-[var(--color-primary)]" size={28} />
                    {t('Nutritionists', 'أخصائيو التغذية')}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                    {t('Book certified nutritionists for online consultations', 'احجز أخصائيي تغذية معتمدين لاستشارات عبر الإنترنت')}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">&times;</button>
                </div>
            )}

            {/* Success */}
            {bookingSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle size={16} />
                    {t('Session booked successfully! Check your email for the video call link.', 'تم حجز الجلسة بنجاح! تحقق من بريدك الإلكتروني لرابط المكالمة.')}
                </div>
            )}

            {/* Filters */}
            {!selectedNutritionist && (
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Search nutritionists...', 'البحث عن أخصائيي التغذية...')}
                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                        />
                    </div>
                    <select
                        value={specialtyFilter}
                        onChange={(e) => setSpecialtyFilter(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                    >
                        <option value="">{t('All Specialties', 'جميع التخصصات')}</option>
                        {Object.entries(SPECIALTY_LABELS).map(([key, labels]) => (
                            <option key={key} value={key}>{isArabic ? labels.ar : labels.en}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Nutritionist Detail & Booking */}
            {selectedNutritionist ? (
                <div className="space-y-6">
                    <button
                        onClick={() => { setSelectedNutritionist(null); setBookingSuccess(false); setSelectedSlot(null); }}
                        className="flex items-center gap-1 text-white/40 hover:text-white text-sm transition-colors"
                    >
                        <ChevronLeft size={16} />
                        {t('Back to list', 'العودة للقائمة')}
                    </button>

                    {/* Profile */}
                    <ApiCard>
                        <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                                {selectedNutritionist.avatarUrl ? (
                                    <img src={selectedNutritionist.avatarUrl} alt={selectedNutritionist.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <Stethoscope size={36} className="text-white/40" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-white">{selectedNutritionist.fullName}</h3>
                                    {selectedNutritionist.isVerified && (
                                        <span className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-500/10 rounded-full text-[10px] text-blue-400 font-semibold">
                                            <Award size={10} />
                                            {t('Verified', 'معتمد')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-white/40 text-xs">
                                    <span className="flex items-center gap-0.5">
                                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                        {selectedNutritionist.rating.toFixed(1)} ({selectedNutritionist.reviewCount})
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Users size={12} />
                                        {selectedNutritionist.totalSessions} {t('sessions', 'جلسات')}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Clock size={12} />
                                        {selectedNutritionist.yearsExperience}y
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <DollarSign size={12} />
                                        ${selectedNutritionist.hourlyRate}/{t('hr', 'س')}
                                    </span>
                                </div>
                                {selectedNutritionist.bio && (
                                    <p className="text-white/40 text-sm mt-2">{selectedNutritionist.bio}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    {selectedNutritionist.specialties.map((s) => (
                                        <span key={s} className="px-2 py-0.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-full text-[10px] text-[var(--color-primary)] font-semibold">
                                            {SPECIALTY_LABELS[s]?.[isArabic ? 'ar' : 'en'] || s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ApiCard>

                    {/* Certifications */}
                    {selectedNutritionist.certifications.length > 0 && (
                        <ApiCard>
                            <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
                                <Award size={16} className="text-[var(--color-primary)]" />
                                {t('Certifications', 'الشهادات')}
                            </h4>
                            <div className="space-y-2">
                                {selectedNutritionist.certifications.map((cert, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <CheckCircle size={12} className="text-green-400" />
                                        <span className="text-white/60">{cert.name}</span>
                                        <span className="text-white/20 text-xs">({cert.year})</span>
                                        <span className="text-white/20 text-xs ml-auto">{cert.issuer}</span>
                                    </div>
                                ))}
                            </div>
                        </ApiCard>
                    )}

                    {/* Booking Calendar */}
                    {!bookingSuccess && (
                        <ApiCard>
                            <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-4">
                                <Calendar size={16} className="text-[var(--color-primary)]" />
                                {t('Booking Calendar', 'تقويم الحجز')}
                            </h4>
                            <p className="text-white/30 text-xs mb-3">
                                {t('Select an available time slot for your consultation', 'اختر وقت متاح لاستشارتك')}
                            </p>

                            <BookingCalendar
                                availability={selectedNutritionist.availabilitySchedule}
                                onSelectSlot={(day, hour) => setSelectedSlot({ day, hour })}
                                selectedSlot={selectedSlot}
                            />

                            {selectedSlot && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle size={14} className="text-green-400" />
                                        <span className="text-white/60">
                                            {t('Selected', 'المختار')}: {selectedSlot.day} at {selectedSlot.hour}:00
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <textarea
                                            value={bookingNotes}
                                            onChange={(e) => setBookingNotes(e.target.value)}
                                            placeholder={t('Any notes for the nutritionist?', 'أي ملاحظات لأخصائي التغذية؟')}
                                            rows={2}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30 resize-none"
                                        />
                                        <textarea
                                            value={bookingGoals}
                                            onChange={(e) => setBookingGoals(e.target.value)}
                                            placeholder={t('Your fitness/nutrition goals', 'أهدافك اللياقية/التغذوية')}
                                            rows={2}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30 resize-none"
                                        />
                                    </div>
                                    <ApiButton onClick={handleBook} loading={isBooking} icon={<Video size={18} />} variant="primary" fullWidth>
                                        {isBooking ? t('Booking...', 'جاري الحجز...') : t('Book Session ($', 'احجز جلسة ($') + selectedNutritionist.hourlyRate + ')'}
                                    </ApiButton>
                                </div>
                            )}
                        </ApiCard>
                    )}

                    {/* Booking Success */}
                    {bookingSuccess && (
                        <ApiCard>
                            <div className="text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                    <CheckCircle size={32} className="text-green-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">
                                    {t('Booking Confirmed!', 'تم تأكيد الحجز!')}
                                </h3>
                                <p className="text-white/50 text-sm">
                                    {t('Your video consultation is scheduled. A Jitsi meeting link will be sent to your email.', 'تم جدولة استشارتك عبر الفيديو. سيتم إرسال رابط اجتماع Jitsi إلى بريدك الإلكتروني.')}
                                </p>
                                <ApiButton onClick={() => { setBookingSuccess(false); setSelectedSlot(null); }} icon={<Calendar size={18} />} variant="secondary" fullWidth>
                                    {t('Book Another Session', 'احجز جلسة أخرى')}
                                </ApiButton>
                            </div>
                        </ApiCard>
                    )}
                </div>
            ) : (
                /* List View */
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                        </div>
                    ) : filteredNutritionists.length > 0 ? (
                        filteredNutritionists.map((n) => (
                            <NutritionistCard key={n.id} n={n} />
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <Stethoscope size={48} className="text-white/10 mx-auto mb-4" />
                            <p className="text-white/30 text-sm">{t('No nutritionists found', 'لم يتم العثور على أخصائيي تغذية')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* My Sessions */}
            {sessions.length > 0 && !selectedNutritionist && (
                <div className="space-y-3 pt-6 border-t border-white/5">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Video size={18} className="text-[var(--color-primary)]" />
                        {t('My Sessions', 'جلساتي')}
                    </h3>
                    <div className="space-y-2">
                        {sessions.slice(0, 5).map((session) => (
                            <div key={session.id} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                                    <Video size={16} className="text-[var(--color-primary)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium">{session.nutritionistName || 'Nutritionist'}</p>
                                    <p className="text-white/30 text-xs">{new Date(session.scheduledAt).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    session.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                    session.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400' :
                                    'bg-white/5 text-white/30'
                                }`}>
                                    {session.status}
                                </span>
                                {session.videoCallUrl && (
                                    <a href={session.videoCallUrl} target="_blank" rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors shrink-0">
                                        <ArrowRight size={14} />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
