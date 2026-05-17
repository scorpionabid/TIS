import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { ApiResponse, apiClient } from './api';

export interface Department extends BaseEntity {
  name: string;
  short_name?: string;
  department_type: string;
  department_type_display?: string;
  institution_id: number;
  parent_department_id?: number;
  description?: string;
  metadata?: Record<string, any>;
  capacity?: number;
  budget_allocation?: number;
  functional_scope?: string;
  is_active: boolean;
  deleted_at?: string | null;
  
  // Relations
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  parent?: Department;
  children?: Department[];
}

export interface CreateDepartmentData {
  name: string;
  short_name?: string;
  department_type: string;
  institution_id: number;
  parent_department_id?: number;
  description?: string;
  metadata?: Record<string, any>;
  capacity?: number;
  budget_allocation?: number;
  functional_scope?: string;
  is_active?: boolean;
}

export interface DepartmentFilters extends PaginationParams {
  institution_id?: number;
  parent_id?: number;
  department_type?: string;
  is_active?: boolean;
  hierarchy?: boolean;
  search?: string;
  include_deleted?: boolean;
  only_deleted?: boolean;
}

export interface DepartmentType {
  key: string;
  label: string;
  description?: string;
}

export interface DepartmentListResponse extends ApiResponse<Department[]> {
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
  };
}

class DepartmentService extends BaseService<Department> {
  constructor() {
    super('/departments');
  }

  async getAll(params?: DepartmentFilters): Promise<DepartmentListResponse> {
    const response = await apiClient.get<Department[]>(this.baseEndpoint, params);
    return response as DepartmentListResponse;
  }

  async create(data: CreateDepartmentData): Promise<Department> {
    const response = await apiClient.post<Department>(this.baseEndpoint, data);

    if (!response.data) {
      throw new Error('Departament yaratmaq mümkün olmadı - server məlumat qaytarmadı.');
    }

    return response.data;
  }

  async update(id: number, data: Partial<CreateDepartmentData>): Promise<Department> {
    const response = await apiClient.put<Department>(`${this.baseEndpoint}/${id}`, data);

    if (!response.data) {
      throw new Error('Departament yenilənmədi - server məlumat qaytarmadı.');
    }

    return response.data;
  }

  async getByInstitution(institutionId: number, params?: DepartmentFilters): Promise<DepartmentListResponse> {
    const response = await apiClient.get<Department[]>(`${this.baseEndpoint}`, { 
      ...params, 
      institution_id: institutionId 
    });
    return response as DepartmentListResponse;
  }

  async getTypes(): Promise<ApiResponse<DepartmentType[]>> {
    const response = await apiClient.get<DepartmentType[]>('/departments/types');
    return response;
  }

  async getTypesForInstitution(institutionId: number): Promise<ApiResponse<DepartmentType[]>> {
    const response = await apiClient.get<DepartmentType[]>('/departments/types-for-institution', { 
      institution_id: institutionId 
    });
    return response;
  }

  async getHierarchy(institutionId?: number): Promise<ApiResponse<Department[]>> {
    const params = institutionId ? { institution_id: institutionId } : {};
    const response = await apiClient.get<Department[]>(`${this.baseEndpoint}`, { 
      ...params, 
      hierarchy: true 
    });
    return response;
  }

  async getRoots(institutionId?: number): Promise<DepartmentListResponse> {
    const params = institutionId ? { institution_id: institutionId } : {};
    const response = await apiClient.get<Department[]>(`${this.baseEndpoint}`, { 
      ...params, 
      parent_id: null 
    });
    return response as DepartmentListResponse;
  }

  async getChildren(parentId: number): Promise<DepartmentListResponse> {
    const response = await apiClient.get<Department[]>(`${this.baseEndpoint}`, { 
      parent_id: parentId 
    });
    return response as DepartmentListResponse;
  }

  async getStatistics(institutionId: number): Promise<ApiResponse<Record<string, any>>> {
    const response = await apiClient.get<Record<string, any>>(`/institutions/${institutionId}/departments/statistics`);
    return response;
  }

  async delete(id: number, deleteType: 'soft' | 'hard' = 'soft'): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/${id}?type=${deleteType}`);
  }
}

export const departmentService = new DepartmentService();
