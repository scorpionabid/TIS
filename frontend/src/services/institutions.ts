import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Institution extends BaseEntity {
  name: string;
  type: string | {
    id: number;
    name: string;
    key: string;
    level: number;
  };
  level: number;
  code?: string;
  institution_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  parent_id?: number;
  is_active: boolean;
  student_count?: number;
  teacher_count?: number;
  parent?: Institution;
  children?: Institution[];
  // Backend JSON fields
  contact_info?: string;
  location?: string;
  metadata?: string;
  region_code?: string;
  short_name?: string;
  established_date?: string;
}

export interface InstitutionType {
  id: number;
  key: string;
  label: string;
  label_az: string;
  label_en: string;
  default_level: number;
  allowed_parent_types: string[];
  icon: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  metadata: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInstitutionData {
  name: string;
  type: 'ministry' | 'region' | 'sektor' | 'school';
  level?: number;
  parent_id?: number;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  utis_code?: string;
}

export interface InstitutionFilters extends PaginationParams {
  type?: 'ministry' | 'regional' | 'sector' | 'school';
  parent_id?: number;
  is_active?: boolean;
}

class InstitutionService extends BaseService<Institution> {
  constructor() {
    super('/institutions');
  }

  async getAll(params?: PaginationParams) {
    console.log('🔍 InstitutionService.getAll called with params:', params);
    try {
      const response = await apiClient.get<Institution[]>(this.baseEndpoint, params);
      console.log('✅ InstitutionService.getAll successful:', response);
      return response as any; // PaginatedResponse
    } catch (error) {
      console.error('❌ InstitutionService.getAll failed:', error);
      throw error;
    }
  }

  // Alias for getAll to maintain compatibility with modal components
  async getInstitutions(params?: PaginationParams) {
    return this.getAll(params);
  }

  async getByType(type: Institution['type'], params?: PaginationParams) {
    const response = await apiClient.get<Institution[]>(`${this.baseEndpoint}`, { ...params, type });
    return response as any; // PaginatedResponse
  }

  async getChildren(parentId: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/${parentId}/children`);
    return { data: response.data || [] };
  }

  async getUsers(institutionId: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/${institutionId}/users`);
    return { data: response.data || [] };
  }

  async getHierarchy() {
    const response = await apiClient.get<Institution[]>(`${this.baseEndpoint}/hierarchy`);
    return response.data || [];
  }

  async getRegions() {
    return this.getByType('regional');
  }

  async getSectors(parentId?: number) {
    const params = parentId ? { parent_id: parentId } : undefined;
    return this.getByType('sector', params);
  }

  async getSchools(parentId?: number) {
    const params = parentId ? { parent_id: parentId } : undefined;
    return this.getByType('school', params);
  }

  async getStats(id: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/stats`);
    return response.data;
  }

  async delete(id: number, type: 'soft' | 'hard' = 'soft'): Promise<void> {
    console.log('🌐 InstitutionService.delete called:', { id, type, endpoint: `${this.baseEndpoint}/${id}?type=${type}` });
    
    try {
      const result = await apiClient.delete(`${this.baseEndpoint}/${id}?type=${type}`);
      console.log('✅ InstitutionService.delete successful:', result);
      return result;
    } catch (error) {
      console.error('❌ InstitutionService.delete failed:', error);
      throw error;
    }
  }

  // Institution Types API methods
  async getInstitutionTypes(params?: { include_inactive?: boolean; level?: number; is_system?: boolean }) {
    console.log('🌐 InstitutionService.getInstitutionTypes called with params:', params);
    try {
      const response = await apiClient.get<InstitutionType[]>('/institution-types', params);
      console.log('✅ InstitutionService.getInstitutionTypes successful:', response);
      return response;
    } catch (error) {
      console.error('❌ InstitutionService.getInstitutionTypes failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        params
      });
      throw error;
    }
  }

  async getInstitutionTypesHierarchy() {
    const response = await apiClient.get('/institution-types/hierarchy');
    return response;
  }

  async getParentTypesForType(typeKey: string) {
    const response = await apiClient.get<InstitutionType[]>('/institution-types/parent-types', { type_key: typeKey });
    return response;
  }

  async createInstitutionType(data: Partial<InstitutionType>) {
    const response = await apiClient.post<InstitutionType>('/institution-types', data);
    return response;
  }

  async updateInstitutionType(id: number, data: Partial<InstitutionType>) {
    const response = await apiClient.put<InstitutionType>(`/institution-types/${id}`, data);
    return response;
  }

  async deleteInstitutionType(id: number) {
    const response = await apiClient.delete(`/institution-types/${id}`);
    return response;
  }

  // Import/Export methods
  async downloadImportTemplate(institutionIds: number[]): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/institutions/import/template`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ institution_ids: institutionIds }),
    });

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  async importFromTemplate(file: File, institutionIds: number[]): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('institution_ids', JSON.stringify(institutionIds));

    const response = await fetch(`${apiClient['baseURL']}/institutions/import`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw errorData;
    }

    return response.json();
  }

  async exportInstitutions(institutionIds: number[]): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/institutions/export`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ institution_ids: institutionIds }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Type-based Import/Export methods
  async downloadImportTemplateByType(institutionType: string): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/institutions/import/template-by-type`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: institutionType }),
    });

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  async importFromTemplateByType(file: File, institutionType: string): Promise<any> {
    try {
      // Validate inputs
      if (!file) {
        throw new Error('Fayl seçilməlidir');
      }
      
      if (!institutionType) {
        throw new Error('Müəssisə növü seçilməlidir');
      }

      // Check file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Yalnız Excel faylları (.xlsx, .xls) yüklənə bilər');
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Fayl ölçüsü 10MB-dan çox ola bilməz');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', institutionType);

      // Debug FormData contents
      console.log('FormData contents:', {
        file: file.name,
        fileSize: file.size,
        fileType: file.type,
        institutionType,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          value: value instanceof File ? `File: ${value.name}` : value
        }))
      });

      // Get headers but remove Content-Type for FormData
      const headers = apiClient['getHeaders']();
      delete headers['Content-Type'];

      const response = await fetch(`${apiClient['baseURL']}/institutions/import-by-type`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle different error types
        if (response.status === 422) {
          // Validation errors
          const errorMessage = result.errors ? result.errors.join(', ') : result.message;
          throw new Error(errorMessage || 'Doğrulama xətası');
        } else if (response.status === 404) {
          throw new Error(result.message || 'Müəssisə növü tapılmadı');
        } else if (response.status === 400) {
          throw new Error(result.message || 'Fayl məlumatları düzgün deyil');
        } else {
          throw new Error(result.message || 'İdxal xətası baş verdi');
        }
      }

      return result;
    } catch (error: any) {
      // Re-throw with detailed error information
      console.error('Import service error:', error);
      throw new Error(`İdxal xətası: ${error.message}`);
    }
  }

  async exportInstitutionsByType(institutionType: string): Promise<Blob> {
    console.log('Starting export for institution type:', institutionType);
    
    const response = await fetch(`${apiClient['baseURL']}/institutions/export-by-type`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ type: institutionType }),
    });

    console.log('Export response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Export error response:', errorText);
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    console.log('Export blob received:', {
      size: blob.size,
      type: blob.type
    });
    
    return blob;
  }
}

export const institutionService = new InstitutionService();