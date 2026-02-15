import { api } from './client';
import type { Event, Game, Standing } from '@/types';

export const eventsApi = {
  list: async (): Promise<Event[]> => {
    const res = await api.get<{ events: Event[] }>('/api/events', { limit: '50' });
    return res.events;
  },

  getById: (id: string) =>
    api.get<Event>(`/api/public/events/${id}`),

  getGames: (eventId: string) =>
    api.get<Game[]>(`/api/public/games/${eventId}`),

  getStandings: (eventId: string) =>
    api.get<Standing[]>('/api/public/standings', { eventId }),

  getResults: (eventId: string) =>
    api.get<Game[]>('/api/public/results', { eventId }),

  getTeams: (eventId: string) =>
    api.get<{ teams: unknown[] }>(`/api/events/${eventId}/teams`),
};
