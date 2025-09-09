import { BaseService } from './BaseService';
import { {{ModelName}}, {{ModelName}}CreateData, {{ModelName}}UpdateData } from '@/types';

export interface {{ModelName}}Filters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  institution_id?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}

/**
 * {{ModelName}}Service - ATİS {{ModelName}} frontend service
 * TypeScript type safety və error handling ilə
 */
export class {{ModelName}}Service extends BaseService {
  private static endpoint = '/{{kebab-case-model-name}}';

  /**
   * Bütün {{ModelName}} siyahısını al (paginated)
   */
  static async getAll(filters: {{ModelName}}Filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const url = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;
    
    return this.get<{
      data: {{ModelName}}[];
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>(url);
  }

  /**
   * ID ilə {{ModelName}} al
   */
  static async getById(id: string): Promise<{{ModelName}}> {
    const response = await this.get<{ data: {{ModelName}} }>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Yeni {{ModelName}} yarat
   */
  static async create(data: {{ModelName}}CreateData): Promise<{{ModelName}}> {
    const response = await this.post<{ data: {{ModelName}} }>(this.endpoint, data);
    return response.data;
  }

  /**
   * {{ModelName}} yenilə
   */
  static async update(id: string, data: {{ModelName}}UpdateData): Promise<{{ModelName}}> {
    const response = await this.put<{ data: {{ModelName}} }>(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * {{ModelName}} sil
   */
  static async delete(id: string): Promise<void> {
    await this.del(`${this.endpoint}/${id}`);
  }

  /**
   * Bulk əməliyyatlar
   */
  static async bulkAction(action: 'delete' | 'activate' | 'deactivate', ids: string[]): Promise<void> {
    await this.post(`${this.endpoint}/bulk`, { action, ids });
  }

  /**
   * {{ModelName}} statistikaları
   */
  static async getStats() {
    return this.get<{
      total: number;
      active: number;
      inactive: number;
      this_month: number;
      last_month: number;
      growth_rate: number;
    }>(`${this.endpoint}/stats`);
  }

  /**
   * Export data (Excel/CSV)
   */
  static async exportData(filters: {{ModelName}}Filters = {}, format: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    params.append('format', format);
    
    const response = await fetch(`${this.baseUrl}${this.endpoint}/export?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Accept': format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Search suggestions
   */
  static async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    const response = await this.get<{ suggestions: string[] }>(
      `${this.endpoint}/search-suggestions?q=${encodeURIComponent(query)}`
    );
    
    return response.suggestions;
  }

  /**
   * Validate {{ModelName}} data
   */
  static validateData(data: Partial<{{ModelName}}CreateData>): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Name validation
    if (!data.name || data.name.trim().length < 3) {
      errors.name = 'Ad minimum 3 simvol olmalıdır';
    }

    // Institution validation  
    if (!data.institution_id) {
      errors.institution_id = 'Təşkilat seçilməlidir';
    }

    // Status validation
    if (data.status && !['active', 'inactive'].includes(data.status)) {
      errors.status = 'Status yalnız active və ya inactive ola bilər';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Cache key generator
   */
  static getCacheKey(filters: {{ModelName}}Filters = {}): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key as keyof {{ModelName}}Filters];
        return result;
      }, {} as any);
    
    return `{{kebab-case-model-name}}-${JSON.stringify(sortedFilters)}`;
  }
}