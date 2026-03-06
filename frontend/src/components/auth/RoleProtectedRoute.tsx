import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: string[];
  permissionMatch?: 'any' | 'all';
  redirectTo?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  permissionMatch = 'any',
  redirectTo = '/'
}) => {
  const { currentUser, hasRole, hasPermission, loading, isAuthenticated } = useAuth();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const debugLog = (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  };

  const permissionMetadata = {
    permissions: requiredPermissions,
    matchType: permissionMatch
  };

  debugLog('🛡️ RoleProtectedRoute: Security check for roles:', allowedRoles, {
    loading,
    isAuthenticated,
    hasCurrentUser: !!currentUser,
    currentUserRole: currentUser?.role,
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString(),
    ...permissionMetadata
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

  const roleAllowed =
    allowedRoles.length === 0 ? true : hasRole(allowedRoles);

  const permissionsAllowed =
    requiredPermissions.length === 0
      ? true
      : permissionMatch === 'all'
        ? requiredPermissions.every((permission) => hasPermission(permission))
        : requiredPermissions.some((permission) => hasPermission(permission));

  performanceMonitor.recordRoleCheck({
    name: `role-check-${window.location.pathname}`,
    duration: 0,
    roleCheckType: 'route-guard',
    rolesChecked: allowedRoles,
    permissionsChecked: requiredPermissions,
    result: roleAllowed && permissionsAllowed
  });

  if (!roleAllowed || !permissionsAllowed) {
    debugLog('🛡️ RoleProtectedRoute: Insufficient permissions, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  debugLog('🛡️ RoleProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};
