'use client';
import React, { useState } from 'react';
import {
    Play, Clock, Star, Bookmark, BookmarkCheck, Globe, Filter,
    Search, ChefHat, Flame, Zap
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const CATEGORIES = [
    { id: 'all', icon: '🍽️', en: 'All', ar: 'الكل' },
    { id: 'breakfast', icon: '🌅', en: 'Breakfast', ar: 'إفطار' },
    { id: 'lunch', icon: '🍗', en: 'Lunch', ar: 'غداء' },
    { id: 'dinner', icon: '🥩', en: 'Dinner', ar: 'عشاء' },
    { id: 'snack', icon: '🥪', en: 'Snacks', ar: 'سناك' },
    { id: 'smoothie', icon: '🥤', en: 'Smoothies', ar: 'سموذي' },
    { id: 'preworkout', icon: '⚡', en: 'Pre-Workout', ar: 'قبل التمرين' },
];

const RECIPES = [
    {
        id: 1, category: 'breakfast', emoji: '🥞',
        nameEn: 'Protein Banana Pancakes', nameAr: 'بانكيك موز بروتيني',
        descEn: '3 ingredients. 20g protein. 5 minutes.', descAr: '3 مكونات. 20 جرام بروتين. 5 دقائق.',
        kcal: 380, protein: 28, carbs: 42, fat: 8,
        prepMin: 5, cookMin: 10, servings: 2, difficulty: 'easy',
        rating: 4.9, reviews: 423,
        tags: ['High-Protein', 'Gluten-Free'], tagsAr: ['عالي البروتين', 'خالي جلوتين'],
        ingredients: ['2 bananas', '2 eggs', '1 scoop whey protein', '1 tsp cinnamon'],
        ingredientsAr: ['2 موزة', '2 بيضة', 'سكوب واي بروتين', '1 ملعقة قرفة'],
        steps: ['Mash bananas', 'Mix with eggs + protein', 'Cook on medium heat 2 min each side'],
        stepsAr: ['اهرس الموز', 'اخلطه مع البيض والبروتين', 'اطهيه على نار متوسطة دقيقتان لكل وجه'],
        color: 'var(--color-warning)', aiRecom: true
    },
    {
        id: 2, category: 'lunch', emoji: '🍗',
        nameEn: 'Grilled Chicken Bowl', nameAr: 'بول دجاج مشوي',
        descEn: 'High protein lunch packed with nutrients.', descAr: 'غداء عالي البروتين مليء بالمغذيات.',
        kcal: 520, protein: 46, carbs: 48, fat: 12,
        prepMin: 10, cookMin: 20, servings: 1, difficulty: 'easy',
        rating: 4.7, reviews: 286,
        tags: ['Meal Prep', 'High-Protein'], tagsAr: ['ميل بريب', 'عالي البروتين'],
        ingredients: ['150g chicken breast', '80g brown rice', 'Broccoli', 'Olive oil', 'Spices'],
        ingredientsAr: ['150 جرام صدر دجاج', '80 جرام أرز بني', 'بروكلي', 'زيت زيتون', 'بهارات'],
        steps: ['Season and grill chicken', 'Cook rice separately', 'Steam broccoli', 'Assemble in bowl'],
        stepsAr: ['تبّل واشوِ الدجاج', 'اطهِ الأرز منفصلاً', 'بخّر البروكلي', 'رتّبهم في البول'],
        color: 'var(--color-primary)', aiRecom: true
    },
    {
        id: 3, category: 'smoothie', emoji: '🥤',
        nameEn: 'Mass Gainer Smoothie', nameAr: 'سموذي ماس جينر',
        descEn: '700 kcal protein shake for bulking.', descAr: 'شيك 700 سعرة للزيادة في الكتلة.',
        kcal: 710, protein: 45, carbs: 88, fat: 18,
        prepMin: 5, cookMin: 0, servings: 1, difficulty: 'easy',
        rating: 4.8, reviews: 198,
        tags: ['Bulking', 'Quick'], tagsAr: ['كتلة عضلية', 'سريع'],
        ingredients: ['2 bananas', '250ml whole milk', '2 scoops whey', '2 tbsp peanut butter', '1 tbsp oats', 'Honey'],
        ingredientsAr: ['2 موزة', '250مل حليب كامل', '2 سكوب واي', '2 ملعقة زبدة فستق', 'شوفان', 'عسل'],
        steps: ['Add all ingredients to blender', 'Blend for 60 seconds', 'Serve immediately'],
        stepsAr: ['ضع كل المكونات في الخلاط', 'اخلط لمدة 60 ثانية', 'قدّمه فوراً'],
        color: 'var(--color-purple)', aiRecom: false
    },
    {
        id: 4, category: 'snack', emoji: '🥚',
        nameEn: 'Egg White Bites', nameAr: 'بايتس بياض البيض',
        descEn: 'Protein-rich mini bites — perfect pre-gym snack.', descAr: 'بايتس صغيرة عالية البروتين — مثالية قبل الجيم.',
        kcal: 185, protein: 22, carbs: 4, fat: 6,
        prepMin: 5, cookMin: 15, servings: 6, difficulty: 'easy',
        rating: 4.6, reviews: 144,
        tags: ['Low-Carb', 'Meal Prep'], tagsAr: ['لو كارب', 'ميل بريب'],
        ingredients: ['6 egg whites', 'Spinach', 'Bell peppers', 'Low-fat cheese', 'Salt & pepper'],
        ingredientsAr: ['6 بياض بيض', 'سبانخ', 'فلفل ألوان', 'جبن قليل دسم', 'ملح وفلفل'],
        steps: ['Preheat oven to 180°C', 'Mix all ingredients', 'Pour into muffin tin', 'Bake 15 minutes'],
        stepsAr: ['سخّن الفرن 180°م', 'اخلط كل المكونات', 'صبّهم في قالب الكبكيك', 'اخبِزهم 15 دقيقة'],
        color: 'var(--color-secondary)', aiRecom: false
    },
    {
        id: 5, category: 'dinner', emoji: '🐟',
        nameEn: 'Salmon & Sweet Potato', nameAr: 'سلمون وبطاطا حلوة',
        descEn: 'Omega-3 rich dinner with complex carbs.', descAr: 'عشاء غني بالأوميجا 3 مع كارب معقد.',
        kcal: 620, protein: 42, carbs: 55, fat: 22,
        prepMin: 10, cookMin: 25, servings: 1, difficulty: 'medium',
        rating: 4.9, reviews: 312,
        tags: ['Omega-3', 'Clean Eating'], tagsAr: ['أوميجا 3', 'أكل نظيف'],
        ingredients: ['200g salmon fillet', '1 sweet potato', 'Asparagus', 'Lemon', 'Garlic', 'Olive oil'],
        ingredientsAr: ['200 جرام فيليه سلمون', 'بطاطا حلوة', 'أسباراغوس', 'ليمون', 'ثوم', 'زيت زيتون'],
        steps: ['Bake sweet potato at 200°C for 20 min', 'Season salmon with lemon & garlic', 'Pan sear salmon 4 min each side', 'Serve with asparagus'],
        stepsAr: ['اخبِز البطاطا 200°م لمدة 20 دقيقة', 'تبّل السلمون بليمون وثوم', 'اشوِه 4 دقائق لكل وجه', 'قدّمه مع الأسباراغوس'],
        color: 'var(--color-orange)', aiRecom: true
    },
    {
        id: 6, category: 'preworkout', emoji: '⚡',
        nameEn: 'Oat Energy Bars', nameAr: 'بارات شوفان طاقة',
        descEn: 'Make 8 bars in 10 mins. Lasts a whole week.', descAr: 'اعمل 8 بارات في 10 دقائق. تكفي أسبوع.',
        kcal: 220, protein: 8, carbs: 32, fat: 7,
        prepMin: 10, cookMin: 0, servings: 8, difficulty: 'easy',
        rating: 4.5, reviews: 87,
        tags: ['No-Bake', 'Energy', 'Meal Prep'], tagsAr: ['بدون خبز', 'طاقة', 'ميل بريب'],
        ingredients: ['2 cups rolled oats', '2 tbsp honey', '3 tbsp peanut butter', 'Dark chocolate chips', 'Vanilla'],
        ingredientsAr: ['2 كوب شوفان', '2 ملعقة عسل', '3 ملعقة زبدة فستق', 'شيبس شوكولاتة داكنة', 'فانيليا'],
        steps: ['Mix all ingredients', 'Press into lined pan', 'Refrigerate 1 hour', 'Cut into bars'],
        stepsAr: ['اخلط كل المكونات', 'اضغطهم في قالب', 'ضعهم في الثلاجة ساعة', 'قطّعهم بارات'],
        color: '#34C759', aiRecom: false
    },
];

export default function RecipeLibraryPage() {
    const { t } = useLanguage();
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [saved, setSaved] = useState<number[]>([2, 5]);
    const [selected, setSelected] = useState<typeof RECIPES[0] | null>(null);

    const displayed = RECIPES.filter(r => {
        const matchCat = category === 'all' || r.category === category;
        const matchSearch = r.nameEn.toLowerCase().includes(search.toLowerCase()) || r.nameAr.includes(search);
        return matchCat && matchSearch;
    });

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen font-sans pb-28" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <nav className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2"><ChefHat size={18} className="text-[var(--color-orange)]" />{isArabic ? 'مكتبة الوصفات' : 'Recipe Library'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{RECIPES.length} {isArabic ? 'وصفة صحية' : 'healthy recipes'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto p-6">
                {/* Search */}
                <div className="relative mb-5">
                    <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-4" style={{ color: 'var(--text-muted)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isArabic ? 'ابحث عن وصفة...' : 'Search recipes...'}
                        className="w-full ps-10 pe-4 py-3 rounded-xl text-sm input-base" />
                </div>
                {/* Category Pills */}
                <div className="flex gap-3 overflow-x-auto pb-3 mb-6 scrollbar-none">
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setCategory(cat.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-all"
                            style={{ background: category === cat.id ? 'var(--color-orange)' : 'var(--bg-card)', color: category === cat.id ? '#fff' : 'var(--text-secondary)', border: `1px solid ${category === cat.id ? 'var(--color-orange)' : 'var(--border-subtle)'}` }}>
                            {cat.icon} {isArabic ? cat.ar : cat.en}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displayed.map(r => (
                        <div key={r.id} className="rounded-3xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: 'var(--bg-card)', border: `1px solid ${r.color}30` }}>
                            {/* Thumbnail */}
                            <div className="h-36 relative flex items-center justify-center overflow-hidden" style={{ background: `${r.color}12` }}>
                                <span className="text-6xl">{r.emoji}</span>
                                {r.aiRecom && (
                                    <div className="absolute top-3 start-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-[var(--color-purple)]" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
                                        🤖 AI Pick
                                    </div>
                                )}
                                <button onClick={e => { e.stopPropagation(); setSaved(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id]); }}
                                    className="absolute top-3 end-3 p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    {saved.includes(r.id) ? <BookmarkCheck size={16} className="text-[var(--color-primary)]" /> : <Bookmark size={16} className="text-white" />}
                                </button>
                                {/* Play button */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center" onClick={() => setSelected(r)}>
                                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                        <Play size={20} className="text-black ms-0.5" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-5" onClick={() => setSelected(r)}>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {(isArabic ? r.tagsAr : r.tags).slice(0, 2).map((tag, i) => (
                                        <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.color}15`, color: r.color }}>{tag}</span>
                                    ))}
                                </div>
                                <h3 className="font-bold mb-1">{isArabic ? r.nameAr : r.nameEn}</h3>
                                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{isArabic ? r.descAr : r.descEn}</p>
                                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                                    <span className="flex items-center gap-1"><Flame size={12} />{r.kcal} kcal</span>
                                    <span className="flex items-center gap-1"><Zap size={12} />{r.protein}g protein</span>
                                    <span className="flex items-center gap-1"><Clock size={12} />{r.prepMin + r.cookMin} min</span>
                                    <span className="flex items-center gap-1"><Star size={10} className="fill-[var(--color-warning)] text-[var(--color-warning)]" />{r.rating}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recipe Detail Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setSelected(null)}>
                    <div className="w-full max-w-lg rounded-3xl overflow-y-auto max-h-[90vh]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                        <div className="h-40 flex items-center justify-center relative" style={{ background: `${selected.color}15` }}>
                            <span className="text-7xl">{selected.emoji}</span>
                            <button onClick={() => setSelected(null)} className="absolute top-4 end-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-lg">×</button>
                        </div>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold font-heading mb-1">{isArabic ? selected.nameAr : selected.nameEn}</h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{isArabic ? selected.descAr : selected.descEn}</p>
                            {/* Macros */}
                            <div className="grid grid-cols-4 gap-3 mb-5">
                                {[{ l: isArabic ? 'سعرات' : 'kcal', v: selected.kcal, c: 'var(--color-orange)' }, { l: isArabic ? 'بروتين' : 'Protein', v: `${selected.protein}g`, c: 'var(--color-primary)' }, { l: isArabic ? 'كارب' : 'Carbs', v: `${selected.carbs}g`, c: 'var(--color-secondary)' }, { l: isArabic ? 'دهون' : 'Fat', v: `${selected.fat}g`, c: 'var(--color-purple)' }].map((m, i) => (
                                    <div key={i} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                                        <p className="font-bold text-sm" style={{ color: m.c }}>{m.v}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.l}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Ingredients */}
                            <h4 className="font-bold mb-2">{isArabic ? '🛒 المكونات:' : '🛒 Ingredients:'}</h4>
                            <ul className="space-y-1.5 mb-5">
                                {(isArabic ? selected.ingredientsAr : selected.ingredients).map((ing, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: selected.color }} />
                                        {ing}
                                    </li>
                                ))}
                            </ul>
                            {/* Steps */}
                            <h4 className="font-bold mb-2">{isArabic ? '👨‍🍳 خطوات التحضير:' : '👨‍🍳 Instructions:'}</h4>
                            {(isArabic ? selected.stepsAr : selected.steps).map((step, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2">
                                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-black" style={{ background: selected.color }}>{i + 1}</div>
                                    <p className="text-sm pt-0.5">{step}</p>
                                </div>
                            ))}
                            <button className="w-full mt-5 py-3 rounded-xl font-bold text-black" style={{ background: selected.color }}>
                                {isArabic ? '➕ أضف لخطة وجباتي' : '➕ Add to My Meal Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
