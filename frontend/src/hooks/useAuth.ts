'use client';

import { useState, useEffect, useCallback } from 'react';
import { GemZApi } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
    role: 'trainee' | 'trainer' | 'gym_admin' | 'store_admin' | 'super_admin';
    full_name: string;
    referral_code: string;
    avatar_url: string | null;
}

export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * GEM Z — useAuth Hook
 *
 * Reads user from localStorage (set during login/register).
 * Provides login, logout, and current user data.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
    });

    // Initialize from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('gemz_access_token');
        const storedUser = localStorage.getItem('gemz_user');

        if (token && storedUser) {
            try {
                const user: AuthUser = JSON.parse(storedUser);
                setAuthState({
                    user,
                    token,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } catch {
                clearAuth();
            }
        } else {
            setAuthState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const clearAuth = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('gemz_access_token');
            localStorage.removeItem('gemz_user');
        }
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
    }, []);

    /**
     * Login — calls backend, stores token + user, returns user
     */
    const login = useCallback(
        async (email: string, password: string): Promise<AuthUser> => {
            const res: any = await GemZApi.Auth.login({ email, password });
            const { accessToken, user } = res?.data || res;

            if (!accessToken || !user) throw new Error('Invalid login response');

            localStorage.setItem('gemz_access_token', accessToken);
            localStorage.setItem('gemz_user', JSON.stringify(user));

            setAuthState({
                user,
                token: accessToken,
                isAuthenticated: true,
                isLoading: false,
            });

            return user;
        },
        []
    );

    /**
     * Logout — calls backend to blacklist token, clears local state
     */
    const logout = useCallback(async () => {
        try {
            await GemZApi.Auth.logout();
        } catch {
            // Fail silently — still clear local state
        } finally {
            clearAuth();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    }, [clearAuth]);

    /**
     * Refresh user data from backend /auth/me
     */
    const refreshUser = useCallback(async () => {
        try {
            const res: any = await GemZApi.Auth.me();
            const user = res?.data?.user || res?.user;
            if (user) {
                localStorage.setItem('gemz_user', JSON.stringify(user));
                setAuthState(prev => ({ ...prev, user }));
            }
        } catch {
            // Token invalid — logout
            clearAuth();
        }
    }, [clearAuth]);

    return {
        ...authState,
        login,
        logout,
        refreshUser,
        clearAuth,
    };
}
