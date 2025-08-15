import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Department extends BaseEntity {
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
  is_active: boolean;
  
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
}

export interface DepartmentType {
  key: string;
  label: string;
  description?: string;
}

class DepartmentService extends BaseService<Department> {
  constructor() {
    super('/departments');
  }

  async getAll(params?: DepartmentFilters) {
    console.log('🔍 DepartmentService.getAll called', params);
    try {
      const response = await apiClient.get(this.baseEndpoint, params);
      console.log('✅ DepartmentService.getAll successful:', response);
      return response;
    } catch (error) {
      console.error('❌ DepartmentService.getAll failed:', error);
      throw error;
    }
  }

  async create(data: CreateDepartmentData): Promise<Department> {
    console.log('🔥 DepartmentService.create called', data);
    
    try {
      const response = await apiClient.post(this.baseEndpoint, data);
      console.log('📤 API response for departments create:', response);
      
      // Backend returns: { message: '...', department: {...} }
      if (!response.department) {
        console.error('❌ No department in response:', response);
        throw new Error('Yaratma əməliyyatı uğursuz oldu - server cavabında department yoxdur');
      }
      
      console.log('✅ Department create successful:', response.department);
      return response.department;
    } catch (error) {
      console.error('❌ Department create failed:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<CreateDepartmentData>): Promise<Department> {
    console.log('🔥 DepartmentService.update called', id, data);
    
    try {
      const response = await apiClient.put(`${this.baseEndpoint}/${id}`, data);
      console.log('📤 API response for departments update:', response);
      
      // Backend returns: { message: '...', department: {...} }
      if (!response.department) {
        console.error('❌ No department in response:', response);
        throw new Error('Yeniləmə əməliyyatı uğursuz oldu - server cavabında department yoxdur');
      }
      
      console.log('✅ Department update successful:', response.department);
      return response.department;
    } catch (error) {
      console.error('❌ Department update failed:', error);
      throw error;
    }
  }

  async getByInstitution(institutionId: number, params?: DepartmentFilters) {
    const response = await apiClient.get(`${this.baseEndpoint}`, { 
      ...params, 
      institution_id: institutionId 
    });
    return response;
  }

  async getTypes() {
    console.log('🔍 DepartmentService.getTypes called');
    try {
      const response = await apiClient.get('/departments/types');
      console.log('✅ DepartmentService.getTypes successful:', response);
      return response;
    } catch (error) {
      console.error('❌ DepartmentService.getTypes failed:', error);
      throw error;
    }
  }

  async getTypesForInstitution(institutionType: string) {
    const response = await apiClient.get('/departments/types/institution', { 
      institution_type: institutionType 
    });
    return response;
  }

  async getHierarchy(institutionId?: number) {
    const params = institutionId ? { institution_id: institutionId } : {};
    const response = await apiClient.get(`${this.baseEndpoint}`, { 
      ...params, 
      hierarchy: true 
    });
    return response;
  }

  async getRoots(institutionId?: number) {
    const params = institutionId ? { institution_id: institutionId } : {};
    const response = await apiClient.get(`${this.baseEndpoint}`, { 
      ...params, 
      parent_id: null 
    });
    return response;
  }

  async getChildren(parentId: number) {
    const response = await apiClient.get(`${this.baseEndpoint}`, { 
      parent_id: parentId 
    });
    return response;
  }

  async getStatistics(institutionId: number) {
    const response = await apiClient.get(`/institutions/${institutionId}/departments/statistics`);
    return response;
  }

  async delete(id: number, deleteType: 'soft' | 'hard' = 'soft'): Promise<void> {
    console.log(`🔥 DepartmentService.delete called for ${id} with type: ${deleteType}`);
    
    try {
      const response = await apiClient.delete(`${this.baseEndpoint}/${id}`, {
        type: deleteType
      });
      console.log('✅ Department delete successful:', response);
    } catch (error) {
      console.error('❌ Department delete failed:', error);
      throw error;
    }
  }
}

export const departmentService = new DepartmentService();