/**
 * Type guards and runtime type checking utilities
 * Helps prevent runtime errors with safe type checking
 */

import { ApiError, NetworkError, ValidationError, PermissionError } from '@/types/api';

/**
 * Checks if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Checks if a value is a valid number (not NaN)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Checks if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Safely checks if an object has a property
 */
export function hasProperty<T extends object, K extends string | number | symbol>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return obj != null && typeof obj === 'object' && key in obj;
}

/**
 * Checks if a value is a valid API response with data property
 */
export function isApiResponse<T = unknown>(value: unknown): value is { data: T } {
  return (
    value != null &&
    typeof value === 'object' &&
    'data' in value
  );
}

/**
 * Checks if a value is a paginated API response
 */
export function isPaginatedResponse<T = unknown>(value: unknown): value is {
  data: T[];
  current_page: number;
  total: number;
  per_page: number;
} {
  return (
    isApiResponse(value) &&
    Array.isArray(value.data) &&
    typeof value.current_page === 'number' &&
    typeof value.total === 'number' &&
    typeof value.per_page === 'number'
  );
}

/**
 * Safely extracts data from API response
 */
export function safeExtractData<T>(response: unknown, fallback: T): T {
  if (isApiResponse<T>(response)) {
    return response.data;
  }
  
  // If response itself looks like the data we want
  if (response && typeof response === 'object') {
    return response as T;
  }
  
  return fallback;
}

/**
 * Safely extracts array data with fallback to empty array
 */
export function safeExtractArray<T>(response: unknown): T[] {
  const extracted = safeExtractData<T[]>(response, []);
  return Array.isArray(extracted) ? extracted : [];
}

/**
 * Checks if an error is an API error with specific status
 */
export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError | NetworkError {
  return (
    error &&
    typeof error === 'object' &&
    (error.status === status || error.response?.status === status)
  );
}

/**
 * Checks if an error is a permission error (401/403)
 */
export function isPermissionError(error: unknown): error is PermissionError {
  return isApiErrorWithStatus(error, 401) || isApiErrorWithStatus(error, 403);
}

/**
 * Checks if an error is a validation error (422)
 */
export function isValidationError(error: unknown): error is ValidationError {
  return isApiErrorWithStatus(error, 422) && hasProperty(error, 'errors');
}

/**
 * Safely gets error message from various error formats
 */
export function getErrorMessage(error: unknown, fallback: string = 'Gözlənilməz xəta baş verdi'): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Check common error message properties
    if (isNonEmptyString(error.message)) {
      return error.message;
    }
    
    if (hasProperty(error, 'data') && isNonEmptyString(error.data.message)) {
      return error.data.message;
    }
    
    if (hasProperty(error, 'response') && hasProperty(error.response, 'data')) {
      const responseData = error.response.data;
      if (isNonEmptyString(responseData.message)) {
        return responseData.message;
      }
    }
  }
  
  return fallback;
}

/**
 * Safely converts string to number with fallback
 */
export function safeParseInt(value: unknown, fallback: number = 0): number {
  if (isValidNumber(value)) {
    return Math.floor(value);
  }
  
  if (isNonEmptyString(value)) {
    const parsed = parseInt(value, 10);
    return isValidNumber(parsed) ? parsed : fallback;
  }
  
  return fallback;
}

/**
 * Safely converts string to float with fallback
 */
export function safeParseFloat(value: unknown, fallback: number = 0): number {
  if (isValidNumber(value)) {
    return value;
  }
  
  if (isNonEmptyString(value)) {
    const parsed = parseFloat(value);
    return isValidNumber(parsed) ? parsed : fallback;
  }
  
  return fallback;
}

/**
 * Creates a safe object property accessor
 */
export function safeGet<T extends object, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  fallback?: T[K]
): T[K] | undefined {
  if (obj && hasProperty(obj, key)) {
    return obj[key];
  }
  return fallback;
}

/**
 * Checks if a value can be used as a React key
 */
export function isValidReactKey(value: unknown): value is string | number {
  return typeof value === 'string' || isValidNumber(value);
}