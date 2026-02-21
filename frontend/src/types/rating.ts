export interface ScoreDetails {
  tasks_on_time: number;
  tasks_late: number;
  tasks_total: number;
  task_score: number;
  surveys_on_time: number;
  surveys_late: number;
  surveys_total: number;
  survey_score: number;
  attendance_on_time: number;
  attendance_missed: number;
  attendance_total_days: number;
  attendance_score: number;
  approved_on_time?: number;
  approved_late?: number;
  approval_pending_overdue?: number;
  approval_total?: number;
  approval_score?: number;
  links_opened: number;
  links_missed: number;
  links_total: number;
  link_score: number;
}

export interface RatingItem {
  id: number;
  user_id: number;
  institution_id: number;
  academic_year_id: number;
  period: string;
  overall_score: number;
  task_score: number;
  survey_score: number;
  attendance_score: number;
  approval_score: number;
  link_score: number;
  manual_score: number;
  academic_score?: number;
  observation_score?: number;
  assessment_score?: number;
  certificate_score?: number;
  olympiad_score?: number;
  award_score?: number;
  growth_bonus?: number;
  yearly_breakdown?: Record<string, Record<string, number>>;
  score_details?: ScoreDetails;
  status: 'draft' | 'published' | 'archived';
  metadata?: {
    calculation_method?: string;
    calculated_at?: string;
    weights?: {
      task: number;
      survey: number;
      manual: number;
    };
  };
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    full_name: string;
    email: string;
    roles?: string[];
  };
  institution?: {
    id: number;
    name: string;
    sector_id?: number;
    sector_name?: string;
  };
  academic_year?: {
    id: number;
    name: string;
  };
}

export interface RatingConfig {
  id: number;
  institution_id: number;
  academic_year_id: number;
  task_weight: number;
  survey_weight: number;
  manual_weight: number;
  calculation_method: 'automatic' | 'manual' | 'hybrid';
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  first_page_url?: string;
  last_page_url?: string;
  path: string;
  from: number;
  to: number;
}

export interface RatingListParams {
  page?: number;
  per_page?: number;
  user_id?: number;
  institution_id?: number;
  academic_year_id?: number;
  period?: string;
  status?: string;
  user_role?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  force_calculate?: boolean;
}

export interface CalculateRequest {
  academic_year_id: number;
  period: string;
  user_role?: string;
}

export interface CalculateResponse {
  results: Array<{
    user_id: number;
    user_name: string;
    rating?: RatingItem;
    status: 'success' | 'error';
    error?: string;
  }>;
  summary: {
    total_users: number;
    success_count: number;
    error_count: number;
    period: string;
  };
}
