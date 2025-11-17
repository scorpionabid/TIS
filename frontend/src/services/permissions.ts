import { BaseService, BaseEntity } from './BaseService';
import { apiClient } from './api';
import { Role } from './roles';

export interface Permission extends BaseEntity {
  name: string;
  display_name?: string | null;
  description?: string | null;
  guard_name: string;
  category?: string | null;
  department?: string | null;
  resource?: string | null;
  action?: string | null;
  is_active: boolean;
  scope: 'global' | 'system' | 'regional' | 'sector' | 'institution' | 'classroom';
  roles_count?: number;
  users_count?: number;
}

export interface PermissionFilters {
  search?: string;
  category?: string;
  scope?: string;
  resource?: string;
  action?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface PermissionUsageStats {
  permission: Permission;
  roles_count: number;
  users_count: number;
  roles: Array<{
    id: number;
    name: string;
    display_name: string;
    level: number;
  }>;
  recent_assignments: Array<{
    user_id: number;
    user_name: string;
    role_name: string;
    assigned_at: string;
  }>;
  usage_timeline: Array<{
    date: string;
    assignments: number;
    revocations: number;
  }>;
}

export interface PermissionMatrix {
  roles: Array<Role>;
  permissions: Array<Permission>;
  matrix: Record<number, Record<number, boolean>>; // [roleId][permissionId]
}

export interface GroupedPermissions {
  [key: string]: {
    label: string;
    permissions: Permission[];
    count: number;
  };
}

export interface PermissionCategory {
  name: string;
  count: number;
}

export interface PermissionScope {
  name: string;
  label: string;
  count: number;
}

class PermissionService extends BaseService<Permission> {
  constructor() {
    super('/permissions');
  }

  async getAll(params?: PermissionFilters): Promise<{
    permissions: Permission[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  }> {
    console.log('🔍 PermissionService.getAll called', params);
    try {
      const response = await apiClient.get(this.baseEndpoint, params);
      console.log('✅ PermissionService.getAll successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getAll failed:', error);
      throw error;
    }
  }

  async getById(id: number): Promise<{ permission: Permission }> {
    console.log('🔍 PermissionService.getById called', id);
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/${id}`);
      console.log('✅ PermissionService.getById successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getById failed:', error);
      throw error;
    }
  }

  async getGrouped(groupBy: 'category' | 'resource' | 'scope' = 'category'): Promise<{
    grouped: GroupedPermissions;
    group_by: string;
  }> {
    console.log('🔍 PermissionService.getGrouped called', groupBy);
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/grouped`, { group_by: groupBy });
      console.log('✅ PermissionService.getGrouped successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getGrouped failed:', error);
      throw error;
    }
  }

  async getMatrix(): Promise<PermissionMatrix> {
    console.log('🔍 PermissionService.getMatrix called');
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/matrix`);
      console.log('✅ PermissionService.getMatrix successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getMatrix failed:', error);
      throw error;
    }
  }

  async update(id: number, data: {
    display_name?: string;
    description?: string;
    is_active?: boolean;
  }): Promise<{
    message: string;
    permission: Permission;
    warning?: string;
  }> {
    console.log('🔥 PermissionService.update called', id, data);
    try {
      const response = await apiClient.put(`${this.baseEndpoint}/${id}`, data);
      console.log('✅ PermissionService.update successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.update failed:', error);
      throw error;
    }
  }

  async bulkUpdate(permissionIds: number[], data: {
    is_active?: boolean;
  }): Promise<{
    message: string;
    updated_count: number;
  }> {
    console.log('🔥 PermissionService.bulkUpdate called', permissionIds, data);
    try {
      const response = await apiClient.post(`${this.baseEndpoint}/bulk-update`, {
        permission_ids: permissionIds,
        data,
      });
      console.log('✅ PermissionService.bulkUpdate successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.bulkUpdate failed:', error);
      throw error;
    }
  }

  async getUsageStats(id: number): Promise<PermissionUsageStats> {
    console.log('🔍 PermissionService.getUsageStats called', id);
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/${id}/usage`);
      console.log('✅ PermissionService.getUsageStats successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getUsageStats failed:', error);
      throw error;
    }
  }

  async syncRolePermissions(
    roleId: number,
    permissionIds: number[],
    action: 'assign' | 'revoke' | 'replace'
  ): Promise<{
    message: string;
    role: Role;
    permissions_count: number;
  }> {
    console.log('🔥 PermissionService.syncRolePermissions called', roleId, permissionIds, action);
    try {
      const response = await apiClient.post(`${this.baseEndpoint}/sync-role`, {
        role_id: roleId,
        permission_ids: permissionIds,
        action,
      });
      console.log('✅ PermissionService.syncRolePermissions successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.syncRolePermissions failed:', error);
      throw error;
    }
  }

  async getCategories(): Promise<{ categories: PermissionCategory[] }> {
    console.log('🔍 PermissionService.getCategories called');
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/categories`);
      console.log('✅ PermissionService.getCategories successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getCategories failed:', error);
      throw error;
    }
  }

  async getScopes(): Promise<{ scopes: PermissionScope[] }> {
    console.log('🔍 PermissionService.getScopes called');
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/scopes`);
      console.log('✅ PermissionService.getScopes successful:', response);
      return response;
    } catch (error) {
      console.error('❌ PermissionService.getScopes failed:', error);
      throw error;
    }
  }
}

export const permissionService = new PermissionService();
