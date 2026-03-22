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
            let response = await fetch(`${BASE_URL}${endpoint}`, config);
            let data = await response.json();

            // Intercept 401 Unauthorized (Token may be expired)
            if (response.status === 401 && requireAuth) {
                try {
                    // Attempt to refresh token
                    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'omit' // cookies might not be supported if domains differ, but let's assume it works or handle via standard mode
                    });

                    if (refreshRes.ok) {
                        const refreshData = await refreshRes.json();
                        if (refreshData.accessToken) {
                            localStorage.setItem('gemz_access_token', refreshData.accessToken);
                            
                            // Retry original request
                            const retryConfig = {
                                ...config,
                                headers: {
                                    ...config.headers,
                                    'Authorization': `Bearer ${refreshData.accessToken}`
                                }
                            };
                            response = await fetch(`${BASE_URL}${endpoint}`, retryConfig);
                            data = await response.json();
                        }
                    } else {
                        // Refresh failed, clear token
                        localStorage.removeItem('gemz_access_token');
                        if (typeof window !== 'undefined') window.location.href = '/login';
                    }
                } catch (refreshErr) {
                    localStorage.removeItem('gemz_access_token');
                }
            }

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
        refresh: () => GemZApi.request('/auth/refresh', { method: 'POST', requireAuth: false }),
    },

    Trainee: {
        getDashboard: () => GemZApi.request('/trainee/dashboard'),
    },

    Gym: {
        getDashboard: () => GemZApi.request('/gym/stats'),
        setOffPeak: (isActive: boolean, discountPercentage?: number) => 
            GemZApi.request('/gym/offpeak', { method: 'POST', body: JSON.stringify({ isActive, discountPercentage }) }),
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
