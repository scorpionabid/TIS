/**
 * SurveyModal TypeScript Type Definitions
 * Centralized type definitions for survey modal components
 */

import type { SurveyQuestion } from '@/services/surveys/types';

// Question type for modal - extends SurveyQuestion with modal-specific fields
export interface Question extends Partial<SurveyQuestion> {
  id?: string;
  question: string;
  description?: string;
  type: 'text' | 'number' | 'date' | 'single_choice' | 'multiple_choice' | 'file_upload' | 'rating' | 'table_matrix';
  options?: string[];
  required: boolean;
  order: number;
  validation?: {
    min_value?: number;
    max_value?: number;
    max_file_size?: number;
    allowed_file_types?: string[];
  };
}

export interface QuestionRestriction {
  approved_responses_count: number;
  can_edit_text: boolean;
  can_edit_type: boolean;
  can_edit_required: boolean;
  can_add_options: boolean;
  can_remove_options: boolean;
}

export interface Institution {
  id: number;
  name: string;
  level: number;
  type: string;
}

export interface QuestionType {
  value: string;
  label: string;
}

export const QUESTION_TYPES: QuestionType[] = [
  { value: 'text', label: 'Mətn sahəsi' },
  { value: 'number', label: 'Rəqəm sahəsi' },
  { value: 'date', label: 'Tarix seçimi' },
  { value: 'single_choice', label: 'Tək seçim' },
  { value: 'multiple_choice', label: 'Çox seçim' },
  { value: 'file_upload', label: 'Fayl yükləmə' },
  { value: 'rating', label: 'Qiymətləndirmə' },
  { value: 'table_matrix', label: 'Cədvəl/Matris' },
];

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_QUESTION_LENGTH = 500;
