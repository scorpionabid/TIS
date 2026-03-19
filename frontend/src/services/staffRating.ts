import { apiClient } from './api';
import type {
  RatingConfiguration,
  ConfigurationUpdate,
  DirectorAssignment,
  RatingSummary,
  RatingBreakdown,
  TrendData,
  DashboardOverview,
  LeaderboardEntry,
} from '@/types/staffRating';

// Rating Configuration Service
export const ratingConfigService = {
  getAll: (): Promise<{ configurations: RatingConfiguration[] }> =>
    apiClient.get('/rating-configurations'),

  validate: (configs: ConfigurationUpdate[]): Promise<{ valid: boolean; errors?: string[] }> =>
    apiClient.post('/rating-configurations/validate', { configurations: configs }),

  bulkUpdate: (configs: ConfigurationUpdate[], reason: string): Promise<{ configurations: RatingConfiguration[] }> =>
    apiClient.put('/rating-configurations/bulk', { configurations: configs, reason }),

  reset: (reason: string): Promise<{ configurations: RatingConfiguration[] }> =>
    apiClient.post('/rating-configurations/reset', { reason }),
};

// Director Assignment Service
export const directorService = {
  getAll: (params?: { institution_id?: number; status?: string }): Promise<{ data: DirectorAssignment[] }> =>
    apiClient.get('/director-assignments', params),

  assign: (data: { institution_id: number; user_id: number }): Promise<DirectorAssignment> =>
    apiClient.post('/director-assignments', data),

  remove: (institutionId: number, reason: string): Promise<void> =>
    apiClient.delete(`/director-assignments/${institutionId}`, { reason }),
};

// My Rating Service
export const myRatingService = {
  getMySummary: (): Promise<RatingSummary> =>
    apiClient.get('/my-rating/summary'),

  getMyHistory: (params?: { months?: number }): Promise<TrendData[]> =>
    apiClient.get('/my-rating/history', params),

  getMyBreakdown: (period?: string): Promise<RatingBreakdown[]> =>
    apiClient.get('/my-rating/breakdown', period ? { period } : undefined),

  getPeerComparison: (period?: string): Promise<{ my_score: number; average: number; top: number }> =>
    apiClient.get('/my-rating/peer-comparison', period ? { period } : undefined),

  getMyRank: (params?: { period?: string; scope?: string }): Promise<{ rank: number; total: number }> =>
    apiClient.get('/my-rating/rank', params),
};

// Dashboard Service
export const dashboardService = {
  getOverview: (period?: string): Promise<DashboardOverview> =>
    apiClient.get('/rating-dashboard/overview', period ? { period } : undefined),

  getLeaderboard: (params?: { period?: string; limit?: number; scope?: string }): Promise<LeaderboardEntry[]> =>
    apiClient.get('/rating-dashboard/leaderboard', params),

  export: (period: string, format: 'xlsx' | 'csv'): Promise<Blob> =>
    apiClient.get('/rating-dashboard/export', { period, format }),
};
