/**
 * Production-safe error handling utility
 * Handles errors consistently across the application
 */

import { logger } from './logger';
import { ApiError, NetworkError, ValidationError, PermissionError, ErrorWithCode, ErrorWithStatus } from '@/types/api';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalInfo?: Record<string, unknown>;
}

export class ErrorHandler {
  /**
   * Handle API errors with consistent logging and user feedback
   */
  static handleApiError(error: ApiError | NetworkError | ErrorWithStatus | Error, context: ErrorContext = {}): string {
    const errorMessage = error?.message || 'Gözlənilməz xəta baş verdi';
    
    // Log detailed error for debugging (only in development)
    logger.error('API Error occurred', error, {
      component: context.component || 'Unknown',
      action: context.action || 'Unknown',
      data: {
        userId: context.userId,
        errorType: error?.name || 'UnknownError',
        statusCode: error?.status,
        additionalInfo: context.additionalInfo
      }
    });

    // Return user-friendly message
    return this.getUserFriendlyMessage(error);
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(errors: Record<string, string[]>, context: ErrorContext = {}): string {
    logger.warn('Validation errors occurred', {
      component: context.component,
      data: { errors }
    });

    const firstError = Object.values(errors)[0]?.[0];
    return firstError || 'Məlumatları düzgün doldurın';
  }

  /**
   * Handle permission errors (403/401)
   */
  static handlePermissionError(error: PermissionError | NetworkError | ErrorWithStatus | Error, context: ErrorContext = {}): string {
    logger.warn('Permission denied', {
      component: context.component,
      action: context.action,
      data: {
        userId: context.userId,
        statusCode: error?.status
      }
    });

    if (error?.status === 401) {
      return 'İcazəniz yoxdur. Yenidən daxil olun.';
    }
    
    return 'Bu əməliyyat üçün icazəniz yoxdur.';
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: NetworkError | ErrorWithStatus | Error, context: ErrorContext = {}): string {
    logger.error('Network error occurred', error, {
      component: context.component,
      data: { isOnline: navigator.onLine }
    });

    if (!navigator.onLine) {
      return 'İnternet bağlantısını yoxlayın';
    }

    return 'Server ilə əlaqə qurula bilmədi';
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private static getUserFriendlyMessage(error: ApiError | NetworkError | ErrorWithStatus | Error): string {
    if (error?.status) {
      switch (error.status) {
        case 400:
          return 'Göndərilən məlumatlar düzgün deyil';
        case 401:
          return 'İcazəniz yoxdur. Yenidən daxil olun.';
        case 403:
          return 'Bu əməliyyat üçün icazəniz yoxdur';
        case 404:
          return 'Axtarılan məlumat tapılmadı';
        case 422:
          return 'Məlumatları düzgün formatda daxil edin';
        case 429:
          return 'Çox tez-tez cəhd edirsiniz. Bir az gözləyin.';
        case 500:
          return 'Server xətası. Daha sonra cəhd edin.';
        case 503:
          return 'Xidmət müvəqqəti dayandırılıb';
        default:
          return error?.message || 'Gözlənilməz xəta baş verdi';
      }
    }

    // Handle specific error types
    if (error?.name === 'ValidationError') {
      return 'Məlumatları düzgün doldurduğunuzdan əmin olun';
    }

    if (error?.name === 'NetworkError') {
      return 'İnternet bağlantısını yoxlayın';
    }

    if (error?.message?.includes('fetch')) {
      return 'Server ilə əlaqə qurula bilmədi';
    }

    return error?.message || 'Gözlənilməz xəta baş verdi';
  }

  /**
   * Handle React component errors (for ErrorBoundary)
   */
  static handleComponentError(error: Error, errorInfo: { componentStack?: string }, context: ErrorContext = {}): void {
    logger.error('React component error', error, {
      component: context.component || 'UnknownComponent',
      data: {
        errorInfo,
        componentStack: errorInfo?.componentStack,
        additionalInfo: context.additionalInfo
      }
    });
  }

  /**
   * Handle form submission errors
   */
  static handleFormError(error: ApiError & { errors?: Record<string, string[]> } | NetworkError | ErrorWithStatus | Error, formName: string): string {
    const context = {
      component: 'Form',
      action: 'submit',
      additionalInfo: { formName }
    };

    if (error?.errors) {
      return this.handleValidationError(error.errors, context);
    }

    if (error?.status === 403 || error?.status === 401) {
      return this.handlePermissionError(error, context);
    }

    return this.handleApiError(error, context);
  }
}

// Convenience exports for common use cases
export const handleApiError = ErrorHandler.handleApiError.bind(ErrorHandler);
export const handleFormError = ErrorHandler.handleFormError.bind(ErrorHandler);
export const handlePermissionError = ErrorHandler.handlePermissionError.bind(ErrorHandler);
export const handleNetworkError = ErrorHandler.handleNetworkError.bind(ErrorHandler);