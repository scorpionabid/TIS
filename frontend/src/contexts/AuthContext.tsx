import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User as AuthUser, LoginCredentials } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'superadmin' | 'regionadmin' | 'regionoperator' | 'sektoradmin' | 'məktəbadmin' | 'müəllim' | 'user';

// Backend to Frontend role mapping
const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
  const roleMapping: Record<string, UserRole> = {
    'superadmin': 'superadmin',
    'regionadmin': 'regionadmin', 
    'regionoperator': 'regionoperator',
    'sektoradmin': 'sektoradmin',
    'schooladmin': 'məktəbadmin', // Backend schooladmin → Frontend məktəbadmin
    'muavin': 'müəllim',
    'ubr': 'müəllim', 
    'tesarrufat': 'müəllim',
    'psixoloq': 'müəllim',
    'müəllim': 'müəllim'
  };
  
  return roleMapping[backendRole] || 'user';
};

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole;
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
        console.log('🔍 AuthContext: Has token:', hasToken);
        
        if (hasToken) {
          console.log('🔍 AuthContext: Token found, getting current user');
          const user = await authService.getCurrentUser();
          console.log('👤 AuthContext: Got current user:', user);
          console.log('🎭 AuthContext: Raw backend role:', user.role);
          
          // Map backend role to frontend role
          const mappedUser = {
            ...user,
            role: mapBackendRoleToFrontend(user.role)
          };
          console.log('🎭 AuthContext: Mapped frontend role:', mappedUser.role);
          
          setCurrentUser(mappedUser);
          setIsAuthenticated(true);
          
          // Save user to localStorage for debugging
          localStorage.setItem('current_user', JSON.stringify(mappedUser));
          console.log('✅ AuthContext: Authentication successful');
        } else {
          console.log('🔍 AuthContext: No token found - user not authenticated');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check failed (attempt', retryCount + 1, '):', error);
        
        // Check if it's a network error and we should retry
        const isNetworkError = error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('Failed to fetch')
        );
        
        const is401Error = error instanceof Error && error.message.includes('401');
        
        if (is401Error) {
          console.log('🔍 AuthContext: 401 error - invalid/expired token');
          authService.clearAuth();
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else if (isNetworkError && retryCount < 2) {
          console.log('🔄 AuthContext: Network error - retrying in 1 second...');
          setTimeout(() => checkAuth(retryCount + 1), 1000);
          return; // Don't continue to finally block
        } else {
          console.log('🔍 AuthContext: Other error or max retries reached - assuming not authenticated');
          // For other errors after retries, assume not authenticated
          setIsAuthenticated(false);
          setCurrentUser(null);
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
    if (currentUser.role === 'superadmin') return true;
    
    return currentUser.permissions.includes(permission);
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    
    if (Array.isArray(role)) {
      return role.includes(currentUser.role);
    }
    
    return currentUser.role === role;
  };

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