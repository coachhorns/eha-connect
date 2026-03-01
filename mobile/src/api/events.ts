import { api } from './client';
import type { Event, Game, EventStandingEntry, ResultGame, GameDetail } from '@/types';

export const eventsApi = {
  list: async (): Promise<Event[]> => {
    const res = await api.get<{ events: Event[] }>('/api/events', { limit: '50' });
    return res.events;
  },

  getById: async (id: string): Promise<Event> => {
    const res = await api.get<{ event: Event }>(`/api/public/events/${id}`);
    return res.event;
  },

  getGames: (eventId: string) =>
    api.get<Game[]>(`/api/public/games/${eventId}`),

  getStandings: async (eventId: string): Promise<Record<string, EventStandingEntry[]>> => {
    const res = await api.get<{ standings: Record<string, EventStandingEntry[]> }>('/api/public/standings', { eventId });
    return res.standings;
  },

  getResults: (eventId: string) =>
    api.get<Game[]>('/api/public/results', { eventId }),

  getTeams: (eventId: string) =>
    api.get<{ teams: unknown[] }>(`/api/events/${eventId}/teams`),

  getRecentResults: async (limit = 10): Promise<{ games: ResultGame[]; total: number }> =>
    api.get<{ games: ResultGame[]; total: number }>('/api/public/results', { limit: String(limit) }),

  getGameDetail: async (gameId: string): Promise<GameDetail> => {
    const res = await api.get<{ game: GameDetail }>(`/api/public/games/${gameId}`);
    return res.game;
  },
};
