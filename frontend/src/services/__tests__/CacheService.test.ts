import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import cacheService from '@/services/CacheService';

describe('cacheService core', () => {
  beforeEach(() => {
    cacheService.clear();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves entries respecting TTL and persistence', () => {
    cacheService.set('cache-key', { value: 1 }, 100, ['persistent']);
    expect(cacheService.get<{ value: number }>('cache-key')).toEqual({ value: 1 });
    expect(localStorage.getItem('cache_cache-key')).toBeTruthy();

    vi.advanceTimersByTime(150);
    expect(cacheService.get('cache-key')).toBeNull();
  });

  it('remember caches successful fetch results till expiry', async () => {
    const fetcher = vi.fn().mockResolvedValue('data-v1');

    const first = await cacheService.remember('remember-key', fetcher, 200);
    expect(first).toBe('data-v1');
    expect(fetcher).toHaveBeenCalledTimes(1);

    const second = await cacheService.remember('remember-key', fetcher, 200);
    expect(second).toBe('data-v1');
    expect(fetcher).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(250);
    fetcher.mockResolvedValue('data-v2');
    const third = await cacheService.remember('remember-key', fetcher, 200);
    expect(third).toBe('data-v2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('clearByTags removes tagged entries from memory və localStorage', () => {
    cacheService.set('tagged', 1, 1000, ['alpha']);
    cacheService.set('other', 2, 1000, ['beta']);

    cacheService.clearByTags(['alpha']);
    expect(cacheService.get('tagged')).toBeNull();
    expect(cacheService.get('other')).toBe(2);
  });
});
