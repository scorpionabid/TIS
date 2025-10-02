import { logger } from '@/utils/logger';

// Environment check for production optimizations
const isDevelopment = process.env.NODE_ENV === 'development';

// Production-safe logging
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  if (isDevelopment) {
    const emoji = { info: '🔍', warn: '⚠️', error: '❌' }[level];
    console[level](`${emoji} ApiClient: ${message}`, data || '');
  }
};

// Environment variable validation and setup
function validateAndSetupApiUrls() {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  const fallbackUrl = 'http://localhost:8000/api';
  
  if (isDevelopment) {
    log('info', 'Environment variable validation', {
      VITE_API_BASE_URL: envApiUrl,
      isDevelopment: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      hasEnvFile: !!envApiUrl
    });
  }
  
  const apiBaseUrl = envApiUrl || fallbackUrl;
  const sanctumBaseUrl = apiBaseUrl.replace('/api', '');

  // Validate URLs are properly formed (skip validation for relative URLs)
  if (!apiBaseUrl.startsWith('/')) {
    try {
      new URL(apiBaseUrl);
      new URL(sanctumBaseUrl);
    } catch (error) {
      log('error', 'Invalid API URL configuration', { apiBaseUrl, sanctumBaseUrl });
      throw new Error('Invalid API URL configuration');
    }
  }

  log('info', 'API URLs configured', { apiBaseUrl, sanctumBaseUrl, source: envApiUrl ? 'env' : 'fallback', isRelative: apiBaseUrl.startsWith('/') });

  return { apiBaseUrl, sanctumBaseUrl };
}

const { apiBaseUrl: API_BASE_URL, sanctumBaseUrl: SANCTUM_BASE_URL } = validateAndSetupApiUrls();

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  status?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// Request deduplication and caching
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class ApiClientOptimized {
  private baseURL: string;
  private token: string | null = null;
  
  // Request deduplication - prevent duplicate requests
  private pendingRequests = new Map<string, PendingRequest<any>>();
  
  // Simple in-memory cache for GET requests
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEDUPLICATION_TTL = 30 * 1000; // 30 seconds
  
  // Batch request queue
  private batchQueue = new Map<string, { requests: Array<{ resolve: Function, reject: Function }>, timeout: NodeJS.Timeout }>();

  constructor(baseURL?: string) {
    const fallbackURL = 'http://localhost:8000/api';
    
    if (baseURL) {
      this.baseURL = baseURL;
    } else if (API_BASE_URL) {
      this.baseURL = API_BASE_URL;
    } else {
      this.baseURL = fallbackURL;
    }
    
    // Verify it's not undefined
    if (!this.baseURL || this.baseURL === 'undefined') {
      log('error', 'baseURL is still invalid, forcing fallback');
      this.baseURL = fallbackURL;
    }
    
    // HARD CHECK: If still showing 8001, force it to 8000
    if (this.baseURL.includes(':8001')) {
      log('error', 'DETECTED PORT 8001! Force changing to 8000');
      this.baseURL = this.baseURL.replace(':8001', ':8000');
    }
    
    log('info', 'ApiClient initialized', { baseURL: this.baseURL });
    this.loadToken();
    
    // Clean up cache and pending requests periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
    }
  }

  // CSRF cookie initialization for Laravel Sanctum SPA authentication
  private csrfInitialized = false;
  
  private async ensureCSRFCookie(): Promise<void> {
    if (this.csrfInitialized) {
      return;
    }

    try {
      const sanctumUrl = this.baseURL.replace('/api', '/sanctum/csrf-cookie');
      await fetch(sanctumUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      this.csrfInitialized = true;
      log('info', 'CSRF cookie initialized for Sanctum SPA');
    } catch (error) {
      log('error', 'Failed to initialize CSRF cookie:', error);
      throw new Error('Unable to initialize secure session');
    }
  }

  // Cache and pending request cleanup
  private cleanup(): void {
    const now = Date.now();
    
    // Clean expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    
    // Clean expired pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.DEDUPLICATION_TTL) {
        this.pendingRequests.delete(key);
      }
    }
    
    log('info', 'Cache cleanup completed', { 
      cacheSize: this.cache.size, 
      pendingSize: this.pendingRequests.size 
    });
  }

  // Generate cache key for requests
  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramsStr}`;
  }

  // Check if cache entry is valid
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    log('info', 'Cache hit', { key, age: now - entry.timestamp });
    return entry.data;
  }

  // Cache data
  private setCachedData<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    log('info', 'Data cached', { key, ttl });
  }

  // Clear cache for specific patterns
  public clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.pendingRequests.clear();
      log('info', 'All cache and pending requests cleared');
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }

    for (const key of this.pendingRequests.keys()) {
      if (key.includes(pattern)) {
        this.pendingRequests.delete(key);
      }
    }

    log('info', 'Pattern-based cache cleared', { pattern });
  }

  // Token management (optimized with single storage location)
  private loadToken(): void {
    const storedToken = localStorage.getItem('atis_auth_token');
    
    if (storedToken) {
      this.token = storedToken;
      log('info', 'Token loaded from storage');
    }
  }

  private saveToken(token: string): void {
    this.token = token;
    localStorage.setItem('atis_auth_token', token);
    log('info', 'Token saved to storage');
  }

  private removeToken(): void {
    this.token = null;
    localStorage.removeItem('atis_auth_token');
    this.clearCache(); // Clear cache when token is removed
    log('info', 'Token removed from storage');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    if (isDevelopment) {
      log('info', `Response: ${response.status} ${response.statusText}`, { 
        url: response.url, 
        contentType 
      });
    }
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        if (isDevelopment) {
          log('error', 'API Error', { status: response.status, data });
          // Enhanced validation error logging
          if (response.status === 422 && data.errors) {
            console.error('🔍 Validation errors detail:', data.errors);
            Object.keys(data.errors).forEach(field => {
              console.error(`❌ ${field}:`, data.errors[field]);
            });
          }
        }

        if (response.status === 401) {
          // Handle 401 responses
          const isInitialAuthCheck = response.url.includes('/me');
          const isLoginPath = window.location.pathname.includes('/login');
          
          if (!isInitialAuthCheck && !isLoginPath) {
            log('warn', 'Auto-logout: Removing token and redirecting');
            this.removeToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }
        
        const enhancedError = new Error(data.message || `HTTP error! status: ${response.status}`);
        if (data.errors) {
          (enhancedError as any).errors = data.errors;
        }
        throw enhancedError;
      }
      
      return data;
    } else {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { data: null } as ApiResponse<T>;
    }
  }

  // Optimized GET with caching and deduplication
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: {
      responseType?: 'json' | 'blob';
      cache?: boolean;
      cacheTtl?: number;
    }
  ): Promise<ApiResponse<T>> {
    // Handle blob responses (no caching, no deduplication)
    if (options?.responseType === 'blob') {
      if (isDevelopment) {
        log('info', 'Blob request - bypassing cache and deduplication', { endpoint });
      }

      // Clear any existing cache for this blob endpoint to prevent issues
      const blobCacheKey = this.getCacheKey(endpoint, params);
      this.cache.delete(blobCacheKey);
      this.pendingRequests.delete(blobCacheKey);

      return this.performRequest<T>('GET', endpoint, undefined, params, options);
    }

    const cacheKey = this.getCacheKey(endpoint, params);

    // Check cache first (if caching is enabled, default true for GET)
    const useCache = options?.cache !== false;
    if (useCache) {
      const cachedData = this.getCachedData<ApiResponse<T>>(cacheKey);
      if (cachedData) {
        if (isDevelopment) {
          log('info', 'Data cached', { key: cacheKey, ttl: this.DEFAULT_CACHE_TTL });
        }
        return cachedData;
      }
    }

    // Check for pending identical request (deduplication)
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      log('info', 'Request deduplication', { endpoint });
      return pendingRequest.promise;
    }

    // Create new request
    const requestPromise = this.performRequest<T>('GET', endpoint, undefined, params, options);
    
    // Store as pending request for deduplication
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now()
    });

    try {
      const result = await requestPromise;
      
      // Cache successful GET responses
      if (useCache && result && !result.errors) {
        const ttl = options?.cacheTtl || this.DEFAULT_CACHE_TTL;
        this.setCachedData(cacheKey, result, ttl);
      }
      
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  // POST/PUT/DELETE methods (no caching, but with deduplication for safety)
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    // Clear related cache entries
    this.clearCache(endpoint.split('/')[0]);
    return this.performRequest<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    // Clear related cache entries
    this.clearCache(endpoint.split('/')[0]);
    return this.performRequest<T>('PUT', endpoint, data);
  }

  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    // Clear related cache entries
    this.clearCache(endpoint.split('/')[0]);
    return this.performRequest<T>('DELETE', endpoint, data);
  }

  // Core request method
  private async performRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
    options?: { responseType?: 'json' | 'blob' }
  ): Promise<ApiResponse<T>> {
    // Safety check for baseURL
    if (!this.baseURL || this.baseURL === 'undefined') {
      this.baseURL = 'http://localhost:8000/api';
    }

    // Ensure CSRF cookie is initialized for Laravel Sanctum SPA authentication
    // Skip for public endpoints like /login (handled in auth service)
    if (!endpoint.startsWith('/login') && !endpoint.startsWith('/register')) {
      await this.ensureCSRFCookie();
    }

    // Handle special Sanctum endpoints
    let requestUrl: string;
    if (endpoint.startsWith('/sanctum/')) {
      requestUrl = `${SANCTUM_BASE_URL}${endpoint}`;
    } else {
      requestUrl = `${this.baseURL}${endpoint}`;
      if (method === 'GET' && params) {
        const url = new URL(requestUrl);
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            let value = params[key];
            if (typeof value === 'boolean') {
              value = value ? '1' : '0';
            }
            url.searchParams.append(key, value.toString());
          }
        });
        requestUrl = url.toString();
      }
    }

    const requestInit: RequestInit = {
      method,
      headers: this.getHeaders(),
      credentials: 'include',
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      requestInit.body = JSON.stringify(data);
    }

    if (isDevelopment) {
      log('info', `${method} request`, { endpoint, hasData: !!data });
      log('info', 'Fetch details', { 
        requestUrl, 
        method, 
        headers: requestInit.headers,
        credentials: requestInit.credentials,
        hasBody: !!requestInit.body 
      });
    }

    let response;
    try {
      response = await fetch(requestUrl, requestInit);
      if (isDevelopment) {
        log('info', 'Fetch successful', { 
          status: response.status, 
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
      }
    } catch (fetchError) {
      if (isDevelopment) {
        log('error', 'Fetch failed', { 
          error: fetchError, 
          requestUrl, 
          method,
          headers: requestInit.headers 
        });
      }
      throw fetchError;
    }

    // Handle blob responses
    if (options?.responseType === 'blob') {
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const blob = await response.blob();
      return { data: blob } as ApiResponse<T>;
    }

    return this.handleResponse<T>(response);
  }

  // Batch request support for multiple API calls
  async batchGet<T>(requests: Array<{ endpoint: string; params?: Record<string, any> }>): Promise<Array<ApiResponse<T>>> {
    const promises = requests.map(req => this.get<T>(req.endpoint, req.params));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        log('error', `Batch request failed`, { 
          endpoint: requests[index].endpoint, 
          error: result.reason 
        });
        return { 
          data: null, 
          message: result.reason.message || 'Batch request failed',
          errors: { batch: ['Request failed'] }
        } as ApiResponse<T>;
      }
    });
  }

  // Auth-specific methods
  setToken(token: string): void {
    this.saveToken(token);
  }

  clearToken(): void {
    this.removeToken();
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Performance metrics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }
}

// Singleton instance
declare global {
  interface Window {
    __apiClientOptimized?: ApiClientOptimized;
    __authToken?: string | null;
  }
}

export const apiClientOptimized = (() => {
  if (typeof window !== 'undefined' && window.__apiClientOptimized) {
    return window.__apiClientOptimized;
  }
  
  const client = new ApiClientOptimized(API_BASE_URL);
  
  // Restore token from localStorage
  const localStorageToken = localStorage.getItem('atis_auth_token');
  if (localStorageToken) {
    client.setToken(localStorageToken);
  }
  
  if (typeof window !== 'undefined') {
    window.__apiClientOptimized = client;
  }
  
  return client;
})();

// Export legacy apiClient name for compatibility
export const apiClient = apiClientOptimized;