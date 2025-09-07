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
const extractUserRole = (roles: any[]): string => {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return 'user';
  }
  
  const firstRole = roles[0];
  return typeof firstRole === 'object' ? firstRole?.name : firstRole || 'user';
};

// Helper function to transform API user data to User type
const transformUserData = (userData: any): User => {
  if (!userData || !userData.id) {
    throw new Error('Invalid user data received from API');
  }

  return {
    id: userData.id,
    name: userData.name || userData.username || 'İstifadəçi',
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    email: userData.email,
    username: userData.username,
    role: extractUserRole(userData.roles),
    permissions: userData.permissions || [],
    institution: userData.institution,
    region: userData.region,
    department: userData.department,
    is_active: userData.is_active !== undefined ? userData.is_active : true,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
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