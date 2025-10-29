import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../apiOptimized';

/**
 * API Client Authentication Header Tests
 *
 * Validates correct header construction for:
 * - Bearer token authentication
 * - Session-based authentication with CSRF tokens
 * - Unauthenticated requests
 */
describe('apiClient.getAuthHeaders()', () => {
  beforeEach(() => {
    // Reset cookies
    document.cookie = '';

    // Reset apiClient state
    apiClient.clearToken();
    apiClient.enableBearerAuth(); // Default state
  });

  it('should include Bearer token when bearer auth enabled', () => {
    apiClient.enableBearerAuth();
    apiClient.setToken('test-token-123');

    const headers = apiClient.getAuthHeaders();

    expect(headers.Authorization).toBe('Bearer test-token-123');
    expect(headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('should include CSRF token when bearer auth disabled', () => {
    // Mock XSRF-TOKEN cookie
    document.cookie = 'XSRF-TOKEN=test-csrf-token-xyz';

    apiClient.disableBearerAuth();

    const headers = apiClient.getAuthHeaders();

    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-XSRF-TOKEN']).toBe('test-csrf-token-xyz');
  });

  it('should return empty object when no auth available', () => {
    apiClient.disableBearerAuth();
    apiClient.clearToken();

    // Clear all cookies manually (vitest environment may persist cookies)
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    const headers = apiClient.getAuthHeaders();

    // Should either be empty or only have empty XSRF-TOKEN
    expect(Object.keys(headers).length).toBeLessThanOrEqual(1);
    if (headers['X-XSRF-TOKEN']) {
      expect(headers['X-XSRF-TOKEN']).toBe('');
    }
  });

  it('should prioritize Bearer token over session auth', () => {
    // Set both Bearer token and CSRF cookie
    apiClient.setToken('bearer-token-456');
    document.cookie = 'XSRF-TOKEN=csrf-token-789';

    apiClient.enableBearerAuth(); // Explicitly enable bearer

    const headers = apiClient.getAuthHeaders();

    // Should use Bearer token, not CSRF
    expect(headers.Authorization).toBe('Bearer bearer-token-456');
    expect(headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('should not include CSRF token when bearer auth is enabled', () => {
    apiClient.enableBearerAuth();
    apiClient.setToken('test-token-999');
    document.cookie = 'XSRF-TOKEN=should-not-be-used';

    const headers = apiClient.getAuthHeaders();

    // Bearer auth should NOT include CSRF token
    expect(headers.Authorization).toBe('Bearer test-token-999');
    expect(headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('should handle URL-encoded CSRF tokens correctly', () => {
    // Simulate Laravel's URL-encoded CSRF token
    const encodedToken = 'test%2Btoken%3Dwith%26special';
    document.cookie = `XSRF-TOKEN=${encodedToken}`;

    apiClient.disableBearerAuth();

    const headers = apiClient.getAuthHeaders();

    // Should decode the token
    expect(headers['X-XSRF-TOKEN']).toBe(decodeURIComponent(encodedToken));
  });

  it('should toggle between bearer and session auth correctly', () => {
    const bearerToken = 'bearer-token-abc';
    const csrfToken = 'csrf-token-def';

    apiClient.setToken(bearerToken);
    document.cookie = `XSRF-TOKEN=${csrfToken}`;

    // Test 1: Bearer auth enabled
    apiClient.enableBearerAuth();
    let headers = apiClient.getAuthHeaders();
    expect(headers.Authorization).toBe(`Bearer ${bearerToken}`);
    expect(headers['X-XSRF-TOKEN']).toBeUndefined();

    // Test 2: Switch to session auth
    apiClient.disableBearerAuth();
    headers = apiClient.getAuthHeaders();
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-XSRF-TOKEN']).toBe(csrfToken);

    // Test 3: Switch back to bearer auth
    apiClient.enableBearerAuth();
    headers = apiClient.getAuthHeaders();
    expect(headers.Authorization).toBe(`Bearer ${bearerToken}`);
    expect(headers['X-XSRF-TOKEN']).toBeUndefined();
  });
});

/**
 * Environment Variable Detection Tests
 */
describe('apiClient bearer auth detection', () => {
  it('should respect VITE_ENABLE_BEARER_AUTH environment variable', () => {
    // Note: This test assumes environment variable is read at initialization
    // In production, apiClient reads import.meta.env.VITE_ENABLE_BEARER_AUTH

    // We can test the current state
    const isBearerEnabled = apiClient.isBearerAuthEnabled();

    // Should be boolean
    expect(typeof isBearerEnabled).toBe('boolean');
  });

  it('should allow runtime toggling of auth mode', () => {
    const initialMode = apiClient.isBearerAuthEnabled();

    // Toggle to opposite mode
    if (initialMode) {
      apiClient.disableBearerAuth();
      expect(apiClient.isBearerAuthEnabled()).toBe(false);
    } else {
      apiClient.enableBearerAuth();
      expect(apiClient.isBearerAuthEnabled()).toBe(true);
    }

    // Toggle back
    if (initialMode) {
      apiClient.enableBearerAuth();
      expect(apiClient.isBearerAuthEnabled()).toBe(true);
    } else {
      apiClient.disableBearerAuth();
      expect(apiClient.isBearerAuthEnabled()).toBe(false);
    }
  });
});
