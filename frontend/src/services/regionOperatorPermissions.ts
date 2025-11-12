import { apiClient, ApiResponse } from './api';

export type RegionOperatorPermissionFlags = Record<string, boolean>;

export interface RegionOperatorModuleMeta {
  label: string;
  description: string;
}

export interface RegionOperatorPermissionResponse {
  operator: {
    id: number;
    username: string;
    full_name: string;
    institution?: string | null;
    department?: string | null;
  };
  permissions: RegionOperatorPermissionFlags;
  modules: Record<string, RegionOperatorModuleMeta>;
}

class RegionOperatorPermissionsService {
  private readonly basePath = '/regionadmin/region-operators';

  async getPermissions(operatorId: number): Promise<RegionOperatorPermissionResponse> {
    const response = await apiClient.get<RegionOperatorPermissionResponse>(
      `${this.basePath}/${operatorId}/permissions`
    );
    return this.unwrap(response);
  }

  async updatePermissions(
    operatorId: number,
    payload: Partial<RegionOperatorPermissionFlags>
  ): Promise<RegionOperatorPermissionFlags> {
    const response = await apiClient.put<ApiResponse<RegionOperatorPermissionFlags> | RegionOperatorPermissionFlags>(
      `${this.basePath}/${operatorId}/permissions`,
      payload
    );
    const data = this.unwrap(response);

    if (data && typeof data === 'object' && 'permissions' in data) {
      return (data as any).permissions as RegionOperatorPermissionFlags;
    }

    return data as RegionOperatorPermissionFlags;
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
}

export const regionOperatorPermissionsService = new RegionOperatorPermissionsService();
