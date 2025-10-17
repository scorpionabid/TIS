import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

vi.mock('@/components/ui/use-toast', () => {
  return {
    toast: vi.fn(),
  };
});

type MockResponseOptions = {
  status: number;
  body?: any;
  contentType?: string | null;
  url?: string;
};

const createMockResponse = ({
  status,
  body,
  contentType = 'application/json',
  url = 'http://localhost/api/test',
}: MockResponseOptions) => {
  const headers = {
    get: (name: string) => {
      if (name.toLowerCase() === 'content-type') {
        return contentType;
      }
      return null;
    },
    entries: () => [].values(),
  };

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    url,
    headers,
    json: async () => body,
    blob: async () => new Blob(),
  } as Response;
};

describe('ApiClient permission handling', () => {
  const mockedToast = toast as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockedToast.mockReset();
    apiClient.clearToken();
    (apiClient as any).lastUnauthorizedToastAt = 0;
    (apiClient as any).lastForbiddenToastAt = 0;
    (apiClient as any).csrfInitialized = false;

    (globalThis as any).document = {
      cookie: '',
    };

    (globalThis as any).window = {
      location: {
        pathname: '/dashboard',
        href: '/dashboard',
      },
    };
  });

  it('surfaces toast and clears session on 401 responses', async () => {
    apiClient.setToken('dummy-token');

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          status: 204,
          contentType: null,
          url: 'http://localhost:8000/sanctum/csrf-cookie',
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          status: 401,
          body: { message: 'Token expired' },
        })
      );

    await expect(
      (apiClient as any).performRequest('GET', '/secure-endpoint')
    ).rejects.toThrow('Token expired');

    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sessiya müddəti bitdi',
        description: 'Token expired',
        variant: 'destructive',
      })
    );

    expect(apiClient.getToken()).toBeNull();
    expect((globalThis as any).window.location.href).toBe('/login');
  });

  it('surfaces toast without clearing session on 403 responses', async () => {
    apiClient.setToken('active-token');

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          status: 204,
          contentType: null,
          url: 'http://localhost:8000/sanctum/csrf-cookie',
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          status: 403,
          body: { message: 'Permission denied' },
        })
      );

    await expect(
      (apiClient as any).performRequest('GET', '/secure-endpoint')
    ).rejects.toThrow('Permission denied');

    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'İcazə məhdudiyyəti',
        description: 'Permission denied',
        variant: 'warning',
      })
    );

    expect(apiClient.getToken()).toBe('active-token');
    expect((globalThis as any).window.location.href).toBe('/dashboard');
  });
});
