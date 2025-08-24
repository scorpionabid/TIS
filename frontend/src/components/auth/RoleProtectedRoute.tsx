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

  console.log('🛡️ RoleProtectedRoute: Security check for roles:', allowedRoles, {
    loading,
    isAuthenticated,
    hasCurrentUser: !!currentUser,
    currentUserRole: currentUser?.role,
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    console.log('🛡️ RoleProtectedRoute: Still loading auth, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    console.log('🛡️ RoleProtectedRoute: No currentUser, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    console.log('🛡️ RoleProtectedRoute: Insufficient permissions, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  console.log('🛡️ RoleProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};