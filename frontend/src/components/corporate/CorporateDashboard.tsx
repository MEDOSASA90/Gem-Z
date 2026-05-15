'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiButton, ApiCard, EmptyState } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface Company {
    id: string;
    name: string;
    industry: string | null;
    size: number;
    contactEmail: string;
    subscriptionPlan: string;
    monthlyCostEgp: number;
    isActive: boolean;
}

interface Employee {
    id: string;
    fullName: string;
    email: string;
    department: string | null;
    jobTitle: string | null;
    engagementScore: number;
    workoutsCompleted: number;
    lastActiveAt: string | null;
    isActive: boolean;
}

interface DashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    avgEngagementScore: number;
    totalWorkoutsCompleted: number;
    monthlyCost: number;
    departments: { name: string; count: number; avgEngagement: number }[];
    engagementTrend: { month: string; score: number }[];
}

// ─── CorporateDashboard Component ───────────────────────────────

export default function CorporateDashboard() {
    const [view, setView] = useState<'register' | 'dashboard' | 'employees'>('register');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Registration form
    const [regName, setRegName] = useState('');
    const [regIndustry, setRegIndustry] = useState('');
    const [regSize, setRegSize] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPlan, setRegPlan] = useState('basic');
    const [registering, setRegistering] = useState(false);

    // Add employee form
    const [empName, setEmpName] = useState('');
    const [empEmail, setEmpEmail] = useState('');
    const [empDept, setEmpDept] = useState('');
    const [empTitle, setEmpTitle] = useState('');
    const [addingEmp, setAddingEmp] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/corporate/companies', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setCompanies(data.data);
                if (data.data.length > 0) {
                    setSelectedCompany(data.data[0].id);
                    setView('dashboard');
                }
            }
        } catch {
            setError('Failed to load companies');
        }
    }, [token]);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    const fetchDashboard = useCallback(async () => {
        if (!selectedCompany) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/corporate/dashboard?company_id=${selectedCompany}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch {
            setError('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, [selectedCompany, token]);

    const fetchEmployees = useCallback(async () => {
        if (!selectedCompany) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/corporate/employees?company_id=${selectedCompany}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch {
            setError('Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, [selectedCompany, token]);

    useEffect(() => {
        if (view === 'dashboard') fetchDashboard();
        if (view === 'employees') fetchEmployees();
    }, [view, fetchDashboard, fetchEmployees]);

    const registerCompany = async () => {
        if (!regName.trim() || !regSize || !regEmail.trim()) {
            setError('Name, size, and email are required');
            return;
        }
        setRegistering(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/corporate/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: regName,
                    industry: regIndustry,
                    size: parseInt(regSize),
                    contact_email: regEmail,
                    contact_phone: regPhone,
                    subscription_plan: regPlan,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setCompanies([data.data]);
                setSelectedCompany(data.data.id);
                setView('dashboard');
                setRegName('');
                setRegIndustry('');
                setRegSize('');
                setRegEmail('');
                setRegPhone('');
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch {
            setError('Registration failed');
        } finally {
            setRegistering(false);
        }
    };

    const addEmployee = async () => {
        if (!empName.trim() || !empEmail.trim()) {
            setError('Name and email are required');
            return;
        }
        setAddingEmp(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/corporate/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    company_id: selectedCompany,
                    full_name: empName,
                    email: empEmail,
                    department: empDept,
                    job_title: empTitle,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setEmpName('');
                setEmpEmail('');
                setEmpDept('');
                setEmpTitle('');
                setShowAddForm(false);
                fetchEmployees();
            } else {
                setError(data.message || 'Failed to add employee');
            }
        } catch {
            setError('Failed to add employee');
        } finally {
            setAddingEmp(false);
        }
    };

    const getEngagementColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getEngagementBg = (score: number) => {
        if (score >= 80) return 'bg-green-500/20';
        if (score >= 50) return 'bg-yellow-500/20';
        return 'bg-red-500/20';
    };

    // ─── Registration View ──────────────────────────────────────

    if (view === 'register' && companies.length === 0) {
        return (
            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">corporate_fare</span>
                        Corporate Wellness
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Register your company to start a wellness program</p>
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

                <ApiCard>
                    <h2 className="text-lg font-bold text-white mb-4">Company Registration</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Company Name</label>
                            <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" placeholder="Acme Corp" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Industry</label>
                                <input type="text" value={regIndustry} onChange={e => setRegIndustry(e.target.value)}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" placeholder="Technology" />
                            </div>
                            <div>
                                <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Size (employees)</label>
                                <input type="number" value={regSize} onChange={e => setRegSize(e.target.value)} min={1}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" placeholder="50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Contact Email</label>
                                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" placeholder="hr@company.com" />
                            </div>
                            <div>
                                <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Phone (optional)</label>
                                <input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" placeholder="+20 1xx xxx xxxx" />
                            </div>
                        </div>
                        <div>
                            <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-2 block">Plan</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[{ v: 'basic', l: 'Basic', p: '500 EGP' }, { v: 'standard', l: 'Standard', p: '1,500 EGP' }, { v: 'premium', l: 'Premium', p: '5,000 EGP' }].map(plan => (
                                    <button key={plan.v} onClick={() => setRegPlan(plan.v)}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            regPlan === plan.v ? 'border-[#ff7b00] bg-[#ff7b00]/10' : 'border-white/10 bg-white/5'
                                        }`}>
                                        <p className={`text-sm font-bold ${regPlan === plan.v ? 'text-[#ff7b00]' : 'text-white'}`}>{plan.l}</p>
                                        <p className="text-white/30 text-xs">{plan.p}/mo</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ApiButton loading={registering} onClick={registerCompany} fullWidth>
                            Register Company
                        </ApiButton>
                    </div>
                </ApiCard>
            </div>
        );
    }

    // ─── Dashboard / Employees View ─────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff7b00]">corporate_fare</span>
                        Corporate Wellness
                    </h1>
                    <p className="text-white/50 text-sm mt-1">{companies.find(c => c.id === selectedCompany)?.name}</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedCompany}
                        onChange={e => setSelectedCompany(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff7b00]"
                    >
                        {companies.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#1a1a1a]">{c.name}</option>
                        ))}
                    </select>
                    <ApiButton variant="ghost" onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'border-[#ff7b00]/50' : ''}>
                        Dashboard
                    </ApiButton>
                    <ApiButton variant="ghost" onClick={() => setView('employees')} className={view === 'employees' ? 'border-[#ff7b00]/50' : ''}>
                        Employees
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

            {/* Dashboard */}
            {view === 'dashboard' && stats && (
                <div className="space-y-4">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Employees', value: stats.totalEmployees, icon: 'group', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { label: 'Active', value: stats.activeEmployees, icon: 'check_circle', color: 'text-green-400', bg: 'bg-green-500/10' },
                            { label: 'Avg Engagement', value: `${stats.avgEngagementScore}%`, icon: 'trending_up', color: getEngagementColor(stats.avgEngagementScore), bg: getEngagementBg(stats.avgEngagementScore) },
                            { label: 'Workouts Done', value: stats.totalWorkoutsCompleted, icon: 'fitness_center', color: 'text-[#ff7b00]', bg: 'bg-[#ff7b00]/10' },
                        ].map(kpi => (
                            <div key={kpi.label} className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
                                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>
                                    <span className={`material-symbols-outlined ${kpi.color} text-sm`}>{kpi.icon}</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                                <p className="text-white/40 text-xs">{kpi.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Cost Card */}
                    <ApiCard>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#ff7b00]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#ff7b00]">payments</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold">Monthly Subscription</p>
                                    <p className="text-white/40 text-xs capitalize">{companies.find(c => c.id === selectedCompany)?.subscriptionPlan} Plan</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-[#ff7b00]">{stats.monthlyCost.toLocaleString()} EGP</p>
                        </div>
                    </ApiCard>

                    {/* Departments */}
                    <ApiCard loading={loading}>
                        <h3 className="text-lg font-bold text-white mb-4">Department Breakdown</h3>
                        {stats.departments.length === 0 ? (
                            <EmptyState icon="domain" title="No department data" />
                        ) : (
                            <div className="space-y-3">
                                {stats.departments.map(dept => (
                                    <div key={dept.name} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-white font-bold text-sm">{dept.name}</span>
                                                <span className="text-white/40 text-xs">{dept.count} employees</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.max(5, dept.avgEngagement)}%`,
                                                        backgroundColor: dept.avgEngagement >= 80 ? '#4ade80' : dept.avgEngagement >= 50 ? '#facc15' : '#f87171',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${getEngagementColor(dept.avgEngagement)}`}>
                                            {dept.avgEngagement}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ApiCard>

                    {/* Engagement Trend Chart */}
                    <ApiCard>
                        <h3 className="text-lg font-bold text-white mb-4">Engagement Trend (6 Months)</h3>
                        <div className="flex items-end gap-2 h-40">
                            {stats.engagementTrend.map((t, i) => {
                                const height = Math.max(10, t.score);
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-white/40">{t.score}</span>
                                        <div
                                            className="w-full rounded-t-lg transition-all"
                                            style={{
                                                height: `${height}%`,
                                                backgroundColor: t.score >= 80 ? '#4ade80' : t.score >= 50 ? '#facc15' : '#f87171',
                                                opacity: 0.7,
                                            }}
                                        />
                                        <span className="text-[10px] text-white/30 whitespace-nowrap">{t.month}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </ApiCard>
                </div>
            )}

            {/* Employees View */}
            {view === 'employees' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Employees ({employees.length})</h3>
                        <ApiButton onClick={() => setShowAddForm(!showAddForm)} icon={<span className="material-symbols-outlined">person_add</span>}>
                            Add Employee
                        </ApiButton>
                    </div>

                    {showAddForm && (
                        <ApiCard>
                            <h4 className="text-white font-bold mb-3">Add Employee</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" value={empName} onChange={e => setEmpName(e.target.value)}
                                    placeholder="Full name"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" />
                                <input type="email" value={empEmail} onChange={e => setEmpEmail(e.target.value)}
                                    placeholder="Email"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" />
                                <input type="text" value={empDept} onChange={e => setEmpDept(e.target.value)}
                                    placeholder="Department"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" />
                                <input type="text" value={empTitle} onChange={e => setEmpTitle(e.target.value)}
                                    placeholder="Job title"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ff7b00]" />
                            </div>
                            <div className="flex gap-2 mt-3">
                                <ApiButton loading={addingEmp} onClick={addEmployee}>Add</ApiButton>
                                <ApiButton variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</ApiButton>
                            </div>
                        </ApiCard>
                    )}

                    <div className="grid gap-3">
                        {employees.map(emp => (
                            <div key={emp.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff7b00]/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-sm">
                                        {emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{emp.fullName}</p>
                                    <p className="text-white/40 text-xs">{emp.email}</p>
                                    <div className="flex gap-2 mt-1">
                                        {emp.department && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">{emp.department}</span>}
                                        {emp.jobTitle && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">{emp.jobTitle}</span>}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className={`text-sm font-bold ${getEngagementColor(emp.engagementScore)}`}>
                                        {emp.engagementScore}%
                                    </div>
                                    <p className="text-white/30 text-xs">{emp.workoutsCompleted} workouts</p>
                                </div>
                            </div>
                        ))}
                        {employees.length === 0 && !loading && (
                            <EmptyState icon="group" title="No employees" subtitle="Add your first employee" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
