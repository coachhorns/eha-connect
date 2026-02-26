import { api } from './client';
import type { Player, PlayerMedia } from '@/types';

export const playersApi = {
  list: async (params?: Record<string, string>): Promise<Player[]> => {
    const res = await api.get<{ players: Player[] }>('/api/players', params);
    return res.players ?? [];
  },

  getBySlug: async (slug: string): Promise<Player> => {
    const res = await api.get<{ player: Player; careerStats?: any } | Player>(`/api/players/${slug}`);

    // Handle the wrapper format { player, careerStats }
    if ('player' in res) {
      return {
        ...res.player,
        careerStats: res.careerStats
      };
    }

    // Handle legacy/direct format
    return res;
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

  getMedia: async (id: string): Promise<PlayerMedia[]> => {
    const res = await api.get<{ media: PlayerMedia[] }>(`/api/user/players/${id}/media`);
    return res.media ?? [];
  },

  createMedia: (id: string, data: { url: string; type: string; title?: string; thumbnail?: string }) =>
    api.post<{ media: PlayerMedia }>(`/api/user/players/${id}/media`, data),

  deleteMedia: (playerId: string, mediaId: string) =>
    api.delete<{ success: boolean }>(`/api/user/players/${playerId}/media?mediaId=${mediaId}`),

  uploadFile: (formData: FormData) =>
    api.uploadFile<{ url: string }>('/api/upload', formData),

  getUpcomingGames: async (id: string) => {
    const res = await api.get<{ games: any[] }>(`/api/user/players/${id}/upcoming-games`);
    return res.games ?? [];
  },

  claimPlayer: (data: { playerId: string }) =>
    api.post<{ success: boolean }>('/api/claim-player', data),
};
