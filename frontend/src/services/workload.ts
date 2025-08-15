import { BaseService } from './BaseService';

export interface TeachingLoad {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  hours_per_week: number;
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
  hours_per_week: number;
  academic_year_id: number;
}

export interface UpdateTeachingLoadData {
  hours_per_week: number;
}

class WorkloadService extends BaseService {
  constructor() {
    super('/teaching-loads');
  }

  async getTeachingLoads(): Promise<{ success: boolean; data: TeachingLoad[] }> {
    console.log('🔍 WorkloadService.getTeachingLoads called');
    try {
      const response = await this.get<TeachingLoad[]>(this.baseUrl);
      console.log('✅ WorkloadService.getTeachingLoads successful:', response);
      return response as { success: boolean; data: TeachingLoad[] };
    } catch (error) {
      console.error('❌ WorkloadService.getTeachingLoads failed:', error);
      throw error;
    }
  }

  async getTeacherWorkload(teacherId: number): Promise<{ success: boolean; data: TeacherWorkload }> {
    console.log('🔍 WorkloadService.getTeacherWorkload called for teacher:', teacherId);
    try {
      const response = await this.get<TeacherWorkload>(`${this.baseUrl}/teacher/${teacherId}`);
      console.log('✅ WorkloadService.getTeacherWorkload successful:', response);
      return response as { success: boolean; data: TeacherWorkload };
    } catch (error) {
      console.error('❌ WorkloadService.getTeacherWorkload failed:', error);
      throw error;
    }
  }

  async createTeachingLoad(data: CreateTeachingLoadData): Promise<{ success: boolean; message: string; data: { id: number } }> {
    console.log('🔍 WorkloadService.createTeachingLoad called with:', data);
    try {
      const response = await this.post<{ id: number }>(this.baseUrl, data);
      console.log('✅ WorkloadService.createTeachingLoad successful:', response);
      return response as { success: boolean; message: string; data: { id: number } };
    } catch (error) {
      console.error('❌ WorkloadService.createTeachingLoad failed:', error);
      throw error;
    }
  }

  async updateTeachingLoad(id: number, data: UpdateTeachingLoadData): Promise<{ success: boolean; message: string }> {
    console.log('🔍 WorkloadService.updateTeachingLoad called for ID:', id, 'with data:', data);
    try {
      const response = await this.put<void>(`${this.baseUrl}/${id}`, data);
      console.log('✅ WorkloadService.updateTeachingLoad successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ WorkloadService.updateTeachingLoad failed:', error);
      throw error;
    }
  }

  async deleteTeachingLoad(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 WorkloadService.deleteTeachingLoad called for ID:', id);
    try {
      const response = await this.delete<void>(`${this.baseUrl}/${id}`);
      console.log('✅ WorkloadService.deleteTeachingLoad successful:', response);
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
    console.log('🔍 WorkloadService.getWorkloadStatistics called');
    try {
      const response = await this.get<{
        total_teachers: number;
        overloaded_teachers: number;
        total_hours_assigned: number;
        average_load_per_teacher: number;
      }>(`${this.baseUrl}/statistics`);
      console.log('✅ WorkloadService.getWorkloadStatistics successful:', response);
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
}

export const workloadService = new WorkloadService();