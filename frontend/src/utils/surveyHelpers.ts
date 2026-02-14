/**
 * Survey Helper Utilities
 * Common functions for survey data transformation and validation
 */

import type { Question } from '@/types/surveyModal';
import type { CreateSurveyData, Survey } from '@/services/surveys';
import { logger } from './logger';

/**
 * Map a Question object for backend API submission
 * Handles field name transformations (question -> title, etc.)
 */
export const mapQuestionForBackend = (question: Question) => {
  // Prepare metadata for table_input type
  let metadata = question.metadata || {};

  if (question.type === 'table_input' && question.tableInputColumns) {
    metadata = {
      ...metadata,
      table_input: {
        max_rows: question.tableInputMaxRows || 20,
        columns: question.tableInputColumns,
      },
    };
  }

  return {
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
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    min_value: question.min_value,
    max_value: question.max_value,
    min_length: question.min_length,
    max_length: question.max_length,
    allowed_file_types: question.allowed_file_types,
    max_file_size: question.max_file_size,
    rating_min: question.rating_min,
    rating_max: question.rating_max,
    rating_min_label: question.rating_min_label,
    rating_max_label: question.rating_max_label,
    table_headers: question.type === 'table_input'
      ? question.tableInputColumns?.map(col => col.label)
      : question.tableHeaders,
    table_rows: question.tableRows,
  };
};

const normalizeMatrixList = (value: any): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (typeof item === 'object' && item !== null) {
        return item.label || item.value || item.name || item.title || '';
      }

      return '';
    })
    .map((str) => str?.toString().trim())
    .filter((str) => Boolean(str && str.length > 0));
};

/**
 * Map a backend question to frontend Question format
 * Handles field name transformations from API response
 */
export const mapQuestionFromBackend = (q: any): Question => {
  logger.log('Raw question data', { component: 'surveyHelpers', action: 'mapQuestionFromBackend', data: { id: q.id, options: q.options, optionsType: typeof q.options } });

  const validation = { ...(q.validation_rules || q.validation || {}) } as Record<string, any>;
  if (q.min_value !== undefined) validation.min_value = q.min_value;
  if (q.max_value !== undefined) validation.max_value = q.max_value;
  if (q.min_length !== undefined) validation.min_length = q.min_length;
  if (q.max_length !== undefined) validation.max_length = q.max_length;
  if (q.allowed_file_types) validation.allowed_file_types = q.allowed_file_types;
  if (q.max_file_size !== undefined) validation.max_file_size = q.max_file_size;
  if (q.rating_min !== undefined) validation.rating_min = q.rating_min;
  if (q.rating_max !== undefined) validation.rating_max = q.rating_max;

  // Extract table_input specific fields from metadata
  const tableInputConfig = q.metadata?.table_input;
  const tableInputColumns = tableInputConfig?.columns;
  const tableInputMaxRows = tableInputConfig?.max_rows;

  return {
    id: q.id?.toString(),
    question: q.title || q.question, // Backend might return 'title' field
    description: q.description,
    type: q.type,
    options: Array.isArray(q.options) ? q.options : [],
    required: q.required || q.is_required, // Handle both field names
    order: q.order_index || q.order, // Handle both field names
    validation: Object.keys(validation).length > 0 ? validation : undefined,
    metadata: q.metadata,
    min_value: q.min_value,
    max_value: q.max_value,
    min_length: q.min_length,
    max_length: q.max_length,
    allowed_file_types: Array.isArray(q.allowed_file_types) ? q.allowed_file_types : undefined,
    max_file_size: q.max_file_size,
    rating_min: q.rating_min,
    rating_max: q.rating_max,
    rating_min_label: q.rating_min_label,
    rating_max_label: q.rating_max_label,
    tableHeaders: normalizeMatrixList(q.table_headers),
    tableRows: normalizeMatrixList(q.table_rows),
    tableInputColumns: Array.isArray(tableInputColumns) ? tableInputColumns : undefined,
    tableInputMaxRows: tableInputMaxRows,
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
    // table_input sualları üçün sual mətni ixtiyaridir - sütun adları kifayətdir
    if (q.type !== 'table_input' && !q.question?.trim()) {
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

    if (q.type === 'table_matrix') {
      const rows = (q.tableRows || []).map(row => row.trim()).filter(Boolean);
      const headers = (q.tableHeaders || []).map(header => header.trim()).filter(Boolean);

      if (rows.length === 0) {
        errors.push(`Sual ${index + 1}: Ən azı bir sətir daxil edilməlidir`);
      }

      if (headers.length === 0) {
        errors.push(`Sual ${index + 1}: Ən azı bir sütun daxil edilməlidir`);
      }
    }

    // Validate table_input questions have columns
    if (q.type === 'table_input') {
      const columns = q.tableInputColumns || [];
      if (columns.length === 0) {
        errors.push(`Sual ${index + 1}: Dinamik cədvəl üçün ən azı bir sütun daxil edilməlidir`);
      } else {
        columns.forEach((col, colIndex) => {
          if (!col.label?.trim()) {
            errors.push(`Sual ${index + 1}: Sütun ${colIndex + 1} başlığı daxil edilməlidir`);
          }
        });
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

export const questionNeedsMatrixConfiguration = (type: string): boolean => {
  return type === 'table_matrix';
};

export const questionNeedsRatingConfiguration = (type: string): boolean => {
  return type === 'rating';
};

export const questionNeedsTableInputConfiguration = (type: string): boolean => {
  return type === 'table_input';
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
