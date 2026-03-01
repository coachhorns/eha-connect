import { api } from './client';
import type { User } from '@/types';

export const userApi = {
  updateProfile: (data: { name?: string; email?: string }) =>
    api.put<{ user: User }>('/api/user/profile', data),
};
