import { Buffer } from 'node:buffer';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cacheService = {
    remember: vi.fn(),
    clearByTags: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  };

  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const apiResponseHandlers = {
    handleArrayResponse: vi.fn((response: any) => response.data),
    handleApiResponseWithError: vi.fn((response: any) => response.data),
    handleApiResponse: vi.fn((response: any) => response.data),
  };

  return {
    cacheService,
    apiClient,
    apiResponseHandlers,
  };
});

vi.mock('@/services/CacheService', () => ({
  cacheService: mocks.cacheService,
}));

vi.mock('@/services/api', () => ({
  apiClient: mocks.apiClient,
  ApiResponse: class {},
  PaginatedResponse: class {},
}));

vi.mock('@/utils/apiResponseHandler', () => ({
  handleArrayResponse: mocks.apiResponseHandlers.handleArrayResponse,
  handleApiResponse: mocks.apiResponseHandlers.handleApiResponse,
  handleApiResponseWithError: mocks.apiResponseHandlers.handleApiResponseWithError,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { BaseService, type BaseEntity } from '@/services/BaseService';

interface TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseService<TestEntity> {
  constructor() {
    super('/tests', ['custom-tag']);
  }

  adjustErrorMessage(error: Error) {
    this.enhancePermissionError(error);
    return error.message;
  }
}

if (!globalThis.btoa) {
  globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();

    mocks.cacheService.remember.mockReset();
    mocks.cacheService.remember.mockImplementation(async (_key, fetcher: () => Promise<any>) => fetcher());
    mocks.cacheService.clearByTags.mockReset();
    mocks.cacheService.delete.mockReset();
    mocks.cacheService.getStats.mockReset();

    mocks.apiClient.get.mockReset();
    mocks.apiClient.post.mockReset();
    mocks.apiClient.put.mockReset();
    mocks.apiClient.delete.mockReset();
  });

  it('uses cacheService.remember for getAll and returns paginated payloads', async () => {
    const paginatedPayload = {
      data: [{ id: 1, created_at: 'a', updated_at: 'b', name: 'Item' }],
      pagination: { current_page: 2, per_page: 10, total: 20, total_pages: 2 },
    };
    mocks.apiClient.get.mockResolvedValue({ data: paginatedPayload });

    const result = await service.getAll({ page: 2 });

    expect(mocks.cacheService.remember).toHaveBeenCalledWith(
      expect.stringContaining('/tests_getAll'),
      expect.any(Function),
      expect.any(Number),
      expect.arrayContaining(['/tests', 'custom-tag', 'list'])
    );
    expect(mocks.apiClient.get).toHaveBeenCalledWith('/tests', { page: 2 });
    expect(result).toEqual(paginatedPayload);
  });

  it('bypasses cache when useCache=false and returns fallback pagination', async () => {
    const items = [{ id: 2, created_at: 'x', updated_at: 'y', name: 'Fallback' }];
    mocks.apiClient.get.mockResolvedValue({ data: items });

    const result = await service.getAll(undefined, false);

    expect(mocks.cacheService.remember).not.toHaveBeenCalled();
    expect(mocks.apiClient.get).toHaveBeenCalledWith('/tests', undefined);
    expect(result).toEqual({
      data: items,
      pagination: {
        current_page: 1,
        per_page: items.length,
        total: items.length,
        total_pages: 1,
      },
    });
  });

  it('getById caches responses with detail tag', async () => {
    const entity = { id: 5, created_at: 'now', updated_at: 'now', name: 'Detail' };
    mocks.apiClient.get.mockResolvedValue({ data: entity });

    const result = await service.getById(5);

    expect(mocks.cacheService.remember).toHaveBeenCalledWith(
      expect.stringContaining('/tests_getById_5'),
      expect.any(Function),
      expect.any(Number),
      expect.arrayContaining(['/tests', 'custom-tag', 'detail'])
    );
    expect(mocks.apiClient.get).toHaveBeenCalledWith('/tests/5');
    expect(result).toEqual(entity);
  });

  it('create invalidates list cache after successful response', async () => {
    mocks.apiClient.post.mockResolvedValue({ data: { id: 7 } });

    const result = await service.create({ name: 'New' } as TestEntity);

    expect(mocks.apiClient.post).toHaveBeenCalledWith('/tests', { name: 'New' });
    expect(result).toEqual({ id: 7 });
    expect(mocks.cacheService.clearByTags).toHaveBeenCalledWith(
      expect.arrayContaining(['/tests', 'custom-tag', 'list'])
    );
  });

  it('update invalidates list/detail caches and removes cached entity', async () => {
    mocks.apiClient.put.mockResolvedValue({ data: { id: 9, name: 'Updated' } });

    await service.update(9, { name: 'Updated' });

    expect(mocks.apiClient.put).toHaveBeenCalledWith('/tests/9', { name: 'Updated' });
    expect(mocks.cacheService.clearByTags).toHaveBeenCalledWith(
      expect.arrayContaining(['/tests', 'custom-tag', 'list', 'detail'])
    );
    expect(mocks.cacheService.delete).toHaveBeenCalledWith(expect.stringContaining('getById_9'));
  });

  it('adjusts permission error messages for 401 və 403', () => {
    const unauthorized = new Error('HTTP error! status: 401');
    const forbidden = new Error('HTTP error! status: 403');

    expect(service.adjustErrorMessage(unauthorized)).toBe(
      'Sessiya müddəti bitdi. Zəhmət olmasa yenidən daxil olun.'
    );
    expect(service.adjustErrorMessage(forbidden)).toBe('Bu əməliyyat üçün icazəniz yoxdur.');
  });

  it('exposes cache stats və clearServiceCache helperini çağırır', () => {
    const stats = { totalEntries: 1 };
    mocks.cacheService.getStats.mockReturnValue(stats);

    const info = service.getCacheStats();
    expect(info).toEqual({ stats, tags: ['/tests', 'custom-tag'] });

    service.clearServiceCache();
    expect(mocks.cacheService.clearByTags).toHaveBeenCalledWith(['/tests', 'custom-tag']);
  });
});
