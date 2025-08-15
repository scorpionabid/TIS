import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Role extends BaseEntity {
  name: string;
  display_name?: string;
  description?: string;
  level: number;
  role_category: string;
  guard_name: string;
  permissions: string[];
  can_create_roles_below_level?: boolean;
  max_institutions_scope?: number;
}

export interface CreateRoleData {
  name: string;
  display_name?: string;
  description?: string;
  level: number;
  permissions?: string[];
}

export interface RoleFilters extends PaginationParams {
  guard?: string;
  level?: number;
  category?: string;
  search?: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface HierarchyVisualization {
  level: number;
  level_name: string;
  roles: Role[];
  stats: {
    total_roles: number;
    custom_roles: number;
    system_roles: number;
  };
}

class RoleService extends BaseService<Role> {
  constructor() {
    super('/roles');
  }

  async getAll(params?: RoleFilters) {
    console.log('🔍 RoleService.getAll called', params);
    try {
      const response = await apiClient.get(this.baseEndpoint, params);
      console.log('✅ RoleService.getAll successful:', response);
      return response;
    } catch (error) {
      console.error('❌ RoleService.getAll failed:', error);
      throw error;
    }
  }

  async create(data: CreateRoleData): Promise<Role> {
    console.log('🔥 RoleService.create called', data);
    
    try {
      const response = await apiClient.post(this.baseEndpoint, data);
      console.log('📤 API response for roles create:', response);
      
      // Backend returns: { message: '...', role: {...} }
      if (!response.role) {
        console.error('❌ No role in response:', response);
        throw new Error('Rol yaratma əməliyyatı uğursuz oldu - server cavabında role yoxdur');
      }
      
      console.log('✅ Role create successful:', response.role);
      return response.role;
    } catch (error) {
      console.error('❌ Role create failed:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<CreateRoleData>): Promise<Role> {
    console.log('🔥 RoleService.update called', id, data);
    
    try {
      const response = await apiClient.put(`${this.baseEndpoint}/${id}`, data);
      console.log('📤 API response for roles update:', response);
      
      // Backend returns: { message: '...', role: {...} }
      if (!response.role) {
        console.error('❌ No role in response:', response);
        throw new Error('Rol yeniləmə əməliyyatı uğursuz oldu - server cavabında role yoxdur');
      }
      
      console.log('✅ Role update successful:', response.role);
      return response.role;
    } catch (error) {
      console.error('❌ Role update failed:', error);
      throw error;
    }
  }

  async getPermissions(params?: { guard?: string; level?: number }) {
    console.log('🔍 RoleService.getPermissions called', params);
    try {
      const response = await apiClient.get('/permissions', params);
      console.log('✅ RoleService.getPermissions successful:', response);
      return response;
    } catch (error) {
      console.error('❌ RoleService.getPermissions failed:', error);
      throw error;
    }
  }

  async getHierarchy() {
    console.log('🔍 RoleService.getHierarchy called');
    try {
      const response = await apiClient.get('/roles/hierarchy');
      console.log('✅ RoleService.getHierarchy successful:', response);
      return response;
    } catch (error) {
      console.error('❌ RoleService.getHierarchy failed:', error);
      throw error;
    }
  }

  async getAvailableForLevel(level: number) {
    console.log(`🔍 RoleService.getAvailableForLevel called for level ${level}`);
    try {
      const response = await apiClient.get(`/roles/level/${level}/available`);
      console.log('✅ RoleService.getAvailableForLevel successful:', response);
      return response;
    } catch (error) {
      console.error('❌ RoleService.getAvailableForLevel failed:', error);
      throw error;
    }
  }

  async delete(id: number, deleteType: 'soft' | 'hard' = 'hard'): Promise<void> {
    console.log(`🔥 RoleService.delete called for ${id} with type: ${deleteType}`);
    
    try {
      // Role silmək üçün sadəcə DELETE request göndəririk
      // Backend-də role silinməsi hard delete-dir çünki system role-ları
      const response = await apiClient.delete(`${this.baseEndpoint}/${id}`);
      console.log('✅ Role delete successful:', response);
    } catch (error) {
      console.error('❌ Role delete failed:', error);
      throw error;
    }
  }
}

export const roleService = new RoleService();