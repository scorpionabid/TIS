import { apiClient } from './api';

export interface TeachingLoad {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  weekly_hours: number;
  academic_year_id: number;
  teacher_name?: string;
  subject_name: string;
  class_name: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherWorkload {
  loads: TeachingLoad[];
  total_hours: number;
  max_hours: number;
  remaining_hours: number;
  is_overloaded: boolean;
}

export interface CreateTeachingLoadData {
  teacher_id: number;
  subject_id: number;
  class_id: number;
  weekly_hours: number;
  academic_year_id: number;
}

export interface UpdateTeachingLoadData {
  weekly_hours: number;
}

export interface GradeSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  weekly_hours: number;
  is_teaching_activity: boolean;
  is_extracurricular: boolean;
  is_club: boolean;
  is_split_groups: boolean;
  group_count: number;
  calculated_hours: number;
  formatted_hours: string;
  activity_types: string[];
  teacher_id?: number;
  teacher_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

class WorkloadService {
  private baseUrl = '/teaching-loads';

  async getTeachingLoads(): Promise<{ success: boolean; data: TeachingLoad[] }> {
    try {
      const response = await apiClient.get<TeachingLoad[]>(this.baseUrl);
      return response as { success: boolean; data: TeachingLoad[] };
    } catch (error) {
      console.error('❌ WorkloadService.getTeachingLoads failed:', error);
      throw error;
    }
  }

  async getTeacherWorkload(teacherId: number): Promise<{ success: boolean; data: TeacherWorkload }> {
    try {
      const response = await apiClient.get<TeacherWorkload>(`${this.baseUrl}/teacher/${teacherId}`);
      return response as { success: boolean; data: TeacherWorkload };
    } catch (error) {
      console.error('❌ WorkloadService.getTeacherWorkload failed:', error);
      throw error;
    }
  }

  async createTeachingLoad(data: CreateTeachingLoadData): Promise<{ success: boolean; message: string; data: { id: number } }> {
    try {
      const response = await apiClient.post<{ id: number }>(this.baseUrl, data);
      return response as { success: boolean; message: string; data: { id: number } };
    } catch (error) {
      console.error('❌ WorkloadService.createTeachingLoad failed:', error);
      throw error;
    }
  }

  async updateTeachingLoad(id: number, data: UpdateTeachingLoadData): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.put<void>(`${this.baseUrl}/${id}`, data);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ WorkloadService.updateTeachingLoad failed:', error);
      throw error;
    }
  }

  async deleteTeachingLoad(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<void>(`${this.baseUrl}/${id}`);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ WorkloadService.deleteTeachingLoad failed:', error);
      throw error;
    }
  }

  async getWorkloadStatistics(): Promise<{
    success: boolean;
    data: {
      total_teachers: number;
      overloaded_teachers: number;
      total_hours_assigned: number;
      average_load_per_teacher: number;
    }
  }> {
    try {
      const response = await apiClient.get<{
        total_teachers: number;
        overloaded_teachers: number;
        total_hours_assigned: number;
        average_load_per_teacher: number;
      }>(`${this.baseUrl}/statistics`);
      return response as {
        success: boolean;
        data: {
          total_teachers: number;
          overloaded_teachers: number;
          total_hours_assigned: number;
          average_load_per_teacher: number;
        }
      };
    } catch (error) {
      console.error('❌ WorkloadService.getWorkloadStatistics failed:', error);
      // Return mock data if API not available
      return {
        success: true,
        data: {
          total_teachers: 0,
          overloaded_teachers: 0,
          total_hours_assigned: 0,
          average_load_per_teacher: 0
        }
      };
    }
  }

  /**
   * Get grade subjects with weekly hours
   */
  async getGradeSubjects(gradeId: number): Promise<{ success: boolean; data: GradeSubject[] }> {
    try {
      const response = await apiClient.get<GradeSubject[]>(`/grades/${gradeId}/subjects`);
      return response as { success: boolean; data: GradeSubject[] };
    } catch (error) {
      console.error('❌ WorkloadService.getGradeSubjects failed:', error);
      return {
        success: false,
        data: []
      };
    }
  }
}

export const workloadService = new WorkloadService();