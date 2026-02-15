import { api } from './client';
import type { College, RecruitingLog } from '@/types';

export const recruitingApi = {
  getColleges: (params?: Record<string, string>) =>
    api.get<College[]>('/api/colleges', params),

  logActivity: (data: { playerId: string; collegeId: string; type: string; notes?: string }) =>
    api.post<RecruitingLog>('/api/recruiting/log', data),

  sendEmail: (data: { playerId: string; collegeId: string; message: string }) =>
    api.post<{ success: boolean }>('/api/recruiting/send-email', data),
};
