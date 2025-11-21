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
  include_trashed?: boolean;
  only_trashed?: boolean;
}

class InstitutionService extends BaseService<Institution> {
  constructor() {
    super('/institutions');
  }

  async getAll(params?: PaginationParams) {
    try {
      const response = await apiClient.get<Institution[]>(this.baseEndpoint, params);
      return response; // Response structure: { data: Institution[] }
    } catch (error) {
      console.error('❌ InstitutionService.getAll failed:', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await apiClient.get<Institution | { data?: Institution }>(`${this.baseEndpoint}/${id}`);
      if (response && typeof response === 'object' && 'data' in response && response.data) {
        return response.data;
      }
      return response as Institution;
    } catch (error) {
      console.error(`❌ InstitutionService.getById failed for id ${id}:`, error);
      throw error;
    }
  }

  // Alias for getAll to maintain compatibility with modal components
  async getInstitutions(params?: PaginationParams) {
    return this.getAll(params);
  }

  // Get only level 4 institutions (schools and preschools)
  async getStudentInstitutions(params?: PaginationParams) {
    try {
      // Filter for level 4 institutions only (schools and preschools)
      const response = await apiClient.get<Institution[]>(this.baseEndpoint, {
        ...params,
        level: 4 // Only level 4 institutions (schools and preschools)
      });
      return response as any;
    } catch (error) {
      console.error('❌ InstitutionService.getStudentInstitutions failed:', error);
      throw error;
    }
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

  async getHierarchy(institutionId?: number) {
    const endpoint = typeof institutionId === 'number'
      ? `${this.baseEndpoint}/${institutionId}/hierarchy`
      : '/hierarchy';

    const response = await apiClient.get<any>(endpoint);
    const payload = response.data;

    // If payload is already an array, return it
    if (Array.isArray(payload)) {
      return payload;
    }

    // If payload has a nested data property
    if (payload?.data) {
      if (Array.isArray(payload.data)) {
        return payload.data;
      }
      if (payload.data && typeof payload.data === 'object') {
        return [payload.data];
      }
      if (Array.isArray(payload.data?.data)) {
        return payload.data.data;
      }
    }

    // If payload itself is a single institution object (direct from API after transformation)
    if (payload && typeof payload === 'object' && 'id' in payload && 'name' in payload) {
      return [payload];
    }

    return [];
  }

  private summariesEndpointAvailable = true;
  private static readonly SUMMARY_CHUNK_SIZE = 50;

  async getSummaries(ids: number[]) {
    if (!ids || ids.length === 0) {
      return {};
    }

    const fetchIndividual = async (targetIds: number[]) => {
      const fallbackEntries: Record<number, any> = {};
      await Promise.all(targetIds.map(async (id) => {
        try {
          const detail = await this.getById(id);
          fallbackEntries[id] = detail;
        } catch (detailError) {
          console.warn('Failed to fetch institution detail during summaries fallback', { id, detailError });
        }
      }));
      return fallbackEntries;
    };

    if (!this.summariesEndpointAvailable) {
      return fetchIndividual(ids);
    }

    const chunkedResponses: Record<number, any> = {};
    const chunks: number[][] = [];

    for (let i = 0; i < ids.length; i += InstitutionService.SUMMARY_CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + InstitutionService.SUMMARY_CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      try {
        const response = await apiClient.get<Record<string, any>>(`${this.baseEndpoint}/summary`, {
          ids: chunk.join(','),
        });

        const payload = response.data as unknown as {
          success?: boolean;
          data?: Record<number | string, any>;
        };

        const summaries = payload?.data || {};
        Object.keys(summaries).forEach((key) => {
          const numericKey = Number(key);
          if (!Number.isNaN(numericKey)) {
            chunkedResponses[numericKey] = summaries[key];
          }
        });
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          this.summariesEndpointAvailable = false;
          console.warn('InstitutionService.getSummaries: summaries endpoint unavailable, falling back to per-id fetch');
          const fallback = await fetchIndividual(chunk);
          Object.assign(chunkedResponses, fallback);
          continue;
        }
        console.error('❌ InstitutionService.getSummaries failed for chunk:', { chunk, error });
        const fallback = await fetchIndividual(chunk);
        Object.assign(chunkedResponses, fallback);
      }
    }

    return chunkedResponses;
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

  async getDeleteImpact(id: number): Promise<{
    institution: { id: number; name: string; type: string; level: number };
    direct_children_count: number;
    total_children_count: number;
    children_details: any[];
    users_count: number;
    total_users_count: number;
    students_count: number;
    total_students_count: number;
    departments_count: number;
    rooms_count: number;
    grades_count: number;
    survey_responses_count: number;
    statistics_count: number;
    indicator_values_count: number;
    audit_logs_count: number;
    has_region: boolean;
    has_sector: boolean;
    deletion_mode: {
      soft_delete: string;
      hard_delete: string;
    };
    cascade_delete_tables: string[];
  }> {
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/${id}/delete-impact`);
      return response.data;
    } catch (error) {
      console.error('❌ InstitutionService.getDeleteImpact failed:', error);
      throw error;
    }
  }

  async delete(
    id: number,
    type: 'soft' | 'hard' = 'soft',
    options?: {
      confirmation?: boolean;
      reason?: string;
      force?: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    delete_type: 'soft' | 'hard';
    deleted_data?: Record<string, any>;
    operation_id?: string;
  }> {
    try {
      // Prepare request data for validation
      const requestData: any = {
        type,
        confirmation: options?.confirmation ?? true, // Default to true for backwards compatibility
      };

      // Add optional parameters
      if (options?.reason) {
        requestData.reason = options.reason;
      }

      if (type === 'hard' && options?.force !== undefined) {
        requestData.force = options.force;
      }

      const result = await apiClient.delete(`${this.baseEndpoint}/${id}`, requestData);
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

  // Validation and duplicate checking methods
  async checkCodeExists(code: string, excludeId?: number): Promise<boolean> {
    try {
      const response = await apiClient.get('/institutions/check-code', {
        code,
        exclude_id: excludeId
      });
      return response.data?.exists || false;
    } catch (error) {
      console.warn('Code existence check failed:', error);
      return false; // Assume doesn't exist if check fails
    }
  }

  async checkUtisCodeExists(utisCode: string, excludeId?: number): Promise<boolean> {
    try {
      const response = await apiClient.get('/institutions/check-utis-code', {
        utis_code: utisCode,
        exclude_id: excludeId
      });
      return response.data?.exists || false;
    } catch (error) {
      console.warn('UTIS code existence check failed:', error);
      return false; // Assume doesn't exist if check fails
    }
  }

  async findSimilar(searchData: {
    name?: string;
    code?: string;
    type?: string;
    parent_id?: number;
  }): Promise<Institution[]> {
    try {
      const response = await apiClient.get('/institutions/find-similar', searchData);
      return response.data || [];
    } catch (error) {
      console.warn('Similar institutions search failed:', error);
      return [];
    }
  }

  async getParentCandidates(typeKey: string): Promise<Institution[]> {
    try {
      const response = await apiClient.get('/institutions/parent-candidates', {
        type: typeKey
      });
      return response.data || [];
    } catch (error) {
      console.warn('Parent candidates fetch failed:', error);
      return [];
    }
  }

  async generateCode(data: {
    type: string;
    name: string;
    parent_id?: number;
  }): Promise<string> {
    try {
      const response = await apiClient.post('/institutions/generate-code', data);
      return response.data?.code || '';
    } catch (error) {
      console.warn('Code generation failed:', error);
      return '';
    }
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
    console.log('🎯 Starting template download for institution type:', {
        institutionType,
        typeType: typeof institutionType,
        stringValue: String(institutionType),
        jsonValue: JSON.stringify(institutionType)
      });
    
    try {
      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';
      const token = (apiClient as any).getToken ? (apiClient as any).getToken() : null;
      const fullURL = `${baseURL}/institutions/import/template-by-type`;
      
      console.log('🌐 Request details:', {
        baseURL,
        fullURL,
        institutionType,
        hasToken: !!token
      });
      
      const requestBody = JSON.stringify({ type: institutionType });
      console.log('📦 Request body:', requestBody);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...apiClient.getAuthHeaders(),
      };
      
      console.log('📋 Request headers:', headers);
      
      const response = await fetch(fullURL, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: requestBody,
      });

      console.log('📥 Template download response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        url: response.url,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Template download error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestBody,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Try to parse JSON error response
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || errorText;

          // Log detailed validation errors if available
          if (errorJson.errors) {
            console.error('🔍 Validation errors:', errorJson.errors);
          }
        } catch (e) {
          // Not JSON, use as-is
        }

        throw new Error(`Template download failed (${response.status}): ${errorDetails}`);
      }

      const blob = await response.blob();
      console.log('📦 Template blob received:', {
        size: blob.size,
        type: blob.type
      });
      
      return blob;
    } catch (error: any) {
      console.error('💥 Template download error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      throw new Error(`Template download failed: ${error.message}`);
    }
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

      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';

      const response = await fetch(`${baseURL}/institutions/import-by-type`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...apiClient.getAuthHeaders(),
          // Don't set Content-Type for FormData, let browser set it
        },
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
    
    try {
      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';
      
      const response = await fetch(`${baseURL}/institutions/export-by-type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...apiClient.getAuthHeaders(),
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
    } catch (error: any) {
      console.error('Export error:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }
}

export const institutionService = new InstitutionService();
