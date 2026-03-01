import { BaseEntity } from '../services/BaseService';

// ─── Column Types ─────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'boolean';

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

// ─── Report Table ─────────────────────────────────────────────────────────────

export type ReportTableStatus = 'draft' | 'published' | 'archived' | 'deleted';

export interface ReportTable extends BaseEntity {
  title: string;
  description?: string;
  notes?: string;
  status: ReportTableStatus;
  columns: ReportTableColumn[];
  max_rows: number;
  target_institutions?: number[];
  deadline?: string;
  published_at?: string;
  archived_at?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  creator?: {
    id: number;
    name: string;
  };
  // Computed
  responses_count?: number;
  can_edit?: boolean;
  can_edit_columns?: boolean;
}

// ─── Report Table Response ────────────────────────────────────────────────────

export type ReportTableResponseStatus = 'draft' | 'submitted';

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
  max_rows?: number;
  target_institutions?: number[];
  deadline?: string;
}

export interface UpdateReportTablePayload {
  title?: string;
  description?: string;
  notes?: string;
  columns?: ReportTableColumn[];
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
