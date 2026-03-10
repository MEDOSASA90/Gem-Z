/**
 * GEM Z - Frontend API Client
 * Centralized wrapper for calling our Backend REST APIs (e.g., /api/v1/*)
 * Handles Auth Tokens automatically.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface RequestOptions extends RequestInit {
    token?: string;
    requireAuth?: boolean;
}

export const GemZApi = {
    /**
     * Core Fetch wrapper with JWT injection
     */
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { requireAuth = true, ...customConfig } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (requireAuth) {
            // In a real Next.js app, this might come from cookies or next-auth session
            const token = localStorage.getItem('gemz_access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const config: RequestInit = {
            ...customConfig,
            headers: {
                ...headers,
                ...customConfig.headers,
            },
        };

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API Request Failed');
            }

            return data;
        } catch (error) {
            console.error(`[API] Error calling ${endpoint}:`, error);
            throw error;
        }
    },

    // --- Module Specific Endpoints ---

    Auth: {
        login: (credentials: any) => GemZApi.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials), requireAuth: false }),
        register: (userData: any) => GemZApi.request('/auth/register', { method: 'POST', body: JSON.stringify(userData), requireAuth: false }),
    },

    Trainee: {
        getDashboard: () => GemZApi.request('/trainee/dashboard'),
    },

    Coins: {
        earn: (amount: number, reason: string) => GemZApi.request('/coins/earn', { method: 'POST', body: JSON.stringify({ amount, reason }) }),
        redeem: (rewardId: string) => GemZApi.request('/coins/redeem', { method: 'POST', body: JSON.stringify({ rewardId }) }),
    },

    Store: {
        getProducts: () => GemZApi.request('/store/products'),
        checkout: (items: any[]) => GemZApi.request('/store/checkout', { method: 'POST', body: JSON.stringify({ items }) }),
    },

    Social: {
        getFeed: () => GemZApi.request('/social/feed'),
        createPost: (content: string, mediaUrl?: string) => GemZApi.request('/social/posts', { method: 'POST', body: JSON.stringify({ content, mediaUrl }) }),
    },

    Recipes: {
        list: (categoryId?: string) => GemZApi.request(categoryId ? `/recipes?category_id=${categoryId}` : '/recipes'),
        toggleSave: (id: string) => GemZApi.request(`/recipes/${id}/toggle-save`, { method: 'POST' }),
    },

    Challenges: {
        list: () => GemZApi.request('/challenges'),
        join: (id: string, gymId?: string) => GemZApi.request(`/challenges/${id}/join`, { method: 'POST', body: JSON.stringify({ gymId }) })
    }
};
