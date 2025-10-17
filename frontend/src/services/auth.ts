import { apiClient, ApiResponse } from './api';
import { storageHelpers } from '@/utils/helpers';
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

const DEVICE_ID_STORAGE_KEY = 'atis_device_id';
const DEVICE_MAP_STORAGE_KEY = 'atis_device_map';
const AUTH_STORAGE_KEY = 'atis_auth_token';
const USER_STORAGE_KEY = 'atis_current_user';

const createFallbackDeviceId = (): string =>
  `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const generateDeviceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return createFallbackDeviceId();
};

const normalizeIdentifier = (identifier?: string | null): string | null => {
  if (!identifier) return null;
  const trimmed = identifier.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
};

const getDeviceMap = (): Record<string, string> => {
  return storageHelpers.get<Record<string, string>>(DEVICE_MAP_STORAGE_KEY, {}) || {};
};

const persistDeviceMap = (map: Record<string, string>, debug = false): void => {
  const stored = storageHelpers.set(DEVICE_MAP_STORAGE_KEY, map);
  if (!stored && debug) {
    console.warn('⚠️ Auth Service: Failed to persist device map');
  }
};

const clearStoredDeviceId = (identifier?: string | null, debug = false): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (normalizedIdentifier) {
    const map = getDeviceMap();
    if (map[normalizedIdentifier]) {
      delete map[normalizedIdentifier];
      persistDeviceMap(map, debug);
      if (debug) {
        console.log('🧹 Auth Service: Cleared stored device ID for identifier', normalizedIdentifier);
      }
    }
    return;
  }

  storageHelpers.remove(DEVICE_ID_STORAGE_KEY);
};

const getStableDeviceId = (identifier?: string | null, debug = false): string => {
  if (typeof window === 'undefined') {
    return createFallbackDeviceId();
  }

  try {
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (normalizedIdentifier) {
      const map = getDeviceMap();
      const storedIdForIdentifier = map[normalizedIdentifier];
      if (storedIdForIdentifier) {
        return storedIdForIdentifier;
      }

      const newIdentifierDeviceId = generateDeviceId();
      map[normalizedIdentifier] = newIdentifierDeviceId;
      persistDeviceMap(map, debug);

      return newIdentifierDeviceId;
    }

    const storedId = storageHelpers.get<string>(DEVICE_ID_STORAGE_KEY);
    if (storedId) {
      return storedId;
    }

    const newId = generateDeviceId();
    const stored = storageHelpers.set(DEVICE_ID_STORAGE_KEY, newId);
    
    if (!stored && debug) {
      console.warn('⚠️ Auth Service: Failed to persist device ID, using in-memory only');
    }

    return newId;
  } catch (storageError) {
    if (debug) {
      console.warn('⚠️ Auth Service: Device ID storage failed, using ephemeral ID', storageError);
    }
    return generateDeviceId();
  }
};

const sanitizeDeviceString = (value: string, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 191 ? trimmed.slice(0, 191) : trimmed;
};

const getDeviceName = (): string => {
  if (typeof navigator === 'undefined') {
    return 'web-browser';
  }

  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
      brands?: Array<{ brand?: string }>;
    };
  };

  const platformRaw = nav.userAgentData?.platform || nav.platform || 'web';
  const browserRaw = nav.userAgentData?.brands?.[0]?.brand || nav.userAgent || 'browser';

  const platform = sanitizeDeviceString(platformRaw, 'web');
  const browser = sanitizeDeviceString(browserRaw, 'browser');

  return sanitizeDeviceString(`web-${platform}-${browser}`.toLowerCase(), 'web-browser');
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
    const loginIdentifier = credentials.email?.trim() || '';
    const normalizedIdentifier = normalizeIdentifier(loginIdentifier);
    const deviceName = getDeviceName();
    let deviceId = getStableDeviceId(normalizedIdentifier, this.DEBUG_MODE);

    const attemptLogin = async () => {
      const loginData = {
        login: loginIdentifier,
        password: credentials.password?.trim(),
        device_name: deviceName,
        device_id: deviceId,
      };

      this.log('🔍 Auth Service: Sending login request');
      if (this.DEBUG_MODE) {
        console.log('🔐 Auth Service: Login payload preview', {
          login: loginData.login,
          passwordLength: loginData.password?.length,
          deviceName: loginData.device_name,
          deviceId: loginData.device_id,
        });
      }

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
        user,
        expires_at: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      apiClient.setToken(loginResponse.token);
      this.log('✅ Auth Service: Login successful');

      const storedUser = storageHelpers.set(USER_STORAGE_KEY, {
        ...loginResponse.user,
        cacheTimestamp: Date.now()
      });

      if (!storedUser && this.DEBUG_MODE) {
        console.warn('⚠️ Auth Service: Failed to cache user data');
      }

      storageHelpers.set(AUTH_STORAGE_KEY, loginResponse.token);

      return loginResponse;
    };

    try {
      return await attemptLogin();
    } catch (error: any) {
      const serverErrors = (error as any)?.errors as Record<string, string[]> | undefined;
      const loginErrors = serverErrors?.login || [];
      const message = error?.message || '';
      const genericDeviceFailure = message.includes('Giriş zamanı xəta baş verdi');
      const deviceLimitFailure = loginErrors.some(err => err.toLowerCase().includes('cihaz'));

      if ((genericDeviceFailure || deviceLimitFailure) && normalizedIdentifier) {
        this.log('warn', 'Auth Service: Login failed with potential device conflict, regenerating device ID and retrying');
        clearStoredDeviceId(normalizedIdentifier, this.DEBUG_MODE);
        deviceId = getStableDeviceId(normalizedIdentifier, this.DEBUG_MODE);

        try {
          return await attemptLogin();
        } catch (retryError: any) {
          const retryMessage = retryError?.message || message || 'Login failed. Please check your credentials.';
          this.log('❌ Auth Service: Login retry failed:', retryMessage);
          throw new Error(retryMessage);
        }
      }

      this.log('❌ Auth Service: Login failed:', error);
      throw new Error(message || 'Login failed. Please check your credentials.');
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

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/password/reset/request', { email });
      this.log('✅ Auth Service: Password reset requested successfully');
    } catch (error) {
      this.log('❌ Auth Service: Password reset request failed:', error);
      throw error;
    }
  }

  async resetPasswordWithToken(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    try {
      await apiClient.post('/password/reset/confirm', data);
      this.log('✅ Auth Service: Password reset completed successfully');
    } catch (error) {
      this.log('❌ Auth Service: Password reset completion failed:', error);
      throw error;
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
