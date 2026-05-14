/**
 * Permission Type Definitions
 * Enhanced permission system with role-based vs direct permission tracking
 */

/**
 * Permission scope types (hierarchical)
 */
export type PermissionScope = 'global' | 'system' | 'regional' | 'sector' | 'institution' | 'classroom';

/**
 * Full permission object from backend API
 */
export interface Permission {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  guard_name: string;
  category: string | null;
  department: string | null;
  resource: string | null;
  action: string | null;
  scope: PermissionScope;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles_count?: number;
  users_count?: number;
}

/**
 * Permission list API response
 */
export interface PermissionListResponse {
  permissions: Permission[];
  total: number;
  page?: number;
  per_page?: number;
}

/**
 * Permission category summary
 */
export interface PermissionCategory {
  name: string;
  count: number;
  label?: string;
}

/**
 * Permission scope summary
 */
export interface PermissionScopeInfo {
  name: PermissionScope;
  count: number;
  label: string;
}

/**
 * Grouped permissions by category/resource/scope
 */
export interface GroupedPermissions {
  [key: string]: {
    label: string;
    permissions: Permission[];
    count: number;
  };
}

/**
 * Permission usage statistics
 */
export interface PermissionUsageStats {
  permission: Permission;
  roles_count: number;
  users_count: number;
  roles: Array<{ id: number; name: string; display_name: string }>;
  recent_assignments: Array<{
    user_id: number;
    user_name: string;
    role_name: string;
    assigned_at: string;
  }>;
  usage_timeline: Array<{
    date: string;
    assignments: number;
    revocations: number;
  }>;
}

/**
 * Detailed permission breakdown from backend
 */
export interface UserPermissionsDetailed {
  direct: string[]; // Direct assigned permissions (editable)
  via_roles: string[]; // Permissions from roles (readonly)
  all: string[]; // Combined list (direct + via_roles)
  role_metadata: RoleMetadata[];
}

/**
 * Role metadata information
 */
export interface RoleMetadata {
  id: number;
  name: string;
  display_name: string;
  level: number;
  permission_count: number;
}

/**
 * Permission dependency definition
 */
export interface PermissionDependency {
  permission: string;
  requires: string[];
}

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  valid: boolean;
  missing_dependencies: Record<string, string[]>;
  warnings: string[];
}

/**
 * Permission source types
 */
export enum PermissionSource {
  DIRECT = "direct", // Directly assigned to user
  ROLE = "role", // Inherited from role
  INHERITED = "inherited", // From parent institution
}

/**
 * Permission with enhanced metadata for UI
 */
export interface PermissionWithMetadata {
  key: string;
  label: string;
  description?: string;
  source: PermissionSource;
  readonly: boolean;
  dependencies?: string[];
  shareable?: boolean;
  // UI helper flags
  required?: boolean;
  default?: boolean;
}

/**
 * Permission module metadata
 */
export interface PermissionModuleMeta {
  key: string;
  label: string;
  description?: string;
  roles?: string[];
  permissions: PermissionWithMetadata[];
  // Backend provides module-level defaults/required arrays
  defaults?: string[];
  required?: string[];
}

/**
 * Backend user response with detailed permissions
 */
export interface UserWithPermissions {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role_id?: number;
  role_name?: string;
  institution_id?: number;
  department_id?: number;
  is_active: boolean;
  permissions?: UserPermissionsDetailed;
  assignable_permissions?: string[]; // Backward compatibility
  profile?: any;
  roles?: any[];
}
