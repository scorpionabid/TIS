import { logger } from '@/utils/logger';

logger.debug('Environment check', {
  component: 'API',
  data: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    all_env: import.meta.env
  }
});

// Environment variable validation and setup
function validateAndSetupApiUrls() {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  const fallbackUrl = 'http://localhost:8000/api';
  
  console.log('🔍 Environment variable validation:', {
    VITE_API_BASE_URL: envApiUrl,
    isDevelopment: import.meta.env.DEV,
    mode: import.meta.env.MODE,
    hasEnvFile: !!envApiUrl
  });
  
  // Use environment variable if available, otherwise fallback to Docker default
  const apiBaseUrl = envApiUrl || fallbackUrl;
  const sanctumBaseUrl = apiBaseUrl.replace('/api', '');
  
  // Validate URLs are properly formed
  try {
    new URL(apiBaseUrl);
    new URL(sanctumBaseUrl);
  } catch (error) {
    console.error('❌ Invalid API URL configuration:', { apiBaseUrl, sanctumBaseUrl });
    throw new Error('Invalid API URL configuration');
  }
  
  console.log('✅ API URLs configured:', { apiBaseUrl, sanctumBaseUrl, source: envApiUrl ? 'env' : 'fallback' });
  
  return { apiBaseUrl, sanctumBaseUrl };
}

const { apiBaseUrl: API_BASE_URL, sanctumBaseUrl: SANCTUM_BASE_URL } = validateAndSetupApiUrls();

console.log('🔗 API URLs:', { API_BASE_URL, SANCTUM_BASE_URL });

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

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL?: string) {
    const fallbackURL = 'http://localhost:8000/api';
    console.log('🔧 ApiClient constructor:', { baseURL, API_BASE_URL, fallbackURL });
    console.log('🔧 Environment check in constructor:', import.meta.env.VITE_API_BASE_URL);
    console.log('🔧 All env vars:', import.meta.env);
    
    // Set baseURL with multiple fallbacks
    if (baseURL) {
      this.baseURL = baseURL;
      console.log('🔧 Using parameter baseURL:', baseURL);
    } else if (API_BASE_URL) {
      this.baseURL = API_BASE_URL;
      console.log('🔧 Using API_BASE_URL constant:', API_BASE_URL);
    } else {
      this.baseURL = fallbackURL;
      console.log('🔧 Using fallback URL:', fallbackURL);
    }
    
    console.log('🔧 Final baseURL set to:', this.baseURL);
    console.log('🔧 baseURL type:', typeof this.baseURL);
    
    // Verify it's not undefined
    if (!this.baseURL || this.baseURL === 'undefined') {
      console.error('❌ baseURL is still invalid, forcing fallback');
      this.baseURL = fallbackURL;
    }
    
    // HARD CHECK: If still showing 8001, force it to 8000
    if (this.baseURL.includes(':8001')) {
      console.error('🚨 DETECTED PORT 8001! Force changing to 8000');
      this.baseURL = this.baseURL.replace(':8001', ':8000');
    }
    
    console.log('🔧 FINAL VERIFIED baseURL:', this.baseURL);
    this.loadToken();
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  private setCookie(name: string, value: string, days: number = 30): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  private loadToken(): void {
    // Try multiple sources in order of preference
    const localStorageToken = localStorage.getItem('auth_token');
    const sessionStorageToken = sessionStorage.getItem('auth_token');
    const windowToken = window.__authToken;
    const cookieToken = this.getCookie('auth_token');
    
    const storedToken = localStorageToken || sessionStorageToken || windowToken || cookieToken;
    
    console.log('🔍 API Client: Token search across all storage types:', {
      localStorage: !!localStorageToken,
      sessionStorage: !!sessionStorageToken,
      window: !!windowToken,
      cookie: !!cookieToken,
      finalToken: !!storedToken,
      tokenLength: storedToken?.length || 0,
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
      allCookies: document.cookie,
      source: localStorageToken ? 'localStorage' : sessionStorageToken ? 'sessionStorage' : windowToken ? 'window' : cookieToken ? 'cookie' : 'none'
    });
    
    if (storedToken) {
      this.token = storedToken;
      // Sync all storage locations
      localStorage.setItem('auth_token', storedToken);
      sessionStorage.setItem('auth_token', storedToken);
      window.__authToken = storedToken;
      this.setCookie('auth_token', storedToken);
      console.log('🔄 Token found and synced across all storage types including cookie');
    }
    
    console.log('🔍 API Client: Loading token result:', !!this.token, this.token ? `(${this.token.substring(0, 20)}...)` : 'null');
  }

  private saveToken(token: string): void {
    this.token = token;
    // Save to all possible storage locations for maximum persistence
    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_token', token);
    window.__authToken = token;
    this.setCookie('auth_token', token);
    console.log('💾 API Client: Token saved to all storage types including cookie:', `(${token.substring(0, 20)}...)`);
    
    // Verify save immediately
    const localToken = localStorage.getItem('auth_token');
    const sessionToken = sessionStorage.getItem('auth_token');
    const windowToken = window.__authToken;
    const cookieToken = this.getCookie('auth_token');
    console.log('💾 API Client: Multi-storage verification:', {
      originalLength: token.length,
      localStorage: { saved: !!localToken, matches: localToken === token },
      sessionStorage: { saved: !!sessionToken, matches: sessionToken === token },
      window: { saved: !!windowToken, matches: windowToken === token },
      cookie: { saved: !!cookieToken, matches: cookieToken === token },
      firstChars: token.substring(0, 10)
    });
  }

  private removeToken(): void {
    console.log('🗑️ API Client: removeToken called from:', new Error().stack?.split('\n')[2]?.trim());
    this.token = null;
    // Remove from all storage locations
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    window.__authToken = null;
    this.deleteCookie('auth_token');
    console.log('🗑️ API Client: Token removed from all storage types including cookie');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (this.token) {
      console.log('🔑 API Client: Adding Authorization header with token (first 30 chars):', this.token.substring(0, 30) + '...');
      headers.Authorization = `Bearer ${this.token}`;
    } else {
      console.warn('🔑 API Client: No token available for authorization');
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    console.log(`📥 API Response: ${response.status} ${response.statusText}`, { 
      url: response.url, 
      contentType 
    });
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('📋 Response data:', data);
      
      if (!response.ok) {
        console.error('❌ API Error:', data);
        console.error('❌ Response status:', response.status, response.statusText);
        console.error('❌ Response URL:', response.url);
        if (data.errors) {
          console.error('❌ Validation Errors:', data.errors);
          // Log each validation error in detail
          Object.keys(data.errors).forEach(field => {
            console.error(`❌ Field "${field}":`, data.errors[field]);
          });
        }
        if (response.status === 401) {
          console.warn('🚪 401 Unauthorized detected');
          console.warn('🚪 Current token before removal:', this.token ? `(${this.token.substring(0, 20)}...)` : 'null');
          console.warn('🚪 Failed API call URL:', response.url);
          console.warn('🚪 Failed API call endpoint:', response.url.replace(this.baseURL, '').replace(SANCTUM_BASE_URL, ''));
          console.warn('🚪 Full response data:', data);
          
          // Get current user info from localStorage if available
          const currentUserStr = localStorage.getItem('current_user');
          if (currentUserStr) {
            try {
              const currentUser = JSON.parse(currentUserStr);
              console.warn('🚪 Current user during 401:', {
                username: currentUser.username,
                role: currentUser.role,
                institution: currentUser.institution?.name
              });
            } catch (e) {
              console.warn('🚪 Could not parse current user from localStorage');
            }
          }
          
          // Only auto-logout if this isn't the initial auth check
          // Let AuthContext handle the initial authentication properly
          const isInitialAuthCheck = response.url.includes('/me') && !window.location.pathname.includes('/login');
          
          // Additional checks to prevent unnecessary logouts
          const isAssessmentContext = response.url.includes('/assessment');
          const hasToken = !!this.token;
          
          console.warn('🚪 401 Analysis:', {
            isInitialAuthCheck,
            isAssessmentContext, 
            hasToken,
            currentPath: window.location.pathname,
            endpoint: response.url.replace(this.baseURL, '')
          });
          
          // Don't auto-logout for assessment-related permission errors or initial auth check
          if (!isInitialAuthCheck && !isAssessmentContext && hasToken) {
            console.warn('🚪 Auto-logout: Removing token and redirecting to login');
            this.removeToken();
            window.location.href = '/login';
          } else if (isInitialAuthCheck) {
            console.warn('🚪 Initial auth check failed - letting AuthContext handle it');
            this.removeToken(); // Still remove invalid token
          } else {
            console.warn('🚪 Skipping auto-logout for assessment context - letting component handle 401 gracefully');
          }
        }
        
        // Create enhanced error with validation details
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

  async get<T>(endpoint: string, params?: Record<string, any>, options?: { responseType?: 'json' | 'blob' }): Promise<ApiResponse<T>> {
    console.log(`🌐 API GET request: baseURL=${this.baseURL}, endpoint=${endpoint}`, { params, options });
    console.log('🔍 baseURL type:', typeof this.baseURL, 'value:', this.baseURL);
    console.log('🔍 endpoint type:', typeof endpoint, 'value:', endpoint);
    
    // Safety check to prevent undefined baseURL
    if (!this.baseURL || this.baseURL === 'undefined' || this.baseURL === undefined) {
      console.error('❌ baseURL is invalid!', { current: this.baseURL, API_BASE_URL });
      this.baseURL = 'http://localhost:8000/api';
      console.error('❌ Fixed baseURL to:', this.baseURL);
    }
    
    console.log('🔍 Full URL will be:', `${this.baseURL}${endpoint}`);
    
    // Handle special Sanctum endpoints
    let requestUrl: string;
    if (endpoint.startsWith('/sanctum/')) {
      requestUrl = `${SANCTUM_BASE_URL}${endpoint}`;
    } else {
      requestUrl = `${this.baseURL}${endpoint}`;
      if (params) {
        const url = new URL(requestUrl);
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            // Convert boolean values properly for Laravel validation
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

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    // Handle blob responses
    if (options?.responseType === 'blob') {
      console.log(`📥 Blob Response: ${response.status} ${response.statusText}`, { 
        url: response.url, 
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      if (!response.ok) {
        // For blob responses, still try to get error message if it's JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const blob = await response.blob();
      console.log('📦 Blob downloaded successfully:', blob.size, 'bytes');
      return { data: blob } as ApiResponse<T>;
    }

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    // HARD CHECK FOR PORT 8001 BEFORE REQUEST
    if (this.baseURL.includes(':8001')) {
      console.error('🚨 CRITICAL: baseURL still contains 8001! Fixing now!');
      this.baseURL = this.baseURL.replace(':8001', ':8000');
    }
    
    console.log(`🌐 API POST ${this.baseURL}${endpoint}`, { data, headers: this.getHeaders() });
    console.log('🔧 POST: Current baseURL verified:', this.baseURL);
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      console.log(`📨 Raw response for POST ${endpoint}:`, { 
        status: response.status, 
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const result = await this.handleResponse<T>(response);
      console.log(`✨ Processed response for POST ${endpoint}:`, result);
      return result;
    } catch (error) {
      console.error(`💥 POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    console.log(`🌐 API DELETE ${this.baseURL}${endpoint}`, { headers: this.getHeaders() });
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      console.log(`📨 Raw response for DELETE ${endpoint}:`, { 
        status: response.status, 
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const result = await this.handleResponse<T>(response);
      console.log(`✨ Processed response for DELETE ${endpoint}:`, result);
      return result;
    } catch (error) {
      console.error(`💥 DELETE ${endpoint} failed:`, error);
      throw error;
    }
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
    const authenticated = !!this.token;
    console.log('🔍 API Client: isAuthenticated check - token exists:', authenticated, 'token value:', this.token ? `(${this.token.substring(0, 20)}...)` : 'null');
    return authenticated;
  }
}

// Force recreation with timestamp to avoid cache
console.log('🔄 Creating new ApiClient instance at:', new Date().toISOString());

// Use singleton pattern to prevent HMR from clearing tokens
declare global {
  interface Window {
    __apiClient?: ApiClient;
    __authToken?: string | null;
  }
}

// Explicitly pass the URL to prevent any undefined issues
export const apiClient = (() => {
  if (window.__apiClient) {
    console.log('🔄 Reusing existing ApiClient instance from window');
    // Restore token from window if available
    if (window.__authToken && !window.__apiClient.getToken()) {
      console.log('🔄 Restoring token from window to ApiClient');
      window.__apiClient.setToken(window.__authToken);
    }
    return window.__apiClient;
  }
  
  const client = new ApiClient(API_BASE_URL);
  
  // Restore token from window or localStorage
  const windowToken = window.__authToken;
  const localStorageToken = localStorage.getItem('auth_token');
  const tokenToRestore = windowToken || localStorageToken;
  
  if (tokenToRestore) {
    console.log('🔄 Restoring token during ApiClient creation:', tokenToRestore.substring(0, 20) + '...');
    client.setToken(tokenToRestore);
    window.__authToken = tokenToRestore;
  }
  
  window.__apiClient = client;
  console.log('🔄 Created new ApiClient instance and stored in window');
  return client;
})();