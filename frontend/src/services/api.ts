console.log('🔧 Environment check:', { 
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  all_env: import.meta.env
});

const API_BASE_URL = 'http://localhost:8001/api'; // Temporarily hardcoded
const SANCTUM_BASE_URL = 'http://localhost:8001';

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

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private loadToken(): void {
    this.token = localStorage.getItem('auth_token');
    console.log('🔍 API Client: Loading token from localStorage:', !!this.token, this.token ? `(${this.token.substring(0, 20)}...)` : 'null');
  }

  private saveToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
    console.log('💾 API Client: Token saved to localStorage:', `(${token.substring(0, 20)}...)`);
  }

  private removeToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
    console.log('🗑️ API Client: Token removed from localStorage');
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
          
          if (!isInitialAuthCheck) {
            console.warn('🚪 Auto-logout: Removing token and redirecting to login');
            this.removeToken();
            window.location.href = '/login';
          } else {
            console.warn('🚪 Initial auth check failed - letting AuthContext handle it');
            // Don't auto-logout on initial auth check
            this.removeToken(); // Still remove invalid token
          }
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } else {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { data: null } as ApiResponse<T>;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    console.log(`🌐 API GET request: ${endpoint}`, { params });
    
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

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`🌐 API POST ${this.baseURL}${endpoint}`, { data, headers: this.getHeaders() });
    
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

export const apiClient = new ApiClient();