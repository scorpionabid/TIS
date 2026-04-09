import { BaseEntity } from '../services/BaseService';

// ─── Column Types ─────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'boolean' | 'calculated' | 'file' | 'signature' | 'gps';

export interface ReportTableColumn {
  key: string;
  label: string;
  type: ColumnType;
  // Optional UX & validation fields
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  // For select type: list of allowed options
  options?: string[];
  // For select type: allow multiple selections
  multiple?: boolean;
  // For calculated type: formula string
  formula?: string;
  // Format for calculated columns
  format?: 'number' | 'currency' | 'percent';
  decimals?: number;
  // For file type: accepted file types
  accepted_types?: string[];
  max_file_size?: number; // in MB
  // For signature type: dimensions
  signature_width?: number;
  signature_height?: number;
  // For gps type: precision and validation
  gps_precision?: 'high' | 'medium' | 'low';
  gps_radius?: number; // meters - validate if within radius
  // For number type: allow N/A sentinel values (e.g. "Yoxdur", "Keçirilməyib")
  allow_na?: boolean;
  // Custom N/A label strings; each stored as cell value when selected
  na_labels?: string[];
  // For number type: export 0 values as blank in Excel
  export_zero_as_blank?: boolean;
}

// ─── Row Status ───────────────────────────────────────────────────────────────

export type RowStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface RowStatusMeta {
  status: RowStatus;
  submitted_by?: number;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
}

/** Key = row index as string (e.g. "0", "1", "2") */
export type RowStatuses = Record<string, RowStatusMeta>;

// ─── Fixed Row (for stable tables) ───────────────────────────────────────────

export interface FixedRow {
  id: string;
  label: string;
}

// ─── Report Table ─────────────────────────────────────────────────────────────

export type ReportTableStatus = 'draft' | 'published' | 'archived' | 'deleted';

export interface ReportTable extends BaseEntity {
  title: string;
  description?: string;
  notes?: string;
  status: ReportTableStatus;
  columns: ReportTableColumn[];
  fixed_rows?: FixedRow[] | null; // Əgər varsa, stabil cədvəl (dinamik deyil)
  max_rows: number;
  allow_additional_rows_after_confirmation?: boolean; // RegionAdmin tərəfindən idarə olunur
  target_institutions?: number[];
  deadline?: string;
  published_at?: string;
  archived_at?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  my_response_status?: 'draft' | 'submitted' | 'approved' | null;
  my_response_row_stats?: {
    total: number;
    completed: number;
    submitted?: number;
    approved?: number;
    rejected?: number;
    pending?: number;
  };
  creator?: {
    id: number;
    name: string;
  };
  // Computed
  responses_count?: number;
  responses_submitted_count?: number;
  responses_approved_count?: number;
  responses_pending_count?: number; // Təsdiq gözləyən
  responses_rejected_count?: number;
  not_responded_count?: number; // Göndərməyən məktəblər
  can_edit?: boolean;
  can_edit_columns?: boolean;
  can_edit_column_content?: boolean;
}

// ─── Report Table Response ────────────────────────────────────────────────────

export type ReportTableResponseStatus = 'draft' | 'submitted' | 'approved';

export type ReportTableRow = Record<string, string | number | null>;

export interface ReportTableResponse extends BaseEntity {
  report_table_id: number;
  institution_id: number;
  respondent_id: number;
  rows: ReportTableRow[];
  status: ReportTableResponseStatus;
  submitted_at?: string;
  row_statuses?: RowStatuses;
  report_table?: Pick<ReportTable, 'id' | 'title' | 'columns' | 'max_rows' | 'status' | 'deadline'>;
  institution?: {
    id: number;
    name: string;
    parent_id?: number;
    parent?: {
      id: number;
      name: string;
    };
  };
  respondent?: {
    id: number;
    name: string;
  };
}

// ─── Create / Update Payloads ─────────────────────────────────────────────────

export interface CreateReportTablePayload {
  title: string;
  description?: string;
  notes?: string;
  columns: ReportTableColumn[];
  fixed_rows?: FixedRow[];
  max_rows?: number;
  target_institutions?: number[];
  deadline?: string;
}

export interface UpdateReportTablePayload {
  title?: string;
  description?: string;
  notes?: string;
  columns?: ReportTableColumn[];
  fixed_rows?: FixedRow[];
  max_rows?: number;
  target_institutions?: number[];
  deadline?: string;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface ReportTableFilters {
  search?: string;
  status?: string;
  per_page?: number;
  page?: number;
}

export interface ReportTableResponseFilters {
  status?: ReportTableResponseStatus;
  institution_id?: number;
  per_page?: number;
  page?: number;
}

// ─── Approval Queue ───────────────────────────────────────────────────────────

export interface ApprovalQueueResponse {
  id: number;
  institution_id: number;
  institution: {
    id: number;
    name: string;
    parent?: { id: number; name: string };
  };
  rows: ReportTableRow[];
  row_statuses: RowStatuses;
  pending_row_indices: number[];
}

export interface ApprovalQueueTable {
  table: {
    id: number;
    title: string;
    deadline?: string;
    columns: ReportTableColumn[];
  };
  pending_count: number;
  responses: ApprovalQueueResponse[];
}

export interface BulkRowSpec {
  response_id: number;
  row_indices: number[];
}

export interface BulkRowActionPayload {
  row_specs: BulkRowSpec[];
  action: 'approve' | 'reject' | 'return';
  reason?: string;
}

export interface BulkRowActionResult {
  message: string;
  successful: number;
  failed: number;
  errors: Array<{ response_id?: number; row_index?: number; error: string }>;
}

// ─── Analytics Summary Types ───────────────────────────────────────────────────

export interface AnalyticsSectorStat {
  id: number;
  name: string;
  total_schools: number;
  responded: number;
  submitted: number;
  draft: number;
}

export interface AnalyticsNonFillingSchool {
  id: number;
  name: string;
  sector: string;
}

export interface TableAnalyticsSummary {
  table_id: number;
  table_title: string;
  generated_at: string;
  summary: {
    target_institutions: number;
    responded_institutions: number;
    participation_rate: number;
    responses: {
      total: number;
      draft: number;
      submitted: number;
      approved: number;
    };
    rows: {
      total: number;
      submitted: number;
      approved: number;
      rejected: number;
      pending_approval: number;
    };
  };
  sectors: AnalyticsSectorStat[];
  non_filling_schools: AnalyticsNonFillingSchool[];
}

// ─── Self Statistics (for School Admins) ───────────────────────────────────

export interface MyTableStat {
  id: number;
  title: string;
  status: 'not_started' | 'draft' | 'submitted' | 'approved';
  row_count: number;
  approved_count: number;
  rejected_count: number;
  returned_count: number;
  penalty: number;
  bonus: number;
  final_score: number;
  rating_percentage: number;
}

export interface MySchoolStatistics {
  institution_id: number;
  institution_name: string;
  sector_name?: string;
  tables: MyTableStat[];
  total_tables: number;
  filled_tables: number;
  total_rows_across_all_tables: number;
  total_approved: number;
  total_pending: number;
  total_rejected: number;
  total_returned: number;
  total_penalty: number;
  total_bonus: number;
  total_points: number;
  total_final_score: number;
  avg_rating_percentage: number;
  rank_in_sector?: number | null;
  total_sector_schools?: number | null;
  rank_in_region?: number | null;
  total_region_schools?: number | null;
}
