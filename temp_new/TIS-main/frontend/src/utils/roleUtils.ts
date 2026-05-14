/**
 * Role and Permission Utility Functions
 * 
 * These utilities help with role-based access control, permission checking,
 * and component rendering decisions throughout the application.
 */

import { USER_ROLES, UserRole, ROLE_GROUPS, ROLE_HIERARCHY } from '@/constants/roles';

/**
 * Check if a role is higher in hierarchy than another
 */
export const isRoleHigher = (role1: UserRole, role2: UserRole): boolean => {
  return ROLE_HIERARCHY[role1] < ROLE_HIERARCHY[role2];
};

/**
 * Get all subordinate roles for a given role
 */
export const getSubordinateRoles = (role: UserRole): UserRole[] => {
  const currentLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level > currentLevel)
    .map(([roleKey, _]) => roleKey as UserRole);
};

/**
 * Get all superior roles for a given role
 */
export const getSuperiorRoles = (role: UserRole): UserRole[] => {
  const currentLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([roleKey, _]) => roleKey as UserRole);
};

/**
 * Check if a role can manage another role
 */
export const canRoleManage = (managerRole: UserRole, targetRole: UserRole): boolean => {
  return isRoleHigher(managerRole, targetRole);
};

/**
 * Get the appropriate dashboard path for a role
 */
export const getDashboardPath = (role: UserRole): string => {
  switch (role) {
    case USER_ROLES.SUPERADMIN:
      return '/';
    case USER_ROLES.REGIONADMIN:
      return '/regionadmin';
    case USER_ROLES.REGIONOPERATOR:
      return '/';
    case USER_ROLES.SEKTORADMIN:
      return '/';
    case USER_ROLES.SCHOOLADMIN:
    case USER_ROLES.MUELLIM:
      return '/';
    default:
      return '/';
  }
};

/**
 * Get role-specific color scheme
 */
export const getRoleColor = (role: UserRole): { bg: string; text: string; border: string } => {
  switch (role) {
    case USER_ROLES.SUPERADMIN:
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case USER_ROLES.REGIONADMIN:
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case USER_ROLES.REGIONOPERATOR:
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case USER_ROLES.SEKTORADMIN:
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case USER_ROLES.SCHOOLADMIN:
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    case USER_ROLES.MUELLIM:
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

/**
 * Get role-specific icon
 */
export const getRoleIcon = (role: UserRole): string => {
  switch (role) {
    case USER_ROLES.SUPERADMIN:
      return '👑';
    case USER_ROLES.REGIONADMIN:
      return '🗺️';
    case USER_ROLES.REGIONOPERATOR:
      return '📊';
    case USER_ROLES.SEKTORADMIN:
      return '🏛️';
    case USER_ROLES.SCHOOLADMIN:
      return '🏫';
    case USER_ROLES.MUELLIM:
      return '👨‍🏫';
    default:
      return '👤';
  }
};

/**
 * Permission checking utilities
 */
export const PERMISSIONS = {
  // User management
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  
  // Institution management
  INSTITUTIONS_CREATE: 'institutions.create',
  INSTITUTIONS_READ: 'institutions.read',
  INSTITUTIONS_UPDATE: 'institutions.update',
  INSTITUTIONS_DELETE: 'institutions.delete',
  
  // Survey management
  SURVEYS_CREATE: 'surveys.create',
  SURVEYS_READ: 'surveys.read',
  SURVEYS_UPDATE: 'surveys.update',
  SURVEYS_DELETE: 'surveys.delete',
  
  // Approval permissions
  APPROVALS_READ: 'approvals.read',
  APPROVALS_CREATE: 'approvals.create',
  APPROVALS_UPDATE: 'approvals.update',
  
  // Student management
  STUDENTS_CREATE: 'students.create',
  STUDENTS_READ: 'students.read',
  STUDENTS_UPDATE: 'students.update',
  STUDENTS_DELETE: 'students.delete',
  
  // Teacher management
  TEACHERS_CREATE: 'teachers.create',
  TEACHERS_READ: 'teachers.read',
  TEACHERS_UPDATE: 'teachers.update',
  TEACHERS_DELETE: 'teachers.delete',
  
  // Class management
  CLASSES_CREATE: 'classes.create',
  CLASSES_READ: 'classes.read',
  CLASSES_UPDATE: 'classes.update',
  CLASSES_DELETE: 'classes.delete',
  
  // Schedule management
  SCHEDULES_CREATE: 'schedules.create',
  SCHEDULES_READ: 'schedules.read',
  SCHEDULES_UPDATE: 'schedules.update',
  SCHEDULES_DELETE: 'schedules.delete',
  
  // Assessment management
  ASSESSMENTS_CREATE: 'assessments.create',
  ASSESSMENTS_READ: 'assessments.read',
  ASSESSMENTS_UPDATE: 'assessments.update',
  ASSESSMENTS_DELETE: 'assessments.delete',
  
  // Attendance management
  ATTENDANCE_CREATE: 'attendance.create',
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_UPDATE: 'attendance.update',
  
  // Report access
  REPORTS_READ: 'reports.read',
  ANALYTICS_READ: 'analytics.read',
  
  // System settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  
  // Audit logs
  AUDIT_LOGS_READ: 'audit.logs.read'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Permission groups for common access patterns
 */
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE
  ],
  INSTITUTION_MANAGEMENT: [
    PERMISSIONS.INSTITUTIONS_CREATE,
    PERMISSIONS.INSTITUTIONS_READ,
    PERMISSIONS.INSTITUTIONS_UPDATE,
    PERMISSIONS.INSTITUTIONS_DELETE
  ],
  STUDENT_MANAGEMENT: [
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.STUDENTS_DELETE
  ],
  TEACHER_MANAGEMENT: [
    PERMISSIONS.TEACHERS_CREATE,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.TEACHERS_UPDATE,
    PERMISSIONS.TEACHERS_DELETE
  ],
  ACADEMIC_MANAGEMENT: [
    PERMISSIONS.CLASSES_CREATE,
    PERMISSIONS.CLASSES_READ,
    PERMISSIONS.CLASSES_UPDATE,
    PERMISSIONS.SCHEDULES_CREATE,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_UPDATE,
    PERMISSIONS.ASSESSMENTS_CREATE,
    PERMISSIONS.ASSESSMENTS_READ,
    PERMISSIONS.ASSESSMENTS_UPDATE,
    PERMISSIONS.ATTENDANCE_CREATE,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_UPDATE
  ],
  SYSTEM_ADMINISTRATION: [
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.AUDIT_LOGS_READ
  ]
} as const;

/**
 * Check if a permission belongs to a specific group
 */
export const isPermissionInGroup = (permission: Permission, group: keyof typeof PERMISSION_GROUPS): boolean => {
  return PERMISSION_GROUPS[group].includes(permission);
};

/**
 * Get appropriate permissions for a role (role-based defaults)
 */
export const getDefaultPermissionsForRole = (role: UserRole): Permission[] => {
  switch (role) {
    case USER_ROLES.SUPERADMIN:
      return Object.values(PERMISSIONS);
    
    case USER_ROLES.REGIONADMIN:
      return [
        ...PERMISSION_GROUPS.USER_MANAGEMENT,
        ...PERMISSION_GROUPS.INSTITUTION_MANAGEMENT,
        ...PERMISSION_GROUPS.STUDENT_MANAGEMENT,
        ...PERMISSION_GROUPS.TEACHER_MANAGEMENT,
        PERMISSIONS.SURVEYS_CREATE,
        PERMISSIONS.SURVEYS_READ,
        PERMISSIONS.SURVEYS_UPDATE,
        PERMISSIONS.APPROVALS_READ,
        PERMISSIONS.APPROVALS_CREATE,
        PERMISSIONS.REPORTS_READ,
        PERMISSIONS.ANALYTICS_READ
      ];
    
    case USER_ROLES.SEKTORADMIN:
      return [
        PERMISSIONS.INSTITUTIONS_READ,
        ...PERMISSION_GROUPS.STUDENT_MANAGEMENT,
        ...PERMISSION_GROUPS.TEACHER_MANAGEMENT,
        ...PERMISSION_GROUPS.ACADEMIC_MANAGEMENT,
        PERMISSIONS.SURVEYS_READ,
        PERMISSIONS.APPROVALS_READ,
        PERMISSIONS.REPORTS_READ,
        PERMISSIONS.ANALYTICS_READ
      ];
    
    case USER_ROLES.SCHOOLADMIN:
      return [
        ...PERMISSION_GROUPS.STUDENT_MANAGEMENT,
        ...PERMISSION_GROUPS.TEACHER_MANAGEMENT,
        ...PERMISSION_GROUPS.ACADEMIC_MANAGEMENT,
        PERMISSIONS.SURVEYS_READ,
        PERMISSIONS.REPORTS_READ
      ];
    
    case USER_ROLES.MUELLIM:
      return [
        PERMISSIONS.STUDENTS_READ,
        PERMISSIONS.CLASSES_READ,
        PERMISSIONS.SCHEDULES_READ,
        PERMISSIONS.ASSESSMENTS_CREATE,
        PERMISSIONS.ASSESSMENTS_READ,
        PERMISSIONS.ASSESSMENTS_UPDATE,
        PERMISSIONS.ATTENDANCE_CREATE,
        PERMISSIONS.ATTENDANCE_READ,
        PERMISSIONS.ATTENDANCE_UPDATE,
        PERMISSIONS.SURVEYS_READ
      ];
    
    default:
      return [];
  }
};

/**
 * Validate if a set of permissions is appropriate for a role
 */
export const validatePermissionsForRole = (role: UserRole, permissions: Permission[]): {
  valid: boolean;
  excessive: Permission[];
  missing: Permission[];
} => {
  const defaultPermissions = getDefaultPermissionsForRole(role);
  const excessive = permissions.filter(p => !defaultPermissions.includes(p));
  const missing = defaultPermissions.filter(p => !permissions.includes(p));
  
  return {
    valid: excessive.length === 0,
    excessive,
    missing
  };
};
