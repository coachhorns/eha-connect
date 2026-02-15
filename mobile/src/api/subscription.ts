import { api } from './client';

interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
}

export const subscriptionApi = {
  getStatus: () =>
    api.get<Subscription>('/api/user/subscription'),

  createCheckout: (priceId: string) =>
    api.post<{ url: string }>('/api/stripe/checkout', { priceId }),
};
