import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { reportsService, type ReportFilters, type ReportOverviewStats } from '@/services/reports';

const mockOverviewResponse = {
  status: 'success',
  data: {
    user_statistics: {
      total_users: 10,
      active_users: 8,
      new_users: 2,
      user_growth_rate: 5,
      users_by_role: [],
    },
    institution_statistics: {
      total_institutions: 4,
      active_institutions: 3,
      institutions_by_type: [],
      regional_distribution: [],
    },
    survey_statistics: {
      total_surveys: 5,
      active_surveys: 2,
      completed_surveys: 3,
      total_responses: 100,
      response_rate: 50,
    },
    system_activity: {
      daily_active_users: 4,
      total_sessions: 20,
      average_session_duration: 10,
      most_active_hours: [],
    },
    performance_metrics: {
      average_response_time: 200,
      system_uptime: 99,
      error_rate: 0.1,
      user_satisfaction_score: 4.5,
    },
    growth_trends: {
      user_growth: [],
      activity_trends: [],
    },
  } as ReportOverviewStats,
  date_range: { start_date: '2025-01-01', end_date: '2025-01-31' },
  generated_at: '2025-01-15T00:00:00Z',
};

const mockExportResponse = {
  success: true,
  data: { download_url: 'https://example.com/report.pdf' },
  message: 'ready',
};

describe('reportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls overview endpoint with provided filters', async () => {
    const filters: ReportFilters = { start_date: '2025-01-01', end_date: '2025-01-31', region: 'Bakı' };
    const getSpy = vi
      .spyOn(reportsService as unknown as { get: ReturnType<typeof vi.fn> }, 'get')
      .mockResolvedValue(mockOverviewResponse);

    const result = await reportsService.getOverviewStats(filters);

    expect(getSpy).toHaveBeenCalledWith('/reports/overview', filters);
    expect(result).toEqual(mockOverviewResponse);
  });

  it('rethrows underlying errors when overview request fails', async () => {
    const error = new Error('boom');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(reportsService as unknown as { get: ReturnType<typeof vi.fn> }, 'get').mockRejectedValue(error);

    await expect(reportsService.getOverviewStats()).rejects.toThrow('boom');
  });

  it('exportOverviewReport üçün düzgün payload qurur', async () => {
    const exportSpy = vi
      .spyOn(reportsService, 'exportReport')
      .mockResolvedValue(mockExportResponse as any);
    const filters: ReportFilters = { institution_id: 42 };

    const result = await reportsService.exportOverviewReport('pdf', filters);

    expect(exportSpy).toHaveBeenCalledWith({
      report_type: 'overview',
      format: 'pdf',
      filters,
      include_charts: true,
      include_raw_data: false,
    });
    expect(result).toEqual(mockExportResponse);
  });

  it('exportSurveyReport Excel üçün xam data flag-nı aktiv edir', async () => {
    const exportSpy = vi
      .spyOn(reportsService, 'exportReport')
      .mockResolvedValue(mockExportResponse as any);

    await reportsService.exportSurveyReport('excel', { survey_id: 7 });

    expect(exportSpy).toHaveBeenCalledWith({
      report_type: 'survey',
      format: 'excel',
      filters: { survey_id: 7 },
      include_charts: true,
      include_raw_data: true,
    });
  });
});
