import { apiClient, ApiResponse } from './api';
import { 
  User, 
  LoginCredentials, 
  LoginResponse, 
  ChangePasswordData 
} from '@/types/user';

// Re-export for backward compatibility
export type { 
  User, 
  LoginCredentials, 
  LoginResponse, 
  ChangePasswordData 
};

// Helper function to extract role from API response
const extractUserRole = (roles: any): string => {
  // Handle different role formats
  if (!roles) {
    return 'user';
  }

  // If roles is a string directly
  if (typeof roles === 'string') {
    return roles;
  }

  // If roles is an array
  if (Array.isArray(roles)) {
    if (roles.length === 0) {
      return 'user';
    }
    
    const firstRole = roles[0];
    return typeof firstRole === 'object' ? firstRole?.name || firstRole?.role : firstRole || 'user';
  }

  // If roles is an object (single role)
  if (typeof roles === 'object') {
    return roles?.name || roles?.role || 'user';
  }
  
  return 'user';
};

// Helper function to transform API user data to User type
const transformUserData = (userData: any): User => {
  // Debug logging to understand API response structure
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Transform User Data - Input:', JSON.stringify(userData, null, 2));
  }

  // Handle different possible API response structures
  let user = userData;
  
  // If data is nested in a 'user' property
  if (userData?.user && typeof userData.user === 'object') {
    user = userData.user;
  }
  
  // If data is nested in a 'data' property  
  if (userData?.data && typeof userData.data === 'object' && userData.data.id) {
    user = userData.data;
  }

  // Final validation with better error message
  if (!user || (!user.id && !user.user_id)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Invalid user data structure:', {
        original: userData,
        processed: user,
        hasId: !!user?.id,
        hasUserId: !!user?.user_id,
        keys: user ? Object.keys(user) : 'no user object'
      });
    }
    throw new Error('Invalid user data received from API - missing user ID');
  }

  return {
    id: user.id || user.user_id,
    name: user.name || user.username || user.full_name || 'İstifadəçi',
    first_name: user.first_name || user.firstName || '',
    last_name: user.last_name || user.lastName || '',
    email: user.email,
    username: user.username || user.login,
    role: extractUserRole(user.roles || user.role),
    permissions: user.permissions || [],
    institution: user.institution,
    region: user.region,
    department: user.department,
    is_active: user.is_active !== undefined ? user.is_active : true,
    created_at: user.created_at || user.createdAt,
    updated_at: user.updated_at || user.updatedAt,
  };
};

class AuthService {
  private readonly DEBUG_MODE = process.env.NODE_ENV === 'development';

  private log(...args: any[]): void {
    if (this.DEBUG_MODE) {
      console.log(...args);
    }
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    this.log('🔐 Auth Service: Starting login process');
    
    // Clear any existing auth data before login
    this.clearAuth();
    
    // STEP 1: Get CSRF cookie first (required for Laravel Sanctum SPA)
    this.log('🍪 Auth Service: Fetching CSRF cookie');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://atis.sim.edu.az';
      await fetch(`${baseUrl}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      this.log('✅ Auth Service: CSRF cookie obtained');
    } catch (csrfError) {
      this.log('❌ Auth Service: Failed to get CSRF cookie:', csrfError);
      throw new Error('Unable to initialize authentication. Please try again.');
    }
    
    // Backend expects 'login' field instead of 'email'
    const loginData = {
      login: credentials.email,
      password: credentials.password,
      device_name: 'web-browser',
    };
    
    this.log('🔍 Auth Service: Sending login request');
    
    try {
      const response = await apiClient.post<{
        token: string;
        user: any;
        expires_at?: string;
      }>('/login', loginData);
      
      if (!response.data || !response.data.token || !response.data.user) {
        throw new Error('Invalid login response structure');
      }

      const user = transformUserData(response.data.user);
      
      const loginResponse: LoginResponse = {
        token: response.data.token,
        user: user,
        expires_at: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      
      apiClient.setToken(loginResponse.token);
      this.log('✅ Auth Service: Login successful');
      
      return loginResponse;
    } catch (error) {
      this.log('❌ Auth Service: Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/logout');
    } finally {
      apiClient.clearToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    this.log('🔍 Auth Service: Calling /me endpoint');
    
    try {
      const response = await apiClient.get<any>('/me');
      
      // Backend might return user data directly or in response.data
      const userData = response.data || response;
      this.log('👤 Auth Service: Extracted user data:', userData);
      
      return transformUserData(userData);
    } catch (error) {
      this.log('❌ Auth Service: Failed to get current user:', error);
      throw new Error('Failed to get current user. Please login again.');
    }
  }

  async refreshToken(): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<{
        token: string;
        user: any;
        expires_at?: string;
      }>('/refresh-token');
      
      if (!response.data || !response.data.token || !response.data.user) {
        throw new Error('Invalid refresh token response structure');
      }

      const user = transformUserData(response.data.user);
      
      const loginResponse: LoginResponse = {
        token: response.data.token,
        user: user,
        expires_at: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      apiClient.setToken(loginResponse.token);
      this.log('✅ Auth Service: Token refreshed successfully');
      
      return loginResponse;
    } catch (error) {
      this.log('❌ Auth Service: Token refresh failed:', error);
      throw new Error('Token refresh failed. Please login again.');
    }
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await apiClient.post('/change-password', data);
      this.log('✅ Auth Service: Password changed successfully');
    } catch (error) {
      this.log('❌ Auth Service: Password change failed:', error);
      throw new Error('Failed to change password. Please try again.');
    }
  }

  isAuthenticated(): boolean {
    const hasToken = apiClient.isAuthenticated();
    this.log('🔍 Auth Service: isAuthenticated check:', hasToken);
    return hasToken;
  }

  getToken(): string | null {
    return apiClient.getToken();
  }

  clearAuth(): void {
    this.log('🧹 Auth Service: Clearing authentication data');
    apiClient.clearToken();
  }
}

export const authService = new AuthService();