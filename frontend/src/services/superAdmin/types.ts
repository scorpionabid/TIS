/**
 * Shared TypeScript types for SuperAdmin services
 *
 * All SuperAdmin services share these common types and interfaces
 */

import type { SchoolTeacher, SchoolStudent, CreateStudentData, AttendanceRecord, Assessment } from '../schoolAdmin';
import type { Grade } from '../grades';

// Re-export commonly used types
export type { SchoolTeacher, SchoolStudent, CreateStudentData, AttendanceRecord, Assessment, Grade };

// Pagination params (also from BaseService but re-exported for convenience)
export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Base entity interface
export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

// Institution types
export interface Institution extends BaseEntity {
  name: string;
  type: string;
  region_id?: number;
  sector_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

// User types
export interface User extends BaseEntity {
  name: string;
  email: string;
  role: string;
  institution_id?: number;
  is_active: boolean;
  last_login?: string;
}

// Survey types
export interface Survey extends BaseEntity {
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed';
  target_roles?: string[];
  start_date?: string;
  end_date?: string;
}

// Task types
export interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: number;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
}

// Report types
export interface Report {
  type: string;
  data: any;
  generated_at: string;
}

// Dashboard stats
export interface DashboardStats {
  total_users: number;
  total_institutions: number;
  total_students: number;
  total_teachers: number;
  active_surveys: number;
  pending_tasks: number;
}

// System config
export interface SystemConfig {
  maintenance_mode: boolean;
  allow_registration: boolean;
  [key: string]: any;
}

// System health
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  database: boolean;
  cache: boolean;
  storage: boolean;
  api: boolean;
}

// Hierarchy node
export interface HierarchyNode {
  id: number;
  name: string;
  type: string;
  children?: HierarchyNode[];
}
