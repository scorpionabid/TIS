import React from 'react';
import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Reports from '../Reports';
import { useAuth } from '@/contexts/AuthContext';
import { reportsService, type ReportOverviewStats } from '@/services/reports';

const toastMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/services/reports', () => ({
  reportsService: {
    getOverviewStats: vi.fn(),
    getInstitutionalPerformance: vi.fn(),
    getUserActivityReport: vi.fn(),
    getMockOverviewStats: vi.fn(),
    exportOverviewReport: vi.fn(),
    exportInstitutionalReport: vi.fn(),
    exportSurveyReport: vi.fn(),
    exportUserActivityReport: vi.fn(),
  },
}));

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockedReportsService = reportsService as unknown as {
  getOverviewStats: ReturnType<typeof vi.fn>;
  getInstitutionalPerformance: ReturnType<typeof vi.fn>;
  getUserActivityReport: ReturnType<typeof vi.fn>;
  getMockOverviewStats: ReturnType<typeof vi.fn>;
  exportOverviewReport: ReturnType<typeof vi.fn>;
  exportInstitutionalReport: ReturnType<typeof vi.fn>;
  exportSurveyReport: ReturnType<typeof vi.fn>;
  exportUserActivityReport: ReturnType<typeof vi.fn>;
};

const renderWithQueryClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <Reports />
    </QueryClientProvider>
  );
};

const authorizedUser = {
  id: 1,
  role: 'superadmin',
  institution: { id: 10, name: 'Baku School' },
};

const mockOverview: ReportOverviewStats = {
  user_statistics: {
    total_users: 120,
    active_users: 95,
    new_users: 10,
    user_growth_rate: 12,
    users_by_role: [
      { role: 'SuperAdmin', count: 5, percentage: 4 },
      { role: 'RegionAdmin', count: 15, percentage: 12 },
      { role: 'Teacher', count: 100, percentage: 84 },
    ],
  },
  institution_statistics: {
    total_institutions: 30,
    active_institutions: 28,
    institutions_by_type: [
      { type: 'School', count: 20, percentage: 66 },
      { type: 'Kindergarten', count: 10, percentage: 34 },
    ],
    regional_distribution: [
      { region: 'Bakı', count: 10 },
      { region: 'Gəncə', count: 8 },
    ],
  },
  survey_statistics: {
    total_surveys: 15,
    active_surveys: 3,
    completed_surveys: 12,
    total_responses: 3400,
    response_rate: 80,
  },
  system_activity: {
    daily_active_users: 75,
    total_sessions: 240,
    average_session_duration: 35,
    most_active_hours: [
      { hour: 9, activity_count: 25 },
      { hour: 10, activity_count: 30 },
    ],
  },
  performance_metrics: {
    average_response_time: 280,
    system_uptime: 99.5,
    error_rate: 0.2,
    user_satisfaction_score: 4.6,
  },
  growth_trends: {
    user_growth: [
      { date: '2025-01', count: 100 },
      { date: '2025-02', count: 110 },
    ],
    activity_trends: [
      { date: '2025-01', activity_count: 200 },
      { date: '2025-02', activity_count: 250 },
    ],
  },
};

describe('Reports page', () => {
  beforeAll(() => {
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      currentUser: authorizedUser,
    });
    mockedReportsService.getOverviewStats.mockResolvedValue({
      status: 'success',
      data: mockOverview,
      date_range: { start_date: '2025-01-01', end_date: '2025-01-31' },
      generated_at: '2025-01-15T12:00:00Z',
    });
    mockedReportsService.getMockOverviewStats.mockReturnValue(mockOverview);
  });

  it('blocks unauthorized roles from accessing reports', () => {
    mockedUseAuth.mockReturnValue({
      currentUser: { role: 'teacher' },
    });

    renderWithQueryClient();

    expect(screen.getByText('Giriş icazəsi yoxdur')).toBeInTheDocument();
    expect(mockedReportsService.getOverviewStats).not.toHaveBeenCalled();
  });

  it('loads overview data for admin roles with default filters', async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(mockedReportsService.getOverviewStats).toHaveBeenCalledWith({
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });
    });

    expect(screen.getByText('Ümumi istifadəçilər')).toBeInTheDocument();
    expect(
      screen.getByText(mockOverview.user_statistics.total_users.toLocaleString())
    ).toBeInTheDocument();
    expect(mockedReportsService.getInstitutionalPerformance).not.toHaveBeenCalled();
  });

  it('exports overview report and shows success toast', async () => {
    const user = userEvent.setup();
    mockedReportsService.exportOverviewReport.mockResolvedValue({
      success: true,
      data: { download_url: 'https://example.com/report.pdf' },
      message: 'ready',
    });

    renderWithQueryClient();
    await screen.findByText('Ümumi istifadəçilər');

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const exportButton = screen.getByRole('button', { name: /PDF Export/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(mockedReportsService.exportOverviewReport).toHaveBeenCalledWith('pdf', {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });
    });

    expect(openSpy).toHaveBeenCalledWith('https://example.com/report.pdf', '_blank');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Export uğurlu' })
    );

    openSpy.mockRestore();
  });
});
