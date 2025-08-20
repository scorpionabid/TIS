// TypeScript interfaces for sectors service
// Extracted from sectors.ts for better organization

export interface Sector {
  id: number;
  name: string;
  code: string;
  description?: string;
  region_id: number;
  region_name: string;
  type: 'primary' | 'secondary' | 'preschool' | 'vocational' | 'special' | 'mixed';
  is_active: boolean;
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  manager?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    phone?: string;
  };
  statistics: {
    total_institutions: number;
    total_students: number;
    total_teachers: number;
    total_staff: number;
    active_surveys: number;
    pending_tasks: number;
  };
  institutions_breakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  performance_metrics: {
    response_rate: number;
    task_completion_rate: number;
    survey_participation: number;
    document_compliance: number;
  };
  created_at: string;
  updated_at: string;
}

export interface SectorFilters {
  region_id?: number;
  type?: string;
  is_active?: boolean;
  manager_id?: number;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'total_institutions' | 'total_students';
  sort_order?: 'asc' | 'desc';
}

export interface SectorCreateData {
  name: string;
  code?: string;
  description?: string;
  parent_id: number; // This is the region_id in Institution model
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  is_active?: boolean;
}

export interface SectorUpdateData extends Partial<SectorCreateData> {
  id: number;
}

export interface SectorStatistics {
  total_sectors: number;
  active_sectors: number;
  inactive_sectors: number;
  by_region: Array<{
    region_id: number;
    region_name: string;
    sector_count: number;
    total_institutions: number;
    total_students: number;
  }>;
  by_type: Array<{
    type: string;
    count: number;
    percentage: number;
    avg_institutions_per_sector: number;
  }>;
  performance_summary: {
    avg_response_rate: number;
    avg_task_completion: number;
    sectors_above_target: number;
    sectors_below_target: number;
  };
  geographic_distribution: Array<{
    region: string;
    latitude: number;
    longitude: number;
    sector_count: number;
    coverage_area: number;
  }>;
}

export interface SectorManager {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  experience_years: number;
  managed_sectors_count: number;
  performance_rating: number;
  is_active: boolean;
  assigned_at: string;
}

export interface SectorAssignment {
  sector_id: number;
  manager_id: number;
}

export interface SectorTask {
  id: number;
  title: string;
  description?: string;
  category: 'report' | 'maintenance' | 'event' | 'audit' | 'instruction' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  progress: number;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  created_by: number;
  assigned_to?: number;
  assigned_institution_id: number;
  target_scope: 'specific' | 'regional' | 'sectoral' | 'all';
  target_institutions?: number[];
  target_roles?: string[];
  notes?: string;
  completion_notes?: string;
  requires_approval: boolean;
  approved_by?: number;
  approved_at?: string;
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  assignee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SectorTaskFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  sort_by?: 'created_at' | 'deadline' | 'title' | 'priority';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
}

export interface SectorTaskCreateData {
  title: string;
  description?: string;
  category: 'report' | 'maintenance' | 'event' | 'audit' | 'instruction' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  target_scope: 'specific' | 'regional' | 'sectoral' | 'all';
  target_institutions?: number[];
  target_roles?: string[];
  assigned_to?: number;
  notes?: string;
  requires_approval?: boolean;
}

export interface SectorTaskStatistics {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  by_category: {
    report: number;
    maintenance: number;
    event: number;
    audit: number;
    instruction: number;
    other: number;
  };
  completion_rate: number;
}

export interface SectorDocument {
  id: number;
  title: string;
  description?: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_extension: string;
  mime_type: string;
  file_size: number;
  file_type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
  access_level: 'public' | 'regional' | 'sectoral' | 'institution';
  uploaded_by: number;
  institution_id: number;
  category: 'administrative' | 'financial' | 'educational' | 'hr' | 'technical' | 'legal' | 'reports' | 'forms' | 'other';
  status: 'draft' | 'active' | 'archived' | 'deleted';
  is_public: boolean;
  is_downloadable: boolean;
  is_viewable_online: boolean;
  expires_at?: string;
  published_at?: string;
  version: string;
  is_latest_version: boolean;
  allowed_institutions?: number[];
  accessible_institutions?: number[];
  uploader?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
  formatted_file_size?: string;
  download_url?: string;
  preview_url?: string;
}

export interface SectorDocumentFilters {
  category?: string;
  access_level?: string;
  file_type?: string;
  search?: string;
  sort_by?: 'created_at' | 'title' | 'file_size' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
}

export interface SectorDocumentUploadData {
  file: File;
  title: string;
  description?: string;
  category: 'administrative' | 'financial' | 'educational' | 'hr' | 'technical' | 'legal' | 'reports' | 'forms' | 'other';
  access_level: 'public' | 'regional' | 'sectoral' | 'institution';
  is_downloadable?: boolean;
  is_viewable_online?: boolean;
  expires_at?: string;
  allowed_institutions?: number[];
}

export interface SectorDocumentStatistics {
  total_documents: number;
  total_size: number;
  by_category: {
    administrative: number;
    financial: number;
    educational: number;
    hr: number;
    technical: number;
    legal: number;
    reports: number;
    forms: number;
    other: number;
  };
  by_file_type: {
    pdf: number;
    excel: number;
    word: number;
    image: number;
    other: number;
  };
  by_access_level: {
    public: number;
    sectoral: number;
    regional: number;
    institution: number;
  };
  recent_uploads: number;
  expiring_soon: number;
}

export interface SectorDocumentShareData {
  target_institutions: number[];
  access_type: 'view' | 'download';
  expires_at?: string;
  message?: string;
}

// API Response types
export interface SectorResponse {
  success: boolean;
  data: Sector;
}

export interface SectorsResponse {
  success: boolean;
  data: Sector[];
}

export interface SectorCreateResponse {
  success: boolean;
  message: string;
  data: Sector;
}

export interface SectorUpdateResponse {
  success: boolean;
  message: string;
  data: Sector;
}

export interface SectorDeleteResponse {
  success: boolean;
  message: string;
}

export interface SectorStatisticsResponse {
  success: boolean;
  data: SectorStatistics;
}

export interface SectorManagersResponse {
  success: boolean;
  data: SectorManager[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface SectorTasksResponse extends PaginatedResponse<SectorTask> {}
export interface SectorDocumentsResponse extends PaginatedResponse<SectorDocument> {}

export interface SectorTaskResponse {
  success: boolean;
  message: string;
  data: SectorTask;
}

export interface SectorDocumentResponse {
  success: boolean;
  message: string;
  data: SectorDocument;
}

export interface SectorTaskStatisticsResponse {
  success: boolean;
  data: SectorTaskStatistics;
}

export interface SectorDocumentStatisticsResponse {
  success: boolean;
  data: SectorDocumentStatistics;
}

export interface SectorDocumentShareResponse {
  success: boolean;
  message: string;
  data: any;
}