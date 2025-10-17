import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, LoginCredentials } from '@/services/auth';
import { apiClient } from '@/services/apiOptimized';
import { storageHelpers } from '@/utils/helpers';
import { User } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { USER_ROLES, UserRole, isValidRole } from '@/constants/roles';
import { usePerformanceMonitor } from '@/utils/performance/hooks';

// Single storage location for token and user data
const AUTH_STORAGE_KEY = 'atis_auth_token';
const USER_STORAGE_KEY = 'atis_current_user';

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
  const isMountedRef = useRef(true);

  // Optimized token management using API client directly
  const getToken = useCallback(() => {
    return apiClient.getToken();
  }, []);

  const setToken = useCallback((token: string) => {
    apiClient.setToken(token);
    log('info', 'Token set successfully');
  }, []);

  const clearAuth = useCallback(() => {
    apiClient.clearToken();
    storageHelpers.remove(USER_STORAGE_KEY);

    // CRITICAL: Clear React Query cache on logout to prevent cross-user data leakage
    // This ensures new user doesn't see previous user's cached data
    queryClient.clear();

    // Also clear API client cache
    apiClient.clearCache();

    if (isMountedRef.current) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }

    log('info', 'Authentication cleared - all caches purged');
  }, [queryClient]);

  // Store auth functions in refs to avoid recreating debouncedAuthCheck
  const getTokenRef = useRef(getToken);
  const clearAuthRef = useRef(clearAuth);
  
  // Update refs when functions change
  useEffect(() => {
    getTokenRef.current = getToken;
    clearAuthRef.current = clearAuth;
  });

  // Optimized auth check with stable dependencies
  const debouncedAuthCheck = useCallback(
    debounce(async (retryCount = 0) => {
      if (!isMountedRef.current) return;
      
      const startTime = performance.now();
      
      try {
        const token = getTokenRef.current();
        log('info', `Checking authentication (attempt ${retryCount + 1})`, {
          hasToken: !!token,
          tokenLength: token?.length || 0
        });

        if (!token) {
          log('info', 'No token found - user not authenticated');
          if (isMountedRef.current) {
            setIsAuthenticated(false);
            setCurrentUser(null);
            storageHelpers.remove(USER_STORAGE_KEY);
          }
          return;
        }

        // Try to restore user from localStorage first (for faster UX)
        const cachedUser = storageHelpers.get<User & { cacheTimestamp?: number }>(USER_STORAGE_KEY);
        if (cachedUser && isMountedRef.current) {
          setCurrentUser(cachedUser);
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

        setCurrentUser(mappedUser);
        setIsAuthenticated(true);
        
        // Update localStorage cache with timestamp
        storageHelpers.set(USER_STORAGE_KEY, mappedUser);
        
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

        if (is401Error) {
          log('warn', 'Token is invalid/expired, clearing auth');
          clearAuthRef.current();
        } else if ((isNetworkError || isTimeoutError) && retryCount < 1 && isMountedRef.current) {
          log('info', `Network/timeout error - retrying in ${(retryCount + 1) * 2000}ms`);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              debouncedAuthCheck(retryCount + 1);
            }
          }, (retryCount + 1) * 2000);
          return;
        } else if (!getTokenRef.current()) {
          // No token exists, safe to set unauthenticated
          if (isMountedRef.current) {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }
        // For other errors with valid token, keep current state
      }
    }, 100), // Reduced from 300ms to 100ms for faster response
    [] // Empty dependency array to prevent recreation
  );

  // Initial auth check on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    const checkAuth = async () => {
      await debouncedAuthCheck();
      if (isMountedRef.current) {
        setLoading(false);
      }
    };

    checkAuth();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      debouncedAuthCheck.cancel?.(); // Cancel debounced function
    };
  }, []); // Remove debouncedAuthCheck from dependencies to prevent loop

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);

      // CRITICAL: Clear all caches BEFORE login to prevent previous user's data from leaking
      // This is essential when switching between different SektorAdmin users
      queryClient.clear();
      apiClient.clearCache();
      log('info', 'Pre-login cache cleared');

      const response = await authService.login(credentials);

      log('info', 'Login successful', { username: response.user.username });

      const mappedUser = {
        ...response.user,
        role: mapBackendRoleToFrontend(response.user.role)
      };

      // Store token and user data
      setToken(response.token || response.access_token);
      setCurrentUser(mappedUser);
      setIsAuthenticated(true);

      // Cache user data
      storageHelpers.set(USER_STORAGE_KEY, mappedUser);

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

      return false;
    } finally {
      setLoading(false);
    }
  }, [setToken, toast, queryClient]);

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
      
      setCurrentUser(mappedUser);
      storageHelpers.set(USER_STORAGE_KEY, mappedUser);
      log('info', 'User data refreshed');
    } catch (error) {
      log('error', 'User refresh failed', error);
      await logout();
    }
  }, [getToken, logout]);

  // Memoized permission and role checks
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === USER_ROLES.SUPERADMIN) return true;
    return currentUser.permissions?.includes(permission) || false;
  }, [currentUser]);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    if (Array.isArray(role)) {
      return role.includes(currentUser.role);
    }
    return currentUser.role === role;
  }, [currentUser]);

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
