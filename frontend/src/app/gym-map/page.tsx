'use client';
import React, { useState } from 'react';
import {
    MapPin, Star, Clock, Tag, Zap, Filter, Globe,
    Navigation, Phone, CheckCircle, ChevronRight, Search, X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import GemZLogo from '../../components/GemZLogo';

const GYMS = [
    { id: 1, name: 'Gold Gym Elite', nameAr: 'جولد جيم إيليت', city: 'Cairo', cityAr: 'القاهرة', area: 'Maadi', areaAr: 'المعادي', rating: 4.8, reviews: 1240, distance: '1.2 km', price: 850, priceMonthly: 850, discount: 20, discountReason: 'Off-peak 9AM–12PM', discountReasonAr: 'خصم ساعات الهدوء 9-12', features: ['Pool', 'Sauna', 'Classes', 'Parking'], open: '06:00 – 23:00', phone: '+20 100 000 0001', isOpen: true, isFeatured: true, color: '#00FFA3', emoji: '🏆' },
    { id: 2, name: 'Platinum Fitness', nameAr: 'بلاتينيوم فيتنس', city: 'Cairo', cityAr: 'القاهرة', area: 'Zamalek', areaAr: 'الزمالك', rating: 4.6, reviews: 890, distance: '2.8 km', price: 650, priceMonthly: 650, discount: 15, discountReason: 'Weekend flash sale', discountReasonAr: 'عرض عطلة نهاية الأسبوع', features: ['Classes', 'Spa', 'Cafe'], open: '07:00 – 22:00', phone: '+20 100 000 0002', isOpen: true, isFeatured: false, color: '#A78BFA', emoji: '⚡' },
    { id: 3, name: 'Iron House', nameAr: 'آيرون هاوس', city: 'Giza', cityAr: 'الجيزة', area: '6th of October', areaAr: '6 أكتوبر', rating: 4.5, reviews: 634, distance: '4.1 km', price: 500, priceMonthly: 500, discount: 0, discountReason: '', discountReasonAr: '', features: ['Free Weights', 'Boxing', 'Parking'], open: '06:00 – 00:00', phone: '+20 100 000 0003', isOpen: true, isFeatured: false, color: '#FF6B35', emoji: '🔥' },
    { id: 4, name: 'FitNation', nameAr: 'فيت نيشن', city: 'Alexandria', cityAr: 'الإسكندرية', area: 'Smouha', areaAr: 'سموحة', rating: 4.3, reviews: 412, distance: '8.6 km', price: 420, priceMonthly: 420, discount: 30, discountReason: 'New member deal', discountReasonAr: 'عرض العضو الجديد', features: ['Pool', 'Cardio Zone', 'Classes'], open: '08:00 – 22:00', phone: '+20 100 000 0004', isOpen: false, isFeatured: false, color: '#00B8FF', emoji: '🏊' },
    { id: 5, name: 'Power Zone', nameAr: 'باور زون', city: 'Cairo', cityAr: 'القاهرة', area: 'Heliopolis', areaAr: 'مصر الجديدة', rating: 4.7, reviews: 988, distance: '3.5 km', price: 720, priceMonthly: 720, discount: 10, discountReason: 'GEM Z exclusive', discountReasonAr: 'حصري GEM Z', features: ['Crossfit', 'Personal Training', 'Sauna'], open: '05:30 – 23:30', phone: '+20 100 000 0005', isOpen: true, isFeatured: true, color: '#FFCC00', emoji: '💪' },
];

const MAP_DOTS = [
    { x: 30, y: 40, gymId: 1 }, { x: 55, y: 25, gymId: 2 }, { x: 20, y: 65, gymId: 3 },
    { x: 75, y: 55, gymId: 4 }, { x: 60, y: 70, gymId: 5 },
];

export default function GymMapPage() {
    const { isArabic, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('all');
    const [showDiscountsOnly, setShowDiscountsOnly] = useState(false);
    const [selectedGym, setSelectedGym] = useState<typeof GYMS[0] | null>(null);
    const [selectedMapDot, setSelectedMapDot] = useState<number | null>(null);
    const [view, setView] = useState<'map' | 'list'>('map');

    const filtered = GYMS.filter(g => {
        const matchSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.nameAr.includes(searchQuery) || g.area.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCity = cityFilter === 'all' || g.city === cityFilter || g.cityAr === cityFilter;
        const matchDiscount = !showDiscountsOnly || g.discount > 0;
        return matchSearch && matchCity && matchDiscount;
    });

    const hoveredGym = GYMS.find(g => g.id === selectedMapDot);

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="h-screen flex flex-col font-sans" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Nav */}
            <nav className="shrink-0 px-6 py-4 flex items-center justify-between border-b z-40" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/trainee"><GemZLogo size={32} variant="icon" /></Link>
                    <div>
                        <h1 className="font-bold font-heading flex items-center gap-2"><MapPin size={18} className="text-[#00FFA3]" />{isArabic ? 'خريطة الصالات' : 'Gym Locator'}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{GYMS.length} {isArabic ? 'صالة شريكة قريبة منك' : 'partner gyms near you'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <button onClick={() => setView('map')} className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all" style={{ background: view === 'map' ? '#00FFA3' : 'transparent', color: view === 'map' ? '#000' : 'var(--text-secondary)' }}>🗺 {isArabic ? 'خريطة' : 'Map'}</button>
                        <button onClick={() => setView('list')} className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all" style={{ background: view === 'list' ? '#00FFA3' : 'transparent', color: view === 'list' ? '#000' : 'var(--text-secondary)' }}>☰ {isArabic ? 'قائمة' : 'List'}</button>
                    </div>
                    <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>{isDark ? '☀️' : '🌙'}</button>
                    <button onClick={toggleLanguage} className="p-2 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}><Globe size={16} /></button>
                </div>
            </nav>

            {/* Search + Filters */}
            <div className="shrink-0 px-6 py-3 flex gap-3 border-b overflow-x-auto" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="relative min-w-[200px]">
                    <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3" style={{ color: 'var(--text-muted)' }} />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isArabic ? 'ابحث عن صالة...' : 'Search gyms...'}
                        className="ps-8 pe-4 py-2 rounded-xl text-sm input-base w-full" />
                </div>
                <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm input-base shrink-0">
                    <option value="all">{isArabic ? 'كل المدن' : 'All Cities'}</option>
                    <option value="Cairo">{isArabic ? 'القاهرة' : 'Cairo'}</option>
                    <option value="Giza">{isArabic ? 'الجيزة' : 'Giza'}</option>
                    <option value="Alexandria">{isArabic ? 'الإسكندرية' : 'Alexandria'}</option>
                </select>
                <button onClick={() => setShowDiscountsOnly(!showDiscountsOnly)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-all"
                    style={{ background: showDiscountsOnly ? '#00FFA3' : 'var(--bg-input)', color: showDiscountsOnly ? '#000' : 'var(--text-secondary)', border: `1px solid ${showDiscountsOnly ? '#00FFA3' : 'var(--border-subtle)'}` }}>
                    <Tag size={14} /> {isArabic ? 'عروض فقط' : 'Deals Only'}
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* MAP VIEW */}
                {view === 'map' && (
                    <>
                        {/* Interactive Map (Stylized placeholder) */}
                        <div className="flex-1 relative overflow-hidden" style={{ background: isDark ? '#0D1117' : '#e8f4e8' }}>
                            {/* Map grid lines */}
                            <svg className="absolute inset-0 w-full h-full opacity-10">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <React.Fragment key={i}>
                                        <line x1={`${i * 5}%`} y1="0" x2={`${i * 5}%`} y2="100%" stroke={isDark ? '#fff' : '#000'} strokeWidth="0.5" />
                                        <line x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`} stroke={isDark ? '#fff' : '#000'} strokeWidth="0.5" />
                                    </React.Fragment>
                                ))}
                            </svg>
                            {/* Roads simulation */}
                            <svg className="absolute inset-0 w-full h-full opacity-20">
                                <line x1="0" y1="40%" x2="100%" y2="40%" stroke="#00FFA3" strokeWidth="2" />
                                <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#00FFA3" strokeWidth="1.5" />
                                <line x1="35%" y1="0" x2="35%" y2="100%" stroke="#00FFA3" strokeWidth="2" />
                                <line x1="65%" y1="0" x2="65%" y2="100%" stroke="#00FFA3" strokeWidth="1.5" />
                            </svg>
                            {/* "You are here" pin */}
                            <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
                                <div className="w-6 h-6 rounded-full bg-[#00B8FF] border-4 border-white shadow-lg flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap" style={{ color: '#00B8FF' }}>
                                    {isArabic ? 'أنت هنا' : 'You'}
                                </div>
                            </div>
                            {/* Gym pins */}
                            {MAP_DOTS.map(dot => {
                                const gym = GYMS.find(g => g.id === dot.gymId)!;
                                return (
                                    <div key={dot.gymId} className="absolute cursor-pointer transition-all hover:scale-125"
                                        style={{ left: `${dot.x}%`, top: `${dot.y}%`, transform: 'translate(-50%,-50%)' }}
                                        onClick={() => { setSelectedMapDot(dot.gymId === selectedMapDot ? null : dot.gymId); setSelectedGym(gym); }}>
                                        <div className="relative">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all ${selectedMapDot === dot.gymId ? 'scale-125' : ''}`}
                                                style={{ background: gym.color, border: selectedMapDot === dot.gymId ? '3px solid white' : 'none' }}>
                                                {gym.emoji}
                                            </div>
                                            {gym.discount > 0 && (
                                                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF3B30] flex items-center justify-center text-white text-[9px] font-bold">
                                                    -{gym.discount}%
                                                </div>
                                            )}
                                            {selectedMapDot === dot.gymId && (
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ background: 'white' }} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Selected gym popup */}
                            {hoveredGym && selectedMapDot && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 rounded-2xl p-4 shadow-2xl"
                                    style={{ background: 'var(--bg-card)', border: `1px solid ${hoveredGym.color}50` }}>
                                    <button onClick={() => setSelectedMapDot(null)} className="absolute top-3 end-3"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="text-2xl">{hoveredGym.emoji}</div>
                                        <div>
                                            <h4 className="font-bold">{isArabic ? hoveredGym.nameAr : hoveredGym.name}</h4>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? hoveredGym.areaAr : hoveredGym.area} • {hoveredGym.distance}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-1"><Star size={12} className="text-[#FFCC00] fill-[#FFCC00]" /><span className="text-sm font-bold">{hoveredGym.rating}</span></div>
                                        <div className="font-bold text-sm" style={{ color: hoveredGym.color }} dir="ltr">EGP {hoveredGym.discount > 0 ? Math.round(hoveredGym.price * (1 - hoveredGym.discount / 100)) : hoveredGym.price}/mo</div>
                                    </div>
                                    {hoveredGym.discount > 0 && <div className="text-xs text-[#FF3B30] mb-3 font-bold">🏷 {isArabic ? hoveredGym.discountReasonAr : hoveredGym.discountReason} — {hoveredGym.discount}% OFF</div>}
                                    <button onClick={() => setSelectedGym(hoveredGym)} className="w-full py-2 rounded-xl text-sm font-bold text-black" style={{ background: hoveredGym.color }}>
                                        {isArabic ? 'عرض التفاصيل' : 'View Details'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* LIST VIEW */}
                {view === 'list' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {filtered.map(gym => (
                            <div key={gym.id} onClick={() => setSelectedGym(gym)} className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01]"
                                style={{ background: 'var(--bg-card)', border: `1px solid ${gym.isFeatured ? `${gym.color}40` : 'var(--border-subtle)'}` }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: `${gym.color}15` }}>{gym.emoji}</div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <h3 className="font-bold">{isArabic ? gym.nameAr : gym.name}</h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><MapPin size={10} className="inline" /> {isArabic ? gym.areaAr : gym.area} • {gym.distance}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold" style={{ color: gym.color }} dir="ltr">EGP {gym.discount > 0 ? Math.round(gym.price * (1 - gym.discount / 100)) : gym.price}</p>
                                                {gym.discount > 0 && <p className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{gym.price}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1"><Star size={10} className="text-[#FFCC00]" />{gym.rating} ({gym.reviews})</span>
                                            <span className={`px-2 py-0.5 rounded-full font-bold ${gym.isOpen ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-gray-800 text-gray-500'}`}>{gym.isOpen ? (isArabic ? 'مفتوح' : 'Open') : (isArabic ? 'مغلق' : 'Closed')}</span>
                                            {gym.discount > 0 && <span className="px-2 py-0.5 rounded-full font-bold bg-[#FF3B30]/10 text-[#FF3B30]">-{gym.discount}%</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Side panel: Gym Detail */}
                {selectedGym && (
                    <div className="w-80 border-s flex flex-col overflow-y-auto" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                        <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)', background: `${selectedGym.color}08` }}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-4xl">{selectedGym.emoji}</div>
                                <button onClick={() => setSelectedGym(null)}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
                            </div>
                            <h2 className="font-bold text-xl font-heading mb-1">{isArabic ? selectedGym.nameAr : selectedGym.name}</h2>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <MapPin size={12} />{isArabic ? selectedGym.areaAr : selectedGym.area}, {isArabic ? selectedGym.cityAr : selectedGym.city}
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-1"><Star size={14} className="text-[#FFCC00] fill-[#FFCC00]" /><span className="font-bold">{selectedGym.rating}</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>({selectedGym.reviews})</span></div>
                                <span className="text-xs">{selectedGym.distance}</span>
                            </div>
                        </div>
                        <div className="p-5 space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'السعر الشهري' : 'Monthly Price'}</p>
                                    <p className="text-3xl font-bold font-mono" style={{ color: selectedGym.color }} dir="ltr">
                                        {selectedGym.discount > 0 ? `EGP ${Math.round(selectedGym.price * (1 - selectedGym.discount / 100))}` : `EGP ${selectedGym.price}`}
                                    </p>
                                    {selectedGym.discount > 0 && <p className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>EGP {selectedGym.price}</p>}
                                </div>
                                {selectedGym.discount > 0 && (
                                    <div className="px-3 py-2 rounded-xl text-center" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)' }}>
                                        <p className="text-xl font-bold text-[#FF3B30]">-{selectedGym.discount}%</p>
                                        <p className="text-xs text-[#FF3B30]">{isArabic ? 'خصم' : 'OFF'}</p>
                                    </div>
                                )}
                            </div>
                            {selectedGym.discount > 0 && (
                                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,204,0,0.1)', border: '1px solid rgba(255,204,0,0.2)' }}>
                                    🏷 {isArabic ? selectedGym.discountReasonAr : selectedGym.discountReason}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm"><Clock size={14} style={{ color: 'var(--text-muted)' }} />{selectedGym.open}</div>
                            <div className="flex items-center gap-2 text-sm"><Phone size={14} style={{ color: 'var(--text-muted)' }} />{selectedGym.phone}</div>
                            <div>
                                <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'المرافق:' : 'Amenities:'}</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGym.features.map(f => (
                                        <span key={f} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                                            <CheckCircle size={10} className="text-[#00FFA3]" />{f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                            <button className="w-full py-3 rounded-xl font-bold text-black" style={{ background: selectedGym.color }}>
                                {isArabic ? '💳 اشترك الآن' : '💳 Subscribe Now'}
                            </button>
                            <button className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                                <Navigation size={14} />{isArabic ? 'اعرض على الخريطة' : 'Get Directions'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
