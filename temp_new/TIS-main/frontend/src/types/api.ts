/**
 * Core API Type Definitions
 * Centralized interfaces for API responses and error handling
 */

// Base API Response Structure
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
  status?: number;
  meta?: ResponseMeta;
}

// Pagination Meta Information
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  from?: number;
  to?: number;
  last_page?: number;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

// Extended Response Meta
export interface ResponseMeta extends PaginationMeta {
  path?: string;
  first_page_url?: string;
  last_page_url?: string;
}

// Paginated Response Structure
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  meta?: ResponseMeta;
}

// Error Response Structure
export interface ApiError {
  name?: string;
  message: string;
  status?: number;
  statusCode?: number;
  code?: string;
  errors?: Record<string, string[]>;
  details?: any;
  stack?: string;
}

// Network/HTTP Error Types
export interface NetworkError extends Error {
  status?: number;
  statusCode?: number;
  response?: {
    data?: any;
    status?: number;
    statusText?: string;
  };
}

// Validation Error Structure
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Permission Error Structure
export interface PermissionError extends ApiError {
  requiredPermissions?: string[];
  userPermissions?: string[];
}

// Generic API Query Parameters
export interface ApiQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  include?: string[];
  filters?: Record<string, any>;
}

// Bulk Operation Response
export interface BulkOperationResponse<T = any> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  summary: {
    total: number;
    successful_count: number;
    failed_count: number;
  };
}

// File Upload Response
export interface FileUploadResponse {
  id: number;
  filename: string;
  original_name: string;
  url: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    database: 'connected' | 'disconnected';
    cache: 'connected' | 'disconnected';
    storage: 'accessible' | 'inaccessible';
  };
  timestamp: string;
}

// API Client Configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
  headers: Record<string, string>;
}

// Request Configuration
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

// Type guards for API responses
export function isApiError(error: any): error is ApiError {
  return error && typeof error.message === 'string';
}

export function isNetworkError(error: any): error is NetworkError {
  return error && (error.status || error.statusCode || error.response);
}

export function isValidationError(error: any): error is ValidationError {
  return error && error.field && error.message;
}

export function isPermissionError(error: any): error is PermissionError {
  return error && (error.status === 403 || error.statusCode === 403);
}

export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return response && Array.isArray(response.data) && response.pagination;
}