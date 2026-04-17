/**
 * Shared TypeScript types for all import / export operations.
 *
 * All import/export modals (Teacher, Student, Institution, User,
 * RegionStudent) must use these types instead of local `any` definitions.
 */

// ── Error types ──────────────────────────────────────────────────────────────

/** A single row-level validation error returned by the backend */
export interface ImportRowError {
  row?: number;
  attribute?: string;
  message: string;
}

// ── Import result ─────────────────────────────────────────────────────────────

/** Standard import result shape returned by ALL import endpoints */
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
  /** Human-readable summary message (optional) */
  message?: string;
}

/** Wraps ImportResult as it comes from the API response envelope */
export interface ImportApiResponse {
  success: boolean;
  data: ImportResult;
  message?: string;
}

// ── Export options ────────────────────────────────────────────────────────────

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export interface BaseExportFilters {
  format?: ExportFormat;
  is_active?: 'all' | 'true' | 'false' | '';
}

// ── File validation ───────────────────────────────────────────────────────────

export interface ImportFileValidationResult {
  valid: boolean;
  error?: string;
}

/** Accepted MIME types + extensions for spreadsheet imports */
export const IMPORT_ACCEPTED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
] as const;

export const IMPORT_ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validate a file before submitting to an import endpoint.
 * Checks both MIME type and file extension (guards against spoofed MIME).
 */
export function validateImportFile(file: File): ImportFileValidationResult {
  if (file.size > IMPORT_MAX_BYTES) {
    return {
      valid: false,
      error: `Fayl ölçüsü 10 MB-dan böyük ola bilməz (seçilmiş: ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    };
  }

  const mimeOk = (IMPORT_ACCEPTED_MIME as readonly string[]).includes(file.type);
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const extOk = (IMPORT_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);

  if (!mimeOk && !extOk) {
    return {
      valid: false,
      error: 'Yalnız Excel (.xlsx, .xls) və CSV (.csv) faylları dəstəklənir',
    };
  }

  return { valid: true };
}

// ── Progress tracking ─────────────────────────────────────────────────────────

export type ImportProgressStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'validating'
  | 'importing'
  | 'complete'
  | 'error';

export interface ImportProgressState {
  status: ImportProgressStatus;
  percent: number;
  processedRows?: number;
  totalRows?: number;
  successCount?: number;
  errorCount?: number;
  message?: string;
}
