'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState, ErrorState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface MealItem {
    id: string;
    dayOfWeek: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    ingredients: string[];
    prepTime: number;
}

interface MealPlan {
    id: string;
    weekStart: string;
    calorieTarget: number;
    dietaryPreference: string;
    status: string;
    meals: MealItem[];
    groceryList: GroceryItem[];
}

interface GroceryItem {
    name: string;
    quantity: string;
    category: string;
    checked: boolean;
}

interface MealPlanSummary {
    id: string;
    weekStart: string;
    calorieTarget: number;
    dietaryPreference: string;
    status: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DIETARY_OPTIONS = ['balanced', 'keto', 'vegan', 'vegetarian', 'paleo', 'mediterranean', 'low-carb', 'high-protein'];

const CATEGORY_COLORS: Record<string, string> = {
    produce: 'bg-green-500/20 text-green-400',
    protein: 'bg-red-500/20 text-red-400',
    dairy: 'bg-blue-500/20 text-blue-400',
    grains: 'bg-yellow-500/20 text-yellow-400',
    pantry: 'bg-purple-500/20 text-purple-400',
    frozen: 'bg-cyan-500/20 text-cyan-400',
    other: 'bg-gray-500/20 text-gray-400',
};

// ─── MealPlanner Component ──────────────────────────────────────

export default function MealPlanner() {
    const [plans, setPlans] = useState<MealPlanSummary[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
    const [activeTab, setActiveTab] = useState<'planner' | 'grocery'>('planner');
    const [activeDay, setActiveDay] = useState(0);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generation form
    const [calorieTarget, setCalorieTarget] = useState(2000);
    const [dietaryPreference, setDietaryPreference] = useState('balanced');
    const [allergies, setAllergies] = useState('');

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/meals', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            const data = await res.json();
            if (data.success) setPlans(data.data);
        } catch (err) {
            setError('Failed to load meal plans');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const fetchPlanDetails = async (planId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/meals/${planId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (data.success) {
                setSelectedPlan(data.data);
                setActiveTab('planner');
                setActiveDay(0);
            }
        } catch (err) {
            setError('Failed to load plan details');
        } finally {
            setLoading(false);
        }
    };

    const generatePlan = async () => {
        setGenerating(true);
        setError(null);
        try {
            const allergyList = allergies.split(',').map(a => a.trim()).filter(Boolean);
            const res = await fetch('/api/v1/meals/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ calorieTarget, dietaryPreference, allergies: allergyList }),
            });
            const data = await res.json();
            if (data.success) {
                setSelectedPlan(data.data);
                setActiveTab('planner');
                setActiveDay(0);
                fetchPlans();
            } else {
                setError(data.message || 'Failed to generate plan');
            }
        } catch (err) {
            setError('Failed to generate meal plan');
        } finally {
            setGenerating(false);
        }
    };

    const deletePlan = async (planId: string) => {
        if (!confirm('Delete this meal plan?')) return;
        try {
            await fetch(`/api/v1/meals/${planId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (selectedPlan?.id === planId) setSelectedPlan(null);
            fetchPlans();
        } catch {
            setError('Failed to delete plan');
        }
    };

    const getMealsForDay = (day: number) => {
        if (!selectedPlan) return [];
        return selectedPlan.meals.filter(m => m.dayOfWeek === day).sort(
            (a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType)
        );
    };

    const toggleGroceryItem = (index: number) => {
        if (!selectedPlan) return;
        const updated = [...selectedPlan.groceryList];
        updated[index] = { ...updated[index], checked: !updated[index].checked };
        setSelectedPlan({ ...selectedPlan, groceryList: updated });
    };

    const totalCalories = selectedPlan?.meals.reduce((sum, m) => sum + m.calories, 0) || 0;

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">restaurant_menu</span>
                        Meal Planner
                    </h1>
                    <p className="text-white/50 text-sm mt-1">AI-powered weekly meal plans with grocery lists</p>
                </div>
                <div className="flex gap-2">
                    <ApiButton variant="ghost" onClick={fetchPlans} disabled={loading}>
                        Refresh
                    </ApiButton>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

            {/* Generation Form */}
            <ApiCard>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff7b00]">auto_awesome</span>
                    Generate New Meal Plan
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Daily Calories</label>
                        <input
                            type="number"
                            value={calorieTarget}
                            onChange={e => setCalorieTarget(Number(e.target.value))}
                            min={800}
                            max={8000}
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00] focus:ring-1 focus:ring-[#ff7b00]"
                        />
                    </div>
                    <div>
                        <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Dietary Preference</label>
                        <select
                            value={dietaryPreference}
                            onChange={e => setDietaryPreference(e.target.value)}
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                        >
                            {DIETARY_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="bg-[#1a1a1a]">{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Allergies (comma-separated)</label>
                        <input
                            type="text"
                            value={allergies}
                            onChange={e => setAllergies(e.target.value)}
                            placeholder="e.g., nuts, dairy, gluten"
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00] focus:ring-1 focus:ring-[#ff7b00]"
                        />
                    </div>
                </div>
                <ApiButton
                    className="mt-4"
                    loading={generating}
                    onClick={generatePlan}
                    icon={<span className="material-symbols-outlined">auto_awesome</span>}
                >
                    Generate Weekly Plan
                </ApiButton>
            </ApiCard>

            {/* Plans List + Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: Plans */}
                <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Your Plans</h3>
                    {plans.length === 0 && !loading && (
                        <EmptyState icon="restaurant_menu" title="No meal plans yet" subtitle="Generate your first plan above" />
                    )}
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            onClick={() => fetchPlanDetails(plan.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedPlan?.id === plan.id
                                    ? 'border-[#ff7b00] bg-[#ff7b00]/10'
                                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-white font-bold text-sm">{plan.dietaryPreference}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    plan.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>{plan.status}</span>
                            </div>
                            <p className="text-white/40 text-xs mt-1">{plan.calorieTarget} kcal/day</p>
                            <p className="text-white/30 text-xs">{new Date(plan.weekStart).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>

                {/* Main: Plan Detail */}
                <div className="lg:col-span-3">
                    {selectedPlan ? (
                        <ApiCard loading={loading}>
                            {/* Plan Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {selectedPlan.dietaryPreference.charAt(0).toUpperCase() + selectedPlan.dietaryPreference.slice(1)} Plan
                                    </h2>
                                    <p className="text-white/40 text-sm">
                                        {selectedPlan.calorieTarget} kcal target | Week of {new Date(selectedPlan.weekStart).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="text-right mr-4">
                                        <p className="text-2xl font-bold text-[#ff7b00]">{Math.round(totalCalories / 7)}</p>
                                        <p className="text-white/30 text-xs">avg kcal/day</p>
                                    </div>
                                    <button
                                        onClick={() => deletePlan(selectedPlan.id)}
                                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
                                {(['planner', 'grocery'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                            activeTab === tab
                                                ? 'bg-[#ff7b00] text-black'
                                                : 'text-white/50 hover:text-white'
                                        }`}
                                    >
                                        {tab === 'planner' ? 'Weekly Plan' : 'Grocery List'}
                                    </button>
                                ))}
                            </div>

                            {activeTab === 'planner' ? (
                                <>
                                    {/* Day Tabs */}
                                    <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                                        {DAYS.map((day, idx) => (
                                            <button
                                                key={day}
                                                onClick={() => setActiveDay(idx)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                                    activeDay === idx
                                                        ? 'bg-[#ff7b00] text-black'
                                                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                }`}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Meals for selected day */}
                                    <div className="space-y-3">
                                        {MEAL_TYPES.map(mealType => {
                                            const meals = getMealsForDay(activeDay).filter(m => m.mealType === mealType);
                                            return meals.map(meal => (
                                                <div key={meal.id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold uppercase tracking-wider text-[#ff7b00]">
                                                                    {mealType}
                                                                </span>
                                                                <span className="text-white/30 text-xs">{meal.prepTime} min prep</span>
                                                            </div>
                                                            <h4 className="text-white font-bold">{meal.name}</h4>
                                                            {meal.description && (
                                                                <p className="text-white/40 text-sm mt-1">{meal.description}</p>
                                                            )}
                                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                                {meal.ingredients.map((ing, i) => (
                                                                    <span key={i} className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded-full">
                                                                        {ing}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="text-lg font-bold text-white">{meal.calories}</p>
                                                            <p className="text-white/30 text-xs">kcal</p>
                                                        </div>
                                                    </div>
                                                    {/* Macros */}
                                                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                                                        <div className="text-center">
                                                            <p className="text-xs font-bold text-blue-400">{meal.protein}g</p>
                                                            <p className="text-white/30 text-[10px]">Protein</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-bold text-yellow-400">{meal.carbs}g</p>
                                                            <p className="text-white/30 text-[10px]">Carbs</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-bold text-red-400">{meal.fats}g</p>
                                                            <p className="text-white/30 text-[10px]">Fats</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ));
                                        })}
                                    </div>
                                </>
                            ) : (
                                /* Grocery List */
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {selectedPlan.groceryList.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => toggleGroceryItem(idx)}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                                item.checked ? 'bg-white/[0.02] opacity-50' : 'bg-white/5'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                item.checked ? 'bg-[#ff7b00] border-[#ff7b00]' : 'border-white/20'
                                            }`}>
                                                {item.checked && <span className="material-symbols-outlined text-xs text-black">check</span>}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-bold ${item.checked ? 'line-through text-white/30' : 'text-white'}`}>
                                                    {item.name}
                                                </p>
                                                <p className="text-white/30 text-xs">{item.quantity}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>
                                                {item.category}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ApiCard>
                    ) : (
                        <EmptyState
                            icon="restaurant"
                            title="Select or create a meal plan"
                            subtitle="Choose a plan from the sidebar or generate a new one"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
