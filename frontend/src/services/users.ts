import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { PaginationParams } from './BaseService';
import { storageHelpers } from '@/utils/helpers';

// Import centralized User types
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserFilters, 
  BulkUserAction, 
  UserStatistics 
} from '@/types/user';

// Re-export for backward compatibility
export type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserFilters, 
  BulkUserAction, 
  UserStatistics 
};

export interface TrashedUser extends User {
  deleted_at?: string;
  roles?: Array<{
    id: number;
    name: string;
    display_name?: string;
  }>;
}

interface TrashedUsersPayload {
  data?: {
    data?: TrashedUser[];
    current_page?: number;
    total?: number;
    per_page?: number;
    last_page?: number;
  } | TrashedUser[];
  users?: TrashedUser[];
  meta?: {
    current_page?: number;
    total?: number;
    per_page?: number;
    last_page?: number;
  };
}

export interface TrashedUsersResult {
  users: TrashedUser[];
  pagination: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

export interface TrashedUsersParams extends Partial<PaginationParams> {
  search?: string;
}

const AUTH_USER_STORAGE_KEY = 'atis_current_user';
const LEGACY_USER_STORAGE_KEY = 'currentUser';

const getStoredUser = (): any => {
  const authUser = storageHelpers.get<any>(AUTH_USER_STORAGE_KEY);
  if (authUser) {
    return authUser;
  }

  return storageHelpers.get<any>(LEGACY_USER_STORAGE_KEY);
};

class UserService {
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    try {
      const response = await apiClient.get<User[]>('/users', filters);
      
      // Handle the backend response format: {success: true, data: [...]}
      if (response && typeof response === 'object' && 'data' in response) {
        const backendData = response.data;
        
        // Transform backend data to match frontend expectations
        const transformedData = Array.isArray(backendData) ? backendData.map(user => {
          const transformed = {
            ...user,
            // Transform role object to string for UserTable compatibility
            role: (user.role && typeof user.role === 'object' && user.role.name) ? user.role.name : user.role,
            // Ensure name field exists for compatibility
            name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email
          };
          
          
          return transformed;
        }) : [];
        
        // Use meta from backend response or create default
        const meta = response.meta || {};
        
        // Return in the expected format
        return {
          data: transformedData,
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          per_page: meta.per_page || transformedData.length,
          total: meta.total || transformedData.length,
          first_page_url: meta.first_page_url || '',
          last_page_url: meta.last_page_url || '',
          next_page_url: meta.next_page_url || null,
          prev_page_url: meta.prev_page_url || null,
          path: meta.path || '',
          from: meta.from || 1,
          to: meta.to || transformedData.length
        } as PaginatedResponse<User>;
      }
      
      // Fallback to original response
      return response as PaginatedResponse<User>;
    } catch (error) {
      console.error('UserService.getUsers error:', error);
      throw error;
    }
  }

  // Add alias methods for backward compatibility with UserManagement component
  async getAll(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    return this.getUsers(filters);
  }

  async create(data: CreateUserData, currentUserRole?: string): Promise<User> {
    return this.createUser(data, currentUserRole);
  }

  async update(id: number, data: UpdateUserData, currentUserRole?: string): Promise<User> {
    return this.updateUser(id, data, currentUserRole);
  }

  async delete(id: number, currentUserRole?: string, deleteType: 'soft' | 'hard' = 'soft'): Promise<void> {
    return this.deleteUser(id, currentUserRole, deleteType);
  }

  async getUser(id: number): Promise<User> {
    const role = getStoredUser()?.role;
    let endpoint = `/users/${id}`;

    switch (role) {
      case 'regionadmin':
        endpoint = `/regionadmin/users/${id}`;
        break;
      case 'sektoradmin':
        endpoint = `/sektoradmin/users/${id}`;
        break;
      default:
        break;
    }

    const response = await apiClient.get<User>(endpoint);

    if (response && typeof response === 'object' && 'data' in response && response.data) {
      return response.data;
    }

    if (response && !('data' in response)) {
      return response as User;
    }

    throw new Error('User not found');
  }

  async createUser(data: CreateUserData, currentUserRole?: string): Promise<User> {
    // Use passed role or fallback to localStorage
    let role = currentUserRole;
    if (!role) {
      const currentUser = getStoredUser();
      role = currentUser?.role;
    }
    
    console.log('🔍 Debug role for endpoint selection:', role);
    
    let endpoint = '/users';
    
    // Use role-specific endpoints for better permission handling
    switch(role) {
      case 'regionadmin':
        endpoint = '/regionadmin/users';
        break;
      case 'sektoradmin':
        endpoint = '/sektoradmin/users';
        break;
      default:
        endpoint = '/users';
        break;
    }
    
    console.log(`🚀 Creating user with role ${role} using endpoint ${endpoint}`);
    const response = await apiClient.post<User>(endpoint, data);
    
    if (response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create user');
  }

  async updateUser(id: number, data: UpdateUserData, currentUserRole?: string): Promise<User> {
    // Use passed role or fallback to localStorage
    let role = currentUserRole;
    if (!role) {
      const currentUser = getStoredUser();
      role = currentUser?.role;
    }

    let endpoint = `/users/${id}`;

    // Use role-specific endpoints for better permission handling
    switch(role) {
      case 'regionadmin':
        endpoint = `/regionadmin/users/${id}`;
        break;
      case 'sektoradmin':
        endpoint = `/sektoradmin/users/${id}`;
        break;
      default:
        endpoint = `/users/${id}`;
        break;
    }

    const response = await apiClient.put<User>(endpoint, data);

    if (response.data) {
      return response.data;
    }

    throw new Error('Failed to update user');
  }

  async deleteUser(id: number, currentUserRole?: string, deleteType: 'soft' | 'hard' = 'soft'): Promise<void> {
    // Use passed role or fallback to localStorage
    let role = currentUserRole;
    if (!role) {
      const currentUser = getStoredUser();
      role = currentUser?.role;
    }
    
    let endpoint = `/users/${id}`;
    
    // Use role-specific endpoints for better permission handling
    switch(role) {
      case 'regionadmin':
        endpoint = `/regionadmin/users/${id}`;
        break;
      case 'sektoradmin':
        endpoint = `/sektoradmin/users/${id}`;
        break;
      default:
        endpoint = `/users/${id}`;
        break;
    }
    
    // Add delete type as query parameter
    const queryParam = deleteType === 'hard' ? '?type=hard' : '?type=soft';
    await apiClient.delete(endpoint + queryParam);
  }

  async getTrashedUsers(params: TrashedUsersParams = {}): Promise<TrashedUsersResult> {
    const requestParams: Record<string, any> = {
      ...params,
    };

    const response = await apiClient.get<TrashedUsersPayload>('/users/trashed', requestParams);
    const payload: TrashedUsersPayload | undefined = response.data;

    if (!payload) {
      throw new Error('Failed to fetch trashed users');
    }

    const inner = Array.isArray(payload.data) ? null : payload.data;

    const users: TrashedUser[] = Array.isArray(payload.users)
      ? payload.users
      : Array.isArray(payload.data)
        ? (payload.data as TrashedUser[])
        : Array.isArray(inner?.data)
          ? (inner?.data as TrashedUser[])
          : [];

    const paginationSource = payload.meta || inner || {};
    const requestedPerPage =
      typeof params.per_page === 'number'
        ? params.per_page
        : users.length;
    const fallbackPerPage = requestedPerPage || 10;

    return {
      users,
      pagination: {
        current_page: Number(paginationSource?.current_page) || 1,
        total: Number(paginationSource?.total) || users.length,
        per_page: Number(paginationSource?.per_page) || fallbackPerPage,
        last_page: Number(paginationSource?.last_page) || 1,
      },
    };
  }

  async restoreTrashedUser(userId: number): Promise<void> {
    await apiClient.post(`/users/${userId}/restore`);
  }

  async bulkRestoreTrashedUsers(userIds: number[]): Promise<{ restored_count: number }> {
    const response = await apiClient.post<{ restored_count: number }>('/users/bulk/restore', {
      user_ids: userIds,
      confirm: true,
    });

    return response.data || { restored_count: 0 };
  }

  async forceDeleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/users/${userId}/force`, { confirm: true });
  }

  async toggleUserStatus(id: number): Promise<User> {
    const response = await apiClient.post<User>(`/users/${id}/toggle-status`);
    
    if (response.data) {
      return response.data;
    }
    
    throw new Error('Failed to toggle user status');
  }

  async bulkAction(action: BulkUserAction): Promise<void> {
    const endpoint = this.getBulkActionEndpoint(action.action);
    await apiClient.post(endpoint, action);
  }

  private getBulkActionEndpoint(action: string): string {
    switch (action) {
      case 'activate':
        return '/users/bulk/activate';
      case 'deactivate':
        return '/users/bulk/deactivate';
      case 'assign_role':
        return '/users/bulk/assign-role';
      case 'assign_institution':
        return '/users/bulk/assign-institution';
      case 'delete':
        return '/users/bulk/delete';
      default:
        throw new Error(`Unknown bulk action: ${action}`);
    }
  }

  async exportUsers(filters?: UserFilters): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/export`, {
      method: 'POST',
      headers: apiClient['getHeaders'](),
      body: JSON.stringify(filters || {}),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  async getStatistics(): Promise<UserStatistics> {
    const response = await apiClient.get<UserStatistics>('/users/bulk/statistics');
    
    if (response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get user statistics');
  }

  async getAvailableInstitutions(roleName?: string): Promise<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>> {
    const params = roleName ? { role_name: roleName } : {};
    const response = await apiClient.get<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>>('/users/institutions/available', params);
    
    if (response.data) {
      return response.data;
    }
    
    return [];
  }

  async getAvailableRoles(): Promise<Array<{id: number, name: string, display_name: string, level: number}>> {
    const response = await apiClient.get<Array<{id: number, name: string, display_name: string, level: number}>>('/users/roles/available');
    
    if (response.data) {
      return response.data;
    }
    
    return [];
  }

  async getAvailableDepartments(roleName?: string, institutionId?: number): Promise<Array<{id: number, name: string, department_type: string, institution: {id: number, name: string, type: string}}>> {
    const params: Record<string, any> = {};
    if (roleName) params.role_name = roleName;
    if (institutionId) params.institution_id = institutionId;
    
    const response = await apiClient.get<Array<{id: number, name: string, department_type: string, institution: {id: number, name: string, type: string}}>>('/users/departments/available', params);
    
    if (response.data) {
      return response.data;
    }
    
    return [];
  }

  // Role-based import/export methods for Users page
  async downloadRoleTemplate(roleId: string): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/bulk/download-template?role_id=${roleId}`, {
      method: 'GET',
      headers: apiClient['getHeaders'](),
    });

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  async importUsersByRole(file: File, roleId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('role_id', roleId);

    const response = await fetch(`${apiClient['baseURL']}/users/bulk/import`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        'Content-Type': undefined, // Let the browser set the content type for FormData
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Import failed');
    }

    return result;
  }

  async exportUsersByRole(roleId: string, filters?: any): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/bulk/export`, {
      method: 'POST',
      headers: apiClient['getHeaders'](),
      body: JSON.stringify({
        role_id: roleId,
        filters: filters || {}
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Legacy methods for backward compatibility with other pages
  async downloadTemplate(userType: 'teachers' | 'students' | 'staff'): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/bulk/download-template?user_type=${userType}`, {
      method: 'GET',
      headers: apiClient['getHeaders'](),
    });

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  async importUsers(file: File, userType: 'teachers' | 'students' | 'staff'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_type', userType);

    const response = await fetch(`${apiClient['baseURL']}/users/bulk/import`, {
      method: 'POST',
      headers: {
        ...apiClient['getHeaders'](),
        'Content-Type': undefined, // Let the browser set the content type for FormData
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Import failed');
    }

    return result;
  }

  async exportUsersByType(userType: 'teachers' | 'students' | 'staff', filters?: any): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/bulk/export`, {
      method: 'POST',
      headers: apiClient['getHeaders'](),
      body: JSON.stringify({
        user_type: userType,
        filters: filters || {}
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  async getExportStats(filters?: any): Promise<any> {
    const response = await apiClient.get('/users/bulk/statistics', filters);
    
    if (response.data) {
      return response.data;
    }
    
    return {
      total_users: 0,
      active_users: 0,
      inactive_users: 0,
      teachers: 0,
      students: 0,
      staff: 0
    };
  }

  validateFile(file: File): {valid: boolean, error?: string} {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Fayl ölçüsü çox böyükdür (maksimum 10MB)'
      };
    }

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Yalnız Excel (.xlsx, .xls) və CSV faylları dəstəklənir'
      };
    }

    return { valid: true };
  }

  downloadFileBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async checkEmailUnique(email: string, excludeUserId?: number): Promise<{isUnique: boolean, message?: string}> {
    try {
      const response = await apiClient.post('/users/check-email-unique', {
        email: email,
        exclude_user_id: excludeUserId
      });

      return {
        isUnique: response.data?.is_unique ?? false,
        message: response.data?.message
      };
    } catch (error) {
      console.error('Email uniqueness check failed:', error);
      return {
        isUnique: false,
        message: 'Email yoxlanması uğursuz oldu'
      };
    }
  }

  async getFilterOptions(): Promise<{
    roles: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
    institutions: Array<{ id: number; name: string; level?: number; type?: string }>;
    departments: Array<{ id: number; name: string; department_type?: string; institution_id?: number; institution?: { id: number; name: string } }>;
  }> {
    try {
      const response = await apiClient.get<{
        roles: Array<{ value: string; label: string }>;
        statuses: Array<{ value: string; label: string }>;
        institutions: Array<{ id: number; name: string; level?: number; type?: string }>;
        departments: Array<{ id: number; name: string; department_type?: string; institution_id?: number; institution?: { id: number; name: string } }>;
      }>('/users/filter-options');

      return response.data || {
        roles: [],
        statuses: [],
        institutions: [],
        departments: []
      };
    } catch (error) {
      console.error('Filter options fetch failed:', error);
      return {
        roles: [],
        statuses: [],
        institutions: [],
        departments: []
      };
    }
  }

  /**
   * Search users for link/resource targeting
   * Used by RegionAdmin+ to search and select specific users
   */
  async searchUsers(params: {
    query?: string;
    institution_id?: number;
    role?: string;
    status?: string;
    include_inactive?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<User>> {
    try {
      const { query, ...restParams } = params;
      const endpoint = query ? `/users/search/${encodeURIComponent(query)}` : '/users/search/';

      const response = await apiClient.get<PaginatedResponse<User>>(endpoint, restParams);

      // Handle backend response format
      if (response && typeof response === 'object' && 'data' in response) {
        const users = Array.isArray(response.data) ? response.data : [];
        const meta = response.meta || {};

        return {
          data: users,
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          per_page: meta.per_page || users.length,
          total: meta.total || users.length,
          first_page_url: meta.first_page_url || '',
          last_page_url: meta.last_page_url || '',
          next_page_url: meta.next_page_url || null,
          prev_page_url: meta.prev_page_url || null,
          path: meta.path || '',
          from: meta.from || 1,
          to: meta.to || users.length
        } as PaginatedResponse<User>;
      }

      return response as PaginatedResponse<User>;
    } catch (error) {
      console.error('UserService.searchUsers error:', error);
      throw error;
    }
  }

}

export const userService = new UserService();
