import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/'
}) => {
  const { currentUser, hasRole, loading, isAuthenticated } = useAuth();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const debugLog = (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  };

  debugLog('🛡️ RoleProtectedRoute: Security check for roles:', allowedRoles, {
    loading,
    isAuthenticated,
    hasCurrentUser: !!currentUser,
    currentUserRole: currentUser?.role,
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    debugLog('🛡️ RoleProtectedRoute: Still loading auth, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    debugLog('🛡️ RoleProtectedRoute: No currentUser, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    debugLog('🛡️ RoleProtectedRoute: Insufficient permissions, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  debugLog('🛡️ RoleProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};
