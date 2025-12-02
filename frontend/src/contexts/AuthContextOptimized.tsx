import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, LoginCredentials } from '@/services/auth';
import { apiClient } from '@/services/apiOptimized';
import { storageHelpers } from '@/utils/helpers';
import { User } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { USER_ROLES, UserRole, isValidRole } from '@/constants/roles';
import { usePerformanceMonitor } from '@/utils/performance/hooks';
import { resetNavigationCache } from '@/hooks/useNavigationCache';

// Single storage location for token and user data
const AUTH_STORAGE_KEY = 'atis_auth_token';
const USER_STORAGE_KEY = 'atis_current_user';
const SESSION_META_STORAGE_KEY = 'atis_session_meta';

interface SessionMetadata {
  remember?: boolean;
  expiresAt?: string | null;
  sessionId?: string | null;
}

// Environment check for production optimizations
const isDevelopment = process.env.NODE_ENV === 'development';

// Backend to Frontend role mapping (optimized)
const ROLE_MAPPING: Record<string, UserRole> = {
  superadmin: USER_ROLES.SUPERADMIN,
  regionadmin: USER_ROLES.REGIONADMIN,
  regionoperator: USER_ROLES.REGIONOPERATOR,
  sektoradmin: USER_ROLES.SEKTORADMIN,
  schooladmin: USER_ROLES.SCHOOLADMIN,
  muavin: USER_ROLES.MUELLIM,
  ubr: USER_ROLES.MUELLIM,
  tesarrufat: USER_ROLES.MUELLIM,
  təsərrüfat: USER_ROLES.MUELLIM,
  psixoloq: USER_ROLES.MUELLIM,
  müəllim: USER_ROLES.MUELLIM,
  muellim: USER_ROLES.MUELLIM,
  teacher: USER_ROLES.MUELLIM,
};

const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
  if (!backendRole) {
    log('warn', 'Received empty backend role from API, defaulting to Müəllim');
    return USER_ROLES.MUELLIM;
  }

  const normalizedRole = backendRole.toString().trim().toLowerCase();
  const mappedRole = ROLE_MAPPING[normalizedRole];

  if (mappedRole && isValidRole(mappedRole)) {
    return mappedRole;
  }

  log('warn', 'Unknown backend role mapping encountered, defaulting to Müəllim', { backendRole });
  return USER_ROLES.MUELLIM;
};

const normalizeUserRole = (roleValue: string | UserRole): UserRole => {
  return typeof roleValue === 'string'
    ? mapBackendRoleToFrontend(roleValue)
    : roleValue;
};

// Optimized debounce utility with faster response
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel?: () => void } => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
};

// Production-safe logging
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  if (isDevelopment) {
    const emoji = { info: '🔍', warn: '⚠️', error: '❌' }[level];
    console[level](`${emoji} AuthContext: ${message}`, data || '');
  }
};

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Performance monitoring
  usePerformanceMonitor('AuthProvider');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Refs for cleanup and preventing memory leaks
  const authCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionMetadataRef = useRef<SessionMetadata | null>(
    typeof window !== 'undefined' ? storageHelpers.get<SessionMetadata | null>(SESSION_META_STORAGE_KEY) : null
  );
  const isMountedRef = useRef(true);

  // Optimized token management using API client directly
  const getToken = useCallback(() => {
    return apiClient.getToken();
  }, []);

  const setToken = useCallback((token: string) => {
    apiClient.setToken(token);
    log('info', 'Token set successfully');
  }, []);

  const applyCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    resetNavigationCache();
  }, []);

  const persistSessionMetadata = useCallback((metadata: SessionMetadata | null) => {
    if (!metadata) {
      sessionMetadataRef.current = null;
      storageHelpers.remove(SESSION_META_STORAGE_KEY);
      return;
    }

    const cleaned: SessionMetadata = {
      remember: Boolean(metadata.remember),
      expiresAt: metadata.expiresAt || null,
      sessionId: metadata.sessionId || null,
    };

    sessionMetadataRef.current = cleaned;
    storageHelpers.set(SESSION_META_STORAGE_KEY, cleaned);
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = undefined;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((
    expiresAt?: string | null,
    remember?: boolean,
    onExpire?: () => void
  ) => {
    clearRefreshTimer();
    if (!expiresAt) {
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();
    if (Number.isNaN(expirationTime)) {
      return;
    }

    const leadTime = 5 * 60 * 1000;
    const delay = expirationTime - Date.now() - leadTime;

    if (delay <= 0) {
      onExpire?.();
      return;
    }

    refreshTimeoutRef.current = setTimeout(() => {
      onExpire?.();
    }, delay);
  }, [clearRefreshTimer]);

  const clearAuth = useCallback(() => {
    apiClient.clearToken();
    storageHelpers.remove(USER_STORAGE_KEY);
    storageHelpers.remove(AUTH_STORAGE_KEY);

    // CRITICAL: Clear React Query cache on logout to prevent cross-user data leakage
    // This ensures new user doesn't see previous user's cached data
    queryClient.clear();

    // Also clear API client cache
    apiClient.clearCache();
    persistSessionMetadata(null);
    clearRefreshTimer();

    if (isMountedRef.current) {
      setIsAuthenticated(false);
      applyCurrentUser(null);
    }

    log('info', 'Authentication cleared - all caches purged');
  }, [applyCurrentUser, clearRefreshTimer, persistSessionMetadata, queryClient]);

  const refreshAuthToken = useCallback(async (rememberOverride?: boolean) => {
    const hasToken = getToken();
    if (!hasToken) {
      return;
    }

    const remember = rememberOverride ?? sessionMetadataRef.current?.remember ?? false;

    try {
      const response = await authService.refreshToken({ remember });

      if (!response?.token || !response.user) {
        return;
      }

      const mappedUser = {
        ...response.user,
        role: mapBackendRoleToFrontend(response.user.role),
      };

      setToken(response.token || response.access_token);
      applyCurrentUser(mappedUser);
      storageHelpers.set(USER_STORAGE_KEY, mappedUser);

      persistSessionMetadata({
        remember,
        expiresAt: response.expires_at,
        sessionId: response.session_id ?? sessionMetadataRef.current?.sessionId ?? null,
      });

      if (isMountedRef.current) {
        scheduleTokenRefresh(response.expires_at, remember, () => refreshAuthToken(remember));
      }
    } catch (error: any) {
      log('error', 'Token refresh failed', error?.message || error);
      clearAuth();
      toast({
        title: 'Sessiya müddəti bitdi',
        description: 'Zəhmət olmasa yenidən daxil olun.',
        variant: 'destructive',
      });
    }
  }, [applyCurrentUser, clearAuth, getToken, persistSessionMetadata, scheduleTokenRefresh, setToken, toast]);

  // Store auth functions in refs to avoid recreating debouncedAuthCheck
  const getTokenRef = useRef(getToken);
  const clearAuthRef = useRef(clearAuth);
  
  // Update refs when functions change
  useEffect(() => {
    getTokenRef.current = getToken;
    clearAuthRef.current = clearAuth;
  });

  // Optimized auth check with stable dependencies
  const debouncedAuthCheck = useRef(
    debounce(async (retryCount = 0) => {
      if (!isMountedRef.current) return;
      
      const startTime = performance.now();
      const token = getTokenRef.current();
      const requiresBearerAuth = typeof apiClient.isBearerAuthEnabled === 'function'
        ? apiClient.isBearerAuthEnabled()
        : true;

      try {
        log('info', `Checking authentication (attempt ${retryCount + 1})`, {
          hasToken: !!token,
          tokenLength: token?.length || 0,
          requiresBearerAuth
        });

        if (!token && requiresBearerAuth) {
          log('info', 'No token found - user not authenticated');
          if (isMountedRef.current) {
            setIsAuthenticated(false);
            applyCurrentUser(null);
            storageHelpers.remove(USER_STORAGE_KEY);
          }
          return;
        }

        // Try to restore user from localStorage first (for faster UX)
        const cachedUser = storageHelpers.get<User & { cacheTimestamp?: number }>(USER_STORAGE_KEY);
        if (cachedUser && isMountedRef.current) {
          applyCurrentUser(cachedUser);
          setIsAuthenticated(true);
          log('info', 'User temporarily restored from cache');
          
          // Return early if cache is fresh (less than 5 minutes)
          const cacheTime = cachedUser.cacheTimestamp || 0;
          const now = Date.now();
          if (now - cacheTime < 5 * 60 * 1000) {
            log('info', 'Using fresh cached user data, skipping API call');
            return;
          }
        } else if (!cachedUser) {
          storageHelpers.remove(USER_STORAGE_KEY);
        }

        // Get fresh user data from API with timeout
        const user = await Promise.race([
          authService.getCurrentUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth check timeout')), 8000)
          )
        ]) as any;
        
        if (!isMountedRef.current) return;

        const mappedUser = {
          ...user,
          role: mapBackendRoleToFrontend(user.role),
          cacheTimestamp: Date.now()
        };

        applyCurrentUser(mappedUser);
        setIsAuthenticated(true);
        
        // Update localStorage cache with timestamp
        storageHelpers.set(USER_STORAGE_KEY, mappedUser);
        const storedMeta = sessionMetadataRef.current;
        if (storedMeta?.expiresAt) {
          scheduleTokenRefresh(
            storedMeta.expiresAt,
            storedMeta.remember,
            () => refreshAuthToken(storedMeta.remember)
          );
        }
        
        const duration = performance.now() - startTime;
        log('info', 'Authentication successful', { 
          username: mappedUser.username, 
          role: mappedUser.role,
          duration: `${duration.toFixed(2)}ms`
        });

    } catch (error: any) {
      const duration = performance.now() - startTime;
      log('error', `Auth check failed (attempt ${retryCount + 1}) after ${duration.toFixed(2)}ms`, error.message);

      const isTimeoutError = error.message?.includes('timeout');
      const isNetworkError = error.message?.includes('fetch') || 
                            error.message?.includes('NetworkError') ||
                            error.message?.includes('Failed to fetch');
      
      const is401Error = error.message?.includes('401') || 
                        error.message?.includes('Unauthenticated');
      const requiresBearerAuth = typeof apiClient.isBearerAuthEnabled === 'function'
        ? apiClient.isBearerAuthEnabled()
        : true;

      if (is401Error) {
        log('warn', 'Token is invalid/expired, clearing auth');
        clearAuthRef.current();
      } else if ((isNetworkError || isTimeoutError) && retryCount < 1) {
        log('info', `Network/timeout error - retrying in ${(retryCount + 1) * 2000}ms`);
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            debouncedAuthCheck.current?.(retryCount + 1);
          }
        }, (retryCount + 1) * 2000);
        return;
      } else if (requiresBearerAuth && !getTokenRef.current()) {
        // No token exists, safe to set unauthenticated
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          applyCurrentUser(null);
        }
      }
      // For other errors with valid token, keep current state
    }
    }, 100) // Reduced from 300ms to 100ms for faster response
  );

  // Initial auth check on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    const checkAuth = async () => {
      await debouncedAuthCheck.current?.();
      if (isMountedRef.current) {
        setLoading(false);
      }
    };

    checkAuth();

    const cleanupAuthTimeoutRef = authCheckTimeoutRef;
    const cleanupRetryTimeoutRef = retryTimeoutRef;
    const cleanupDebouncedRef = debouncedAuthCheck;

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      const authTimeout = cleanupAuthTimeoutRef.current;
      if (authTimeout) {
        clearTimeout(authTimeout);
        cleanupAuthTimeoutRef.current = undefined;
      }
      const retryTimeout = cleanupRetryTimeoutRef.current;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        cleanupRetryTimeoutRef.current = undefined;
      }
      cleanupDebouncedRef.current?.cancel?.(); // Cancel debounced function
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]); // Remove debouncedAuthCheck from dependencies to prevent loop

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);

      queryClient.clear();
      apiClient.clearCache();
      log('info', 'Pre-login cache cleared');

      const response = await authService.login(credentials);

      if (response.requires_password_change) {
        log('warn', 'Password change required before granting access');
        persistSessionMetadata(null);
        storageHelpers.remove(AUTH_STORAGE_KEY);

        toast({
          title: 'Şifrə yenilənməlidir',
          description: 'Zəhmət olmasa şifrənizi yeniləyin. "Şifrəni unutmusunuz?" seçimini istifadə edin.',
          variant: 'destructive',
        });

        const passwordChangeError: any = new Error('PASSWORD_RESET_REQUIRED');
        passwordChangeError.code = 'PASSWORD_RESET_REQUIRED';
        passwordChangeError.resetToken = response.token;
        passwordChangeError.email = credentials.email;
        throw passwordChangeError;
      }

      log('info', 'Login successful', { username: response.user.username });

      const mappedUser = {
        ...response.user,
        role: mapBackendRoleToFrontend(response.user.role)
      };
      const rememberSession = response.remember ?? Boolean(credentials.remember);

      setToken(response.token || response.access_token);
      applyCurrentUser(mappedUser);
      setIsAuthenticated(true);
      storageHelpers.set(USER_STORAGE_KEY, mappedUser);
      persistSessionMetadata({
        remember: rememberSession,
        expiresAt: response.expires_at,
        sessionId: response.session_id ?? null,
      });
      scheduleTokenRefresh(
        response.expires_at,
        rememberSession,
        () => refreshAuthToken(rememberSession)
      );

      toast({
        title: 'Uğurlu giriş',
        description: `Xoş gəlmisiniz, ${mappedUser.name}!`,
      });

      return true;
    } catch (error: any) {
      const message = error.message || 'Giriş xətası baş verdi';
      log('error', 'Login failed', message);

      toast({
        title: 'Giriş xətası',
        description: message,
        variant: 'destructive',
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [applyCurrentUser, persistSessionMetadata, queryClient, refreshAuthToken, scheduleTokenRefresh, setToken, toast]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
      log('info', 'Logout successful');
    } catch (error) {
      log('error', 'Logout error', error);
    } finally {
      clearAuth();
      setLoading(false);
      
      toast({
        title: 'Çıxış',
        description: 'Uğurla çıxış etdiniz',
      });
    }
  }, [clearAuth, toast]);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!getToken()) return;
    
    try {
      const user = await authService.getCurrentUser();
      const mappedUser = {
        ...user,
        role: mapBackendRoleToFrontend(user.role)
      };
      
      applyCurrentUser(mappedUser);
      storageHelpers.set(USER_STORAGE_KEY, mappedUser);
      log('info', 'User data refreshed');
    } catch (error) {
      log('error', 'User refresh failed', error);
      await logout();
    }
  }, [applyCurrentUser, getToken, logout]);

  // Memoized permission and role checks
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    const normalizedRole = normalizeUserRole(currentUser.role);
    if (normalizedRole === USER_ROLES.SUPERADMIN) return true;
    return currentUser.permissions?.includes(permission) || false;
  }, [currentUser]);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    const normalizedRole = normalizeUserRole(currentUser.role);
    if (Array.isArray(role)) {
      return role.includes(normalizedRole);
    }
    return normalizedRole === role;
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key) return;

      if (
        (event.key === AUTH_STORAGE_KEY || event.key === SESSION_META_STORAGE_KEY) &&
        event.newValue === null
      ) {
        clearAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clearAuth]);

  // Memoized context value to prevent unnecessary re-renders
  const value = React.useMemo<AuthContextType>(() => ({
    isAuthenticated,
    currentUser,
    loading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    clearAuth
  }), [
    isAuthenticated,
    currentUser,
    loading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    clearAuth
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
