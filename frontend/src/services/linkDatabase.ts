import { apiClient } from './api';
import { LinkShare } from './links';

export interface Department {
  id: number;
  key: string;
  name: string;
  short_name?: string;
  label: string;
  department_type: string;
  institution_id: number;
}

export interface SectorOption {
  id: number;
  name: string;
  short_name?: string;
  parent_id?: number;
}

export interface CreateLinkData {
  title: string;
  url: string;
  description?: string;
  link_type: 'external' | 'video' | 'form' | 'document';
  is_featured?: boolean;
  expires_at?: string;
  // Target selection
  target_departments?: number[];
  target_institutions?: number[];
}

// Backward compatibility aliases
export type DepartmentType = Department;
export type CreateLinkForDepartmentData = CreateLinkData;
export type CreateLinkForSectorData = CreateLinkData;

export interface LinkDatabaseFilters {
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Link Database Service
 * Handles API calls for department and sector based link management
 */
export const linkDatabaseService = {
  /**
   * Get departments from database for tabs
   */
  async getDepartments(): Promise<Department[]> {
    const response = await apiClient.get('/link-database/department-types');
    const data = response.data;

    // Handle both wrapped and direct response formats
    let departments: Department[] = [];
    if (Array.isArray(data)) {
      departments = data;
    } else if (data?.data && Array.isArray(data.data)) {
      departments = data.data;
    } else if (Array.isArray(data?.data?.data)) {
      departments = data.data.data;
    }

    if (import.meta.env?.DEV) {
      console.log('[LinkDatabase] getDepartments:', { rawData: data, departments });
    }

    return departments;
  },

  /**
   * Alias for backward compatibility
   */
  async getDepartmentTypes(): Promise<Department[]> {
    return this.getDepartments();
  },

  /**
   * Get sectors for dropdown
   */
  async getSectors(): Promise<SectorOption[]> {
    const response = await apiClient.get('/link-database/sectors');
    const data = response.data;

    // Handle both wrapped and direct response formats
    let sectors: SectorOption[] = [];
    if (Array.isArray(data)) {
      sectors = data;
    } else if (data?.data && Array.isArray(data.data)) {
      sectors = data.data;
    } else if (Array.isArray(data?.data?.data)) {
      sectors = data.data.data;
    }

    if (import.meta.env?.DEV) {
      console.log('[LinkDatabase] getSectors:', { rawData: data, sectors });
    }

    return sectors;
  },

  /**
   * Get links by department type
   */
  async getLinksByDepartmentType(
    departmentType: string,
    filters: LinkDatabaseFilters = {}
  ): Promise<PaginatedResponse<LinkShare>> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const response = await apiClient.get(
      `/link-database/by-department/${departmentType}?${params.toString()}`
    );

    // Parse response - handle both direct and wrapped formats
    const fullResponse = response.data;
    let paginatedData: any;
    let linksArray: LinkShare[] = [];

    // Check if response has 'current_page' (direct paginated response)
    if (fullResponse && 'current_page' in fullResponse) {
      paginatedData = fullResponse;
      linksArray = fullResponse.data || [];
    }
    // Check if wrapped in { success, data: {...}, message }
    else if (fullResponse?.data && typeof fullResponse.data === 'object' && 'current_page' in fullResponse.data) {
      paginatedData = fullResponse.data;
      linksArray = paginatedData.data || [];
    }
    // Fallback
    else {
      paginatedData = fullResponse?.data || fullResponse || {};
      linksArray = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.data || []);
    }

    if (import.meta.env?.DEV) {
      console.log('[LinkDatabase] getLinksByDepartmentType response:', {
        departmentType,
        rawResponse: fullResponse,
        paginatedData,
        linksArray,
        linksCount: linksArray.length,
      });
    }

    return {
      data: linksArray,
      current_page: paginatedData?.current_page || 1,
      last_page: paginatedData?.last_page || 1,
      per_page: paginatedData?.per_page || 15,
      total: paginatedData?.total || 0,
    };
  },

  /**
   * Get links by sector
   */
  async getLinksBySector(
    sectorId: number,
    filters: LinkDatabaseFilters = {}
  ): Promise<PaginatedResponse<LinkShare>> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const response = await apiClient.get(
      `/link-database/by-sector/${sectorId}?${params.toString()}`
    );

    // Parse response - handle both direct and wrapped formats
    const fullResponse = response.data;
    let paginatedData: any;
    let linksArray: LinkShare[] = [];

    // Check if response has 'current_page' (direct paginated response)
    if (fullResponse && 'current_page' in fullResponse) {
      paginatedData = fullResponse;
      linksArray = fullResponse.data || [];
    }
    // Check if wrapped in { success, data: {...}, message }
    else if (fullResponse?.data && typeof fullResponse.data === 'object' && 'current_page' in fullResponse.data) {
      paginatedData = fullResponse.data;
      linksArray = paginatedData.data || [];
    }
    // Fallback
    else {
      paginatedData = fullResponse?.data || fullResponse || {};
      linksArray = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.data || []);
    }

    if (import.meta.env?.DEV) {
      console.log('[LinkDatabase] getLinksBySector response:', {
        sectorId,
        rawResponse: fullResponse,
        paginatedData,
        linksArray,
        linksCount: linksArray.length,
      });
    }

    return {
      data: linksArray,
      current_page: paginatedData?.current_page || 1,
      last_page: paginatedData?.last_page || 1,
      per_page: paginatedData?.per_page || 15,
      total: paginatedData?.total || 0,
    };
  },

  /**
   * Create link for a specific department type
   */
  async createLinkForDepartment(
    departmentType: string,
    data: CreateLinkForDepartmentData
  ): Promise<LinkShare> {
    const response = await apiClient.post(
      `/link-database/department/${departmentType}`,
      data
    );
    return response.data?.data || response.data;
  },

  /**
   * Create link for a specific sector
   */
  async createLinkForSector(
    sectorId: number,
    data: CreateLinkForSectorData
  ): Promise<LinkShare> {
    const response = await apiClient.post(
      `/link-database/sector/${sectorId}`,
      data
    );
    return response.data?.data || response.data;
  },

  /**
   * Update an existing link
   */
  async updateLink(linkId: number, data: Partial<CreateLinkForDepartmentData>): Promise<LinkShare> {
    const response = await apiClient.put(`/links/${linkId}`, data);
    return response.data?.data || response.data;
  },

  /**
   * Delete a link
   */
  async deleteLink(linkId: number): Promise<void> {
    await apiClient.delete(`/links/${linkId}`);
  },

  /**
   * Restore a disabled link
   */
  async restoreLink(linkId: number): Promise<LinkShare> {
    const response = await apiClient.patch(`/links/${linkId}/restore`);
    return response.data?.data || response.data;
  },
};

export default linkDatabaseService;
