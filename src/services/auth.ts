import { apiClient, ApiResponse } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  institution?: {
    id: number;
    name: string;
    type: string;
    level: number;
  };
  region?: {
    id: number;
    name: string;
  };
  department?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expires_at: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // First get CSRF token for Laravel Sanctum
    try {
      await apiClient.get('/sanctum/csrf-cookie');
    } catch (error) {
      console.warn('CSRF cookie request failed:', error);
    }
    
    // Clear any existing auth data before login
    console.log('🧹 Auth Service: Clearing existing auth data before login');
    this.clearAuth();
    
    // Backend expects 'login' field instead of 'email'
    const loginData = {
      login: credentials.email,
      password: credentials.password,
      device_name: 'web-browser',
    };
    
    const response = await apiClient.post<any>('/login', loginData);
    
    console.log('🔍 Login Service: Full response:', response);
    console.log('📦 Login Service: Response data:', response.data);
    
    if (response.data) {
      // Backend returns {token, user, requires_password_change} structure inside data
      const userData = response.data.user;
      console.log('👤 Login Service: User data:', userData);
      console.log('🎭 Login Service: Roles array:', userData.roles);
      console.log('🎭 Login Service: First role raw:', userData.roles?.[0]);
      console.log('🎭 Login Service: First role name:', userData.roles?.[0]?.name);
      
      const extractedRole = userData.roles?.[0]?.name || userData.roles?.[0] || 'user';
      console.log('🎭 Login Service: Extracted role:', extractedRole);
      
      const user: User = {
        id: userData.id,
        name: userData.name || userData.username || 'İstifadəçi',
        email: userData.email,
        username: userData.username,
        role: extractedRole, // Extract role name from first role
        permissions: userData.permissions || [],
        institution: userData.institution,
        region: userData.region,
        department: userData.department,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      };
      
      const loginResponse: LoginResponse = {
        token: response.data.token,
        user: user,
        expires_at: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      
      apiClient.setToken(loginResponse.token);
      return loginResponse;
    }
    
    throw new Error('Login failed');
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/logout');
    } finally {
      apiClient.clearToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    console.log('🔍 Auth Service: Calling /me endpoint');
    const response = await apiClient.get<any>('/me');
    
    console.log('📥 Auth Service: /me response:', response);
    console.log('📥 Auth Service: /me response.data:', response.data);
    console.log('📥 Auth Service: /me response.data.user exists:', !!response.data?.user);
    
    if (response.user) {
      // Backend returns {user: {...}} structure from AuthController /me  
      const userData = response.user;
      console.log('👤 Auth Service: User data:', userData);
      console.log('🎭 Auth Service: Roles array:', userData.roles);
      console.log('🎭 Auth Service: First role:', userData.roles?.[0]);
      
      const user: User = {
        id: userData.id,
        name: userData.name || userData.username || 'İstifadəçi',
        email: userData.email,
        username: userData.username,
        role: userData.roles?.[0] || 'user', // Extract role name from first role (roles array contains strings)
        permissions: userData.permissions || [],
        institution: userData.institution,
        region: userData.region,
        department: userData.department,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      };
      
      console.log('✅ Auth Service: Final user object:', user);
      return user;
    }
    
    console.error('❌ Auth Service: No user data in response');
    throw new Error('Failed to get current user');
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/refresh-token');
    
    if (response.data) {
      apiClient.setToken(response.data.token);
      return response.data;
    }
    
    throw new Error('Token refresh failed');
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.post('/change-password', data);
  }

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  getToken(): string | null {
    return apiClient.getToken();
  }

  clearAuth(): void {
    apiClient.clearToken();
  }
}

export const authService = new AuthService();