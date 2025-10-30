/**
 * Centralized User Type Definitions
 * This file consolidates all User-related interfaces to eliminate duplication
 */

import { UserRole } from '@/constants/roles';

// Core User interface - combines all fields from different services
export interface User {
  // Basic identity
  id: number;
  first_name: string;
  last_name: string;
  name: string; // computed field (first_name + last_name) or explicit name
  email: string;
  username: string;
  
  // User identification
  utis_code?: string;
  
  // Role and permissions
  role_id?: number | string; // Backend role ID
  role: string | UserRole; // Flexible to handle both string and UserRole
  permissions: string[];
  
  // Contact information
  contact_phone?: string;
  phone?: string; // alias for contact_phone
  
  // Status
  is_active: boolean;
  status?: 'active' | 'inactive'; // computed from is_active
  last_login?: string; // Last login timestamp
  
  // Hierarchical relationships
  institution?: {
    id: number;
    name: string;
    type: string;
    level: number;
  };
  
  region?: {
    id: number;
    name: string;
  };
  
  department?: {
    id: number;
    name: string;
  };
  
  // Additional department support for multiple departments
  department_id?: number;
  departments?: number[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string; // For soft delete support
  
  // Additional profile information
  profile?: UserProfile;
}

// User profile information
export interface UserProfile {
  id?: number;
  user_id: number;
  avatar?: string;
  bio?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

// User creation data (required fields only)
export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  role_id: number | string;
  role_name?: string;
  role_display_name?: string;
  institution_id?: number;
  department_id?: number;
  contact_phone?: string;
  utis_code?: string;
  is_active?: boolean;
}

// User update data (all fields optional except ID)
export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  role_id?: number | string;
  role_name?: string;
  role_display_name?: string;
  institution_id?: number;
  department_id?: number;
  departments?: number[];
  contact_phone?: string;
  utis_code?: string;
  is_active?: boolean;
}

// User filtering options
export interface UserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
  institution_id?: number;
  department_id?: number;
  region_id?: number;
  page?: number;
  per_page?: number;
  include_deleted?: boolean; // For soft delete support
}

// Bulk operations on users
export interface BulkUserAction {
  user_ids: number[];
  action: 'activate' | 'deactivate' | 'assign_role' | 'assign_institution' | 'delete' | 'restore' | 'force_delete';
  value?: string | number;
}

// User statistics
export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  deleted: number; // For soft delete support
  by_role: Record<string, number>;
  by_institution: Record<string, number>;
  by_department: Record<string, number>;
}

// Authentication-specific interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expires_at: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

// User import/export interfaces
export interface UserImportData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: string;
  institution?: string;
  department?: string;
  phone?: string;
  utis_code?: string;
}

export interface UserExportData extends User {
  institution_name?: string;
  department_name?: string;
  role_name?: string;
}

// Delegation and assignment interfaces
export interface UserDelegation {
  id: number;
  delegator_id: number;
  delegatee_id: number;
  delegator: User;
  delegatee: User;
  permissions: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// Type guards for better type safety
export const hasInstitution = (user: User): user is User & { institution: NonNullable<User['institution']> } => {
  return !!user.institution;
};

export const hasDepartment = (user: User): user is User & { department: NonNullable<User['department']> } => {
  return !!user.department;
};

export const hasRegion = (user: User): user is User & { region: NonNullable<User['region']> } => {
  return !!user.region;
};

// Note: isUserRole type guard moved to avoid circular dependency with constants/roles
