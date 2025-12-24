import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ErrorHandler } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns friendly API message and logs context', () => {
    const error = { status: 404, message: 'not found', name: 'ApiError' } as any;
    const message = ErrorHandler.handleApiError(error, { component: 'Reports', action: 'fetch' });

    expect(message).toBe('Axtarılan məlumat tapılmadı');
    expect(logger.error).toHaveBeenCalledWith(
      'API Error occurred',
      error,
      expect.objectContaining({ component: 'Reports', action: 'fetch' })
    );
  });

  it('distinguishes permission responses by status', () => {
    const unauthorized = ErrorHandler.handlePermissionError({ status: 401 } as any);
    const forbidden = ErrorHandler.handlePermissionError({ status: 403 } as any);

    expect(unauthorized).toBe('İcazəniz yoxdur. Yenidən daxil olun.');
    expect(forbidden).toBe('Bu əməliyyat üçün icazəniz yoxdur.');
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('network handler respects navigator.onLine flag', () => {
    const originalOnline = navigator.onLine;
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });

    const offlineMessage = ErrorHandler.handleNetworkError(new Error('offline'));
    expect(offlineMessage).toBe('İnternet bağlantısını yoxlayın');

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    const onlineMessage = ErrorHandler.handleNetworkError(new Error('fetch failed'));
    expect(onlineMessage).toBe('Server ilə əlaqə qurula bilmədi');

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: originalOnline });
  });

  it('form handler prioritizes validation errors before permissions', () => {
    const validationMessage = ErrorHandler.handleFormError(
      { errors: { email: ['Email yanlışdır'] } } as any,
      'user-form'
    );
    expect(validationMessage).toBe('Email yanlışdır');

    const permissionMessage = ErrorHandler.handleFormError({ status: 403 } as any, 'user-form');
    expect(permissionMessage).toBe('Bu əməliyyat üçün icazəniz yoxdur.');
  });
});
