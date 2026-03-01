import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setToken, clearToken } from '@/lib/storage';
import { api } from '@/api/client';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          await api.setToken(token);
          const { user } = await authApi.getSession();
          setState({ user, isLoading: false, isAuthenticated: true });
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        await clearToken();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user, token: t } = await authApi.login(email, password);
    await setToken(t);
    await api.setToken(t);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const { user, token: t } = await authApi.googleAuth(idToken);
    await setToken(t);
    await api.setToken(t);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user, token: t } = await authApi.register({ name, email, password });
    await setToken(t);
    await api.setToken(t);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    await api.clearToken();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signInWithGoogle, register, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
