/**
 * Form-Related Type Definitions
 * Centralized interfaces for form data and validation
 */

import { ReactNode } from 'react';

// Base Form Props Interface
export interface BaseFormProps<T = any> {
  onSubmit: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  initialData?: Partial<T>;
  validationErrors?: Record<string, string | string[]>;
}

// Form Field Props
export interface FormFieldProps {
  label?: string;
  error?: string | string[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: ReactNode;
}

// Form Validation Error
export interface FormValidationError {
  field: string;
  message: string;
  type: 'required' | 'invalid' | 'min' | 'max' | 'pattern' | 'custom';
}

// Assessment Form Data Types
export interface KSQAssessmentFormData {
  student_name: string;
  teacher_name: string;
  institution_id: number;
  academic_year_id: number;
  assessment_date: string;
  total_score: number;
  percentage: number;
  criteria: AssessmentCriteria[];
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  notes?: string;
  is_final: boolean;
}

export interface BSQAssessmentFormData {
  student_name: string;
  teacher_name: string;
  institution_id: number;
  academic_year_id: number;
  assessment_date: string;
  behavioral_scores: BehavioralScore[];
  overall_rating: number;
  observations: string[];
  interventions: string[];
  goals: string[];
  notes?: string;
}

export interface AssessmentCriteria {
  name: string;
  score: number;
  max_score?: number;
  category?: string;
}

export interface BehavioralScore {
  behavior_type: string;
  frequency: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
  score: number;
  notes?: string;
}

// User Form Data Types
export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password?: string;
  password_confirmation?: string;
  role_id: string;
  institution_id?: number;
  department_id?: number;
  departments?: number[];
  contact_phone?: string;
  utis_code?: string;
  is_active: boolean;
}

// Institution Form Data Types
export interface InstitutionFormData {
  name: string;
  code: string;
  type_id: number;
  parent_id?: number;
  region_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  director_name?: string;
  director_phone?: string;
  is_active: boolean;
  student_capacity?: number;
  teacher_count?: number;
}

// Survey Form Data Types
export interface SurveyFormData {
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  target_roles: string[];
  target_institutions?: number[];
  start_date: string;
  end_date: string;
  is_anonymous: boolean;
  requires_approval: boolean;
  max_responses?: number;
}

export interface SurveyQuestion {
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'rating' | 'date';
  question: string;
  options?: string[];
  required: boolean;
  order: number;
}

// Task Form Data Types
export interface TaskFormData {
  title: string;
  description: string;
  assignee_role?: string;
  assignee_institution_id?: number;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  attachments?: File[];
  requires_evidence: boolean;
  evidence_description?: string;
}

// Schedule Form Data Types
export interface ScheduleFormData {
  subject_id: number;
  teacher_id: number;
  class_id: number;
  room_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year_id: number;
  semester?: 1 | 2;
  is_recurring: boolean;
  recurrence_pattern?: 'weekly' | 'biweekly' | 'monthly';
  end_date?: string;
}

// Document Form Data Types
export interface DocumentFormData {
  title: string;
  description?: string;
  category: string;
  file: File;
  access_level: 'public' | 'institution' | 'department' | 'role_specific';
  allowed_roles?: string[];
  allowed_institutions?: number[];
  expiry_date?: string;
  requires_approval: boolean;
}

// Grade Configuration Form Data
export interface GradeConfigFormData {
  name: string;
  min_score: number;
  max_score: number;
  letter_grade: string;
  gpa_value: number;
  color: string;
  description?: string;
  is_passing: boolean;
  academic_year_id: number;
  institution_id?: number;
}

// Search and Filter Form Data
export interface SearchFiltersFormData {
  search?: string;
  status?: string;
  role?: string;
  institution?: string;
  department?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

// Modal Form Props
export interface ModalFormProps<T> extends BaseFormProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Dynamic Form Builder Types
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  defaultValue?: any;
  dependencies?: FormFieldDependency[];
}

export interface FormFieldOption {
  label: string;
  value: any;
  disabled?: boolean;
}

export interface FormFieldDependency {
  field: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require';
}

export interface DynamicFormData {
  [key: string]: any;
}

export interface FormBuilderProps {
  fields: FormField[];
  data: DynamicFormData;
  onChange: (data: DynamicFormData) => void;
  onSubmit: (data: DynamicFormData) => void | Promise<void>;
  loading?: boolean;
  errors?: Record<string, string>;
}

// Form State Management
export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string>;
  loading: boolean;
  touched: Set<keyof T>;
  dirty: boolean;
  valid: boolean;
}

// Form Actions
export type FormAction<T> =
  | { type: 'SET_DATA'; payload: Partial<T> }
  | { type: 'SET_ERROR'; field: keyof T; message: string }
  | { type: 'CLEAR_ERROR'; field: keyof T }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_TOUCHED'; field: keyof T }
  | { type: 'RESET' };

// Type guards for form validation
export function hasFormErrors(errors: Record<string, any>): boolean {
  return Object.keys(errors).length > 0;
}

export function isValidFormData<T>(data: T, requiredFields: (keyof T)[]): boolean {
  return requiredFields.every(field =>
    data[field] !== undefined &&
    data[field] !== null &&
    data[field] !== ''
  );
}