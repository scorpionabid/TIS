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
   * Generate cache key for requests
   */
  protected getCacheKey(method: string, suffix: string = '', params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${this.baseEndpoint}_${method}_${suffix}_${btoa(paramString).substring(0, 10)}`;
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
    
    // Handle paginated response structure
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data as PaginatedResponse<T>;
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
      throw error;
    }
  }

  async search(query: string, params?: Partial<PaginationParams>): Promise<PaginatedResponse<T>> {
    const searchParams = { ...params, search: query };
    return this.getAll(searchParams);
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
  protected invalidateSpecificCache(method: string, suffix: string = '', params?: any): void {
    const cacheKey = this.getCacheKey(method, suffix, params);
    cacheService.delete(cacheKey);
  }

  /**
   * Get cache statistics for this service
   */
  getCacheStats(): { stats: any; tags: string[] } {
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