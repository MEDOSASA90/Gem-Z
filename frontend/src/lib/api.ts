/**
 * GEM Z — Frontend API Client
 * Centralized REST API wrapper.
 * - Auto JWT injection via localStorage
 * - Auto token refresh on 401
 * - Typed module sub-clients for each domain
 */

const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Types ───────────────────────────────────────────────────

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

interface RequestOptions extends RequestInit {
    requireAuth?: boolean;
}

// ─── Core Fetch Wrapper ──────────────────────────────────────

async function request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { requireAuth = true, ...rest } = options;

    const isFormData =
        typeof FormData !== 'undefined' && rest.body instanceof FormData;

    const headers: Record<string, string> = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(rest.headers as Record<string, string>),
    };

    if (requireAuth) {
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('gemz_access_token')
                : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...rest,
        headers,
        credentials: 'include', // send cookies (refresh token)
    };

    let response = await fetch(`${BASE_URL}${endpoint}`, config);

    // ── Auto refresh on 401 ──
    if (response.status === 401 && requireAuth) {
        try {
            const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });

            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                const newToken = refreshData?.data?.accessToken;
                if (newToken) {
                    localStorage.setItem('gemz_access_token', newToken);
                    headers['Authorization'] = `Bearer ${newToken}`;
                    response = await fetch(`${BASE_URL}${endpoint}`, {
                        ...config,
                        headers,
                    });
                }
            } else {
                // Refresh failed — clear session, redirect to login
                localStorage.removeItem('gemz_access_token');
                localStorage.removeItem('gemz_user');
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                throw new Error('Session expired. Please log in again.');
            }
        } catch {
            localStorage.removeItem('gemz_access_token');
            localStorage.removeItem('gemz_user');
            throw new Error('Session expired. Please log in again.');
        }
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.message || `API Error ${response.status}`);
    }

    return data as T;
}

// ─── Module Sub-Clients ──────────────────────────────────────

/** Authentication */
const Auth = {
    login: (credentials: { email: string; password: string }) =>
        request<ApiResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
            requireAuth: false,
        }),

    register: (userData: Record<string, any>) =>
        request<ApiResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            requireAuth: false,
        }),

    refresh: () =>
        request<ApiResponse>('/auth/refresh', {
            method: 'POST',
            requireAuth: false,
        }),

    logout: () =>
        request<ApiResponse>('/auth/logout', { method: 'POST' }),

    me: () => request<ApiResponse>('/auth/me'),

    forgotPassword: (email: string) =>
        request<ApiResponse>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
            requireAuth: false,
        }),

    resetPassword: (token: string, newPassword: string) =>
        request<ApiResponse>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
            requireAuth: false,
        }),

    verifyEmail: (token: string) =>
        request<ApiResponse>(`/auth/verify-email?token=${token}`, {
            requireAuth: false,
        }),

    resendVerification: () =>
        request<ApiResponse>('/auth/resend-verification', { method: 'POST' }),
};

/** Trainee */
const Trainee = {
    getDashboard: () => request<ApiResponse>('/trainee/dashboard'),
    getPasses: () => request<ApiResponse>('/trainee/passes'),
    getTraineePasses: () => request<ApiResponse>('/trainee/passes'),  // alias
};

/** Gym */
const Gym = {
    getStats: () => request<ApiResponse>('/gym/stats'),
    getDashboard: () => request<ApiResponse>('/gym/stats'),    // alias
    buyPass: (gymId: string, price: number) =>
        request<ApiResponse>('/gym/passes/buy', {
            method: 'POST',
            body: JSON.stringify({ gymId, price }),
        }),
    scanPass: (qrCode: string) =>
        request<ApiResponse>('/gym/passes/scan', {
            method: 'POST',
            body: JSON.stringify({ qrCode }),
        }),
    getCrowd: () => request<ApiResponse>('/gym/crowd'),
    setOffPeak: (isActive: boolean, discountPercentage: number) =>
        request<ApiResponse>('/gym/off-peak', {
            method: 'POST',
            body: JSON.stringify({ isActive, discountPercentage }),
        }),
};

/** Finance / Wallet */
const Finance = {
    getWallet: () => request<ApiResponse>('/wallet'),

    topup: (amount: number, gateway = 'instapay') =>
        request<ApiResponse>('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount, gateway }),
        }),

    withdraw: (amount: number, bankDetails: Record<string, string>) =>
        request<ApiResponse>('/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify({
                amount,
                method: bankDetails.method || 'bank_transfer',
                accountNumber: bankDetails.accountNumber || bankDetails.account_number,
                accountName: bankDetails.accountName || bankDetails.account_name,
                bankName: bankDetails.bankName || bankDetails.bank_name,
            }),
        }),

    getTransactions: (limit = 20, offset = 0) =>
        request<ApiResponse>(
            `/wallet/history?limit=${limit}&offset=${offset}`
        ),

    requestPayout: (amount: number, bankDetails: Record<string, string>) =>
        request<ApiResponse>('/finance/payout', {
            method: 'POST',
            body: JSON.stringify({ amount, bankDetails }),
        }),
};

/** Coins */
const Coins = {
    earn: (amount: number, reason: string) =>
        request<ApiResponse>('/coins/earn', {
            method: 'POST',
            body: JSON.stringify({ amount, reason }),
        }),
    redeem: (rewardId: string) =>
        request<ApiResponse>('/coins/redeem', {
            method: 'POST',
            body: JSON.stringify({ rewardId }),
        }),
    stake: (amount: number, goalId: string) =>
        request<ApiResponse>('/coins/stake', {
            method: 'POST',
            body: JSON.stringify({ amount, goalId }),
        }),
};

/** Chat */
const Chat = {
    getContacts: () => request<ApiResponse>('/chat/contacts'),
    getHistory: (contactId: string) =>
        request<ApiResponse>(`/chat/history/${contactId}`),
};

/** Store / Shop */
const Store = {
    getProducts: (category?: string) =>
        request<ApiResponse>(
            category ? `/store/products?category=${category}` : '/store/products'
        ),
    checkout: (items: Array<{ productId: string; quantity: number }>) =>
        request<ApiResponse>('/store/checkout', {
            method: 'POST',
            body: JSON.stringify({ items }),
        }),
};

/** Social Feed */
const Social = {
    getFeed: () => request<ApiResponse>('/social/feed'),
    createPost: (content: string, mediaUrl?: string) =>
        request<ApiResponse>('/social/posts', {
            method: 'POST',
            body: JSON.stringify({ content, mediaUrl }),
        }),
};

/** Recipes */
const Recipes = {
    list: (categoryId?: string) =>
        request<ApiResponse>(
            categoryId ? `/recipes?category_id=${categoryId}` : '/recipes'
        ),
    toggleSave: (id: string) =>
        request<ApiResponse>(`/recipes/${id}/toggle-save`, { method: 'POST' }),
};

/** Challenges */
const Challenges = {
    list: () => request<ApiResponse>('/challenges'),
    join: (id: string, gymId?: string) =>
        request<ApiResponse>(`/challenges/${id}/join`, {
            method: 'POST',
            body: JSON.stringify({ gymId }),
        }),
};

/** AI */
const AI = {
    generatePlan: (data: Record<string, any>) =>
        request<ApiResponse>('/ai/generate', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getSavedPlans: () => request<ApiResponse>('/ai/plans'),
    analyzeForm: (videoBase64: string) =>
        request<ApiResponse>('/ai/analyze-form', {
            method: 'POST',
            body: JSON.stringify({ videoBase64 }),
        }),
};

/** Trainer */
const Trainer = {
    getStats: () => request<ApiResponse>('/trainer/stats'),
    assignPlan: (traineeId: string, planId: string, planType: string) =>
        request<ApiResponse>('/trainer/assign', {
            method: 'POST',
            body: JSON.stringify({ traineeId, planId, planType }),
        }),
    getChurnPrediction: () => request<ApiResponse>('/trainer/churn-prediction'),
};

/** Upload */
const Upload = {
    image: async (file: File): Promise<{ url: string }> => {
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('gemz_access_token')
                : null;
        const fd = new FormData();
        fd.append('image', file);
        const response = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: fd,
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    },

    document: async (file: File): Promise<{ url: string }> => {
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('gemz_access_token')
                : null;
        const fd = new FormData();
        fd.append('document', file);
        const response = await fetch(`${BASE_URL}/upload/document`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: fd,
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Document upload failed');
        return response.json();
    },
};


/** Squads */
const Squads = {
    list: () => request<ApiResponse>('/squads'),
    create: (data: { name: string; description: string; privacy: string }) =>
        request<ApiResponse>('/squads', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    join: (id: string) =>
        request<ApiResponse>(`/squads/${id}/join`, { method: 'POST' }),
};

// ─── Exports ─────────────────────────────────────────────────

export const GemZApi = {
    request,
    Auth,
    Trainee,
    Gym,
    Finance,
    Coins,
    Chat,
    Store,
    Social,
    Recipes,
    Challenges,
    AI,
    Trainer,
    Upload,
    Squads,
};
