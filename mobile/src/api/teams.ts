import { api } from './client';
import type { Team, RosterPlayer } from '@/types';

export const teamsApi = {
  list: () =>
    api.get<Team[]>('/api/teams'),

  getDirectorTeams: () =>
    api.get<Team[]>('/api/director/teams'),

  getTeam: (id: string) =>
    api.get<Team>(`/api/director/teams/${id}`),

  getRoster: (teamId: string) =>
    api.get<RosterPlayer[]>(`/api/director/teams/${teamId}/roster`),

  searchPlayers: (query: string) =>
    api.get<unknown[]>('/api/director/players/search', { q: query }),

  createTeam: (data: Partial<Team>) =>
    api.post<Team>('/api/director/teams', data),

  updateTeam: (id: string, data: Partial<Team>) =>
    api.put<Team>(`/api/director/teams/${id}`, data),
};
