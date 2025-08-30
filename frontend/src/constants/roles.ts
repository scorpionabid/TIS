/**
 * Centralized role constants for the ATIS system
 * 
 * This file contains all role definitions used throughout the application.
 * Use these constants instead of hardcoded strings to ensure consistency
 * and make role management easier.
 */

// Primary user roles
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  REGIONADMIN: 'regionadmin',
  REGIONOPERATOR: 'regionoperator', 
  SEKTORADMIN: 'sektoradmin',
  SCHOOLADMIN: 'schooladmin',
  MUELLIM: 'müəllim'
} as const;

// School-specific roles (more granular)
export const SCHOOL_ROLES = {
  SCHOOL_ADMIN: 'schooladmin',
  MUAVIN: 'muavin',
  UBR: 'ubr',
  TESARRUFAT: 'tesarrufat',
  PSIXOLOQ: 'psixoloq',
  MUELLIM: 'müəllim'
} as const;

// Type definitions
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type SchoolRoleType = typeof SCHOOL_ROLES[keyof typeof SCHOOL_ROLES];

// Role display names in Azerbaijani
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [USER_ROLES.SUPERADMIN]: 'Super İdarəçi',
  [USER_ROLES.REGIONADMIN]: 'Regional İdarəçi',
  [USER_ROLES.REGIONOPERATOR]: 'Regional Operator',
  [USER_ROLES.SEKTORADMIN]: 'Sektor İdarəçisi',
  [USER_ROLES.SCHOOLADMIN]: 'Məktəb İdarəçisi',
  [USER_ROLES.MUELLIM]: 'Müəllim'
};

// School role display names
export const SCHOOL_ROLE_DISPLAY_NAMES: Record<SchoolRoleType, string> = {
  [SCHOOL_ROLES.SCHOOL_ADMIN]: 'Məktəb Direktoru',
  [SCHOOL_ROLES.MUAVIN]: 'Müavin (Dərs İdarəetməsi)',
  [SCHOOL_ROLES.UBR]: 'Tədris-Bilimlər Referenti', 
  [SCHOOL_ROLES.TESARRUFAT]: 'Təsərrüfat Müdiri',
  [SCHOOL_ROLES.PSIXOLOQ]: 'Məktəb Psixoloquu',
  [SCHOOL_ROLES.MUELLIM]: 'Fənn Müəllimi'
};

// Role hierarchy levels (lower number = higher authority)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.SUPERADMIN]: 1,
  [USER_ROLES.REGIONADMIN]: 2,
  [USER_ROLES.REGIONOPERATOR]: 3,
  [USER_ROLES.SEKTORADMIN]: 4,
  [USER_ROLES.SCHOOLADMIN]: 5,
  [USER_ROLES.MUELLIM]: 6
};

// Role groups for easier checking
export const ROLE_GROUPS = {
  ADMIN_ROLES: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN],
  MANAGEMENT_ROLES: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN],
  SCHOOL_ROLES: [USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
  ALL_ROLES: Object.values(USER_ROLES)
} as const;

// Utility functions
export const getRoleDisplayName = (role: UserRole): string => {
  return ROLE_DISPLAY_NAMES[role] || role;
};

export const getSchoolRoleDisplayName = (role: SchoolRoleType): string => {
  return SCHOOL_ROLE_DISPLAY_NAMES[role] || role;
};

export const getRoleHierarchyLevel = (role: UserRole): number => {
  return ROLE_HIERARCHY[role] || 999;
};

export const canManageRole = (managerRole: UserRole, targetRole: UserRole): boolean => {
  const managerLevel = getRoleHierarchyLevel(managerRole);
  const targetLevel = getRoleHierarchyLevel(targetRole);
  return managerLevel < targetLevel;
};

export const isAdminRole = (role: UserRole): boolean => {
  return ROLE_GROUPS.ADMIN_ROLES.includes(role);
};

export const isManagementRole = (role: UserRole): boolean => {
  return ROLE_GROUPS.MANAGEMENT_ROLES.includes(role);
};

export const isSchoolRole = (role: UserRole): boolean => {
  return ROLE_GROUPS.SCHOOL_ROLES.includes(role);
};

// Role validation
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(USER_ROLES).includes(role as UserRole);
};

export const isValidSchoolRole = (role: string): role is SchoolRoleType => {
  return Object.values(SCHOOL_ROLES).includes(role as SchoolRoleType);
};