import { BaseService } from './BaseService';
import { apiClient } from './api';
import { handleApiResponseWithError } from '@/utils/apiResponseHandler';
import {
  ReportTable,
  ReportTableResponse,
  CreateReportTablePayload,
  UpdateReportTablePayload,
  ReportTableFilters,
  ReportTableResponseFilters,
  ReportTableRow,
  ApprovalQueueTable,
  BulkRowSpec,
  BulkRowActionResult,
} from '../types/reportTable';

// ─── Local response shape types ───────────────────────────────────────────────

interface PaginatedApiResult<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

interface SingleApiResult<T> {
  data: T | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class ReportTableService extends BaseService<ReportTable> {
  constructor() {
    super('report-tables', ['report-tables']);
  }

  // ─── Admin: Cədvəl siyahısı ───────────────────────────────────────────────

  async getList(filters?: ReportTableFilters): Promise<PaginatedApiResult<ReportTable>> {
    const response = await apiClient.get<ReportTable[]>('report-tables', filters as Record<string, unknown>);
    const result = response as unknown as PaginatedApiResult<ReportTable>;
    return {
      data: result.data ?? [],
      meta: result.meta ?? { current_page: 1, per_page: 15, total: 0, last_page: 1 },
    };
  }

  // ─── Məktəb: Mənə aid cədvəllər ──────────────────────────────────────────

  async getMyTables(): Promise<ReportTable[]> {
    const response = await this.get<ReportTable[]>('report-tables/my');
    return handleApiResponseWithError<ReportTable[]>(response, 'ReportTableService.getMyTables', 'ReportTableService');
  }

  // ─── Show ─────────────────────────────────────────────────────────────────

  async getTable(id: number): Promise<ReportTable> {
    const response = await this.get<ReportTable>(`report-tables/${id}`);
    return handleApiResponseWithError<ReportTable>(response, 'ReportTableService.getTable', 'ReportTableService');
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async createTable(payload: CreateReportTablePayload): Promise<ReportTable> {
    const response = await this.post<ReportTable>('report-tables', payload as unknown as Record<string, unknown>);
    const result = handleApiResponseWithError<ReportTable>(response, 'ReportTableService.createTable', 'ReportTableService');
    this.invalidateCache(['list']);
    return result;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async updateTable(id: number, payload: UpdateReportTablePayload): Promise<ReportTable> {
    const response = await this.put<ReportTable>(`report-tables/${id}`, payload as unknown as Record<string, unknown>);
    const result = handleApiResponseWithError<ReportTable>(response, 'ReportTableService.updateTable', 'ReportTableService');
    this.invalidateCache(['list', 'detail']);
    return result;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async deleteTable(id: number): Promise<void> {
    await apiClient.delete(`report-tables/${id}`);
    this.invalidateCache(['list', 'detail']);
  }

  // ─── Publish / Archive ────────────────────────────────────────────────────

  async publishTable(id: number): Promise<ReportTable> {
    const response = await this.post<ReportTable>(`report-tables/${id}/publish`);
    const result = handleApiResponseWithError<ReportTable>(response, 'ReportTableService.publishTable', 'ReportTableService');
    this.invalidateCache(['list', 'detail']);
    return result;
  }

  async archiveTable(id: number): Promise<ReportTable> {
    const response = await this.post<ReportTable>(`report-tables/${id}/archive`);
    const result = handleApiResponseWithError<ReportTable>(response, 'ReportTableService.archiveTable', 'ReportTableService');
    this.invalidateCache(['list', 'detail']);
    return result;
  }

  // ─── Admin: Cavab siyahısı ────────────────────────────────────────────────

  async getResponses(tableId: number, filters?: ReportTableResponseFilters): Promise<PaginatedApiResult<ReportTableResponse>> {
    const response = await apiClient.get<ReportTableResponse[]>(
      `report-tables/${tableId}/responses`,
      filters as Record<string, unknown>
    );
    const result = response as unknown as PaginatedApiResult<ReportTableResponse>;
    return {
      data: result.data ?? [],
      meta: result.meta ?? { current_page: 1, per_page: 50, total: 0, last_page: 1 },
    };
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async exportTable(tableId: number, title: string): Promise<void> {
    const response = await apiClient.get<Blob>(
      `report-tables/${tableId}/export`,
      {},
      { responseType: 'blob' }
    );
    const blobResponse = response as unknown as { data: Blob };
    if (blobResponse.data) {
      const url = window.URL.createObjectURL(blobResponse.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}_hesabat.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  }

  // ─── School: Cavab əməliyyatları ──────────────────────────────────────────

  async startResponse(tableId: number): Promise<ReportTableResponse> {
    const response = await this.post<ReportTableResponse>(`report-tables/${tableId}/response/start`);
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.startResponse', 'ReportTableService');
  }

  async getMyResponse(tableId: number): Promise<ReportTableResponse | null> {
    const response = await this.get<ReportTableResponse | null>(`report-tables/${tableId}/response/my`);
    const result = response as unknown as SingleApiResult<ReportTableResponse>;
    return result.data ?? null;
  }

  async saveResponse(responseId: number, rows: ReportTableRow[]): Promise<ReportTableResponse> {
    const response = await this.put<ReportTableResponse>(
      `report-table-responses/${responseId}`,
      { rows: rows as unknown as Record<string, unknown> }
    );
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.saveResponse', 'ReportTableService');
  }

  async submitResponse(responseId: number): Promise<ReportTableResponse> {
    const response = await this.post<ReportTableResponse>(`report-table-responses/${responseId}/submit`);
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.submitResponse', 'ReportTableService');
  }

  // ─── School: Tək sətir göndər ─────────────────────────────────────────────

  async submitRow(tableId: number, responseId: number, rowIndex: number): Promise<ReportTableResponse> {
    const response = await this.post<ReportTableResponse>(
      `report-tables/${tableId}/responses/${responseId}/rows/submit`,
      { row_index: rowIndex }
    );
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.submitRow', 'ReportTableService');
  }

  // ─── Admin: Sətir action-ları (review) ────────────────────────────────────

  async approveRow(tableId: number, responseId: number, rowIndex: number): Promise<ReportTableResponse> {
    const response = await this.post<ReportTableResponse>(
      `report-tables/${tableId}/responses/${responseId}/rows/approve`,
      { row_index: rowIndex }
    );
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.approveRow', 'ReportTableService');
  }

  async rejectRow(tableId: number, responseId: number, rowIndex: number, reason: string): Promise<ReportTableResponse> {
    const response = await this.post<ReportTableResponse>(
      `report-tables/${tableId}/responses/${responseId}/rows/reject`,
      { row_index: rowIndex, reason }
    );
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.rejectRow', 'ReportTableService');
  }

  async returnRow(tableId: number, responseId: number, rowIndex: number): Promise<ReportTableResponse> {
    const response = await this.post<ReportTableResponse>(
      `report-tables/${tableId}/responses/${responseId}/rows/return`,
      { row_index: rowIndex }
    );
    return handleApiResponseWithError<ReportTableResponse>(response, 'ReportTableService.returnRow', 'ReportTableService');
  }

  // ─── Approval Queue ───────────────────────────────────────────────────────

  async getApprovalQueue(): Promise<ApprovalQueueTable[]> {
    const response = await this.get<{ data: ApprovalQueueTable[] }>('report-tables/approval-queue');
    const result = response as unknown as { data: ApprovalQueueTable[] };
    return result.data ?? [];
  }

  async bulkRowAction(
    tableId: number,
    rowSpecs: BulkRowSpec[],
    action: 'approve' | 'reject' | 'return',
    reason?: string
  ): Promise<BulkRowActionResult> {
    const payload: Record<string, unknown> = { row_specs: rowSpecs, action };
    if (reason) payload.reason = reason;
    const response = await this.post<BulkRowActionResult>(
      `report-tables/${tableId}/responses/bulk-row-action`,
      payload
    );
    return response as unknown as BulkRowActionResult;
  }

  // ─── SuperAdmin: Soft delete bərpa / birdəfəlik sil ──────────────────────

  async restoreTable(tableId: number): Promise<ReportTable> {
    const response = await this.post<ReportTable>(`report-tables/${tableId}/restore`);
    const result = handleApiResponseWithError<ReportTable>(response, 'ReportTableService.restoreTable', 'ReportTableService');
    this.invalidateCache(['list', 'detail']);
    return result;
  }

  async forceDeleteTable(tableId: number): Promise<void> {
    await apiClient.delete(`report-tables/${tableId}/force`);
    this.invalidateCache(['list', 'detail']);
  }
}

export const reportTableService = new ReportTableService();
