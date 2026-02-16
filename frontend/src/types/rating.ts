export interface RatingItem {
  id: number;
  user_id: number;
  institution_id: number;
  academic_year_id: number;
  period: string;
  overall_score: number;
  task_score: number;
  survey_score: number;
  manual_score: number;
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
  config?: Record<string, any>;
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
}

export interface CalculateRequest {
  academic_year_id: number;
  period: string;
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
