'use client';
import React, { useState } from 'react';
import {
    Search, Filter, Play, ChevronRight, Dumbbell, Globe,
    Zap, Target, TrendingUp, Activity, RotateCcw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const MUSCLE_GROUPS = [
    { id: 'all', icon: '🏋️', nameEn: 'All Muscles', nameAr: 'الكل' },
    { id: 'chest', icon: '💪', nameEn: 'Chest', nameAr: 'الصدر' },
    { id: 'back', icon: '🔙', nameEn: 'Back', nameAr: 'الظهر' },
    { id: 'shoulders', icon: '🤸', nameEn: 'Shoulders', nameAr: 'الأكتاف' },
    { id: 'legs', icon: '🦵', nameEn: 'Legs', nameAr: 'الأرجل' },
    { id: 'arms', icon: '💪', nameEn: 'Arms', nameAr: 'الذراعين' },
    { id: 'core', icon: '🎯', nameEn: 'Core', nameAr: 'الكور' },
    { id: 'cardio', icon: '❤️', nameEn: 'Cardio', nameAr: 'كارديو' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
    Beginner: '#34C759', Intermediate: '#FFCC00', Advanced: '#FF3B30',
};

const EXERCISES = [
    { id: 1, name: 'Bench Press', nameAr: 'ضغط صدر بالبار', muscle: 'chest', equipment: 'Barbell', difficulty: 'Intermediate', kcalPerMin: 8, desc: 'The king of chest exercises. Targets the entire pectoral region.', descAr: 'ملك تمارين الصدر. يستهدف منطقة الصدر بالكامل.', steps: ['Lie flat on bench', 'Grip bar shoulder-width', 'Lower to chest', 'Press up explosively'], emoji: '🏋️' },
    { id: 2, name: 'Pull-Up', nameAr: 'عقلة', muscle: 'back', equipment: 'Bodyweight', difficulty: 'Intermediate', kcalPerMin: 10, desc: 'Superior back compound movement for width and thickness.', descAr: 'تمرين مركب ممتاز للظهر في العرض والسماكة.', steps: ['Grip bar wider than shoulders', 'Hang with arms extended', 'Pull up until chin over bar', 'Lower with control'], emoji: '💪' },
    { id: 3, name: 'Squat', nameAr: 'سكوات', muscle: 'legs', equipment: 'Barbell', difficulty: 'Advanced', kcalPerMin: 12, desc: 'The ultimate lower body builder. Activates 200+ muscles.', descAr: 'المبني الأمثل للجسم السفلي. يُنشّط أكثر من 200 عضلة.', steps: ['Bar on upper traps', 'Feet shoulder-width', 'Descend until thighs parallel', 'Drive through heels'], emoji: '🦵' },
    { id: 4, name: 'Overhead Press', nameAr: 'ضغط أكتاف', muscle: 'shoulders', equipment: 'Barbell', difficulty: 'Intermediate', kcalPerMin: 9, desc: 'Best exercise for building boulder shoulders.', descAr: 'أفضل تمرين لبناء أكتاف قوية.', steps: ['Grip bar at shoulder width', 'Press overhead', 'Lock elbows out', 'Lower with control'], emoji: '🤸' },
    { id: 5, name: 'Deadlift', nameAr: 'ديدليفت', muscle: 'back', equipment: 'Barbell', difficulty: 'Advanced', kcalPerMin: 14, desc: 'Full-body powerhouse movement. Builds total strength.', descAr: 'تمرين قوة للجسم بالكامل. يبني القوة الإجمالية.', steps: ['Stand with feet hip-width', 'Hinge and grip bar', 'Keep back flat', 'Drive hips forward'], emoji: '⚡' },
    { id: 6, name: 'Bicep Curl', nameAr: 'كيرل بايسبس', muscle: 'arms', equipment: 'Dumbbell', difficulty: 'Beginner', kcalPerMin: 6, desc: 'Classic arm builder targeting the biceps brachii.', descAr: 'مبني ذراع كلاسيكي يستهدف عضلة البايسبس.', steps: ['Stand with dumbbells', 'Keep elbows at sides', 'Curl up to shoulder', 'Squeeze at peak'], emoji: '💪' },
    { id: 7, name: 'Plank', nameAr: 'بلانك', muscle: 'core', equipment: 'Bodyweight', difficulty: 'Beginner', kcalPerMin: 5, desc: 'The ultimate core stability exercise for all levels.', descAr: 'تمرين الاستقرار الأمثل للكور لجميع المستويات.', steps: ['Forearms on ground', 'Body in straight line', 'Engage core tightly', 'Hold for time'], emoji: '🎯' },
    { id: 8, name: 'Running', nameAr: 'جري', muscle: 'cardio', equipment: 'None', difficulty: 'Beginner', kcalPerMin: 11, desc: 'The most accessible cardio exercise for fat burning.', descAr: 'أكثر تمارين الكارديو للحرق الدهني.', steps: ['Maintain upright posture', 'Land on mid-foot', 'Swing arms naturally', 'Control breathing'], emoji: '🏃' },
    { id: 9, name: 'Incline DB Press', nameAr: 'ضغط دمبل مائل', muscle: 'chest', equipment: 'Dumbbell', difficulty: 'Intermediate', kcalPerMin: 8, desc: 'Targets the upper chest for a complete pec development.', descAr: 'يستهدف الجزء العلوي للصدر لتطوير كامل.', steps: ['Set bench to 30-45°', 'Hold dumbbells at shoulders', 'Press up and together', 'Lower slowly'], emoji: '💪' },
    { id: 10, name: 'Leg Press', nameAr: 'ضغط رجل', muscle: 'legs', equipment: 'Machine', difficulty: 'Beginner', kcalPerMin: 9, desc: 'Effective quad-dominant leg exercise using a machine.', descAr: 'تمرين أرجل فعال للرباعية باستخدام الآلة.', steps: ['Sit in machine', 'Place feet hip-width', 'Press plate away', 'Bend knees to 90°'], emoji: '🦵' },
    { id: 11, name: 'Lateral Raise', nameAr: 'رفع جانبي', muscle: 'shoulders', equipment: 'Dumbbell', difficulty: 'Beginner', kcalPerMin: 5, desc: 'Isolates the medial deltoid for wider-looking shoulders.', descAr: 'يعزل العضلة الدالية الوسطى لأكتاف أعرض.', steps: ['Hold dumbbells at sides', 'Raise arms to sides', 'Stop at shoulder height', 'Lower slowly'], emoji: '🤸' },
    { id: 12, name: 'Tricep Dips', nameAr: 'دبسات ترايسبس', muscle: 'arms', equipment: 'Bodyweight', difficulty: 'Intermediate', kcalPerMin: 7, desc: 'Compound tricep movement using bodyweight.', descAr: 'تمرين مركب للترايسبس باستخدام وزن الجسم.', steps: ['Grip parallel bars', 'Lower body down', 'Lean forward slightly', 'Press back up'], emoji: '💪' },
];

export default function ExerciseLibraryPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedMuscle, setSelectedMuscle] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [selectedExercise, setSelectedExercise] = useState<typeof EXERCISES[0] | null>(null);

    const filtered = EXERCISES.filter(ex => {
        const matchMuscle = selectedMuscle === 'all' || ex.muscle === selectedMuscle;
        const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.nameAr.includes(searchQuery);
        const matchDiff = selectedDifficulty === 'all' || ex.difficulty === selectedDifficulty;
        return matchMuscle && matchSearch && matchDiff;
    });

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading">{isArabic ? 'مكتبة التمارين' : 'Exercise Library'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{EXERCISES.length} {isArabic ? 'تمرين' : 'exercises'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6">
                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-4" style={{ color: 'var(--text-muted)' }} />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder={isArabic ? 'ابحث عن تمرين...' : 'Search exercises...'}
                            className="w-full ps-10 pe-4 py-3 rounded-xl text-sm input-base" />
                    </div>
                    <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}
                        className="px-4 py-3 rounded-xl text-sm input-base">
                        <option value="all">{isArabic ? 'كل المستويات' : 'All Levels'}</option>
                        <option value="Beginner">{isArabic ? 'مبتدئ' : 'Beginner'}</option>
                        <option value="Intermediate">{isArabic ? 'متوسط' : 'Intermediate'}</option>
                        <option value="Advanced">{isArabic ? 'متقدم' : 'Advanced'}</option>
                    </select>
                </div>

                {/* Muscle Group Pills */}
                <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-none">
                    {MUSCLE_GROUPS.map(mg => (
                        <button key={mg.id} onClick={() => setSelectedMuscle(mg.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-all"
                            style={{ background: selectedMuscle === mg.id ? '#00FFA3' : 'var(--bg-card)', color: selectedMuscle === mg.id ? '#000' : 'var(--text-secondary)', border: `1px solid ${selectedMuscle === mg.id ? '#00FFA3' : 'var(--border-subtle)'}` }}>
                            <span>{mg.icon}</span> {isArabic ? mg.nameAr : mg.nameEn}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(ex => (
                        <div key={ex.id} onClick={() => setSelectedExercise(ex)}
                            className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] group"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-4xl">{ex.emoji}</div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${DIFFICULTY_COLORS[ex.difficulty]}15`, color: DIFFICULTY_COLORS[ex.difficulty], border: `1px solid ${DIFFICULTY_COLORS[ex.difficulty]}40` }}>
                                    {ex.difficulty}
                                </span>
                            </div>
                            <h3 className="font-bold mb-1">{isArabic ? ex.nameAr : ex.name}</h3>
                            <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{isArabic ? ex.descAr : ex.desc}</p>
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1"><Dumbbell size={12} />{ex.equipment}</span>
                                <span className="flex items-center gap-1"><Zap size={12} />{ex.kcalPerMin} kcal/min</span>
                            </div>
                            <button className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all group-hover:bg-[#00FFA3] group-hover:text-black"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                                <Play size={14} /> {isArabic ? 'عرض التمرين' : 'View Exercise'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Exercise Detail Modal */}
            {selectedExercise && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedExercise(null)}>
                    <div className="w-full max-w-lg rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="text-5xl mb-2">{selectedExercise.emoji}</div>
                                    <h2 className="text-2xl font-bold font-heading">{isArabic ? selectedExercise.nameAr : selectedExercise.name}</h2>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{isArabic ? selectedExercise.descAr : selectedExercise.desc}</p>
                                </div>
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: `${DIFFICULTY_COLORS[selectedExercise.difficulty]}15`, color: DIFFICULTY_COLORS[selectedExercise.difficulty] }}>
                                    {selectedExercise.difficulty}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    { label: isArabic ? 'المعدات' : 'Equipment', value: selectedExercise.equipment, icon: Dumbbell },
                                    { label: isArabic ? 'العضلة' : 'Muscle', value: selectedExercise.muscle, icon: Target },
                                    { label: isArabic ? 'الحرق' : 'Burn', value: `${selectedExercise.kcalPerMin} kcal/m`, icon: Zap },
                                ].map((s, i) => (
                                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-input)' }}>
                                        <s.icon size={16} className="mx-auto mb-1 text-[#00FFA3]" />
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                                        <p className="font-bold text-sm capitalize">{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h4 className="font-bold mb-3">{isArabic ? 'خطوات التنفيذ:' : 'How to perform:'}</h4>
                                <div className="space-y-2">
                                    {selectedExercise.steps.map((step, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: '#00FFA3' }}>{i + 1}</div>
                                            <p className="text-sm">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button className="flex-1 py-3 rounded-xl font-bold text-black" style={{ background: '#00FFA3' }}>
                                    {isArabic ? '➕ إضافة للتمرين' : '➕ Add to Workout'}
                                </button>
                                <button onClick={() => setSelectedExercise(null)} className="px-5 py-3 rounded-xl font-bold" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                    {isArabic ? 'إغلاق' : 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
