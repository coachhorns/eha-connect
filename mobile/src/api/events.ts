import { api } from './client';
import type { Event, Game, Standing } from '@/types';

export const eventsApi = {
  list: () =>
    api.get<Event[]>('/api/events'),

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
