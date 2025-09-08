import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { authService, LoginCredentials } from '@/services/auth';
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
  'superadmin': USER_ROLES.SUPERADMIN,
  'regionadmin': USER_ROLES.REGIONADMIN, 
  'regionoperator': USER_ROLES.REGIONOPERATOR,
  'sektoradmin': USER_ROLES.SEKTORADMIN,
  'schooladmin': USER_ROLES.SCHOOLADMIN,
  'muavin': USER_ROLES.MUELLIM,
  'ubr': USER_ROLES.MUELLIM, 
  'tesarrufat': USER_ROLES.MUELLIM,
  'psixoloq': USER_ROLES.MUELLIM,
  'müəllim': USER_ROLES.MUELLIM
};

const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
  const mappedRole = ROLE_MAPPING[backendRole];
  return mappedRole && isValidRole(mappedRole) ? mappedRole : USER_ROLES.MUELLIM;
};

// Debounce utility to prevent excessive auth checks
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
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
  
  // Refs for cleanup and preventing memory leaks
  const authCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Optimized token management
  const getToken = useCallback(() => {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }, []);

  const setToken = useCallback((token: string) => {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    authService.setAuthToken(token);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    authService.clearAuth();
    
    if (isMountedRef.current) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
    
    log('info', 'Authentication cleared');
  }, []);

  // Debounced auth check to prevent excessive calls
  const debouncedAuthCheck = useCallback(
    debounce(async (retryCount = 0) => {
      if (!isMountedRef.current) return;
      
      try {
        const token = getToken();
        log('info', `Checking authentication (attempt ${retryCount + 1})`, {
          hasToken: !!token,
          tokenLength: token?.length || 0
        });

        if (!token) {
          log('info', 'No token found - user not authenticated');
          if (isMountedRef.current) {
            setIsAuthenticated(false);
            setCurrentUser(null);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
          return;
        }

        // Try to restore user from localStorage first (for faster UX)
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (savedUser && isMountedRef.current) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setCurrentUser(parsedUser);
            setIsAuthenticated(true);
            log('info', 'User temporarily restored from cache');
          } catch (e) {
            log('warn', 'Failed to parse cached user data');
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }

        // Get fresh user data from API
        const user = await authService.getCurrentUser();
        
        if (!isMountedRef.current) return;

        const mappedUser = {
          ...user,
          role: mapBackendRoleToFrontend(user.role)
        };

        setCurrentUser(mappedUser);
        setIsAuthenticated(true);
        
        // Update localStorage cache
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
        log('info', 'Authentication successful', { 
          username: mappedUser.username, 
          role: mappedUser.role 
        });

      } catch (error: any) {
        log('error', `Auth check failed (attempt ${retryCount + 1})`, error.message);

        const isNetworkError = error.message?.includes('fetch') || 
                              error.message?.includes('NetworkError') ||
                              error.message?.includes('Failed to fetch');
        
        const is401Error = error.message?.includes('401') || 
                          error.message?.includes('Unauthenticated');

        if (is401Error) {
          log('warn', 'Token is invalid/expired, clearing auth');
          clearAuth();
        } else if (isNetworkError && retryCount < 2 && isMountedRef.current) {
          log('info', `Network error - retrying in ${(retryCount + 1) * 1000}ms`);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              debouncedAuthCheck(retryCount + 1);
            }
          }, (retryCount + 1) * 1000);
          return;
        } else if (!getToken()) {
          // No token exists, safe to set unauthenticated
          if (isMountedRef.current) {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }
        // For other errors with valid token, keep current state
      }
    }, 300),
    [getToken, clearAuth]
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
  }, [debouncedAuthCheck]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);
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
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      
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
  }, [setToken, toast]);

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
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
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