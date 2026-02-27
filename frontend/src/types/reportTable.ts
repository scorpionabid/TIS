import { BaseEntity } from '../services/BaseService';

// ─── Column Types ─────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date';

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
}

// ─── Report Table ─────────────────────────────────────────────────────────────

export type ReportTableStatus = 'draft' | 'published' | 'archived';

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
  status?: ReportTableStatus;
  per_page?: number;
  page?: number;
}

export interface ReportTableResponseFilters {
  status?: ReportTableResponseStatus;
  institution_id?: number;
  per_page?: number;
  page?: number;
}
