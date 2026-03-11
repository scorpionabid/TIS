import { apiClient, ApiResponse } from './api';

export interface PreschoolGroup {
  id: number;
  name: string;
  student_count: number;
  male_count: number;
  female_count: number;
  description: string | null;
  is_active: boolean;
  teacher: {
    id: number;
    name: string;
  } | null;
}

export interface CreateGroupData {
  name: string;
  student_count: number;
  male_student_count?: number;
  female_student_count?: number;
  description?: string;
}

export type UpdateGroupData = Partial<CreateGroupData & { is_active: boolean }>;

class PreschoolGroupService {
  private readonly baseUrl = '/preschool/groups';

  async getGroups(): Promise<ApiResponse<PreschoolGroup[]>> {
    return apiClient.get<PreschoolGroup[]>(this.baseUrl);
  }

  async createGroup(data: CreateGroupData): Promise<ApiResponse<PreschoolGroup>> {
    return apiClient.post<PreschoolGroup>(this.baseUrl, data);
  }

  async updateGroup(id: number, data: UpdateGroupData): Promise<ApiResponse<PreschoolGroup>> {
    return apiClient.put<PreschoolGroup>(`${this.baseUrl}/${id}`, data);
  }

  async deleteGroup(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.baseUrl}/${id}`);
  }
}

export const preschoolGroupService = new PreschoolGroupService();
