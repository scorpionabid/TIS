import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Institution extends BaseEntity {
  name: string;
  type: 'ministry' | 'region' | 'sektor' | 'school' | 'secondary_school' | 'primary_school' | 'vocational' | 'university' | 'regional_education_department' | 'sector_education_office' | 'lyceum' | 'gymnasium';
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
    const response = await apiClient.get<Institution[]>(`${this.baseEndpoint}/${parentId}/children`);
    return response.data || [];
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
}

export const institutionService = new InstitutionService();