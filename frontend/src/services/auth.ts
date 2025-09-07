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

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // CSRF token disabled for API-only authentication
    // Laravel Sanctum with token authentication doesn't require CSRF for API endpoints
    console.log('🔐 Auth Service: Using token-based authentication, skipping CSRF cookie');
    
    // Clear any existing auth data before login
    console.log('🧹 Auth Service: Clearing existing auth data before login');
    this.clearAuth();
    
    // Backend expects 'login' field instead of 'email'
    const loginData = {
      login: credentials.email,
      password: credentials.password,
      device_name: 'web-browser',
    };
    
    console.log('🔍 Auth Service: Sending login data:', {
      login: loginData.login,
      password: '[' + loginData.password.length + ' chars]',
      device_name: loginData.device_name,
      credentialsSource: credentials
    });
    
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
      
      // Debug: Verify token was saved immediately after login
      console.log('🔐 Auth Service: Login successful, verifying token save:', {
        tokenLength: loginResponse.token.length,
        tokenStart: loginResponse.token.substring(0, 20),
        apiClientHasToken: !!apiClient.getToken(),
        localStorageHasToken: !!localStorage.getItem('auth_token'),
        localStorageToken: localStorage.getItem('auth_token')?.substring(0, 20),
        allLocalStorageKeys: Object.keys(localStorage)
      });
      
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
    console.log('🔍 Auth Service: Current token before /me call:', apiClient.getToken());
    const response = await apiClient.get<any>('/me');
    
    console.log('📥 Auth Service: /me response:', response);
    console.log('📥 Auth Service: /me response.data:', response.data);
    console.log('📥 Auth Service: /me response.user exists:', !!response.user);
    
    // Backend might return response.user directly or response.data
    const userData = response.user || response.data || response;
    console.log('👤 Auth Service: Extracted user data:', userData);
    
    if (userData && userData.id) {
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
    console.error('❌ Auth Service: Full response structure:', JSON.stringify(response, null, 2));
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
    const hasToken = apiClient.isAuthenticated();
    const token = apiClient.getToken();
    console.log('🔍 Auth Service: isAuthenticated check - hasToken:', hasToken, 'token exists:', !!token);
    return hasToken;
  }

  getToken(): string | null {
    return apiClient.getToken();
  }

  clearAuth(): void {
    apiClient.clearToken();
  }
}

export const authService = new AuthService();