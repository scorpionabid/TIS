import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, LoginCredentials } from '@/services/auth';
import { User } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { USER_ROLES, UserRole, isValidRole } from '@/constants/roles';

// Backend to Frontend role mapping
const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
  const roleMapping: Record<string, UserRole> = {
    'superadmin': USER_ROLES.SUPERADMIN,
    'regionadmin': USER_ROLES.REGIONADMIN, 
    'regionoperator': USER_ROLES.REGIONOPERATOR,
    'sektoradmin': USER_ROLES.SEKTORADMIN,
    'schooladmin': USER_ROLES.SCHOOLADMIN, // Backend schooladmin → Frontend schooladmin
    'muavin': USER_ROLES.MUELLIM,
    'ubr': USER_ROLES.MUELLIM, 
    'tesarrufat': USER_ROLES.MUELLIM,
    'psixoloq': USER_ROLES.MUELLIM,
    'müəllim': USER_ROLES.MUELLIM
  };
  
  const mappedRole = roleMapping[backendRole];
  return mappedRole && isValidRole(mappedRole) ? mappedRole : USER_ROLES.MUELLIM;
};

// User interface now imported from centralized types

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async (retryCount = 0) => {
      try {
        console.log('🔍 AuthContext: Checking authentication (attempt', retryCount + 1, ')');
        
        const hasToken = authService.isAuthenticated();
        const rawToken = authService.getToken();
        const localStorageToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('current_user');
        
        console.log('🔍 AuthContext: Token status:', {
          hasToken: hasToken,
          authServiceToken: rawToken ? `${rawToken.substring(0, 15)}...` : 'null',
          localStorageToken: localStorageToken ? `${localStorageToken.substring(0, 15)}...` : 'null',
          hasSavedUser: !!savedUser,
          localStorageKeys: Object.keys(localStorage),
          tokenLengths: {
            authService: rawToken?.length || 0,
            localStorage: localStorageToken?.length || 0
          }
        });
        
        if (hasToken) {
          console.log('🔍 AuthContext: Token found, getting current user');
          
          // Try to restore user from localStorage first for faster UX
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              console.log('🔄 AuthContext: Temporarily restoring user from localStorage');
              setCurrentUser(parsedUser);
              setIsAuthenticated(true);
            } catch (e) {
              console.warn('🔍 AuthContext: Failed to parse saved user');
            }
          }
          
          const user = await authService.getCurrentUser();
          console.log('👤 AuthContext: Got current user from API:', user);
          console.log('🎭 AuthContext: Raw backend role:', user.role);
          
          // Map backend role to frontend role
          const mappedUser = {
            ...user,
            role: mapBackendRoleToFrontend(user.role)
          };
          console.log('🎭 AuthContext: Mapped frontend role:', mappedUser.role);
          
          setCurrentUser(mappedUser);
          setIsAuthenticated(true);
          
          // Save user to localStorage for persistence
          localStorage.setItem('current_user', JSON.stringify(mappedUser));
          console.log('✅ AuthContext: Authentication successful');
        } else {
          console.log('🔍 AuthContext: No token found - user not authenticated');
          setIsAuthenticated(false);
          setCurrentUser(null);
          localStorage.removeItem('current_user');
        }
      } catch (error) {
        console.error('❌ Auth check failed (attempt', retryCount + 1, '):', error);
        
        // Check if it's a network error and we should retry
        const isNetworkError = error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('Failed to fetch')
        );
        
        const is401Error = error instanceof Error && (
          error.message.includes('401') || 
          error.message.includes('Unauthenticated')
        );
        
        if (is401Error) {
          console.log('🔍 AuthContext: 401/Unauthenticated error - checking token validity');
          const currentToken = authService.getToken();
          
          if (currentToken) {
            console.log('🔍 AuthContext: Token exists but API returned 401 - token is invalid/expired');
            console.log('🗑️ AuthContext: Clearing invalid token and setting unauthenticated state');
            authService.clearAuth();
          } else {
            console.log('🔍 AuthContext: No token found - user was already logged out');
          }
          
          setIsAuthenticated(false);
          setCurrentUser(null);
          localStorage.removeItem('current_user');
        } else if (isNetworkError && retryCount < 2) {
          console.log('🔄 AuthContext: Network error - retrying in 1 second...');
          setTimeout(() => checkAuth(retryCount + 1), 1000);
          return; // Don't continue to finally block
        } else {
          console.log('🔍 AuthContext: Other error or max retries reached');
          
          // For other errors, don't clear token - might be temporary API issue
          // Only update state if we don't have a token
          const hasToken = authService.isAuthenticated();
          if (!hasToken) {
            console.log('🔍 AuthContext: No token found - setting unauthenticated');
            setIsAuthenticated(false);
            setCurrentUser(null);
          } else {
            console.log('🔍 AuthContext: Token exists but API call failed - keeping authenticated state');
            // Keep the current authentication state - don't log out on temporary errors
          }
        }
      } finally {
        // Only set loading to false if we're not retrying
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      
      console.log('🔍 AuthContext: Login response:', response);
      console.log('👤 AuthContext: Setting user:', response.user);
      console.log('🎭 AuthContext: Raw backend role:', response.user.role);
      console.log('🔑 AuthContext: Token set in apiClient:', !!authService.getToken());
      
      // Map backend role to frontend role
      const mappedUser = {
        ...response.user,
        role: mapBackendRoleToFrontend(response.user.role)
      };
      console.log('🎭 AuthContext: Mapped frontend role:', mappedUser.role);
      
      setCurrentUser(mappedUser);
      setIsAuthenticated(true);
      
      // Save user to localStorage for debugging
      localStorage.setItem('current_user', JSON.stringify(mappedUser));
      
      console.log('✅ AuthContext: Login completed - isAuthenticated:', true);
      console.log('✅ AuthContext: Current user set:', mappedUser.username);
      
      toast({
        title: 'Uğurlu giriş',
        description: `Xoş gəlmisiniz, ${mappedUser.name}!`,
      });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Giriş xətası baş verdi';
      
      toast({
        title: 'Giriş xətası',
        description: message,
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      
      // Clear user from localStorage
      localStorage.removeItem('current_user');
      
      toast({
        title: 'Çıxış',
        description: 'Uğurla çıxış etdiniz',
      });
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('User refresh failed:', error);
      await logout();
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    
    // SuperAdmin has all permissions
    if (currentUser.role === USER_ROLES.SUPERADMIN) return true;
    
    return currentUser.permissions.includes(permission);
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    
    if (Array.isArray(role)) {
      return role.includes(currentUser.role);
    }
    
    return currentUser.role === role;
  };

  console.log('🔗 AuthContext value:', { currentUser, isAuthenticated, loading });
  
  const value: AuthContextType = {
    isAuthenticated,
    currentUser,
    loading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};