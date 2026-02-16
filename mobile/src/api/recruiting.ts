import { api } from './client';
import type { College, CollegeFilters, RecruitingEmailLog } from '@/types';

export const recruitingApi = {
  // Get filter options (divisions, states)
  getFilters: () =>
    api.get<CollegeFilters>('/api/colleges'),

  // Search colleges by name
  searchColleges: (search: string) =>
    api.get<{ colleges: College[] }>('/api/colleges', { search }),

  // Filter colleges by division/state/conference
  filterColleges: (params: { division?: string; state?: string; conference?: string }) => {
    const query: Record<string, string> = {};
    if (params.division) query.division = params.division;
    if (params.state) query.state = params.state;
    if (params.conference) query.conference = params.conference;
    return api.get<{ colleges: College[] }>('/api/colleges', query);
  },

  // Get a single college with its coaches
  getCollegeWithCoaches: (schoolId: string) =>
    api.get<{ college: College }>('/api/colleges', { schoolId }),

  // Send recruiting email
  sendEmail: (data: {
    coachEmail: string;
    coachName: string;
    coachId?: string;
    collegeId?: string;
    collegeName: string;
    playerSlugs: string[];
    subject: string;
    message: string;
  }) => api.post<{ success: boolean; id: string }>('/api/recruiting/send-email', data),

  // Get sent email log
  getEmailLog: async (): Promise<RecruitingEmailLog[]> => {
    const res = await api.get<{ logs: RecruitingEmailLog[] }>('/api/recruiting/log');
    return res.logs ?? [];
  },
};
