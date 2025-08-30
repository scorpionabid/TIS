import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  name?: string; // computed field (first_name + last_name)
  email: string;
  username: string;
  utis_code?: string;
  role_id: string;
  role?: string;
  permissions: string[];
  contact_phone?: string;
  phone?: string; // alias for contact_phone
  is_active: boolean;
  status?: 'active' | 'inactive'; // computed from is_active
  institution?: {
    id: number;
    name: string;
    type: string;
    level: number;
  };
  region?: {
    id: number;
    name: string;
  };
  department?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  utis_code?: string;
  password: string;
  role_id: string;
  contact_phone?: string;
  institution_id?: number;
  department_id?: number;
  is_active?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  utis_code?: string;
  role_id?: string;
  contact_phone?: string;
  is_active?: boolean;
  institution_id?: number;
  department_id?: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
  institution_id?: number;
  department_id?: number;
  page?: number;
  per_page?: number;
}

export interface BulkUserAction {
  user_ids: number[];
  action: 'activate' | 'deactivate' | 'assign_role' | 'assign_institution' | 'delete';
  value?: string | number;
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  by_role: Record<string, number>;
  by_institution: Record<string, number>;
  recent_registrations: number;
}

class UserService {
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    try {
      const response = await apiClient.get<User[]>('/users', filters);
      
      // Handle the backend response format: {success: true, data: [...]}
      if (response && typeof response === 'object' && 'data' in response) {
        const backendData = response.data;
        
        // Return in the expected format
        return {
          data: backendData || [],
          current_page: 1,
          last_page: 1,
          per_page: 100,
          total: Array.isArray(backendData) ? backendData.length : 0,
          first_page_url: '',
          last_page_url: '',
          next_page_url: null,
          prev_page_url: null,
          path: '',
          from: 1,
          to: Array.isArray(backendData) ? backendData.length : 0
        } as PaginatedResponse<User>;
      }
      
      // Fallback to original response
      return response as PaginatedResponse<User>;
    } catch (error) {
      console.error('UserService.getUsers error:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    
    if (response.data) {
      return response.data;
    }
    
    throw new Error('User not found');
  }

  async createUser(data: CreateUserData, currentUserRole?: string): Promise<User> {
    // Use passed role or fallback to localStorage
    let role = currentUserRole;
    if (!role) {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
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

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    
    if (response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update user');
  }

  async deleteUser(id: number, currentUserRole?: string): Promise<void> {
    // Use passed role or fallback to localStorage
    let role = currentUserRole;
    if (!role) {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
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
    
    console.log(`🗑️ Deleting user with role ${role} using endpoint ${endpoint}`);
    await apiClient.delete(endpoint);
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

}

export const userService = new UserService();