import { BaseEntity, PaginationParams } from '../BaseService';

export interface Survey extends BaseEntity {
  title: string;
  description?: string;
  questions?: SurveyQuestion[];
  status: 'draft' | 'published' | 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  target_roles?: string[];
  target_institutions?: number[];
  response_count?: number;
  questions_count?: number;
  max_responses?: number;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  creator?: {
    id: number;
    username: string;
    full_name: string;
  };
  institution?: {
    id: number;
    name: string;
  };
  survey_type?: string;
  published_at?: string;
}

export interface SurveyQuestion {
  id?: number;
  title: string;
  description?: string;
  type: 'text' | 'number' | 'date' | 'single_choice' | 'multiple_choice' | 'file_upload' | 'rating' | 'table_matrix';
  options?: string[];
  required?: boolean;
  is_required?: boolean;
  order?: number;
  order_index?: number;
  is_active?: boolean;
  validation_rules?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  allowed_file_types?: string[];
  max_file_size?: number;
  rating_min?: number;
  rating_max?: number;
  rating_min_label?: string;
  rating_max_label?: string;
  table_headers?: string[];
  table_rows?: string[];
  translations?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  survey_id?: number;
}

export interface CreateSurveyData {
  title: string;
  description?: string;
  questions: Omit<SurveyQuestion, 'id'>[];
  start_date?: string;
  end_date?: string;
  target_roles?: string[];
  target_institutions?: number[];
  is_anonymous?: boolean;
  allow_multiple_responses?: boolean;
  max_responses?: number;
}

export interface SurveyFilters extends PaginationParams {
  status?: Survey['status'];
  created_by?: number;
  target_role?: string;
  target_institution?: number;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  institution_id: number;
  department_id?: number;
  respondent_id: number;
  respondent_role?: string;
  responses: Record<string, unknown>;
  progress_percentage: number;
  is_complete: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  started_at: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: number;
  rejection_reason?: string;
  survey?: {
    id: number;
    title: string;
    survey_type: string;
    is_anonymous: boolean;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  respondent?: {
    id: number;
    username: string;
    name: string;
  };
  attachments?: SurveyResponseAttachment[];
}

export interface SurveyResponseAttachmentDocument {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type?: string;
  created_at?: string;
}

export interface SurveyResponseAttachment {
  id: number;
  survey_question_id: number;
  document: SurveyResponseAttachmentDocument | null;
  uploaded_by: number;
  created_at?: string;
}

export interface SurveyAnswer {
  question_id: number;
  answer: string | string[];
}

export interface SurveyStats {
  total_responses: number;
  completion_rate: number;
  average_completion_time: number;
  responses_by_day: Array<{ date: string; count: number }>;
  demographic_breakdown?: Record<string, number>;
}

export interface QuestionRestrictions {
  approved_responses_count: number;
  can_edit_text: boolean;
  can_edit_type: boolean;
  can_edit_required: boolean;
  can_add_options: boolean;
  can_remove_options: boolean;
}

export interface SurveyQuestionRestrictions {
  survey_id: number;
  survey_status: string;
  total_responses: number;
  question_restrictions: Record<string, QuestionRestrictions>;
  editing_allowed: boolean;
}

export interface SurveyFormSchema {
  id: number;
  title: string;
  description?: string;
  survey_type: string;
  questions: SurveyQuestion[];
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  requires_login: boolean;
  response_count: number;
  max_responses?: number;
  remaining_responses?: number;
  expires_at?: string;
  estimated_duration: number;
}
