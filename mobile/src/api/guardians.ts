import { api } from './client';

export interface GuardianInvite {
  id: string;
  email: string;
  expiresAt: string;
  type: 'PARENT' | 'PLAYER';
  emailSent?: boolean;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
  };
}

export const guardiansApi = {
  getPendingInvites: async (): Promise<GuardianInvite[]> => {
    const res = await api.get<{ invites: GuardianInvite[] }>('/api/guardians/invite');
    return res.invites ?? [];
  },

  sendInvite: (data: { playerId: string; email: string; type?: 'PARENT' | 'PLAYER' }) =>
    api.post<{ success: boolean; invite: GuardianInvite; message: string }>('/api/guardians/invite', data),

  cancelInvite: (inviteId: string) =>
    api.delete<{ success: boolean }>(`/api/guardians/invite?id=${inviteId}`),

  unlinkGuardian: (playerId: string) =>
    api.delete<{ success: boolean; wasLastGuardian: boolean; message: string }>(
      `/api/guardians/unlink?playerId=${playerId}`
    ),
};
