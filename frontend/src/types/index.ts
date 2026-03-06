/**
 * Type Definitions Index
 * Centralized exports for all type definitions
 */

// Re-export all types for easy importing
export * from './api';
export * from './forms';
export * from './events';
export * from './components';
export * from './user';
export * from './schoolRoles';

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never;
}[keyof T];

export type NonNullable<T> = T extends null | undefined ? never : T;

export type KeyOf<T> = keyof T;

export type ValueOf<T> = T[keyof T];

export type ArrayElement<T> = T extends (infer U)[] ? U : never;

// React-specific utility types
export type PropsWithClassName<T = Record<string, unknown>> = T & {
  className?: string;
};

export type PropsWithChildren<T = Record<string, unknown>> = T & {
  children?: React.ReactNode;
};

export type PropsWithTestId<T = Record<string, unknown>> = T & {
  'data-testid'?: string;
};

// Common prop combinations
export type BaseProps<T = Record<string, unknown>> = PropsWithClassName<PropsWithChildren<PropsWithTestId<T>>>;

// Function types
export type AsyncFunction<T = void, P extends any[] = any[]> = (...args: P) => Promise<T>;
export type SyncFunction<T = void, P extends any[] = any[]> = (...args: P) => T;
export type AnyFunction<T = void, P extends any[] = any[]> = AsyncFunction<T, P> | SyncFunction<T, P>;

// State management types
export type StateUpdater<T> = (value: T | ((prev: T) => T)) => void;
export type StateGetter<T> = () => T;
export type StatePair<T> = [T, StateUpdater<T>];

// Error types
export type ErrorWithCode = Error & { code?: string | number };
export type ErrorWithStatus = Error & { status?: number; statusCode?: number };

// API-related utility types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryKey = string | readonly unknown[];

// Form-related utility types
export type FormFieldValue = string | number | boolean | Date | File | null | undefined;
export type FormFieldName<T> = keyof T;
export type FormErrors<T> = Partial<Record<keyof T, string | string[]>>;

// Permission types
export type Permission = string;
export type Role = string;

// Date and time types
export type DateString = string; // ISO date string
export type TimeString = string; // HH:MM format
export type DateTimeString = string; // ISO datetime string

// File types
export type FileType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'text/csv'
  | 'text/plain';

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type AsyncStatus = 'idle' | 'pending' | 'fulfilled' | 'rejected';

// Size types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentSize = 'small' | 'medium' | 'large';

// Color variants
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

// Direction types
export type Direction = 'ltr' | 'rtl';
export type Orientation = 'horizontal' | 'vertical';
export type Position = 'top' | 'right' | 'bottom' | 'left';
export type Alignment = 'start' | 'center' | 'end';

// Sorting types
export type SortDirection = 'asc' | 'desc';
export type SortBy<T> = keyof T;

// Filter types
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_equal'
  | 'less_than_equal'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_null'
  | 'is_not_null';

// Generic ID types
export type ID = string | number;
export type StringID = string;
export type NumberID = number;

// Callback types
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;
export type CallbackWithParam<P, T = void> = (param: P) => T;
export type AsyncCallbackWithParam<P, T = void> = (param: P) => Promise<T>;

// Event callback types
export type EventCallback<T = any> = (event: T) => void;
export type AsyncEventCallback<T = any> = (event: T) => Promise<void>;

// Validation types
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type ValidationRule<T = any> = (value: T) => string | null;
export type ValidationRules<T> = Partial<Record<keyof T, ValidationRule[]>>;

// Configuration types
export type Config<T = Record<string, any>> = T & {
  env: 'development' | 'staging' | 'production';
  version: string;
};

// Theme types
export type Theme = 'light' | 'dark' | 'auto';
export type ThemeMode = 'light' | 'dark';

// Language and locale types
export type Locale = 'az' | 'en' | 'ru' | 'tr';
export type LocaleDirection = 'ltr' | 'rtl';

// Responsive breakpoint types
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Generic utility for creating branded types
export type Brand<T, B> = T & { __brand: B };

// Institution hierarchy types
export type InstitutionLevel = 0 | 1 | 2 | 3; // Ministry, Region, Sector, School
export type InstitutionType =
  | 'ministry'
  | 'region'
  | 'sector'
  | 'school'
  | 'kindergarten'
  | 'preschool_center'
  | 'vocational_school'
  | 'special_education';

// Academic types
export type AcademicYear = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export type Semester = 1 | 2;
export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Assessment types
export type AssessmentType = 'KSQ' | 'BSQ' | 'academic' | 'behavioral';
export type ScoreType = 'numeric' | 'letter' | 'percentage' | 'pass_fail';

// Task and workflow types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Document types
export type DocumentCategory = 'policy' | 'form' | 'report' | 'manual' | 'other';
export type AccessLevel = 'public' | 'institution' | 'department' | 'role_specific' | 'private';

// Survey types
export type QuestionType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'rating'
  | 'date'
  | 'time'
  | 'datetime'
  | 'number'
  | 'email'
  | 'url'
  | 'file';

// Notification types
export type NotificationType = 'system' | 'task' | 'survey' | 'document' | 'assessment' | 'schedule';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Report types
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

// Dashboard widget types
export type WidgetType = 'chart' | 'table' | 'statistic' | 'list' | 'calendar' | 'custom';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'gauge';

// Cache types
export type CacheKey = string;
export type CacheTTL = number;
export type CacheTag = string;