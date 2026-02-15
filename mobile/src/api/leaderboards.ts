import { api } from './client';
import type { LeaderboardEntry } from '@/types';

export const leaderboardsApi = {
  get: (params?: Record<string, string>) =>
    api.get<LeaderboardEntry[]>('/api/leaderboards', params),
};
