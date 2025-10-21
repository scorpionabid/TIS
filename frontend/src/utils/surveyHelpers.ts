/**
 * Survey Helper Utilities
 * Common functions for survey data transformation and validation
 */

import type { Question } from '@/types/surveyModal';
import type { CreateSurveyData, Survey } from '@/services/surveys';

/**
 * Map a Question object for backend API submission
 * Handles field name transformations (question -> title, etc.)
 */
export const mapQuestionForBackend = (question: Question) => ({
  id: question.id,
  title: question.question, // Backend expects 'title'
  question: question.question, // Keep for compatibility
  description: question.description,
  type: question.type,
  options: question.options || [],
  required: question.required,
  is_required: question.required, // Backend alias
  order: question.order || 0,
  validation: question.validation,
});

/**
 * Map a backend question to frontend Question format
 * Handles field name transformations from API response
 */
export const mapQuestionFromBackend = (q: any): Question => {
  console.log('🐛 Raw question data:', {
    id: q.id,
    options: q.options,
    optionsType: typeof q.options,
    isArray: Array.isArray(q.options)
  });

  return {
    id: q.id?.toString(),
    question: q.title || q.question, // Backend might return 'title' field
    description: q.description,
    type: q.type,
    options: Array.isArray(q.options) ? q.options : [],
    required: q.required || q.is_required, // Handle both field names
    order: q.order_index || q.order, // Handle both field names
    validation: q.validation_rules || q.validation,
  };
};

/**
 * Validate survey data before submission
 * Returns { isValid: boolean, errors: string[] }
 */
export const validateSurveyData = (formData: CreateSurveyData, questions: Question[]) => {
  const errors: string[] = [];

  // Title validation
  if (!formData.title?.trim()) {
    errors.push('Sorğu başlığı daxil edilməlidir');
  }

  // Questions validation
  if (questions.length === 0) {
    errors.push('Ən azı bir sual əlavə edilməlidir');
  }

  // Target institutions validation
  if (!formData.target_institutions || formData.target_institutions.length === 0) {
    errors.push('Ən azı bir hədəf müəssisə seçilməlidir');
  }

  // Question content validation
  questions.forEach((q, index) => {
    if (!q.question?.trim()) {
      errors.push(`Sual ${index + 1}: Sual mətni daxil edilməlidir`);
    }

    // Validate choice questions have options
    if (['single_choice', 'multiple_choice'].includes(q.type)) {
      if (!q.options || q.options.length === 0) {
        errors.push(`Sual ${index + 1}: Seçim variantları əlavə edilməlidir`);
      } else {
        const validOptions = q.options.filter(opt => opt.trim());
        if (validOptions.length === 0) {
          errors.push(`Sual ${index + 1}: Ən azı bir seçim variantı daxil edilməlidir`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Prepare survey data for API submission
 * Combines formData and questions into proper format
 */
export const prepareSurveyDataForSubmission = (
  formData: CreateSurveyData,
  questions: Question[]
): CreateSurveyData => {
  return {
    ...formData,
    questions: questions.map(mapQuestionForBackend),
  };
};

/**
 * Check if a question type needs options
 */
export const questionNeedsOptions = (type: string): boolean => {
  return ['single_choice', 'multiple_choice'].includes(type);
};

/**
 * Check if a question type needs number validation
 */
export const questionNeedsNumberValidation = (type: string): boolean => {
  return type === 'number';
};

/**
 * Check if a question type needs file validation
 */
export const questionNeedsFileValidation = (type: string): boolean => {
  return type === 'file_upload';
};

/**
 * Generate a unique question ID
 */
export const generateQuestionId = (): string => {
  return `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if survey is editable based on status and user permissions
 */
export const isSurveyEditable = (
  survey: Survey | null,
  currentUserId?: number,
  isSuperAdmin?: boolean,
  hasWritePermission?: boolean
): boolean => {
  if (!survey) return true; // New surveys are always editable

  // Draft and active surveys can always be edited
  if (survey.status === 'draft' || survey.status === 'active') return true;

  // Published surveys - check permissions
  if (survey.status === 'published') {
    const isCreator = survey.creator?.id === currentUserId;
    return isCreator || isSuperAdmin || hasWritePermission || false;
  }

  // Completed, archived and other statuses cannot be edited
  return false;
};
