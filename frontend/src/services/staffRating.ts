import api from './api';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface StaffRating {
  id: number;
  staff_user_id: number;
  staff_role: string;
  institution_id: number | null;
  rater_user_id: number | null;
  rater_role: string | null;
  rating_type: 'manual' | 'automatic';
  category: string;
  score: number;
  period: string;
  notes: string | null;
  auto_calculated_data: any | null;
  is_latest: boolean;
  created_at: string;
  updated_at: string;
  // Relationships
  staffUser?: User;
  rater?: User;
  institution?: Institution;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface Institution {
  id: number;
  name: string;
  type: string;
}

export interface RatingBreakdown {
  final_score: number;
  task_performance: ComponentScore;
  survey_performance: ComponentScore;
  document_activity: ComponentScore;
  link_management: ComponentScore;
  period: string;
  calculated_at: string;
  user_id: number;
  user_role: string;
}

export interface ComponentScore {
  total?: number;
  component_score: number;
  weight: number;
  weighted_score: number;
  [key: string]: any;
}

export interface RatingConfiguration {
  id: number;
  component_name: string;
  weight: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverview {
  period: string;
  overview: {
    total_staff: number;
    average_score: number;
    manual_average: number;
    automatic_average: number;
    total_ratings: number;
  };
  score_distribution: {
    excellent: number;
    good: number;
    average: number;
    below_average: number;
    poor: number;
  };
  by_role: Array<{
    role: string;
    count: number;
    average: number;
  }>;
  by_category: Array<{
    category: string;
    count: number;
    average: number;
  }>;
  top_performers: Array<{
    staff: User;
    score: number;
    category: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  staff: User;
  institution: Institution | null;
  score: number;
  category: string;
  rating_type: string;
}

export interface AuditLog {
  id: number;
  rating_id: number | null;
  staff_user_id: number | null;
  action: string;
  actor_user_id: number | null;
  actor_role: string | null;
  old_score: number | null;
  new_score: number | null;
  old_data: any | null;
  new_data: any | null;
  change_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Relationships
  staffUser?: User;
  actor?: User;
  rating?: StaffRating;
}

// ============================================
// DIRECTOR MANAGEMENT SERVICE
// ============================================

export const directorService = {
  /**
   * Get all directors
   */
  async getAll(params?: {
    region_id?: number;
    sector_id?: number;
    search?: string;
  }) {
    const response = await api.get('/staff-rating/directors', { params });
    return response.data;
  },

  /**
   * Get director for specific institution
   */
  async getByInstitution(institutionId: number) {
    const response = await api.get(`/staff-rating/directors/${institutionId}`);
    return response.data;
  },

  /**
   * Assign director to institution
   */
  async assign(data: {
    institution_id: number;
    user_id: number;
    notes?: string;
  }) {
    const response = await api.post('/staff-rating/directors', data);
    return response.data;
  },

  /**
   * Update director information
   */
  async update(institutionId: number, data: {
    notes?: string;
    status?: string;
  }) {
    const response = await api.put(`/staff-rating/directors/${institutionId}`, data);
    return response.data;
  },

  /**
   * Remove director from institution
   */
  async remove(institutionId: number, reason?: string) {
    const response = await api.delete(`/staff-rating/directors/${institutionId}`, {
      data: { reason },
    });
    return response.data;
  },

  /**
   * Bulk assign directors
   */
  async bulkAssign(assignments: Array<{
    institution_id: number;
    user_id: number;
    notes?: string;
  }>) {
    const response = await api.post('/staff-rating/directors/bulk-assign', {
      assignments,
    });
    return response.data;
  },
};

// ============================================
// STAFF RATING SERVICE
// ============================================

export const staffRatingService = {
  /**
   * Get all ratings for a staff member
   */
  async getForStaff(staffId: number, params?: {
    rating_type?: 'manual' | 'automatic';
    category?: string;
    period?: string;
    latest_only?: boolean;
  }) {
    const response = await api.get(`/staff-rating/ratings/staff/${staffId}`, {
      params,
    });
    return response.data;
  },

  /**
   * Get specific rating
   */
  async getById(ratingId: number) {
    const response = await api.get(`/staff-rating/ratings/${ratingId}`);
    return response.data;
  },

  /**
   * Create new manual rating
   */
  async create(data: {
    staff_user_id: number;
    category: string;
    score: number;
    period: string;
    notes?: string;
  }) {
    const response = await api.post('/staff-rating/ratings', data);
    return response.data;
  },

  /**
   * Update existing rating
   */
  async update(ratingId: number, data: {
    score?: number;
    notes?: string;
    reason?: string;
  }) {
    const response = await api.put(`/staff-rating/ratings/${ratingId}`, data);
    return response.data;
  },

  /**
   * Delete rating
   */
  async delete(ratingId: number, reason: string) {
    const response = await api.delete(`/staff-rating/ratings/${ratingId}`, {
      data: { reason },
    });
    return response.data;
  },

  /**
   * Get automatic rating breakdown
   */
  async getBreakdown(staffId: number, period: string): Promise<{ breakdown: RatingBreakdown }> {
    const response = await api.get(`/staff-rating/ratings/staff/${staffId}/breakdown`, {
      params: { period },
    });
    return response.data;
  },

  /**
   * Get rateable users for current user
   */
  async getRateableUsers() {
    const response = await api.get('/staff-rating/ratings/rateable-users');
    return response.data;
  },

  /**
   * Get statistics for multiple staff
   */
  async getStatistics(staffUserIds: number[], period?: string) {
    const response = await api.post('/staff-rating/ratings/statistics', {
      staff_user_ids: staffUserIds,
      period,
    });
    return response.data;
  },
};

// ============================================
// RATING CONFIGURATION SERVICE
// ============================================

export const ratingConfigService = {
  /**
   * Get all configurations
   */
  async getAll() {
    const response = await api.get('/staff-rating/configuration');
    return response.data;
  },

  /**
   * Get specific configuration
   */
  async getById(configId: number) {
    const response = await api.get(`/staff-rating/configuration/${configId}`);
    return response.data;
  },

  /**
   * Update configuration weight
   */
  async update(configId: number, data: {
    weight?: number;
    description?: string;
    is_active?: boolean;
  }) {
    const response = await api.put(`/staff-rating/configuration/${configId}`, data);
    return response.data;
  },

  /**
   * Bulk update all configurations
   */
  async bulkUpdate(configurations: Array<{
    component_name: string;
    weight: number;
  }>, reason?: string) {
    const response = await api.post('/staff-rating/configuration/bulk-update', {
      configurations,
      reason,
    });
    return response.data;
  },

  /**
   * Reset to default values
   */
  async reset(reason: string) {
    const response = await api.post('/staff-rating/configuration/reset', {
      reason,
    });
    return response.data;
  },

  /**
   * Get configuration history
   */
  async getHistory(limit?: number) {
    const response = await api.get('/staff-rating/configuration/history', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Validate proposed configurations
   */
  async validate(configurations: Array<{
    component_name: string;
    weight: number;
  }>) {
    const response = await api.post('/staff-rating/configuration/validate', {
      configurations,
    });
    return response.data;
  },
};

// ============================================
// DASHBOARD SERVICE
// ============================================

export const dashboardService = {
  /**
   * Get overview statistics
   */
  async getOverview(period?: string): Promise<DashboardOverview> {
    const response = await api.get('/staff-rating/dashboard/overview', {
      params: { period },
    });
    return response.data;
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(params?: {
    period?: string;
    category?: string;
    limit?: number;
    rating_type?: string;
  }): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const response = await api.get('/staff-rating/dashboard/leaderboard', {
      params,
    });
    return response.data;
  },

  /**
   * Get trend analysis
   */
  async getTrend(staffUserId: number, params?: {
    category?: string;
    months?: number;
  }) {
    const response = await api.get('/staff-rating/dashboard/trend', {
      params: { staff_user_id: staffUserId, ...params },
    });
    return response.data;
  },

  /**
   * Compare multiple staff members
   */
  async compare(staffIds: number[], period?: string) {
    const response = await api.post('/staff-rating/dashboard/compare', {
      staff_ids: staffIds,
      period,
    });
    return response.data;
  },

  /**
   * Get institution statistics
   */
  async getInstitutionStats(institutionId: number, period?: string) {
    const response = await api.get(`/staff-rating/dashboard/institution/${institutionId}`, {
      params: { period },
    });
    return response.data;
  },

  /**
   * Export dashboard data
   */
  async export(period?: string, format: 'json' | 'csv' | 'excel' = 'json') {
    const response = await api.get('/staff-rating/dashboard/export', {
      params: { period, format },
    });
    return response.data;
  },
};

// ============================================
// MY RATING SERVICE
// ============================================

export const myRatingService = {
  /**
   * Get my ratings
   */
  async getMyRatings(params?: {
    period?: string;
    latest_only?: boolean;
  }) {
    const response = await api.get('/staff-rating/my-rating', { params });
    return response.data;
  },

  /**
   * Get my automatic rating breakdown
   */
  async getMyBreakdown(period?: string) {
    const response = await api.get('/staff-rating/my-rating/breakdown', {
      params: { period },
    });
    return response.data;
  },

  /**
   * Get my rating history
   */
  async getMyHistory(params?: {
    months?: number;
    category?: string;
  }) {
    const response = await api.get('/staff-rating/my-rating/history', {
      params,
    });
    return response.data;
  },

  /**
   * Compare with peer average
   */
  async getPeerComparison(period?: string) {
    const response = await api.get('/staff-rating/my-rating/peer-comparison', {
      params: { period },
    });
    return response.data;
  },

  /**
   * Get my rank in leaderboard
   */
  async getMyRank(params?: {
    period?: string;
    category?: string;
  }) {
    const response = await api.get('/staff-rating/my-rating/rank', {
      params,
    });
    return response.data;
  },

  /**
   * Get summary of all my ratings
   */
  async getMySummary() {
    const response = await api.get('/staff-rating/my-rating/summary');
    return response.data;
  },
};

// ============================================
// AUDIT LOG SERVICE
// ============================================

export const auditService = {
  /**
   * Get all audit logs
   */
  async getAll(params?: {
    staff_user_id?: number;
    actor_user_id?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
  }) {
    const response = await api.get('/staff-rating/audit', { params });
    return response.data;
  },

  /**
   * Get specific audit log
   */
  async getById(logId: number) {
    const response = await api.get(`/staff-rating/audit/${logId}`);
    return response.data;
  },

  /**
   * Get logs for specific staff
   */
  async getForStaff(staffId: number, action?: string) {
    const response = await api.get(`/staff-rating/audit/staff/${staffId}`, {
      params: { action },
    });
    return response.data;
  },

  /**
   * Get logs by specific actor
   */
  async getByActor(actorId: number) {
    const response = await api.get(`/staff-rating/audit/actor/${actorId}`);
    return response.data;
  },

  /**
   * Get recent activity
   */
  async getRecent(days: number = 7, limit: number = 100) {
    const response = await api.get('/staff-rating/audit/recent', {
      params: { days, limit },
    });
    return response.data;
  },

  /**
   * Get audit statistics
   */
  async getStatistics(params?: {
    date_from?: string;
    date_to?: string;
  }) {
    const response = await api.get('/staff-rating/audit/statistics', {
      params,
    });
    return response.data;
  },

  /**
   * Export audit logs
   */
  async export(params?: {
    date_from?: string;
    date_to?: string;
  }) {
    const response = await api.get('/staff-rating/audit/export', {
      params,
    });
    return response.data;
  },
};

export default {
  directors: directorService,
  ratings: staffRatingService,
  config: ratingConfigService,
  dashboard: dashboardService,
  myRating: myRatingService,
  audit: auditService,
};
