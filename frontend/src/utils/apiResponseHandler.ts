import { logger } from './logger';
import { ErrorHandler } from './errorHandler';

/**
 * Phase 2: Service Layer Stabilization
 * Standardized API response handling to prevent runtime errors
 */

export interface StandardApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Safely extracts data from API response with proper error handling
 */
export function handleApiResponse<T>(
  response: any,
  context: string = 'API call',
  fallback?: T
): T {
  try {
    logger.debug(`Processing API response for ${context}`, {
      component: 'apiResponseHandler',
      action: 'handleApiResponse',
      data: { hasResponse: !!response, responseType: typeof response }
    });

    // Handle null/undefined response
    if (!response) {
      const error = new Error(`${context}: No response received`);
      logger.error('Empty API response', error, { 
        component: 'apiResponseHandler', 
        action: context 
      });
      
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }

    // Standard Laravel response structure: { success, data, message }
    if (response.success !== undefined && response.data !== undefined) {
      logger.debug(`${context}: Using Laravel success structure`);
      return response.data;
    }

    // Direct data property (most common)
    if (response.data !== undefined) {
      logger.debug(`${context}: Using direct data property`);
      return response.data;
    }

    // Nested data structure (e.g., response.data.data)
    if (response.data?.data !== undefined) {
      logger.debug(`${context}: Using nested data structure`);
      return response.data.data;
    }

    // Array response wrapped in data
    if (response.data && Array.isArray(response.data)) {
      logger.debug(`${context}: Using array data structure`);
      return response.data;
    }

    // Direct object response (fallback for simple objects)
    if (typeof response === 'object' && (response.id || Object.keys(response).length > 0)) {
      logger.debug(`${context}: Using direct object response`);
      return response;
    }

    // Final fallback if provided
    if (fallback !== undefined) {
      logger.warn(`${context}: Using provided fallback`, {
        component: 'apiResponseHandler',
        action: context,
        data: { responseKeys: Object.keys(response || {}) }
      });
      return fallback;
    }

    // Error case: Invalid structure
    const error = new Error(`${context}: Invalid response structure`);
    logger.error('Invalid API response structure', error, {
      component: 'apiResponseHandler',
      action: context,
      data: { 
        responseKeys: Object.keys(response || {}),
        responseType: typeof response,
        response: JSON.stringify(response).substring(0, 500) // Truncate large responses
      }
    });
    
    throw error;

  } catch (error) {
    logger.error(`API response handling failed for ${context}`, error);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}

/**
 * Safely extracts array data with fallback to empty array
 */
export function handleArrayResponse<T>(
  response: any,
  context: string = 'Array API call'
): T[] {
  try {
    const data = handleApiResponse<T[] | PaginatedResponse<T>>(response, context, []);
    
    // Handle paginated response structure
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      logger.debug(`${context}: Extracted paginated array with ${data.data.length} items`);
      return data.data;
    }
    
    // Handle direct array
    if (Array.isArray(data)) {
      logger.debug(`${context}: Extracted direct array with ${data.length} items`);
      return data;
    }
    
    // Fallback to empty array
    logger.warn(`${context}: Non-array response, returning empty array`, {
      component: 'apiResponseHandler',
      action: context,
      data: { dataType: typeof data, hasData: !!data }
    });
    
    return [];
    
  } catch (error) {
    logger.error(`Array response handling failed for ${context}`, error);
    return []; // Safe fallback
  }
}

/**
 * Handles API responses with comprehensive error processing
 */
export function handleApiResponseWithError<T>(
  response: any,
  context: string,
  componentName: string = 'Unknown'
): T {
  try {
    return handleApiResponse<T>(response, context);
  } catch (error) {
    // Use centralized error handler
    const userMessage = ErrorHandler.handleApiError(error, {
      component: componentName,
      action: context,
      additionalInfo: { response }
    });
    
    // Re-throw with user-friendly message
    const enhancedError = new Error(userMessage);
    enhancedError.name = 'ApiResponseError';
    throw enhancedError;
  }
}

/**
 * Type guard for checking if response has expected structure
 */
export function isValidApiResponse(response: any): response is StandardApiResponse<any> {
  return response && typeof response === 'object' && (
    response.data !== undefined || 
    response.success !== undefined ||
    (typeof response === 'object' && Object.keys(response).length > 0)
  );
}

/**
 * Validates response structure and logs warnings for unexpected formats
 */
export function validateResponseStructure(
  response: any, 
  expectedFields: string[] = ['data'],
  context: string = 'API validation'
): boolean {
  if (!isValidApiResponse(response)) {
    logger.warn(`${context}: Invalid response structure`, {
      component: 'apiResponseHandler',
      action: 'validateResponseStructure',
      data: { response, expectedFields }
    });
    return false;
  }

  const missingFields = expectedFields.filter(field => !(field in response));
  if (missingFields.length > 0) {
    logger.warn(`${context}: Missing expected fields: ${missingFields.join(', ')}`, {
      component: 'apiResponseHandler',
      action: 'validateResponseStructure',
      data: { missingFields, availableFields: Object.keys(response) }
    });
    return false;
  }

  return true;
}

/**
 * Development helper to analyze response patterns
 */
export function analyzeResponsePattern(response: any, context: string): void {
  if (import.meta.env.MODE !== 'development') return;

  logger.debug(`Response pattern analysis for ${context}`, {
    component: 'apiResponseHandler',
    action: 'analyzeResponsePattern',
    data: {
      hasData: 'data' in response,
      hasSuccess: 'success' in response,
      hasMessage: 'message' in response,
      hasErrors: 'errors' in response,
      hasNestedData: response.data && 'data' in response.data,
      isArray: Array.isArray(response),
      isDataArray: Array.isArray(response.data),
      keys: Object.keys(response || {}),
      dataKeys: response.data ? Object.keys(response.data) : null
    }
  });
}