'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    AlertTriangle,
    Shield,
    MapPin,
    Phone,
    UserPlus,
    UserMinus,
    Loader2,
    CheckCircle,
    X,
    ChevronDown,
    ChevronUp,
    Clock,
    Navigation,
    Bell,
    Heart,
    Users,
    Settings,
    Send,
    Trash2,
    Radio,
} from 'lucide-react';
import { ApiButton, ApiCard } from '../ui/ApiComponents';
import { useLanguage } from '../../context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    relationship?: string;
    priority: number;
    isActive: boolean;
    notifyViaSms: boolean;
    notifyViaPush: boolean;
    notifyViaEmail: boolean;
}

interface SOSAlert {
    id: string;
    status: 'active' | 'acknowledged' | 'resolved' | 'false_alarm';
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    alertMessage: string;
    contactsNotified: number;
    gymsNotified: number;
    triggeredAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const RELATIONSHIP_LABELS: Record<string, { en: string; ar: string }> = {
    family: { en: 'Family', ar: 'عائلة' },
    friend: { en: 'Friend', ar: 'صديق' },
    partner: { en: 'Partner', ar: 'شريك' },
    trainer: { en: 'Trainer', ar: 'مدرب' },
    doctor: { en: 'Doctor', ar: 'طبيب' },
    colleague: { en: 'Colleague', ar: 'زميل' },
    other: { en: 'Other', ar: 'آخر' },
};

// ─── Main Component ───────────────────────────────────────────────

export default function SOSButton() {
    const { isArabic } = useLanguage();
    const t = (en: string, ar: string) => (isArabic ? ar : en);

    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
    const [alertHistory, setAlertHistory] = useState<SOSAlert[]>([]);
    const [isSendingSOS, setIsSendingSOS] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showContactForm, setShowContactForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
    const [sosCountdown, setSosCountdown] = useState(0);
    const [expandedContact, setExpandedContact] = useState<string | null>(null);

    // Contact form state
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactRelationship, setContactRelationship] = useState('');
    const [contactPriority, setContactPriority] = useState(1);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Fetch Data ─────────────────────────────────────────────────

    const fetchContacts = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/sos/contacts`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setContacts(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    const fetchActiveAlert = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/sos/active`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success && data.data) {
                setActiveAlert(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    const fetchAlertHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/sos/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setAlertHistory(data.data);
            }
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchContacts();
        fetchActiveAlert();
        fetchAlertHistory();
    }, [fetchContacts, fetchActiveAlert, fetchAlertHistory]);

    // ─── GPS ────────────────────────────────────────────────────────

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError(t('GPS not available on this device', 'نظام تحديد المواقع غير متاح على هذا الجهاز'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCurrentLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
                setGpsEnabled(true);
            },
            (err) => {
                setGpsEnabled(false);
                setError(t('GPS access denied. Please enable location services.', 'تم رفض الوصول إلى الموقع. يرجى تمكين خدمات الموقع.'));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [t]);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    // ─── SOS Actions ────────────────────────────────────────────────

    const startSOSCountdown = () => {
        setSosCountdown(3);
        let count = 3;
        countdownRef.current = setInterval(() => {
            count--;
            setSosCountdown(count);
            if (count <= 0) {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setSosCountdown(0);
                triggerSOS();
            }
        }, 1000);
    };

    const cancelSOS = () => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        setSosCountdown(0);
    };

    const triggerSOS = async () => {
        if (!currentLocation) {
            setError(t('Location not available. Please enable GPS.', 'الموقع غير متاح. يرجى تمكين GPS.'));
            return;
        }

        if (contacts.length === 0) {
            setError(t('Add at least one emergency contact first', 'أضف جهة اتصال طوارئ واحدة على الأقل أولاً'));
            return;
        }

        setIsSendingSOS(true);
        setError(null);

        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/sos/alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng,
                    accuracyMeters: currentLocation.accuracy,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setActiveAlert(data.alert);
                setSuccess(t(`SOS sent! ${data.alert.contactsNotified} contacts and ${data.alert.gymsNotified} nearby gyms notified.`, `تم إرسال SOS! ${data.alert.contactsNotified} جهة اتصال و${data.alert.gymsNotified} صالة رياضية قريبة تم إخطارهم.`));
                await fetchAlertHistory();
            } else {
                setError(data.message || 'Failed to send SOS');
            }
        } catch {
            setError(t('Failed to send SOS alert', 'فشل إرسال تنبيه SOS'));
        } finally {
            setIsSendingSOS(false);
        }
    };

    const resolveAlert = async () => {
        if (!activeAlert) return;

        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/sos/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ alertId: activeAlert.id }),
            });

            const data = await response.json();
            if (data.success) {
                setActiveAlert(null);
                setSuccess(t('Alert resolved. Stay safe!', 'تم حل التنبيه. ابقَ آمناً!'));
                await fetchAlertHistory();
            }
        } catch {
            setError(t('Failed to resolve alert', 'فشل حل التنبيه'));
        }
    };

    // ─── Contact Management ─────────────────────────────────────────

    const handleAddContact = async () => {
        if (!contactName.trim() || !contactPhone.trim()) {
            setError(t('Name and phone are required', 'الاسم والهاتف مطلوبان'));
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('gemz_access_token');
            const response = await fetch(`${API_BASE}/sos/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: contactName,
                    phone: contactPhone,
                    email: contactEmail || undefined,
                    relationship: contactRelationship || undefined,
                    priority: contactPriority,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setShowContactForm(false);
                setContactName('');
                setContactPhone('');
                setContactEmail('');
                setContactRelationship('');
                setContactPriority(1);
                await fetchContacts();
                setSuccess(t('Contact added successfully', 'تمت إضافة جهة الاتصال بنجاح'));
            } else {
                setError(data.message || 'Failed to add contact');
            }
        } catch {
            setError(t('Failed to add contact', 'فشل إضافة جهة الاتصال'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteContact = async (contactId: string) => {
        try {
            const token = localStorage.getItem('gemz_access_token');
            await fetch(`${API_BASE}/sos/contacts/${contactId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchContacts();
            setSuccess(t('Contact removed', 'تمت إزالة جهة الاتصال'));
        } catch {
            setError(t('Failed to remove contact', 'فشل إزالة جهة الاتصال'));
        }
    };

    // ─── JSX ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center">
                <Shield className="text-red-400 mx-auto mb-2" size={36} />
                <h2 className="text-2xl font-bold font-heading text-white">
                    {t('Emergency SOS', 'طوارئ SOS')}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                    {t('One-tap emergency alert with GPS location', 'تنبيه طوارئ بنقرة واحدة مع موقع GPS')}
                </p>
            </div>

            {/* Error / Success */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">&times;</button>
                </div>
            )}
            {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle size={14} />
                    {success}
                    <button onClick={() => setSuccess(null)} className="ml-auto text-white/40 hover:text-white">&times;</button>
                </div>
            )}

            {/* Active SOS Status */}
            {activeAlert ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                            <Radio size={20} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bold">{t('SOS ACTIVE', 'SOS نشط')}</h3>
                            <p className="text-white/40 text-xs">
                                {t(`${activeAlert.contactsNotified} contacts notified`, `${activeAlert.contactsNotified} جهة اتصال تم إخطارهم`)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                        <MapPin size={12} />
                        <span>{activeAlert.latitude.toFixed(4)}, {activeAlert.longitude.toFixed(4)}</span>
                    </div>
                    <ApiButton onClick={resolveAlert} icon={<CheckCircle size={16} />} variant="primary" fullWidth>
                        {t('I am Safe — Resolve Alert', 'أنا بأمان — حل التنبيه')}
                    </ApiButton>
                </div>
            ) : (
                /* SOS Button */
                <div className="flex flex-col items-center gap-4 py-4">
                    {/* Countdown overlay */}
                    {sosCountdown > 0 ? (
                        <div className="text-center space-y-3">
                            <div className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center border-4 border-red-500/50 animate-pulse">
                                <span className="text-4xl font-bold text-red-400">{sosCountdown}</span>
                            </div>
                            <p className="text-red-400 text-sm">{t('Sending SOS...', 'جاري إرسال SOS...')}</p>
                            <button onClick={cancelSOS} className="text-white/40 hover:text-white text-xs underline">
                                {t('Cancel', 'إلغاء')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={startSOSCountdown}
                                disabled={isSendingSOS || contacts.length === 0}
                                className={`relative w-44 h-44 rounded-full transition-all group ${
                                    contacts.length === 0
                                        ? 'bg-gray-700/20 cursor-not-allowed'
                                        : 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 active:scale-95 shadow-2xl shadow-red-500/40 hover:shadow-red-500/60'
                                }`}
                            >
                                <div className="absolute inset-2 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-all" />
                                <div className="flex flex-col items-center justify-center h-full gap-1">
                                    <AlertTriangle size={36} className="text-white" />
                                    <span className="text-white font-bold text-lg tracking-wider">SOS</span>
                                    <span className="text-white/60 text-[10px]">{t('HOLD TO SEND', 'اضغط للإرسال')}</span>
                                </div>
                            </button>

                            <div className="text-center space-y-1">
                                <p className="text-white/30 text-xs">
                                    {gpsEnabled && currentLocation ? (
                                        <span className="flex items-center gap-1 justify-center text-green-400/60">
                                            <Navigation size={10} />
                                            GPS Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 justify-center text-red-400/60">
                                            <Navigation size={10} />
                                            {t('GPS unavailable', 'نظام تحديد المواقع غير متاح')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Users size={16} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white font-bold text-sm">{contacts.length}</p>
                    <p className="text-white/20 text-[10px]">{t('Contacts', 'جهات الاتصال')}</p>
                </div>
                <div className="text-center p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Bell size={16} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white font-bold text-sm">{alertHistory.length}</p>
                    <p className="text-white/20 text-[10px]">{t('Alerts', 'تنبيهات')}</p>
                </div>
                <div className="text-center p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Shield size={16} className="text-green-400/40 mx-auto mb-1" />
                    <p className="text-green-400 font-bold text-sm">{activeAlert ? 'Active' : 'Ready'}</p>
                    <p className="text-white/20 text-[10px]">{t('Status', 'الحالة')}</p>
                </div>
            </div>

            {/* Emergency Contacts Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                        <Heart size={16} className="text-red-400" />
                        {t('Emergency Contacts', 'جهات اتصال الطوارئ')}
                    </h3>
                    <button
                        onClick={() => setShowContactForm(!showContactForm)}
                        className="flex items-center gap-1 text-[var(--color-primary)] text-xs font-semibold hover:underline"
                    >
                        {showContactForm ? <X size={14} /> : <UserPlus size={14} />}
                        {showContactForm ? t('Cancel', 'إلغاء') : t('Add', 'إضافة')}
                    </button>
                </div>

                {/* Add Contact Form */}
                {showContactForm && (
                    <ApiCard>
                        <div className="space-y-3">
                            <input
                                type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                                placeholder={t('Contact name', 'اسم جهة الاتصال')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                            <input
                                type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                                placeholder={t('Phone number', 'رقم الهاتف')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                            <input
                                type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                                placeholder={t('Email (optional)', 'البريد الإلكتروني (اختياري)')}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-white/30"
                            />
                            <select
                                value={contactRelationship}
                                onChange={(e) => setContactRelationship(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                            >
                                <option value="">{t('Relationship (optional)', 'العلاقة (اختياري)')}</option>
                                {Object.entries(RELATIONSHIP_LABELS).map(([key, labels]) => (
                                    <option key={key} value={key}>{isArabic ? labels.ar : labels.en}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <ApiButton onClick={handleAddContact} loading={isLoading} icon={<UserPlus size={14} />} variant="primary" fullWidth>
                                    {t('Add Contact', 'إضافة جهة اتصال')}
                                </ApiButton>
                            </div>
                        </div>
                    </ApiCard>
                )}

                {/* Contacts List */}
                <div className="space-y-2">
                    {contacts.map((contact) => (
                        <div key={contact.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                                    <span className="text-[var(--color-primary)] font-bold text-sm">{contact.priority}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-white text-sm font-semibold">{contact.name}</h4>
                                        {contact.relationship && (
                                            <span className="text-white/20 text-[10px]">
                                                {RELATIONSHIP_LABELS[contact.relationship]?.[isArabic ? 'ar' : 'en'] || contact.relationship}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-white/30 text-xs">
                                        <Phone size={10} />
                                        <span>{contact.phone}</span>
                                        {contact.email && (
                                            <>
                                                <span className="text-white/10">|</span>
                                                <span>{contact.email}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteContact(contact.id)}
                                    className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {contacts.length === 0 && !showContactForm && (
                        <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5">
                            <Users size={28} className="text-white/10 mx-auto mb-2" />
                            <p className="text-white/20 text-xs">{t('No emergency contacts. Add at least one to enable SOS.', 'لا توجد جهات اتصال طوارئ. أضف واحدة على الأقل لتفعيل SOS.')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Alert History */}
            {alertHistory.length > 0 && (
                <div className="space-y-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-left"
                    >
                        <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                            <Clock size={16} className="text-white/40" />
                            {t('Alert History', 'سجل التنبيهات')}
                        </h3>
                        {showHistory ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                    </button>

                    {showHistory && (
                        <div className="space-y-2">
                            {alertHistory.map((alert) => (
                                <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                                    alert.status === 'active' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                        alert.status === 'active' ? 'bg-red-500/20' : 'bg-green-500/20'
                                    }`}>
                                        {alert.status === 'active' ? <Radio size={14} className="text-red-400" /> : <CheckCircle size={14} className="text-green-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/60 text-xs">
                                            {new Date(alert.triggeredAt).toLocaleDateString()} — {alert.contactsNotified} {t('contacts', 'جهات اتصال')}, {alert.gymsNotified} {t('gyms', 'صالات')}
                                        </p>
                                        <div className="flex items-center gap-1 text-white/20 text-[10px]">
                                            <MapPin size={8} />
                                            {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        alert.status === 'active' ? 'bg-red-500/10 text-red-400' :
                                        alert.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                                        'bg-white/5 text-white/30'
                                    }`}>
                                        {alert.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
