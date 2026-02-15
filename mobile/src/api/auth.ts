import { api } from './client';
import type { User } from '@/types';

interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/api/auth/mobile/login', { email, password }),

  register: (data: { name: string; email: string; password: string }) =>
    api.post<LoginResponse>('/api/auth/register', data),

  getSession: () =>
    api.get<{ user: User }>('/api/auth/mobile/session'),

  googleAuth: (idToken: string) =>
    api.post<LoginResponse>('/api/auth/mobile/google', { idToken }),
};
