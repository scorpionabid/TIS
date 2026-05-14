/**
 * Role Tab Configuration
 * Defines tab structure for role-based user creation modal
 */

export interface RoleTabConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  allowedForRoles: string[]; // Which logged-in user roles can see this tab
  targetRoleName: string; // The role that will be created
}

export const ROLE_TAB_CONFIG: Record<string, RoleTabConfig> = {
  regionadmin: {
    id: 'regionadmin',
    label: 'RegionAdmin',
    icon: 'Shield',
    description: 'Regional administrator yaradın',
    allowedForRoles: ['superadmin'], // Only SuperAdmin can create RegionAdmin
    targetRoleName: 'regionadmin',
  },
  regionoperator: {
    id: 'regionoperator',
    label: 'RegionOperator',
    icon: 'UserCog',
    description: 'Regional operator yaradın (səlahiyyətlərlə)',
    allowedForRoles: ['superadmin', 'regionadmin'],
    targetRoleName: 'regionoperator',
  },
  teacher: {
    id: 'teacher',
    label: 'Müəllim',
    icon: 'GraduationCap',
    description: 'Müəllim profili yaradın',
    allowedForRoles: ['superadmin', 'regionadmin', 'schooladmin'],
    targetRoleName: 'müəllim',
  },
  sektoradmin: {
    id: 'sektoradmin',
    label: 'SektorAdmin',
    icon: 'Building',
    description: 'Sector administrator yaradın',
    allowedForRoles: ['superadmin', 'regionadmin'],
    targetRoleName: 'sektoradmin',
  },
  schooladmin: {
    id: 'schooladmin',
    label: 'SchoolAdmin',
    icon: 'School',
    description: 'School administrator yaradın',
    allowedForRoles: ['superadmin', 'regionadmin'],
    targetRoleName: 'schooladmin',
  },
} as const;

/**
 * Get visible tabs based on current user's role
 */
export function getVisibleRoleTabs(userRoleName: string): string[] {
  return Object.entries(ROLE_TAB_CONFIG)
    .filter(([_, config]) => config.allowedForRoles.includes(userRoleName.toLowerCase()))
    .map(([key]) => key);
}

/**
 * Get role tab configuration by tab ID
 */
export function getRoleTabConfig(tabId: string): RoleTabConfig | undefined {
  return ROLE_TAB_CONFIG[tabId];
}

/**
 * Check if user can access a specific role tab
 */
export function canAccessRoleTab(userRoleName: string, tabId: string): boolean {
  const config = ROLE_TAB_CONFIG[tabId];
  if (!config) return false;
  return config.allowedForRoles.includes(userRoleName.toLowerCase());
}
