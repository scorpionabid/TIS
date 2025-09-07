import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  name?: string; // computed field (first_name + last_name)
  email: string;
  username: string;
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
    const response = await apiClient.get<User[]>('/users', filters);
    return response as PaginatedResponse<User>;
  }

  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    
    if (response.data) {
      return response.data;
    }
    
    throw new Error('User not found');
  }

  async createUser(data: CreateUserData): Promise<User> {
    const response = await apiClient.post<User>('/users', data);
    
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

  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
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

  async getAvailableInstitutions(): Promise<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>> {
    const response = await apiClient.get<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>>('/users/institutions/available');
    
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
}

export const userService = new UserService();