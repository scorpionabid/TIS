/**
 * React Hook Form Type Extensions
 * Proper type definitions for React Hook Form hooks and components
 */

import { FieldValues, UseFormReturn, SubmitHandler, FieldErrors, UseFormRegister } from 'react-hook-form';

// Generic form return type with proper typing
export interface TypedUseFormReturn<T extends FieldValues = FieldValues> extends UseFormReturn<T> {
  handleSubmit: (onValid: SubmitHandler<T>, onInvalid?: (errors: FieldErrors<T>) => void) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<T>;
  formState: UseFormReturn<T>['formState'] & {
    errors: FieldErrors<T>;
  };
  setValue: UseFormReturn<T>['setValue'];
  getValue: UseFormReturn<T>['getValues'];
  watch: UseFormReturn<T>['watch'];
  reset: UseFormReturn<T>['reset'];
  trigger: UseFormReturn<T>['trigger'];
  clearErrors: UseFormReturn<T>['clearErrors'];
  setError: UseFormReturn<T>['setError'];
}

// Form handler types
export type FormSubmitHandler<T extends FieldValues> = SubmitHandler<T>;
export type FormErrorHandler<T extends FieldValues> = (errors: FieldErrors<T>) => void;

// Common form props interface
export interface FormProps<T extends FieldValues = FieldValues> {
  form: TypedUseFormReturn<T>;
  onSubmit: FormSubmitHandler<T>;
  onError?: FormErrorHandler<T>;
  loading?: boolean;
  disabled?: boolean;
}

// Field registration type
export type FormFieldRegister<T extends FieldValues> = UseFormRegister<T>;

// Form validation result type
export interface FormValidationResult<T extends FieldValues = FieldValues> {
  isValid: boolean;
  errors: FieldErrors<T>;
  data?: T;
}

// Enhanced form state
export interface FormState<T extends FieldValues = FieldValues> {
  data: T;
  errors: FieldErrors<T>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  isSubmitted: boolean;
  submitCount: number;
}

// Form context type for complex forms
export interface FormContextValue<T extends FieldValues = FieldValues> {
  form: TypedUseFormReturn<T>;
  isLoading: boolean;
  errors: FieldErrors<T>;
  onSubmit: FormSubmitHandler<T>;
}

// Specific form data types for ATİS application
export type UserFormReturn = TypedUseFormReturn<{
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password?: string;
  role_id: string;
  institution_id?: number;
  department_id?: number;
  contact_phone?: string;
  is_active: boolean;
}>;

export type InstitutionFormReturn = TypedUseFormReturn<{
  name: string;
  code: string;
  type_id: number;
  parent_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  director_name?: string;
  is_active: boolean;
}>;

export type TaskFormReturn = TypedUseFormReturn<{
  title: string;
  description: string;
  assignee_role?: string;
  assignee_institution_id?: number;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  requires_evidence: boolean;
}>;

export type DepartmentFormReturn = TypedUseFormReturn<{
  name: string;
  code?: string;
  institution_id: number;
  head_teacher_id?: number;
  description?: string;
  is_active: boolean;
}>;

export type DocumentFormReturn = TypedUseFormReturn<{
  title: string;
  description?: string;
  category: string;
  access_level: 'public' | 'institution' | 'department' | 'role_specific';
  allowed_roles?: string[];
  expiry_date?: string;
  requires_approval: boolean;
}>;

// Type guards for form validation
export function isValidFormData<T extends FieldValues>(
  data: unknown,
  requiredFields: (keyof T)[]
): data is T {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return requiredFields.every(field =>
    obj[field as string] !== undefined &&
    obj[field as string] !== null &&
    obj[field as string] !== ''
  );
}

export function hasFormErrors<T extends FieldValues>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

// Form event handlers
export interface FormEventHandlers<T extends FieldValues = FieldValues> {
  onSubmit: FormSubmitHandler<T>;
  onReset?: () => void;
  onChange?: (data: Partial<T>) => void;
  onError?: FormErrorHandler<T>;
  onFieldChange?: (field: keyof T, value: unknown) => void;
}

// Form configuration
export interface FormConfig<T extends FieldValues = FieldValues> {
  defaultValues?: Partial<T>;
  mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onBlur' | 'onChange' | 'onSubmit';
  shouldFocusError?: boolean;
  shouldUnregister?: boolean;
  shouldUseNativeValidation?: boolean;
  criteriaMode?: 'firstError' | 'all';
  delayError?: number;
}

// Form field configuration
export interface FormFieldConfig {
  name: string;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    required?: string;
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    validate?: Record<string, (value: unknown) => string | boolean>;
  };
}

// Dynamic form schema
export interface FormSchema<T extends FieldValues = FieldValues> {
  fields: FormFieldConfig[];
  title?: string;
  description?: string;
  submitText?: string;
  resetText?: string;
  layout?: 'vertical' | 'horizontal' | 'inline';
  sections?: Array<{
    title: string;
    fields: string[];
    collapsible?: boolean;
  }>;
}
