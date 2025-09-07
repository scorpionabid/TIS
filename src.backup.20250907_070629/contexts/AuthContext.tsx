import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User as AuthUser, LoginCredentials } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'superadmin' | 'regionadmin' | 'regionoperator' | 'sektoradmin' | 'məktəbadmin' | 'müəllim' | 'user';

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
    const checkAuth = async () => {
      try {
        console.log('🔍 AuthContext: Checking authentication');
        if (authService.isAuthenticated()) {
          console.log('🔍 AuthContext: User is authenticated, getting current user');
          const user = await authService.getCurrentUser();
          console.log('👤 AuthContext: Got current user:', user);
          console.log('🎭 AuthContext: Current user role:', user.role);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          console.log('🔍 AuthContext: User is not authenticated');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.clearAuth();
      } finally {
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
      console.log('🎭 AuthContext: User role:', response.user.role);
      
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      
      toast({
        title: 'Uğurlu giriş',
        description: `Xoş gəlmisiniz, ${response.user.name}!`,
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