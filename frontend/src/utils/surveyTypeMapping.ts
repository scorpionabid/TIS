/**
 * Survey Question Type Mapping Utility
 * Maps between frontend and backend question types for consistency
 */

// Backend types from SurveyQuestion.php
export type BackendQuestionType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'file_upload' 
  | 'rating' 
  | 'table_matrix';

// Frontend types used in components
export type FrontendQuestionType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'radio' 
  | 'checkbox' 
  | 'select' 
  | 'rating' 
  | 'date' 
  | 'file_upload' 
  | 'table_matrix';

// Mapping from frontend to backend types
export const frontendToBackendMapping: Record<FrontendQuestionType, BackendQuestionType> = {
  'text': 'text',
  'textarea': 'text', // Both map to text with max_length validation
  'number': 'number',
  'radio': 'single_choice',
  'checkbox': 'multiple_choice',
  'select': 'single_choice', // Select dropdown is also single choice
  'rating': 'rating',
  'date': 'date',
  'file_upload': 'file_upload',
  'table_matrix': 'table_matrix',
};

// Mapping from backend to frontend types (for display)
export const backendToFrontendMapping: Record<BackendQuestionType, FrontendQuestionType> = {
  'text': 'text',
  'number': 'number',
  'date': 'date',
  'single_choice': 'radio', // Default to radio for single choice
  'multiple_choice': 'checkbox',
  'file_upload': 'file_upload',
  'rating': 'rating',
  'table_matrix': 'table_matrix',
};

// Question type labels for UI display
export const questionTypeLabels: Record<BackendQuestionType, string> = {
  'text': 'Mətn sahəsi',
  'number': 'Rəqəm sahəsi',
  'date': 'Tarix seçimi',
  'single_choice': 'Tək seçim',
  'multiple_choice': 'Çox seçim',
  'file_upload': 'Fayl yükləmə',
  'rating': 'Qiymətləndirmə',
  'table_matrix': 'Cədvəl/Matris',
};

// Question type descriptions
export const questionTypeDescriptions: Record<BackendQuestionType, string> = {
  'text': 'Açıq cavab sahələri - qısa və ya uzun mətn',
  'number': 'Rəqəmsal məlumatlar - tam və ya ondalık rəqəmlər',
  'date': 'Tarix seçimi - təqvim formatında',
  'single_choice': 'Radio button seçimlər - yalnız bir variant',
  'multiple_choice': 'Checkbox seçimlər - çoxsaylı variant',
  'file_upload': 'PDF, Excel faylları (maksimum 10MB)',
  'rating': '1-10 qiymətləndirmə skalası',
  'table_matrix': 'Strukturlaşdırılmış cədvəl məlumatları',
};

/**
 * Convert frontend question type to backend type
 */
export function mapFrontendToBackend(frontendType: FrontendQuestionType): BackendQuestionType {
  return frontendToBackendMapping[frontendType];
}

/**
 * Convert backend question type to frontend type
 */
export function mapBackendToFrontend(backendType: BackendQuestionType): FrontendQuestionType {
  return backendToFrontendMapping[backendType];
}

/**
 * Get question type label for display
 */
export function getQuestionTypeLabel(backendType: BackendQuestionType): string {
  return questionTypeLabels[backendType] || backendType;
}

/**
 * Get question type description
 */
export function getQuestionTypeDescription(backendType: BackendQuestionType): string {
  return questionTypeDescriptions[backendType] || '';
}

/**
 * Validate if question type is supported
 */
export function isValidQuestionType(type: string): type is BackendQuestionType {
  return Object.keys(questionTypeLabels).includes(type);
}

/**
 * Get all available question types for UI selection
 */
export function getAvailableQuestionTypes(): Array<{
  value: BackendQuestionType;
  label: string;
  description: string;
}> {
  return Object.keys(questionTypeLabels).map(type => ({
    value: type as BackendQuestionType,
    label: questionTypeLabels[type as BackendQuestionType],
    description: questionTypeDescriptions[type as BackendQuestionType],
  }));
}