/**
 * PermissionGate - Permission-based rendering component
 * 
 * This component conditionally renders children based on user roles and permissions.
 * It provides a declarative way to handle role-based access control in the UI.
 * 
 * Usage:
 * <PermissionGate roles={[USER_ROLES.SUPERADMIN]} fallback={<div>No access</div>}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * <PermissionGate permissions={['users.create']} requireAll>
 *   <CreateUserButton />
 * </PermissionGate>
 */

import React from 'react';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { UserRole } from '@/constants/roles';
import { AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface PermissionGateProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  requireAll?: boolean; // true = AND logic, false = OR logic (default)
  fallback?: React.ReactNode;
  showFallback?: boolean; // Show fallback UI or just hide content
  fallbackType?: 'simple' | 'card' | 'alert';
  fallbackMessage?: string;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback,
  showFallback = false,
  fallbackType = 'simple',
  fallbackMessage
}) => {
  const { 
    canAccess, 
    hasAnyRole, 
    hasAllRoles, 
    hasAnyPermission, 
    hasAllPermissions 
  } = useRoleCheck();

  // Check role access
  let hasRoleAccess = true;
  if (roles.length > 0) {
    hasRoleAccess = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
  }

  // Check permission access
  let hasPermissionAccess = true;
  if (permissions.length > 0) {
    hasPermissionAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  // Final access check
  const hasAccess = hasRoleAccess && hasPermissionAccess;

  // If access granted, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If no access and shouldn't show fallback, return null
  if (!showFallback && !fallback) {
    return null;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback based on type
  const defaultMessage = fallbackMessage || 'Bu əməliyyat üçün icazəniz yoxdur';

  switch (fallbackType) {
    case 'card':
      return (
        <Card className="border-destructive/20">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Lock className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{defaultMessage}</p>
            </div>
          </CardContent>
        </Card>
      );

    case 'alert':
      return (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{defaultMessage}</p>
        </div>
      );

    default: // simple
      return (
        <div className="text-sm text-muted-foreground p-2">
          {defaultMessage}
        </div>
      );
  }
};

/**
 * Higher-order component for permission-based rendering
 */
export const withPermissionGate = <P extends object>(
  Component: React.ComponentType<P>,
  gateProps: Omit<PermissionGateProps, 'children'>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <PermissionGate {...gateProps}>
      <Component {...props} ref={ref} />
    </PermissionGate>
  ));
};

/**
 * Hook for conditional rendering based on permissions
 */
export const usePermissionGate = (
  roles: UserRole[] = [],
  permissions: string[] = [],
  requireAll: boolean = false
) => {
  const { canAccess, hasAnyRole, hasAllRoles, hasAnyPermission, hasAllPermissions } = useRoleCheck();

  const checkAccess = React.useCallback(() => {
    let hasRoleAccess = true;
    if (roles.length > 0) {
      hasRoleAccess = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
    }

    let hasPermissionAccess = true;
    if (permissions.length > 0) {
      hasPermissionAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }

    return hasRoleAccess && hasPermissionAccess;
  }, [roles, permissions, requireAll, hasAnyRole, hasAllRoles, hasAnyPermission, hasAllPermissions]);

  return {
    canAccess: checkAccess(),
    checkAccess
  };
};

/**
 * Convenience components for common permission patterns
 */

// Admin-only content
export const AdminGate: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate 
    roles={['superadmin', 'regionadmin', 'sektoradmin'] as UserRole[]} 
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

// SuperAdmin-only content
export const SuperAdminGate: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate 
    roles={['superadmin'] as UserRole[]} 
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

// School management content
export const SchoolGate: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate 
    roles={['superadmin', 'schooladmin'] as UserRole[]} 
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

// Teacher content
export const TeacherGate: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate 
    roles={['superadmin', 'schooladmin', 'müəllim'] as UserRole[]} 
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

export default PermissionGate;