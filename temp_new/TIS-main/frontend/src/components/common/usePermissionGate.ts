import { useCallback } from 'react';
import type { UserRole } from '@/constants/roles';
import { useRoleCheck } from '@/hooks/useRoleCheck';

export const usePermissionGate = (
  roles: UserRole[] = [],
  permissions: string[] = [],
  requireAll: boolean = false
) => {
  const { hasAnyRole, hasAllRoles, hasAnyPermission, hasAllPermissions } = useRoleCheck();

  const checkAccess = useCallback(() => {
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
    checkAccess,
  };
};
