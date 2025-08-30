/**
 * useRoleCheck - Centralized role checking hook
 * 
 * This hook provides utility functions for checking user roles and permissions
 * without duplicating role checking logic across components.
 * 
 * Usage:
 * const { isRole, hasAnyRole, hasAllRoles, canAccess } = useRoleCheck();
 * if (isRole('superadmin')) { ... }
 * if (hasAnyRole(['superadmin', 'regionadmin'])) { ... }
 */

import { useMemo } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { 
  USER_ROLES, 
  ROLE_GROUPS, 
  canManageRole, 
  isAdminRole, 
  isManagementRole,
  isSchoolRole,
  getRoleHierarchyLevel 
} from '@/constants/roles';
import { performanceMonitor } from '@/utils/performanceMonitor';

export interface RoleCheckResult {
  // Basic role checks
  isRole: (role: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Hierarchical checks
  canManage: (targetRole: UserRole) => boolean;
  hasHierarchyLevel: (level: number) => boolean;
  isHigherThan: (role: UserRole) => boolean;
  
  // Role group checks
  isAdmin: boolean;
  isManagement: boolean;
  isSchoolUser: boolean;
  isSuperAdmin: boolean;
  isRegionAdmin: boolean;
  isSektorAdmin: boolean;
  isSchoolAdmin: boolean;
  isTeacher: boolean;
  
  // Access utility
  canAccess: (requiredRoles: UserRole[], requiredPermissions?: string[]) => boolean;
  
  // Current user info
  currentUser: ReturnType<typeof useAuth>['currentUser'];
  currentRole: UserRole | null;
  currentPermissions: string[];
}

export const useRoleCheck = (): RoleCheckResult => {
  const { currentUser, hasRole, hasPermission } = useAuth();

  // Memoized calculations for performance
  const calculations = useMemo(() => {
    const currentRole = currentUser?.role || null;
    const currentPermissions = currentUser?.permissions || [];
    
    return {
      currentRole,
      currentPermissions,
      isAdmin: currentRole ? isAdminRole(currentRole) : false,
      isManagement: currentRole ? isManagementRole(currentRole) : false,
      isSchoolUser: currentRole ? isSchoolRole(currentRole) : false,
      isSuperAdmin: currentRole === USER_ROLES.SUPERADMIN,
      isRegionAdmin: currentRole === USER_ROLES.REGIONADMIN,
      isSektorAdmin: currentRole === USER_ROLES.SEKTORADMIN,
      isSchoolAdmin: currentRole === USER_ROLES.SCHOOLADMIN,
      isTeacher: currentRole === USER_ROLES.MUELLIM,
    };
  }, [currentUser]);

  // Role checking functions
  const isRole = (role: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    return hasRole(role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.some(role => hasRole(role));
  };

  const hasAllRoles = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.every(role => hasRole(role));
  };

  // Permission checking functions
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!currentUser) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!currentUser) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  // Hierarchical checking functions
  const canManage = (targetRole: UserRole): boolean => {
    if (!calculations.currentRole) return false;
    return canManageRole(calculations.currentRole, targetRole);
  };

  const hasHierarchyLevel = (level: number): boolean => {
    if (!calculations.currentRole) return false;
    return getRoleHierarchyLevel(calculations.currentRole) <= level;
  };

  const isHigherThan = (role: UserRole): boolean => {
    if (!calculations.currentRole) return false;
    const currentLevel = getRoleHierarchyLevel(calculations.currentRole);
    const targetLevel = getRoleHierarchyLevel(role);
    return currentLevel < targetLevel;
  };

  // Access utility function with performance monitoring
  const canAccess = (requiredRoles: UserRole[], requiredPermissions?: string[]): boolean => {
    const startTime = performance.now();
    
    if (!currentUser) return false;
    
    const hasRequiredRole = hasAnyRole(requiredRoles);
    const hasRequiredPermissions = requiredPermissions 
      ? hasAllPermissions(requiredPermissions)
      : true;
    
    const result = hasRequiredRole && hasRequiredPermissions;
    
    // Record performance metric for complex access checks
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (requiredPermissions && requiredPermissions.length > 0) {
      performanceMonitor.recordRoleCheck({
        name: 'role-access-check',
        roleCheckType: 'canAccess',
        duration,
        rolesChecked: requiredRoles,
        permissionsChecked: requiredPermissions || [],
        result,
        metadata: {
          userRole: calculations.currentRole,
          hasRequiredRole,
          hasRequiredPermissions
        }
      });
    }
    
    return result;
  };

  return {
    // Basic role checks
    isRole,
    hasAnyRole,
    hasAllRoles,
    
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Hierarchical checks
    canManage,
    hasHierarchyLevel,
    isHigherThan,
    
    // Role group checks
    ...calculations,
    
    // Access utility
    canAccess,
    
    // Current user info
    currentUser,
  };
};

// Convenience hooks for common patterns
export const useSuperAdminCheck = () => {
  const { isSuperAdmin } = useRoleCheck();
  return isSuperAdmin;
};

export const useAdminCheck = () => {
  const { isAdmin } = useRoleCheck();
  return isAdmin;
};

export const useSchoolAdminCheck = () => {
  const { isSchoolAdmin } = useRoleCheck();
  return isSchoolAdmin;
};

export const useTeacherCheck = () => {
  const { isTeacher } = useRoleCheck();
  return isTeacher;
};

// Higher-order function to create role-specific checks
export const createRoleChecker = (allowedRoles: UserRole[]) => {
  return () => {
    const { hasAnyRole } = useRoleCheck();
    return hasAnyRole(allowedRoles);
  };
};

// Pre-built role checkers for common combinations
export const useManagementRoleCheck = createRoleChecker(ROLE_GROUPS.MANAGEMENT_ROLES);
export const useAdminRoleCheck = createRoleChecker(ROLE_GROUPS.ADMIN_ROLES);
export const useSchoolRoleCheck = createRoleChecker(ROLE_GROUPS.SCHOOL_ROLES);

export default useRoleCheck;