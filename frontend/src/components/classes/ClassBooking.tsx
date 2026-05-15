'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface GroupClass {
    id: string;
    name: string;
    classType: string;
    description: string | null;
    instructorName: string;
    instructorAvatarUrl: string | null;
    durationMinutes: number;
    maxCapacity: number;
    calorieBurnEstimate: number | null;
    difficulty: string;
    imageUrl: string | null;
}

interface ClassSchedule {
    id: string;
    classId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    spotsLeft: number;
}

interface ClassWithSchedules extends GroupClass {
    schedules: ClassSchedule[];
}

interface Booking {
    id: string;
    className: string;
    classType: string;
    bookingDate: string;
    startTime: string;
    dayOfWeek: number;
    status: string;
}

// ─── Constants ──────────────────────────────────────────────────

const CLASS_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'yoga', label: 'Yoga', icon: 'self_improvement' },
    { value: 'zumba', label: 'Zumba', icon: 'music_note' },
    { value: 'pilates', label: 'Pilates', icon: 'accessibility_new' },
    { value: 'hiit', label: 'HIIT', icon: 'timer' },
    { value: 'spinning', label: 'Spinning', icon: 'pedal_bike' },
    { value: 'boxing', label: 'Boxing', icon: 'sports_mma' },
    { value: 'dance', label: 'Dance', icon: 'theater_comedy' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-yellow-500/20 text-yellow-400',
    advanced: 'bg-red-500/20 text-red-400',
};

const TYPE_COLORS: Record<string, string> = {
    yoga: 'from-purple-500/30 to-pink-500/30',
    zumba: 'from-yellow-500/30 to-orange-500/30',
    pilates: 'from-blue-500/30 to-cyan-500/30',
    hiit: 'from-red-500/30 to-orange-500/30',
    spinning: 'from-green-500/30 to-emerald-500/30',
    boxing: 'from-red-600/30 to-red-400/30',
    dance: 'from-pink-500/30 to-rose-500/30',
};

// ─── ClassBooking Component ─────────────────────────────────────

export default function ClassBooking() {
    const [view, setView] = useState<'classes' | 'detail' | 'bookings' | 'schedule'>('classes');
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<ClassWithSchedules | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<(GroupClass & { schedules: { id: string; dayOfWeek: number; startTime: string; room: string | null }[] })[]>([]);
    const [selectedType, setSelectedType] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [bookingSchedule, setBookingSchedule] = useState('');
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try {
            const url = selectedType ? `/api/v1/classes?class_type=${selectedType}` : '/api/v1/classes';
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setClasses(data.data);
        } catch {
            setError('Failed to load classes');
        } finally {
            setLoading(false);
        }
    }, [selectedType, token]);

    const fetchBookings = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/classes/bookings', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setBookings(data.data);
        } catch {
            /* silent */
        }
    }, [token]);

    const fetchSchedule = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/classes/schedule', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setWeeklySchedule(data.data);
        } catch {
            /* silent */
        }
    }, [token]);

    useEffect(() => { fetchClasses(); }, [fetchClasses]);

    useEffect(() => {
        fetchBookings();
        fetchSchedule();
    }, [fetchBookings, fetchSchedule]);

    const fetchClassDetail = async (classId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/classes/${classId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSelectedClass(data.data);
                setView('detail');
                // Set default booking date to today
                setBookingDate(new Date().toISOString().split('T')[0]);
            }
        } catch {
            setError('Failed to load class details');
        } finally {
            setLoading(false);
        }
    };

    const bookClass = async () => {
        if (!selectedClass || !bookingDate || !bookingSchedule) {
            setError('Please select a date and time slot');
            return;
        }
        setBooking(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/classes/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    schedule_id: bookingSchedule,
                    booking_date: bookingDate,
                }),
            });
            const data = await res.json();
            if (data.success) {
                fetchBookings();
                fetchClassDetail(selectedClass.id);
            } else {
                setError(data.message || 'Booking failed');
            }
        } catch {
            setError('Booking failed');
        } finally {
            setBooking(false);
        }
    };

    const cancelBooking = async (bookingId: string) => {
        if (!confirm('Cancel this booking?')) return;
        try {
            await fetch(`/api/v1/classes/cancel/${bookingId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchBookings();
        } catch {
            setError('Failed to cancel booking');
        }
    };

    const getTodayDayIndex = () => new Date().getDay();

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">sports_gymnastics</span>
                        Group Classes
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Book Yoga, Zumba, Pilates, HIIT & more</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <ApiButton variant="ghost" onClick={() => setView('classes')} className={view === 'classes' ? 'border-[#ff7b00]/50' : ''}>
                        Classes
                    </ApiButton>
                    <ApiButton variant="ghost" onClick={() => setView('schedule')} className={view === 'schedule' ? 'border-[#ff7b00]/50' : ''}>
                        Schedule
                    </ApiButton>
                    <ApiButton variant="ghost" onClick={() => setView('bookings')} className={view === 'bookings' ? 'border-[#ff7b00]/50' : ''}>
                        My Bookings ({bookings.length})
                    </ApiButton>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

            {/* Classes View */}
            {view === 'classes' && (
                <>
                    {/* Type Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {CLASS_TYPES.map(type => (
                            <button
                                key={type.value}
                                onClick={() => setSelectedType(type.value)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${
                                    selectedType === type.value
                                        ? 'bg-[#ff7b00] text-black'
                                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                                }`}
                            >
                                {type.icon && <span className="material-symbols-outlined text-sm">{type.icon}</span>}
                                {type.label}
                            </button>
                        ))}
                    </div>

                    {/* Class Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map(cls => (
                            <div
                                key={cls.id}
                                onClick={() => fetchClassDetail(cls.id)}
                                className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-white/[0.08] hover:border-[#ff7b00]/30 transition-all group"
                            >
                                <div className={`h-24 rounded-xl bg-gradient-to-br ${TYPE_COLORS[cls.classType] || 'from-gray-500/30 to-gray-400/30'} flex items-center justify-center mb-4 group-hover:scale-[1.02] transition-transform`}>
                                    <span className="material-symbols-outlined text-4xl text-white/50">
                                        {CLASS_TYPES.find(t => t.value === cls.classType)?.icon || 'sports'}
                                    </span>
                                </div>
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-white font-bold">{cls.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[cls.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                                        {cls.difficulty}
                                    </span>
                                </div>
                                <p className="text-white/40 text-xs mb-3 line-clamp-2">{cls.description}</p>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff7b00]/30 to-purple-500/30 flex items-center justify-center">
                                        <span className="text-white text-[8px] font-bold">
                                            {cls.instructorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-white/50 text-xs">{cls.instructorName}</span>
                                </div>
                                <div className="flex gap-3 text-xs text-white/30 border-t border-white/5 pt-3">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                        {cls.durationMinutes} min
                                    </span>
                                    {cls.calorieBurnEstimate && (
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">local_fire_department</span>
                                            {cls.calorieBurnEstimate} kcal
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">group</span>
                                        {cls.maxCapacity}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {classes.length === 0 && !loading && (
                            <EmptyState icon="sports_gymnastics" title="No classes found" />
                        )}
                    </div>
                </>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedClass && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ApiButton variant="ghost" onClick={() => setView('classes')}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </ApiButton>
                        <h2 className="text-xl font-bold text-white">{selectedClass.name}</h2>
                    </div>

                    <ApiCard>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${TYPE_COLORS[selectedClass.classType] || 'from-gray-500/30'} flex items-center justify-center`}>
                                <span className="material-symbols-outlined text-3xl text-white/50">
                                    {CLASS_TYPES.find(t => t.value === selectedClass?.classType)?.icon || 'sports'}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-bold">{selectedClass.instructorName}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[selectedClass.difficulty]}`}>
                                        {selectedClass.difficulty}
                                    </span>
                                </div>
                                <p className="text-white/40 text-sm">{selectedClass.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center bg-white/5 rounded-xl p-3">
                                <p className="text-[#ff7b00] font-bold">{selectedClass.durationMinutes}m</p>
                                <p className="text-white/30 text-xs">Duration</p>
                            </div>
                            <div className="text-center bg-white/5 rounded-xl p-3">
                                <p className="text-[#ff7b00] font-bold">{selectedClass.calorieBurnEstimate || '--'}</p>
                                <p className="text-white/30 text-xs">Calories</p>
                            </div>
                            <div className="text-center bg-white/5 rounded-xl p-3">
                                <p className="text-[#ff7b00] font-bold">{selectedClass.maxCapacity}</p>
                                <p className="text-white/30 text-xs">Capacity</p>
                            </div>
                        </div>

                        <h3 className="text-white font-bold mb-3">Available Time Slots</h3>
                        <div className="space-y-2 mb-4">
                            {selectedClass.schedules.map(schedule => (
                                <label
                                    key={schedule.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        bookingSchedule === schedule.id
                                            ? 'border-[#ff7b00] bg-[#ff7b00]/10'
                                            : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="schedule"
                                        value={schedule.id}
                                        checked={bookingSchedule === schedule.id}
                                        onChange={() => setBookingSchedule(schedule.id)}
                                        className="accent-[#ff7b00]"
                                    />
                                    <div className="flex-1">
                                        <span className="text-white text-sm font-bold">
                                            {FULL_DAYS[schedule.dayOfWeek]} {schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)}
                                        </span>
                                        {schedule.room && <span className="text-white/30 text-xs ml-2">{schedule.room}</span>}
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        schedule.spotsLeft > 5 ? 'bg-green-500/20 text-green-400' :
                                        schedule.spotsLeft > 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                        {schedule.spotsLeft > 0 ? `${schedule.spotsLeft} spots` : 'Full'}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="date"
                                value={bookingDate}
                                onChange={e => setBookingDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                            />
                            <ApiButton
                                loading={booking}
                                onClick={bookClass}
                                disabled={!bookingSchedule || !bookingDate}
                                icon={<span className="material-symbols-outlined">event_available</span>}
                            >
                                Book Class
                            </ApiButton>
                        </div>
                    </ApiCard>
                </div>
            )}

            {/* Weekly Schedule View */}
            {view === 'schedule' && (
                <ApiCard loading={loading}>
                    <h3 className="text-lg font-bold text-white mb-4">Weekly Schedule</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {FULL_DAYS.map((day, i) => (
                                    <div key={day} className={`text-center py-2 rounded-lg text-xs font-bold ${
                                        i === getTodayDayIndex() ? 'bg-[#ff7b00]/20 text-[#ff7b00]' : 'text-white/40'
                                    }`}>
                                        {day.slice(0, 3)}
                                    </div>
                                ))}
                            </div>
                            {/* Schedule Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {DAYS.map((_, dayIdx) => (
                                    <div key={dayIdx} className="space-y-1">
                                        {weeklySchedule.map(cls =>
                                            cls.schedules
                                                .filter(s => s.dayOfWeek === dayIdx)
                                                .map((s, si) => (
                                                    <button
                                                        key={`${cls.id}-${si}`}
                                                        onClick={() => fetchClassDetail(cls.id)}
                                                        className={`w-full text-left p-2 rounded-lg text-[10px] font-bold transition-all bg-gradient-to-br ${
                                                            TYPE_COLORS[cls.classType] || 'from-gray-500/30'
                                                        } hover:scale-[1.02]`}
                                                    >
                                                        <p className="text-white truncate">{cls.name}</p>
                                                        <p className="text-white/50">{s.startTime.slice(0, 5)}</p>
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ApiCard>
            )}

            {/* Bookings View */}
            {view === 'bookings' && (
                <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white">My Bookings</h3>
                    {bookings.length === 0 ? (
                        <EmptyState icon="event_available" title="No bookings yet" subtitle="Book your first class" />
                    ) : (
                        bookings.map(b => (
                            <div key={b.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TYPE_COLORS[b.classType] || 'from-gray-500/30'} flex items-center justify-center flex-shrink-0`}>
                                    <span className="material-symbols-outlined text-white/50 text-sm">
                                        {CLASS_TYPES.find(t => t.value === b.classType)?.icon || 'sports'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-sm">{b.className}</p>
                                    <p className="text-white/40 text-xs">
                                        {FULL_DAYS[b.dayOfWeek]} {b.startTime.slice(0, 5)} | {new Date(b.bookingDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                    b.status === 'attended' ? 'bg-green-500/20 text-green-400' :
                                    b.status === 'booked' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>{b.status}</span>
                                {b.status === 'booked' && (
                                    <button
                                        onClick={() => cancelBooking(b.id)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
