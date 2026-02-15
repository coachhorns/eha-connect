import { api } from './client';

export const leaderboardsApi = {
  get: async (params?: Record<string, string>) => {
    const res = await api.get<{ leaderboard: unknown[] }>('/api/leaderboards', params);
    return res.leaderboard ?? [];
  },
};
