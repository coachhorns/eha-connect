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

  async uploadFile<T>(path: string, formData: FormData): Promise<T> {
    const token = await this.getToken();
    const h: Record<string, string> = {};
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type — fetch sets multipart/form-data with boundary automatically
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: h,
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text);
    }
    return res.json();
  }

  /**
   * Upload a file directly to Vercel Blob via client token.
   * Bypasses the serverless function body limit (4.5MB).
   */
  async directUpload(uri: string, mimeType: string, fileName: string, folder: string): Promise<string> {
    const token = await this.getToken();
    const authHeader: Record<string, string> = {};
    if (token) authHeader['Authorization'] = `Bearer ${token}`;

    // Step 1: Get a client upload token from the server (tiny JSON request)
    const tokenRes = await fetch(`${this.baseUrl}/api/upload/client-token`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'blob.generate-client-token',
        payload: {
          pathname: `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileName.split('.').pop()}`,
          callbackUrl: `${this.baseUrl}/api/upload/client-token`,
          clientPayload: '',
          multipart: false,
        },
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new ApiError(tokenRes.status, text);
    }
    const { clientToken } = await tokenRes.json();

    // Step 2: Upload directly to Vercel Blob (no serverless function size limit)
    const fileRes = await fetch(uri);
    const fileBlob = await fileRes.blob();

    const uploadRes = await fetch(
      `https://blob.vercel-storage.com/${folder}/${Date.now()}-${fileName}`,
      {
        method: 'PUT',
        headers: {
          'x-api-version': '7',
          authorization: `Bearer ${clientToken}`,
          'x-content-type': mimeType,
          'x-cache-control-max-age': '31536000',
        },
        body: fileBlob,
      }
    );
    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new ApiError(uploadRes.status, text);
    }
    const result = await uploadRes.json();
    return result.url;
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
