// Staff Rating types for configuration and dashboard pages

export interface RatingConfiguration {
  id: number;
  key: string;
  label: string;
  value: number;
  min_value: number;
  max_value: number;
  description?: string;
  category: string;
}

export interface ConfigurationUpdate {
  key: string;
  value: number;
  reason?: string;
}

export interface DirectorAssignment {
  id: number;
  institution_id: number;
  institution_name: string;
  user_id: number;
  user_name: string;
  assigned_at: string;
  assigned_by: string;
}

export interface RatingSummary {
  overall_score: number;
  rank: number;
  total_users: number;
  percentile: number;
  period: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface RatingBreakdown {
  category: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface TrendData {
  period: string;
  score: number;
  rank: number;
}

export interface DashboardOverview {
  total_users: number;
  average_score: number;
  top_performers: number;
  below_threshold: number;
  period: string;
  score_distribution: { range: string; count: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_name: string;
  institution_name: string;
  overall_score: number;
  trend: 'up' | 'down' | 'stable';
}

export const CATEGORY_LABELS: Record<string, string> = {
  task: 'Tapşırıqlar',
  survey: 'Sorğular',
  attendance: 'Davamiyyət',
  approval: 'Təsdiqləmə',
  link: 'Linklər',
  report: 'Hesabatlar',
  manual: 'Manual',
  academic: 'Akademik',
  observation: 'Müşahidə',
};
