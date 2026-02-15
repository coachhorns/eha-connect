import { api } from './client';
import type { Player, PlayerMedia } from '@/types';

export const playersApi = {
  list: (params?: Record<string, string>) =>
    api.get<Player[]>('/api/players', params),

  getBySlug: (slug: string) =>
    api.get<Player>(`/api/players/${slug}`),

  getMyPlayers: () =>
    api.get<Player[]>('/api/user/players'),

  getGuardedPlayers: () =>
    api.get<Player[]>('/api/user/guarded-players'),

  updatePlayer: (id: string, data: Partial<Player>) =>
    api.put<Player>(`/api/user/players/${id}`, data),

  getMedia: (id: string) =>
    api.get<PlayerMedia[]>(`/api/user/players/${id}/media`),

  uploadMedia: (id: string, data: FormData) =>
    api.post<PlayerMedia>(`/api/user/players/${id}/media`, data),

  claimPlayer: (data: { playerId: string }) =>
    api.post<{ success: boolean }>('/api/claim-player', data),
};
