import { getToken, setToken, clearToken } from '@/lib/storage';
import ENV from '@/constants/config';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ENV.apiUrl;
  }

  async getToken(): Promise<string | null> {
    return getToken();
  }

  async setToken(token: string): Promise<void> {
    await setToken(token);
  }

  async clearToken(): Promise<void> {
    await clearToken();
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body);
    }
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text);
    }
    return res.json();
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: await this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text);
    }
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: await this.headers(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text);
    }
    return res.json();
  }
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.status = status;
  }
}

export const api = new ApiClient();
