import type { PaginationParams } from '../BaseService';
import type { PaginationMeta } from '../../types/api';
import type { EnhancedTeacherProfile } from '../../types/teacher';

/**
 * Filter interfaces for teacher listing
 */
export interface RegionTeacherFilters extends PaginationParams {
  sector_ids?: number[];
  school_ids?: number[];
  department_id?: number;
  position_type?: string;
  employment_status?: string;
  is_active?: boolean;
  search?: string;
  sort_by?: 'name' | 'email' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Statistics for the regional teacher overview
 */
export interface RegionTeacherStatistics {
  total_teachers: number;
  active_teachers: number;
  inactive_teachers: number;
  by_position: Record<string, number>;
  by_employment_status: Record<string, number>;
  by_institution: Record<string, number>;
}

/**
 * Main result interface for paginated teacher lists
 */
export interface RegionTeacherResult {
  data: EnhancedTeacherProfile[];
  pagination: PaginationMeta;
  statistics: RegionTeacherStatistics;
}

/**
 * Simplified Institution interface for sector/school listings
 */
export interface Institution {
  id: number;
  name: string;
  level: number;
  parent_id?: number;
}

/**
 * Standard bulk operation response
 */
export interface BulkOperationResponse {
  success: boolean;
  message: string;
  updated_count?: number;
  deleted_count?: number;
}

/**
 * Input for creating a new teacher
 */
export interface RegionTeacherCreateInput {
  email: string;
  first_name: string;
  last_name: string;
  institution_id: number;
  phone?: string;
  position_type?: string;
  employment_status?: string;
  password?: string;
}

/**
 * Input for updating an existing teacher
 */
export interface RegionTeacherUpdateInput extends Partial<RegionTeacherCreateInput> {
  is_active?: boolean;
}

/**
 * Detailed analysis of import results
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: number;
  details?: {
    success: any[];
    errors: any[];
  };
}

/**
 * Pre-validation result for import files
 */
export interface ValidationResult {
  success: boolean;
  summary: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    valid_percentage: number;
    can_proceed_with_skip: boolean;
  };
  suggestions: string[];
  error_groups: Record<string, number>;
  errors: Array<{
    row_number: number;
    field: string;
    message: string;
    value?: any;
    suggestion?: string;
  }>;
}

/**
 * Options for the enhanced import with strategies
 */
export type ImportStrategy = 'strict' | 'skip_errors';

export interface EnhancedImportOptions {
  strategy?: ImportStrategy;
  skip_duplicates?: boolean;
  update_existing?: boolean;
  onUploadProgress?: (progress: { loaded: number; total: number }) => void;
}
