import { api } from './client';
import type { Player, PlayerMedia } from '@/types';

export const playersApi = {
  list: async (params?: Record<string, string>): Promise<Player[]> => {
    const res = await api.get<{ players: Player[] }>('/api/players', params);
    return res.players ?? [];
  },

  getBySlug: async (slug: string): Promise<Player> => {
    const res = await api.get<{ player: Player } | Player>(`/api/players/${slug}`);
    return 'player' in res ? res.player : res;
  },

  getMyPlayers: async (): Promise<Player[]> => {
    const res = await api.get<{ players: Player[] }>('/api/user/players');
    return res.players ?? [];
  },

  getGuardedPlayers: async (): Promise<Player[]> => {
    const res = await api.get<{ players: Player[] }>('/api/user/guarded-players');
    return res.players ?? [];
  },

  updatePlayer: (id: string, data: Partial<Player>) =>
    api.put<Player>(`/api/user/players/${id}`, data),

  getMedia: (id: string) =>
    api.get<PlayerMedia[]>(`/api/user/players/${id}/media`),

  uploadMedia: (id: string, data: FormData) =>
    api.post<PlayerMedia>(`/api/user/players/${id}/media`, data),

  claimPlayer: (data: { playerId: string }) =>
    api.post<{ success: boolean }>('/api/claim-player', data),
};
