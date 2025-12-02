/**
 * Permission Type Definitions
 * Enhanced permission system with role-based vs direct permission tracking
 */

/**
 * Detailed permission breakdown from backend
 */
export interface UserPermissionsDetailed {
  direct: string[];           // Direct assigned permissions (editable)
  via_roles: string[];        // Permissions from roles (readonly)
  all: string[];              // Combined list (direct + via_roles)
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
  DIRECT = 'direct',       // Directly assigned to user
  ROLE = 'role',           // Inherited from role
  INHERITED = 'inherited'  // From parent institution
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
