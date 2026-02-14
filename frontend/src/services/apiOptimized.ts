import { logger } from '@/utils/logger';
import { storageHelpers } from '@/utils/helpers';
import { toast } from '@/components/ui/use-toast';
import { cacheService } from './CacheService';

// Environment check for production optimizations
const isDevelopment = process.env.NODE_ENV === 'development';

// Production-safe logging
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  if (isDevelopment && true) { // Enable debug logs for debugging
    const emoji = { info: '🔍', warn: '⚠️', error: '❌' }[level];
    console[level](`${emoji} ApiClient: ${message}`, data || '');
  }
};

// Environment variable validation and setup
function validateAndSetupApiUrls() {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  const localApiUrl = import.meta.env.VITE_LOCAL_API_URL;
  const fallbackUrl = 'http://localhost:8000/api';
  
  // Auto-detect best URL based on current context
  let apiBaseUrl;
  if (isDevelopment) {
    // Try to detect if we're running on the same machine as backend
    const currentHost = window.location.hostname;
    
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Running locally - use localhost
      apiBaseUrl = localApiUrl || fallbackUrl;
      log('info', 'Local development detected', {
        currentHost,
        usingLocalApi: true,
        apiBaseUrl
      });
    } else {
      // Running from IP - use IP-based URL
      apiBaseUrl = envApiUrl || fallbackUrl;
      log('info', 'Remote development detected', {
        currentHost,
        usingIpApi: true,
        apiBaseUrl
      });
    }
  } else {
    // Production - use environment variable
    apiBaseUrl = envApiUrl || fallbackUrl;
  }
  
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

  // Development-only API configuration debug
  if (isDevelopment && true) { // Set to true to enable debug
    console.warn('🔥 API CONFIGURATION DEBUG:', {
      apiBaseUrl,
      sanctumBaseUrl,
      source: envApiUrl ? 'env' : 'fallback',
      envValue: envApiUrl,
      fallback: fallbackUrl,
      isRelative: apiBaseUrl.startsWith('/'),
      currentHost: window.location.hostname,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString()
    });
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

export interface PaginatedResponse<T = any> extends Omit<ApiResponse<T>, 'data'> {
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

type BatchQueueRequest<T = any> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const TOKEN_STORAGE_KEY = 'atis_auth_token';

class ApiClientOptimized {
  private baseURL: string;
  private token: string | null = null;
  private useBearerAuth: boolean;
  
  // Request deduplication - prevent duplicate requests
  private pendingRequests = new Map<string, PendingRequest<any>>();
  
  // Simple in-memory cache for GET requests
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEDUPLICATION_TTL = 30 * 1000; // 30 seconds
  
  // Batch request queue
  private batchQueue = new Map<string, { requests: Array<BatchQueueRequest>; timeout: NodeJS.Timeout }>();
  private lastUnauthorizedToastAt = 0;
  private lastForbiddenToastAt = 0;
  private readonly AUTH_TOAST_THROTTLE = 5000;

  constructor(baseURL?: string) {
    const fallbackURL = 'http://localhost:8000/api';
    const bearerFlag = import.meta.env.VITE_ENABLE_BEARER_AUTH;
    // Default to bearer auth enabled unless explicitly set to 'false'
    this.useBearerAuth = bearerFlag === undefined ? true : bearerFlag !== 'false';
    
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
    try {
      const storedToken = storageHelpers.get<string>(TOKEN_STORAGE_KEY);
      
      if (storedToken) {
        this.token = storedToken;
        log('info', 'Token loaded from storage');
      }
    } catch (error) {
      log('warn', 'Failed to load token from storage', error);
    }
  }

  private saveToken(token: string): void {
    this.token = token;
    const stored = storageHelpers.set(TOKEN_STORAGE_KEY, token);
    if (stored) {
      log('info', 'Token saved to storage');
    } else {
      log('warn', 'Token storage failed, keeping token in memory only');
    }
  }

  private removeToken(): void {
    this.token = null;
    storageHelpers.remove(TOKEN_STORAGE_KEY);
    this.clearCache(); // Clear cache when token is removed
    log('info', 'Token removed from storage');
  }

  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const csrfCookie = document.cookie
      ?.split('; ')
      .find(cookie => cookie.startsWith('XSRF-TOKEN='));

    if (!csrfCookie) {
      return null;
    }

    try {
      return decodeURIComponent(csrfCookie.split('=')[1]);
    } catch (error) {
      log('warn', 'Failed to decode CSRF token', error);
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const authorization = this.getAuthorizationHeader();
    if (authorization) {
      headers.Authorization = authorization;
      log('info', 'Authorization header added', { hasBearer: authorization.startsWith('Bearer ') });
    } else {
      log('warn', 'No authorization header - user not logged in?', { hasToken: !!this.token });
    }

    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
      log('info', 'CSRF token attached to headers');
    } else {
      log('warn', 'CSRF token missing when preparing request headers');
    }

    if (isDevelopment) {
      log('info', 'Request headers prepared', {
        hasAuth: !!headers.Authorization,
        hasCsrf: !!headers['X-XSRF-TOKEN'],
        contentType: headers['Content-Type']
      });
    }

    return headers;
  }

  private notifyPermissionIssue(
    type: 'unauthorized' | 'forbidden',
    backendMessage?: string
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    const now = Date.now();
    const defaultMessages = {
      unauthorized: {
        title: 'Sessiya müddəti bitdi',
        description: 'Zəhmət olmasa yenidən daxil olun.',
        variant: 'destructive' as const,
      },
      forbidden: {
        title: 'İcazə məhdudiyyəti',
        description: 'Bu əməliyyat üçün icazəniz yoxdur.',
        variant: 'warning' as const,
      },
    };

    if (type === 'unauthorized') {
      if (now - this.lastUnauthorizedToastAt < this.AUTH_TOAST_THROTTLE) {
        return;
      }
      this.lastUnauthorizedToastAt = now;
    } else {
      if (now - this.lastForbiddenToastAt < this.AUTH_TOAST_THROTTLE) {
        return;
      }
      this.lastForbiddenToastAt = now;
    }

    const defaultMessage = defaultMessages[type];
    const message =
      backendMessage && backendMessage !== 'Unauthorized' && backendMessage !== 'Forbidden'
        ? backendMessage
        : defaultMessage.description;

    toast({
      title: defaultMessage.title,
      description: message,
      variant: defaultMessage.variant,
    });
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

          // FULL ERROR LOGGING for all error types
          console.error('═══════════════════════════════════════');
          console.error('❌ BACKEND ERROR DETAILS:');
          console.error('═══════════════════════════════════════');
          console.error('Status:', response.status, response.statusText);
          console.error('URL:', response.url);
          console.error('Error Message:', data?.error || data?.message || 'Unknown');
          console.error('Full Response:', JSON.stringify(data, null, 2));
          console.error('═══════════════════════════════════════');

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
            this.notifyPermissionIssue('unauthorized', data?.message);
            log('warn', 'Auto-logout: Removing token and redirecting');
            this.removeToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        } else if (response.status === 403) {
          this.notifyPermissionIssue('forbidden', data?.message);
        }
        
        const enhancedError = new Error(data.message || `HTTP error! status: ${response.status}`);
        if (data.errors) {
          (enhancedError as any).errors = data.errors;
        }
        if (data.code) {
          (enhancedError as any).code = data.code;
        }
        if (typeof data.retry_after !== 'undefined') {
          (enhancedError as any).retryAfter = data.retry_after;
        }
        throw enhancedError;
      }
      
      // Log response structure for debugging (development only)
      if (isDevelopment && response.url.includes('/grades')) {
        console.log('📦 GRADES API RESPONSE STRUCTURE:', {
          hasData: 'data' in data,
          hasSuccess: 'success' in data,
          dataType: typeof data.data,
          dataIsArray: Array.isArray(data.data),
          topLevelKeys: Object.keys(data),
          firstItemKeys: Array.isArray(data.data) && data.data.length > 0 ? Object.keys(data.data[0]) : [],
          fullResponse: data
        });
      }

      // Log TASKS response (assigned-to-me) - ALWAYS (even in production for debugging)
      if (response.url.includes('/tasks/assigned-to-me')) {
        console.log('📦 TASKS ASSIGNED API RESPONSE:', {
          url: response.url,
          hasData: 'data' in data,
          hasSuccess: 'success' in data,
          dataType: typeof data.data,
          dataIsArray: Array.isArray(data.data),
          dataLength: Array.isArray(data.data) ? data.data.length : 0,
          topLevelKeys: Object.keys(data),
          firstTask: Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null,
          fullResponse: data
        });
      }

      return data;
    } else {
      if (!response.ok) {
        if (response.status === 401) {
          const isInitialAuthCheck = response.url.includes('/me');
          const isLoginPath = typeof window !== 'undefined' && window.location.pathname.includes('/login');
          
          if (!isInitialAuthCheck && !isLoginPath) {
            this.notifyPermissionIssue('unauthorized');
            log('warn', 'Auto-logout: Removing token and redirecting');
            this.removeToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        } else if (response.status === 403) {
          this.notifyPermissionIssue('forbidden');
        }
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

  // Helper: invalidate both in-memory cache and CacheService for a mutation endpoint
  private invalidateCachesForMutation(endpoint: string): void {
    const resourcePath = endpoint.split('?')[0]; // Remove query params
    const basePath = resourcePath.split('/').slice(0, 3).join('/'); // e.g., "/regionadmin/users"

    // 1. Clear apiOptimized in-memory cache
    this.clearCache(basePath);

    // 2. Clear CacheService cache (tag-based) - fixes stale data from BaseService.getAll/getById
    // BaseService stores cache entries with tags like [baseEndpoint, 'list'] or [baseEndpoint, 'detail']
    // clearByTags uses OR matching - any matching tag clears the entry
    try {
      cacheService.clearByTags([basePath, resourcePath]);
    } catch (e) {
      // CacheService failure should not block the mutation
      log('warn', 'Failed to clear CacheService', e);
    }
  }

  // POST/PUT/DELETE methods (no caching, but with deduplication for safety)
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    this.invalidateCachesForMutation(endpoint);
    return this.performRequest<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    this.invalidateCachesForMutation(endpoint);
    return this.performRequest<T>('PUT', endpoint, data);
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    this.invalidateCachesForMutation(endpoint);
    return this.performRequest<T>('PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    this.invalidateCachesForMutation(endpoint);
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
      requestUrl = `${this.baseURL}/${endpoint.replace(/^\//, '')}`;
      if (method === 'GET' && params) {
        const url = new URL(requestUrl);
        Object.keys(params).forEach(key => {
          const paramValue = params[key];
          if (paramValue === undefined || paramValue === null) {
            return;
          }

          const appendValue = (value: any, paramKey: string) => {
            if (value === undefined || value === null || value === '') {
              return;
            }
            let normalized = value;
            if (typeof normalized === 'boolean') {
              normalized = normalized ? '1' : '0';
            }
            url.searchParams.append(paramKey, normalized.toString());
          };

          if (Array.isArray(paramValue)) {
            paramValue.forEach((value) => appendValue(value, `${key}[]`));
          } else {
            appendValue(paramValue, key);
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

    if (isDevelopment) {
      log('info', 'Preparing request', {
        method,
        requestUrl,
        hasBody: !!data,
        headers: requestInit.headers,
      });
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      // Don't stringify FormData - send it directly
      if (data instanceof FormData) {
        requestInit.body = data;
        // Remove Content-Type header for FormData - browser sets it automatically with boundary
        delete (requestInit.headers as Record<string, string>)['Content-Type'];
      } else {
        requestInit.body = JSON.stringify(data);
      }
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
      log('info', 'Processing blob response', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          log('error', 'Blob request failed with JSON error', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } else {
          log('error', 'Blob request failed', { status: response.status, statusText: response.statusText });
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const blob = await response.blob();
      log('info', 'Blob created successfully', {
        size: blob.size,
        type: blob.type
      });

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

  enableBearerAuth(): void {
    this.useBearerAuth = true;
  }

  disableBearerAuth(): void {
    this.useBearerAuth = false;
  }

  isBearerAuthEnabled(): boolean {
    return this.useBearerAuth;
  }

  getAuthorizationHeader(): string | null {
    if (!this.useBearerAuth || !this.token) {
      return null;
    }
    return `Bearer ${this.token}`;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Authorization header (Bearer token)
    const authorization = this.getAuthorizationHeader();
    if (authorization) {
      headers.Authorization = authorization;
    }

    // CSRF token (session-based auth üçün kritik)
    // Yalnız session-based auth istifadə edildikdə əlavə et
    if (!this.useBearerAuth) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    return headers;
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
  try {
    const storedToken = storageHelpers.get<string>(TOKEN_STORAGE_KEY);
    if (storedToken) {
      client.setToken(storedToken);
    }
  } catch (error) {
    log('warn', 'Failed to hydrate token from storage', error);
  }
  
  if (typeof window !== 'undefined') {
    window.__apiClientOptimized = client;
  }
  
  return client;
})();

// Export legacy apiClient name for compatibility
export const apiClient = apiClientOptimized;
