import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { handleApiResponse, handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import { cacheService } from './CacheService';

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export abstract class BaseService<T extends BaseEntity> {
  protected baseEndpoint: string;
  protected cacheTags: string[];
  protected defaultCacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(baseEndpoint: string, cacheTags: string[] = []) {
    this.baseEndpoint = baseEndpoint;
    this.cacheTags = [baseEndpoint, ...cacheTags];
  }

  /**
   * Getter for backward compatibility with baseUrl
   */
  protected get baseUrl(): string {
    return this.baseEndpoint;
  }

  /**
   * Generate cache key for requests
   */
  protected getCacheKey(method: string, suffix: string = '', params?: Record<string, unknown>): string {
    const paramString = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
    const signature = paramString ? this.hashString(paramString) : 'no_params';
    return `${this.baseEndpoint}_${method}_${suffix}_${signature}`;
  }

  protected hashString(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `${(hash >>> 0).toString(16)}_${value.length}`;
  }

  async getAll(params?: PaginationParams, useCache: boolean = true): Promise<PaginatedResponse<T>> {
    const cacheKey = this.getCacheKey('getAll', '', params);
    
    if (useCache) {
      try {
        const result = await cacheService.remember(
          cacheKey,
          () => this.fetchAll(params),
          this.defaultCacheTTL,
          [...this.cacheTags, 'list']
        );
        return result;
      } catch (error) {
        logger.error(`Failed to fetch all ${this.baseEndpoint}`, error);
        this.enhancePermissionError(error);
        throw error;
      }
    } else {
      return this.fetchAll(params);
    }
  }

  private async fetchAll(params?: PaginationParams): Promise<PaginatedResponse<T>> {
    logger.debug(`Fetching all ${this.baseEndpoint}`, {
      component: 'BaseService',
      action: 'getAll',
      data: { endpoint: this.baseEndpoint, params }
    });

    const response = await apiClient.get<T[]>(this.baseEndpoint, params);
    const data = handleArrayResponse<T>(response, `BaseService.getAll(${this.baseEndpoint})`);
    const meta = (response as any)?.meta;
    
    // Handle paginated response structure
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data as PaginatedResponse<T>;
    }

    if (meta && typeof meta === 'object') {
      const totalFromMeta = Number(meta.total);
      const perPageFromMeta = Number(meta.per_page);
      const currentPageFromMeta = Number(meta.current_page);
      const lastPageFromMeta = Number(meta.last_page);

      const total = Number.isFinite(totalFromMeta) ? totalFromMeta : data.length;
      const perPage = Number.isFinite(perPageFromMeta) ? perPageFromMeta : data.length;
      const currentPage = Number.isFinite(currentPageFromMeta) ? currentPageFromMeta : 1;
      const totalPages = Number.isFinite(lastPageFromMeta) ? lastPageFromMeta : 1;

      return {
        data,
        pagination: {
          current_page: currentPage,
          per_page: perPage,
          total,
          total_pages: totalPages
        }
      } as PaginatedResponse<T>;
    }
    
    // Fallback to simple array structure
    return {
      data,
      pagination: {
        current_page: 1,
        per_page: data.length,
        total: data.length,
        total_pages: 1
      }
    } as PaginatedResponse<T>;
  }

  async getById(id: number, useCache: boolean = true): Promise<T> {
    const cacheKey = this.getCacheKey('getById', id.toString());
    
    if (useCache) {
      try {
        const result = await cacheService.remember(
          cacheKey,
          () => this.fetchById(id),
          this.defaultCacheTTL,
          [...this.cacheTags, 'detail']
        );
        return result;
    } catch (error) {
      logger.error(`Failed to fetch ${this.baseEndpoint}/${id}`, error);
      this.enhancePermissionError(error);
      throw error;
    }
    } else {
      return this.fetchById(id);
    }
  }

  private async fetchById(id: number): Promise<T> {
    logger.debug(`Fetching ${this.baseEndpoint} by ID`, {
      component: 'BaseService',
      action: 'getById',
      data: { endpoint: this.baseEndpoint, id }
    });
    
    const response = await apiClient.get<T>(`${this.baseEndpoint}/${id}`);
    return handleApiResponseWithError<T>(response, `BaseService.getById(${this.baseEndpoint}/${id})`, 'BaseService');
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      logger.debug(`Creating new ${this.baseEndpoint}`, {
        component: 'BaseService',
        action: 'create',
        data: { endpoint: this.baseEndpoint, payload: data }
      });
      
      const response = await apiClient.post<T>(this.baseEndpoint, data);
      const result = handleApiResponseWithError<T>(response, `BaseService.create(${this.baseEndpoint})`, 'BaseService');
      
      // Invalidate related caches after successful creation
      this.invalidateCache(['list']);
      
      logger.info(`Successfully created ${this.baseEndpoint}`, {
        component: 'BaseService',
        action: 'create',
        data: { endpoint: this.baseEndpoint, id: (result as any)?.id }
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Failed to create ${this.baseEndpoint}`, error, {
        component: 'BaseService',
        action: 'create',
        data: { endpoint: this.baseEndpoint, payload: data }
      });
      this.enhancePermissionError(error);
      throw error;
    }
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    try {
      logger.debug(`Updating ${this.baseEndpoint}/${id}`, {
        component: 'BaseService',
        action: 'update',
        data: { endpoint: this.baseEndpoint, id, payload: data }
      });
      
      const response = await apiClient.put<T>(`${this.baseEndpoint}/${id}`, data);
      const result = handleApiResponseWithError<T>(response, `BaseService.update(${this.baseEndpoint}/${id})`, 'BaseService');
      
      // Invalidate related caches after successful update
      this.invalidateCache(['list', 'detail']);
      this.invalidateSpecificCache('getById', id.toString());
      
      logger.info(`Successfully updated ${this.baseEndpoint}/${id}`, {
        component: 'BaseService',
        action: 'update'
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Failed to update ${this.baseEndpoint}/${id}`, error);
      this.enhancePermissionError(error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      logger.debug(`Deleting ${this.baseEndpoint}/${id}`, {
        component: 'BaseService',
        action: 'delete',
        data: { endpoint: this.baseEndpoint, id }
      });
      
      await apiClient.delete(`${this.baseEndpoint}/${id}`);
      
      // Invalidate related caches after successful deletion
      this.invalidateCache(['list', 'detail']);
      this.invalidateSpecificCache('getById', id.toString());
      
      logger.info(`Successfully deleted ${this.baseEndpoint}/${id}`, {
        component: 'BaseService',
        action: 'delete'
      });
      
    } catch (error) {
      logger.error(`Failed to delete ${this.baseEndpoint}/${id}`, error);
      this.enhancePermissionError(error);
      throw error;
    }
  }

  async search(query: string, params?: Partial<PaginationParams>): Promise<PaginatedResponse<T>> {
    const searchParams = { ...params, search: query };
    return this.getAll(searchParams);
  }

  /**
   * Generic GET method for custom endpoints
   */
  async get<R = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<R>> {
    logger.debug(`Making GET request to ${endpoint}`, {
      component: 'BaseService',
      action: 'get',
      data: { endpoint, params }
    });
    
    try {
      const response = await apiClient.get<R>(endpoint, params);
      return response;
    } catch (error) {
      logger.error(`Failed to GET ${endpoint}`, error);
      this.enhancePermissionError(error);
      throw error;
    }
  }

  /**
   * Generic POST method for custom endpoints
   */
  async post<R = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<R>> {
    logger.debug(`Making POST request to ${endpoint}`, {
      component: 'BaseService',
      action: 'post',
      data: { endpoint, payload: data }
    });
    
    try {
      const response = await apiClient.post<R>(endpoint, data);
      return response;
    } catch (error) {
      logger.error(`Failed to POST ${endpoint}`, error);
      this.enhancePermissionError(error);
      throw error;
    }
  }

  /**
   * Generic PUT method for custom endpoints
   */
  async put<R = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<R>> {
    logger.debug(`Making PUT request to ${endpoint}`, {
      component: 'BaseService',
      action: 'put',
      data: { endpoint, payload: data }
    });
    
    try {
      const response = await apiClient.put<R>(endpoint, data);
      return response;
    } catch (error) {
      logger.error(`Failed to PUT ${endpoint}`, error);
      this.enhancePermissionError(error);
      throw error;
    }
  }

  /**
   * Invalidate cache by tags
   */
  protected invalidateCache(additionalTags: string[] = []): void {
    const tagsToInvalidate = [...this.cacheTags, ...additionalTags];
    cacheService.clearByTags(tagsToInvalidate);
  }

  /**
   * Invalidate specific cache entry
   */
  protected invalidateSpecificCache(method: string, suffix: string = '', params?: Record<string, unknown>): void {
    const cacheKey = this.getCacheKey(method, suffix, params);
    cacheService.delete(cacheKey);
  }

  /**
   * Normalize authorization and permission errors to user-friendly messages
   */
  protected enhancePermissionError(error: unknown): void {
    if (!(error instanceof Error)) {
      return;
    }

    if (error.message === 'HTTP error! status: 401') {
      error.message = 'Sessiya müddəti bitdi. Zəhmət olmasa yenidən daxil olun.';
    } else if (error.message === 'HTTP error! status: 403') {
      error.message = 'Bu əməliyyat üçün icazəniz yoxdur.';
    }
  }

  /**
   * Get cache statistics for this service
   */
  getCacheStats(): { stats: Record<string, unknown>; tags: string[] } {
    return {
      stats: cacheService.getStats(),
      tags: this.cacheTags
    };
  }

  /**
   * Clear all cache for this service
   */
  clearServiceCache(): void {
    this.invalidateCache();
  }
}
