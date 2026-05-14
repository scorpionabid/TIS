/**
 * Tests for ReportTable Service
 */

import { reportTableService } from '../../services/reportTables';
import { apiClient } from '../../services/api';
import {
  createMockReportTable,
  createMockReportTableResponse,
  mockPaginatedResponse,
  mockApiResponse,
} from './testUtils';

// Mock the API client
jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ReportTableService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── List Operations ───────────────────────────────────────────────────────

  describe('getList', () => {
    test('should fetch paginated list of report tables', async () => {
      const mockTables = [
        createMockReportTable({ id: 1, title: 'Table 1' }),
        createMockReportTable({ id: 2, title: 'Table 2' }),
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(
        mockPaginatedResponse(mockTables, 2, 1, 15)
      );

      const result = await reportTableService.getList();

      expect(apiClient.get).toHaveBeenCalledWith('report-tables', undefined);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBe('Table 1');
      expect(result.meta.total).toBe(2);
    });

    test('should apply filters correctly', async () => {
      const filters = { status: 'published', per_page: 10, page: 1 };
      const mockTables = [createMockReportTable({ status: 'published' })];

      (apiClient.get as jest.Mock).mockResolvedValue(
        mockPaginatedResponse(mockTables, 1, 1, 10)
      );

      await reportTableService.getList(filters);

      expect(apiClient.get).toHaveBeenCalledWith('report-tables', filters);
    });

    test('should handle empty list', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(
        mockPaginatedResponse([], 0, 1, 15)
      );

      const result = await reportTableService.getList();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    test('should handle API errors', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(reportTableService.getList()).rejects.toThrow('Network error');
    });
  });

  // ─── Get My Tables ─────────────────────────────────────────────────────────

  describe('getMyTables', () => {
    test('should fetch my assigned tables', async () => {
      const mockTables = [
        createMockReportTable({ id: 1, my_response_status: 'draft' }),
        createMockReportTable({ id: 2, my_response_status: 'submitted' }),
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse(mockTables));

      const result = await reportTableService.getMyTables();

      expect(apiClient.get).toHaveBeenCalledWith('report-tables/my', undefined);
      expect(result).toHaveLength(2);
    });

    test('should handle empty my tables list', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse([]));

      const result = await reportTableService.getMyTables();

      expect(result).toEqual([]);
    });
  });

  // ─── Single Table Operations ───────────────────────────────────────────────

  describe('getTable', () => {
    test('should fetch single table by id', async () => {
      const mockTable = createMockReportTable({ id: 1 });

      (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse(mockTable));

      const result = await reportTableService.getTable(1);

      expect(apiClient.get).toHaveBeenCalledWith('report-tables/1', undefined);
      expect(result.id).toBe(1);
    });

    test('should handle table not found', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(
        new Error('Report table not found')
      );

      await expect(reportTableService.getTable(999)).rejects.toThrow(
        'Report table not found'
      );
    });
  });

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  describe('createTable', () => {
    test('should create new report table', async () => {
      const payload = {
        title: 'New Table',
        description: 'Description',
        columns: [
          { key: 'name', label: 'Name', type: 'text' as const },
        ],
        max_rows: 5,
        target_institutions: [1, 2],
      };

      const mockTable = createMockReportTable({ id: 1, ...payload });
      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockTable));

      const result = await reportTableService.createTable(payload);

      expect(apiClient.post).toHaveBeenCalledWith('report-tables', payload);
      expect(result.title).toBe('New Table');
    });

    test('should validate required fields', async () => {
      const invalidPayload = {
        title: '',
        columns: [],
      };

      await expect(
        reportTableService.createTable(invalidPayload as any)
      ).rejects.toThrow();
    });
  });

  describe('updateTable', () => {
    test('should update existing table', async () => {
      const payload = {
        title: 'Updated Table',
        max_rows: 20,
      };

      const mockTable = createMockReportTable({ id: 1, ...payload });
      (apiClient.put as jest.Mock).mockResolvedValue(mockApiResponse(mockTable));

      const result = await reportTableService.updateTable(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('report-tables/1', payload);
      expect(result.title).toBe('Updated Table');
    });

    test('should handle update with partial fields', async () => {
      const payload = { title: 'Updated Title' };

      const mockTable = createMockReportTable({ id: 1, title: 'Updated Title' });
      (apiClient.put as jest.Mock).mockResolvedValue(mockApiResponse(mockTable));

      const result = await reportTableService.updateTable(1, payload);

      expect(result.title).toBe('Updated Title');
    });
  });

  describe('deleteTable', () => {
    test('should delete table by id', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ status: 204 });

      await reportTableService.deleteTable(1);

      expect(apiClient.delete).toHaveBeenCalledWith('report-tables/1');
    });

    test('should handle delete error', async () => {
      (apiClient.delete as jest.Mock).mockRejectedValue(
        new Error('Cannot delete published table')
      );

      await expect(reportTableService.deleteTable(1)).rejects.toThrow(
        'Cannot delete published table'
      );
    });
  });

  // ─── Status Operations ─────────────────────────────────────────────────────

  describe('publishTable', () => {
    test('should publish draft table', async () => {
      const mockTable = createMockReportTable({ id: 1, status: 'published' });
      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockTable));

      const result = await reportTableService.publishTable(1);

      expect(apiClient.post).toHaveBeenCalledWith('report-tables/1/publish', undefined);
      expect(result.status).toBe('published');
    });
  });

  describe('archiveTable', () => {
    test('should archive published table', async () => {
      const mockTable = createMockReportTable({ id: 1, status: 'archived' });
      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockTable));

      const result = await reportTableService.archiveTable(1);

      expect(apiClient.post).toHaveBeenCalledWith('report-tables/1/archive', undefined);
      expect(result.status).toBe('archived');
    });
  });

  // ─── Response Operations ───────────────────────────────────────────────────

  describe('getMyResponse', () => {
    test('should fetch my response for a table', async () => {
      const mockResponse = createMockReportTableResponse({
        report_table_id: 1,
        status: 'draft',
      });

      (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse(mockResponse));

      const result = await reportTableService.getMyResponse(1);

      expect(apiClient.get).toHaveBeenCalledWith('report-tables/1/my-response', undefined);
      expect(result.report_table_id).toBe(1);
    });

    test('should return null if no response exists', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse(null));

      const result = await reportTableService.getMyResponse(1);

      expect(result).toBeNull();
    });
  });

  describe('saveResponse', () => {
    test('should save draft response', async () => {
      const rows = [{ name: 'John', age: 25 }];
      const mockResponse = createMockReportTableResponse({
        report_table_id: 1,
        rows,
        status: 'draft',
      });

      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockResponse));

      const result = await reportTableService.saveResponse(1, rows);

      expect(apiClient.post).toHaveBeenCalledWith('report-tables/1/save-response', { rows });
      expect(result.rows).toEqual(rows);
    });
  });

  describe('submitResponse', () => {
    test('should submit final response', async () => {
      const rows = [{ name: 'John', age: 25 }];
      const mockResponse = createMockReportTableResponse({
        report_table_id: 1,
        rows,
        status: 'submitted',
        submitted_at: '2026-03-01T00:00:00Z',
      });

      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockResponse));

      const result = await reportTableService.submitResponse(1, rows);

      expect(apiClient.post).toHaveBeenCalledWith('report-tables/1/submit-response', { rows });
      expect(result.status).toBe('submitted');
    });
  });

  // ─── Admin Response Management ─────────────────────────────────────────────

  describe('getResponses', () => {
    test('should fetch all responses for admin', async () => {
      const mockResponses = [
        createMockReportTableResponse({ id: 1, institution_id: 1 }),
        createMockReportTableResponse({ id: 2, institution_id: 2 }),
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(mockPaginatedResponse(mockResponses, 2));

      const result = await reportTableService.getResponses(1);

      expect(apiClient.get).toHaveBeenCalledWith('report-tables/1/responses', undefined);
      expect(result.data).toHaveLength(2);
    });

    test('should filter responses by status', async () => {
      const filters = { status: 'submitted' as const };
      const mockResponses = [createMockReportTableResponse({ status: 'submitted' })];

      (apiClient.get as jest.Mock).mockResolvedValue(mockPaginatedResponse(mockResponses, 1));

      await reportTableService.getResponses(1, filters);

      expect(apiClient.get).toHaveBeenCalledWith('report-tables/1/responses', filters);
    });
  });

  describe('approveResponse', () => {
    test('should approve a response', async () => {
      const mockResponse = createMockReportTableResponse({
        id: 1,
        status: 'approved',
      });

      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockResponse));

      const result = await reportTableService.approveResponse(1, 1);

      expect(apiClient.post).toHaveBeenCalledWith(
        'report-tables/1/responses/1/approve',
        undefined
      );
      expect(result.status).toBe('approved');
    });
  });

  describe('rejectResponse', () => {
    test('should reject a response with reason', async () => {
      const mockResponse = createMockReportTableResponse({
        id: 1,
        status: 'rejected',
      });

      (apiClient.post as jest.Mock).mockResolvedValue(mockApiResponse(mockResponse));

      const result = await reportTableService.rejectResponse(1, 1, 'Incomplete data');

      expect(apiClient.post).toHaveBeenCalledWith(
        'report-tables/1/responses/1/reject',
        { reason: 'Incomplete data' }
      );
      expect(result.status).toBe('rejected');
    });
  });
});
