import { apiClient, ApiResponse, PaginatedResponse } from './api';

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

  constructor(baseEndpoint: string) {
    this.baseEndpoint = baseEndpoint;
  }

  async getAll(params?: PaginationParams): Promise<PaginatedResponse<T>> {
    const response = await apiClient.get<T[]>(this.baseEndpoint, params);
    return response as PaginatedResponse<T>;
  }

  async getById(id: number): Promise<T> {
    const response = await apiClient.get<T>(`${this.baseEndpoint}/${id}`);
    if (!response.data) {
      throw new Error('Məlumat tapılmadı');
    }
    return response.data;
  }

  async create(data: Partial<T>): Promise<T> {
    console.log(`🔥 BaseService.create called for ${this.baseEndpoint}`, data);
    
    try {
      const response = await apiClient.post<T>(this.baseEndpoint, data);
      console.log(`📤 API response for ${this.baseEndpoint}:`, response);
      
      if (!response.data) {
        console.error(`❌ No data in response for ${this.baseEndpoint}:`, response);
        throw new Error('Yaratma əməliyyatı uğursuz oldu - server cavabında data yoxdur');
      }
      
      console.log(`✅ Create successful for ${this.baseEndpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Create failed for ${this.baseEndpoint}:`, error);
      throw error;
    }
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    const response = await apiClient.put<T>(`${this.baseEndpoint}/${id}`, data);
    if (!response.data) {
      throw new Error('Yeniləmə əməliyyatı uğursuz oldu');
    }
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/${id}`);
  }

  async search(query: string, params?: Partial<PaginationParams>): Promise<PaginatedResponse<T>> {
    const searchParams = { ...params, search: query };
    return this.getAll(searchParams);
  }
}