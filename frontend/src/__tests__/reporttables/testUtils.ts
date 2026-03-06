/**
 * Test utilities and mocks for Report Table tests
 */

import { ReportTable, ReportTableColumn, ReportTableResponse, RowStatus } from '../../types/reportTable';

// ─── Mock Data Factories ───────────────────────────────────────────────────

export const createMockColumn = (overrides?: Partial<ReportTableColumn>): ReportTableColumn => ({
  key: 'test_column',
  label: 'Test Column',
  type: 'text',
  required: false,
  ...overrides,
});

export const createMockReportTable = (overrides?: Partial<ReportTable>): ReportTable => ({
  id: 1,
  title: 'Test Report Table',
  description: 'Test description',
  status: 'published',
  columns: [
    createMockColumn({ key: 'name', label: 'Name', type: 'text' }),
    createMockColumn({ key: 'age', label: 'Age', type: 'number' }),
    createMockColumn({ key: 'date', label: 'Date', type: 'date' }),
  ],
  max_rows: 10,
  target_institutions: [1, 2, 3],
  deadline: '2026-12-31',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  can_edit: true,
  can_edit_columns: true,
  responses_count: 5,
  ...overrides,
});

export const createMockReportTableResponse = (overrides?: Partial<ReportTableResponse>): ReportTableResponse => ({
  id: 1,
  report_table_id: 1,
  institution_id: 1,
  respondent_id: 1,
  rows: [
    { name: 'John Doe', age: 25, date: '2026-03-01' },
  ],
  status: 'draft',
  row_statuses: {
    '0': {
      status: 'draft',
      submitted_by: undefined,
      submitted_at: undefined,
    },
  },
  report_table: {
    id: 1,
    title: 'Test Report Table',
    columns: [
      createMockColumn({ key: 'name', label: 'Name', type: 'text' }),
      createMockColumn({ key: 'age', label: 'Age', type: 'number' }),
    ],
    max_rows: 10,
    status: 'published',
  },
  institution: {
    id: 1,
    name: 'Test Institution',
  },
  respondent: {
    id: 1,
    name: 'Test User',
  },
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
});

// ─── API Mock Helpers ──────────────────────────────────────────────────────

export const mockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  headers: {},
});

export const mockPaginatedResponse = <T>(data: T[], total = 10, currentPage = 1, perPage = 15) => ({
  data,
  meta: {
    current_page: currentPage,
    per_page: perPage,
    total,
    last_page: Math.ceil(total / perPage),
  },
});

// ─── Test IDs ────────────────────────────────────────────────────────────────

export const TEST_IDS = {
  REPORT_TABLE: {
    LIST_ITEM: 'report-table-list-item',
    CREATE_BUTTON: 'create-report-table-btn',
    EDIT_BUTTON: 'edit-report-table-btn',
    DELETE_BUTTON: 'delete-report-table-btn',
    PUBLISH_BUTTON: 'publish-report-table-btn',
    ARCHIVE_BUTTON: 'archive-report-table-btn',
    FORM_TITLE: 'report-table-form-title',
    FORM_COLUMNS: 'report-table-form-columns',
    SUBMIT_BUTTON: 'report-table-submit-btn',
  },
  TABLE_RESPONSE: {
    ROW_INPUT: 'table-response-row-input',
    ADD_ROW_BUTTON: 'add-row-btn',
    DELETE_ROW_BUTTON: 'delete-row-btn',
    SUBMIT_BUTTON: 'submit-response-btn',
    SAVE_DRAFT_BUTTON: 'save-draft-btn',
  },
} as const;
