import { apiClient, ApiResponse } from './api';
import { PaginationParams } from './BaseService';

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface RegionAdminUserFilters extends Partial<PaginationParams> {
  role?: string;
  search?: string;
  status?: string;
}

export interface RegionAdminUsersResult<T = RegionAdminUser> {
  users: T[];
  meta: PaginationMeta;
  raw: unknown;
}

export interface RegionAdminUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  roles?: Array<{
    id: number;
    name: string;
    display_name?: string;
  }>;
  role?: string;
  role_name?: string;
  institution?: {
    id: number;
    name: string;
    type?: string;
    level?: number;
  };
  status?: string;
  is_active?: boolean;
  last_login_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface RegionAdminInstitutionsResult<T = any> {
  institutions: T[];
  meta: PaginationMeta;
  raw: unknown;
}

class RegionAdminService {
  private readonly basePath = '/regionadmin';

  async getUsers<T = RegionAdminUser>(
    filters: RegionAdminUserFilters = {}
  ): Promise<RegionAdminUsersResult<T>> {
    const response = await apiClient.get<any>(`${this.basePath}/users`, filters);
    const payload = this.unwrap(response);
    const users = this.extractCollection<T>(payload, ['users', 'data', 'items']);
    const meta = this.extractMeta(payload, {
      per_page: filters.per_page,
      total: users.length,
    });

    return {
      users,
      meta,
      raw: payload,
    };
  }

  async getDashboardStats<T = any>(): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/dashboard/stats`);
    return this.unwrap(response);
  }

  async getDashboardActivities<T = any[]>(): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/dashboard/activities`);
    return this.unwrap(response);
  }

  async getRegionInstitutions<T = any>(
    params: Record<string, unknown> = {}
  ): Promise<RegionAdminInstitutionsResult<T>> {
    const response = await apiClient.get<any>(`${this.basePath}/region-institutions`, params);
    const payload = this.unwrap(response);
    const institutions = this.extractCollection<T>(payload, ['institutions', 'data', 'items']);
    const meta = this.extractMeta(payload, {
      per_page: Number(params?.per_page) || institutions.length,
      total: institutions.length,
    });

    return {
      institutions,
      meta,
      raw: payload,
    };
  }

  async getRegionInstitutionDetails<T = any>(institutionId: number): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/region-institutions/${institutionId}`);
    return this.unwrap(response);
  }

  async getRegionInstitutionStats<T = any>(institutionId: number): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/region-institutions/${institutionId}/stats`);
    return this.unwrap(response);
  }

  async getRegionInstitutionHierarchy<T = any>(institutionId: number): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/region-institutions/${institutionId}/hierarchy`);
    return this.unwrap(response);
  }

  /**
   * Get institutions for UserModalTabs
   * Returns institutions filtered by RegionAdmin's access
   */
  async getInstitutions(): Promise<{ institutions: any[] }> {
    try {
      const result = await this.getRegionInstitutions();
      return {
        institutions: result.institutions || []
      };
    } catch (error) {
      console.error('regionAdminService.getInstitutions error:', error);
      return { institutions: [] };
    }
  }

  /**
   * Get departments for UserModalTabs
   * Returns departments filtered by RegionAdmin's access
   */
  async getDepartments(): Promise<{ departments: any[] }> {
    try {
      const response = await apiClient.get<any>(`${this.basePath}/departments`);
      const payload = this.unwrap(response);
      const departments = this.extractCollection(payload, ['departments', 'data', 'items']);

      console.log('🔧 regionAdminService.getDepartments:', {
        payload,
        departments,
        count: departments.length
      });

      return {
        departments: departments || []
      };
    } catch (error) {
      console.error('regionAdminService.getDepartments error:', error);
      return { departments: [] };
    }
  }

  private unwrap<T>(response: ApiResponse<T> | any): any {
    if (!response) {
      return null;
    }

    if (typeof response === 'object' && 'data' in response && response.data !== undefined) {
      return response.data;
    }

    return response;
  }

  private extractCollection<T>(payload: any, preferredKeys: string[]): T[] {
    if (!payload) {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload as T[];
    }

    for (const key of preferredKeys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
      if (value && Array.isArray(value.data)) {
        return value.data as T[];
      }
    }

    if (payload.data && Array.isArray(payload.data)) {
      return payload.data as T[];
    }

    if (payload.result && Array.isArray(payload.result)) {
      return payload.result as T[];
    }

    if (payload.result && Array.isArray(payload.result?.data)) {
      return payload.result.data as T[];
    }

    return [];
  }

  private extractMeta(payload: any, fallback: { per_page?: number; total?: number }): PaginationMeta {
    const defaultMeta: PaginationMeta = {
      current_page: 1,
      per_page: Number(fallback.per_page ?? fallback.total ?? 0),
      total: Number(fallback.total ?? fallback.per_page ?? 0),
      last_page: 1,
    };

    if (!payload || Array.isArray(payload)) {
      return defaultMeta;
    }

    const metaSource =
      this.pickObject(payload.meta) ||
      this.pickObject(payload.pagination) ||
      this.pickObject(payload.page) ||
      this.pickObject(payload.data?.meta) ||
      this.pickObject(payload.data?.pagination) ||
      (this.isMetaShape(payload.data) ? payload.data : null);

    if (!metaSource) {
      return defaultMeta;
    }

    const perPage =
      Number(metaSource.per_page ?? metaSource.perPage ?? defaultMeta.per_page) || defaultMeta.per_page;
    const total = Number(metaSource.total ?? defaultMeta.total) || defaultMeta.total;
    const lastPage =
      Number(metaSource.last_page ?? metaSource.lastPage ?? (perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1)) ||
      defaultMeta.last_page;

    return {
      current_page: Number(metaSource.current_page ?? 1),
      per_page: perPage,
      total,
      last_page: lastPage,
    };
  }

  private pickObject(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private isMetaShape(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
      'current_page' in candidate ||
      'per_page' in candidate ||
      'perPage' in candidate ||
      'total' in candidate ||
      'last_page' in candidate ||
      'lastPage' in candidate
    );
  }
}

export const regionAdminService = new RegionAdminService();
