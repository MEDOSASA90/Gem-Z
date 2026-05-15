'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    MapPin,
    Video,
    Users,
    Star,
    CalendarDays,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type SessionType = 'in_person' | 'online' | 'group';

export interface BookingData {
    id: string;
    traineeId: string;
    traineeName: string;
    trainerId: string;
    trainerName: string;
    gymId: string | null;
    gymName: string | null;
    status: BookingStatus;
    sessionType: SessionType;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    notes: string | null;
    price: number;
    priceUnit: string;
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    bookingId?: string;
}

export interface TrainerCalendarDay {
    date: string;
    dayOfWeek: number;
    isAvailable: boolean;
    slots: TimeSlot[];
}

export interface TrainerInfo {
    id: string;
    name: string;
    avatar: string | null;
    rating: number;
    specialty: string;
    hourlyRate: number;
}

export interface BookingCalendarProps {
    bookings: BookingData[];
    calendarDays: TrainerCalendarDay[];
    trainer: TrainerInfo;
    isTrainer: boolean;
    onCreateBooking: (data: {
        trainerId: string;
        scheduledDate: string;
        startTime: string;
        sessionType: SessionType;
        gymId?: string;
        durationMinutes?: number;
        notes?: string;
    }) => Promise<void>;
    onCancelBooking: (bookingId: string, reason?: string) => Promise<void>;
    onRescheduleBooking: (
        bookingId: string,
        data: { scheduledDate: string; startTime: string; durationMinutes?: number }
    ) => Promise<void>;
    onConfirmBooking: (bookingId: string) => Promise<void>;
    onCompleteBooking: (bookingId: string) => Promise<void>;
    onFetchCalendar: (trainerId: string, startDate: string, endDate: string) => Promise<TrainerCalendarDay[]>;
}

// ─── Helpers ────────────────────────────────────────────────────

const sessionTypeConfig: Record<SessionType, { label: string; icon: any; color: string; bg: string }> = {
    in_person: { label: 'In-Person', icon: MapPin, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    online: { label: 'Online', icon: Video, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    group: { label: 'Group', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const statusConfig: Record<BookingStatus, { color: string; bg: string; label: string }> = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Pending' },
    confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Confirmed' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Cancelled' },
    completed: { color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'Completed' },
    no_show: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'No Show' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─── Component ──────────────────────────────────────────────────

export default function BookingCalendar({
    bookings,
    calendarDays,
    trainer,
    isTrainer,
    onCreateBooking,
    onCancelBooking,
    onRescheduleBooking,
    onConfirmBooking,
    onCompleteBooking,
}: BookingCalendarProps) {
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(today));
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    const [sessionType, setSessionType] = useState<SessionType>('in_person');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Derive calendar days for the selected month
    const monthCalendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const days: Array<{ date: string; dayOfMonth: number; isCurrentMonth: boolean; isToday: boolean }> = [];

        // Previous month filler
        const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = prevMonthDays - i;
            const date = new Date(viewYear, viewMonth - 1, d);
            days.push({
                date: toDateStr(date),
                dayOfMonth: d,
                isCurrentMonth: false,
                isToday: false,
            });
        }

        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(viewYear, viewMonth, d);
            days.push({
                date: toDateStr(date),
                dayOfMonth: d,
                isCurrentMonth: true,
                isToday: toDateStr(date) === toDateStr(today),
            });
        }

        // Next month filler
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const date = new Date(viewYear, viewMonth + 1, d);
            days.push({
                date: toDateStr(date),
                dayOfMonth: d,
                isCurrentMonth: false,
                isToday: false,
            });
        }

        return days;
    }, [viewYear, viewMonth]);

    // Get slots for selected date
    const selectedDateSlots = useMemo(() => {
        const day = calendarDays.find((d) => d.date === selectedDate);
        return day?.slots || [];
    }, [calendarDays, selectedDate]);

    // Get bookings for selected date
    const selectedDateBookings = useMemo(() => {
        return bookings.filter((b) => {
            const bDate = b.scheduledDate.slice(0, 10);
            return bDate === selectedDate && b.status !== 'cancelled';
        });
    }, [bookings, selectedDate]);

    const navigateMonth = (delta: number) => {
        let newMonth = viewMonth + delta;
        let newYear = viewYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        setViewMonth(newMonth);
        setViewYear(newYear);
    };

    const handleCreateBooking = async () => {
        if (!selectedDate || !selectedSlot) return;
        setLoading(true);
        try {
            await onCreateBooking({
                trainerId: trainer.id,
                scheduledDate: selectedDate,
                startTime: selectedSlot.startTime,
                sessionType,
                notes: notes || undefined,
            });
            setShowBookingForm(false);
            setSelectedSlot(null);
            setNotes('');
        } catch (e) {
            /* error handled by parent */
        }
        setLoading(false);
    };

    const handleCancelBooking = async (bookingId: string) => {
        setLoading(true);
        try {
            await onCancelBooking(bookingId);
            setSelectedBooking(null);
        } catch (e) {
            /* error handled by parent */
        }
        setLoading(false);
    };

    const handleConfirmBooking = async (bookingId: string) => {
        setLoading(true);
        try {
            await onConfirmBooking(bookingId);
        } catch (e) {
            /* error handled by parent */
        }
        setLoading(false);
    };

    const handleCompleteBooking = async (bookingId: string) => {
        setLoading(true);
        try {
            await onCompleteBooking(bookingId);
        } catch (e) {
            /* error handled by parent */
        }
        setLoading(false);
    };

    return (
        <div className="space-y-5">
            {/* Trainer Info */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4"
            >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                    {trainer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{trainer.name}</h3>
                    <p className="text-xs text-slate-400">{trainer.specialty}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {trainer.rating.toFixed(1)}
                        </span>
                        <span className="text-emerald-400">
                            EGP {trainer.hourlyRate}/hr
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex bg-white/5 rounded-lg border border-white/10 p-1">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            viewMode === 'calendar'
                                ? 'bg-violet-600 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            viewMode === 'list'
                                ? 'bg-violet-600 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        List
                    </button>
                </div>
                <span className="text-xs text-slate-400">
                    {bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length} upcoming
                </span>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-sm font-bold text-white">
                            {MONTHS[viewMonth]} {viewYear}
                        </h3>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1">
                        {DAYS.map((d) => (
                            <div
                                key={d}
                                className="text-center text-[10px] text-slate-500 font-semibold py-1"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {monthCalendarDays.map((day) => {
                            const hasBookings = bookings.some(
                                (b) =>
                                    b.scheduledDate.slice(0, 10) === day.date &&
                                    b.status !== 'cancelled'
                            );
                            const isSelected = selectedDate === day.date;

                            return (
                                <button
                                    key={`${day.date}-${day.isCurrentMonth}`}
                                    onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
                                    disabled={!day.isCurrentMonth}
                                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                                        !day.isCurrentMonth
                                            ? 'opacity-20 cursor-default'
                                            : isSelected
                                                ? 'bg-violet-600 text-white'
                                                : day.isToday
                                                    ? 'bg-white/10 text-white border border-violet-500/30'
                                                    : 'text-white hover:bg-white/5'
                                    } ${
                                        hasBookings && !isSelected && day.isCurrentMonth
                                            ? 'ring-1 ring-emerald-500/30'
                                            : ''
                                    }`}
                                >
                                    <span className="font-semibold">{day.dayOfMonth}</span>
                                    {hasBookings && !isSelected && (
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Date Details */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedDate}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                        >
                            <h4 className="text-sm font-semibold text-white mb-3">
                                {selectedDate
                                    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                                          weekday: 'long',
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                      })
                                    : 'Select a date'}
                            </h4>

                            {/* Existing Bookings for this date */}
                            {selectedDateBookings.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                        Your Bookings
                                    </span>
                                    {selectedDateBookings.map((booking) => {
                                        const st = statusConfig[booking.status];
                                        const SessionIcon = sessionTypeConfig[booking.sessionType].icon;
                                        return (
                                            <div
                                                key={booking.id}
                                                onClick={() => setSelectedBooking(booking)}
                                                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.04] cursor-pointer hover:bg-white/[0.07] transition-all"
                                            >
                                                <div className={`p-1.5 rounded-md ${st.bg}`}>
                                                    <SessionIcon className={`w-4 h-4 ${st.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">
                                                        {booking.trainerName}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {booking.startTime} - {booking.endTime}
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                                                    {st.label}
                                                </span>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Time Slots */}
                            {!isTrainer && (
                                <div>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">
                                        Available Slots
                                    </span>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                                        {selectedDateSlots.length === 0 ? (
                                            <p className="text-xs text-slate-500 col-span-full text-center py-4">
                                                No slots available
                                            </p>
                                        ) : (
                                            selectedDateSlots.map((slot, idx) => (
                                                <motion.button
                                                    key={idx}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    onClick={() => {
                                                        if (slot.isAvailable) {
                                                            setSelectedSlot(slot);
                                                            setShowBookingForm(true);
                                                        }
                                                    }}
                                                    disabled={!slot.isAvailable}
                                                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                                                        slot.isAvailable
                                                            ? selectedSlot?.startTime === slot.startTime
                                                                ? 'bg-violet-600 text-white'
                                                                : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                                            : 'bg-white/[0.02] text-slate-600 cursor-not-allowed border border-transparent'
                                                    }`}
                                                >
                                                    {slot.startTime}
                                                </motion.button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                >
                    {bookings.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No bookings yet</p>
                        </div>
                    ) : (
                        bookings
                            .filter((b) => b.status !== 'cancelled')
                            .sort(
                                (a, b) =>
                                    new Date(a.scheduledDate).getTime() -
                                    new Date(b.scheduledDate).getTime()
                            )
                            .map((booking, idx) => {
                                const st = statusConfig[booking.status];
                                const SessionIcon = sessionTypeConfig[booking.sessionType].icon;
                                const isPast =
                                    new Date(booking.scheduledDate) < new Date(today.toDateString());

                                return (
                                    <motion.div
                                        key={booking.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => setSelectedBooking(booking)}
                                        className="rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer hover:bg-white/[0.05] transition-all"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${st.bg}`}>
                                                    <SessionIcon className={`w-4 h-4 ${st.color}`} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-white">
                                                        {isTrainer ? booking.traineeName : booking.trainerName}
                                                    </h4>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(booking.scheduledDate).toLocaleDateString()} ·{' '}
                                                        {booking.startTime} - {booking.endTime} ·{' '}
                                                        {booking.durationMinutes}min
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                                                {st.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                {booking.sessionType === 'in_person' ? (
                                                    <MapPin className="w-3 h-3" />
                                                ) : (
                                                    <Video className="w-3 h-3" />
                                                )}
                                                {sessionTypeConfig[booking.sessionType].label}
                                            </span>
                                            {booking.price > 0 && (
                                                <span className="text-emerald-400 font-semibold">
                                                    EGP {booking.price}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                    )}
                </motion.div>
            )}

            {/* Booking Form Modal */}
            <AnimatePresence>
                {showBookingForm && selectedSlot && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setShowBookingForm(false)}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-white">Book Session</h3>
                                <button
                                    onClick={() => setShowBookingForm(false)}
                                    className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-1 mb-4 p-3 rounded-lg bg-white/5">
                                <p className="text-sm text-white font-medium">
                                    {trainer.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString()}
                                    {' · '}
                                    {selectedSlot.startTime} - {selectedSlot.endTime}
                                </p>
                            </div>

                            {/* Session Type */}
                            <div className="mb-4">
                                <label className="text-xs text-slate-400 block mb-2">Session Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(sessionTypeConfig) as SessionType[]).map((type) => {
                                        const cfg = sessionTypeConfig[type];
                                        const Icon = cfg.icon;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setSessionType(type)}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                                                    sessionType === type
                                                        ? `${cfg.bg} ${cfg.color} ring-1 ring-current`
                                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                }`}
                                            >
                                                <Icon className="w-3 h-3" />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mb-5">
                                <label className="text-xs text-slate-400 block mb-2">Notes (optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any special requests..."
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none h-20"
                                />
                            </div>

                            <button
                                onClick={handleCreateBooking}
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Booking...' : 'Confirm Booking'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Booking Detail Modal */}
            <AnimatePresence>
                {selectedBooking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setSelectedBooking(null)}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-white">Session Details</h3>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-lg ${
                                            statusConfig[selectedBooking.status].bg
                                        }`}
                                    >
                                        {React.createElement(
                                            sessionTypeConfig[selectedBooking.sessionType].icon,
                                            {
                                                className: `w-5 h-5 ${statusConfig[selectedBooking.status].color}`,
                                            }
                                        )}
                                    </div>
                                    <div>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${
                                                statusConfig[selectedBooking.status].bg
                                            } ${statusConfig[selectedBooking.status].color}`}
                                        >
                                            {statusConfig[selectedBooking.status].label}
                                        </span>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {sessionTypeConfig[selectedBooking.sessionType].label} ·{' '}
                                            {selectedBooking.durationMinutes}min
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Calendar className="w-4 h-4 text-violet-400" />
                                        {new Date(selectedBooking.scheduledDate + 'T12:00:00').toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Clock className="w-4 h-4 text-violet-400" />
                                        {selectedBooking.startTime} - {selectedBooking.endTime}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Users className="w-4 h-4 text-violet-400" />
                                        {isTrainer ? selectedBooking.traineeName : selectedBooking.trainerName}
                                    </div>
                                    {selectedBooking.gymName && (
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <MapPin className="w-4 h-4 text-violet-400" />
                                            {selectedBooking.gymName}
                                        </div>
                                    )}
                                    {selectedBooking.price > 0 && (
                                        <div className="flex items-center gap-3 text-emerald-400 font-semibold">
                                            <Star className="w-4 h-4" />
                                            EGP {selectedBooking.price} {selectedBooking.priceUnit}
                                        </div>
                                    )}
                                    {selectedBooking.notes && (
                                        <div className="p-3 rounded-lg bg-white/5 text-xs text-slate-400">
                                            <span className="font-semibold text-slate-300 block mb-1">Notes:</span>
                                            {selectedBooking.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-white/5">
                                    {isTrainer ? (
                                        <>
                                            {selectedBooking.status === 'pending' && (
                                                <button
                                                    onClick={() => handleConfirmBooking(selectedBooking.id)}
                                                    disabled={loading}
                                                    className="flex-1 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                                    Confirm
                                                </button>
                                            )}
                                            {selectedBooking.status === 'confirmed' && (
                                                <button
                                                    onClick={() => handleCompleteBooking(selectedBooking.id)}
                                                    disabled={loading}
                                                    className="flex-1 py-2.5 rounded-lg bg-sky-500/10 text-sky-400 text-sm font-semibold hover:bg-sky-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <Check className="w-4 h-4 inline mr-1" />
                                                    Complete
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {(selectedBooking.status === 'pending' ||
                                                selectedBooking.status === 'confirmed') && (
                                                <button
                                                    onClick={() => handleCancelBooking(selectedBooking.id)}
                                                    disabled={loading}
                                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4 inline mr-1" />
                                                    Cancel
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
