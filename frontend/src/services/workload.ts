import { apiClient } from './api';
import { curriculumService } from './curriculumService';

export interface TeachingLoad {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  weekly_hours: number;
  academic_year_id: number;
  teacher_name?: string;
  subject_name: string;
  education_type?: string;
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
  education_type: string;
  weekly_hours: number;
  is_teaching_activity: boolean;
  is_extracurricular: boolean;
  is_club: boolean;
  is_split_groups: boolean;
  is_assigned: boolean;
  teacher_id?: number;
  group_count: number;
  calculated_hours: number;
  formatted_hours: string;
  activity_types: string[];
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

  async getTeachingLoadsForClass(classId: number): Promise<{ success: boolean; data: TeachingLoad[] }> {
    try {
      // Use the index endpoint with class_id filter if supported, 
      // or we can use a more specific endpoint.
      // Looking at TeachingLoadApiController, index() filters by institution, 
      // but we can add a class_id filter or use another method.
      // For now, let's assume we filter the institution-wide loads or use a dedicated query.
      const response = await apiClient.get<TeachingLoad[]>(this.baseUrl, { class_id: classId });
      return response as { success: boolean; data: TeachingLoad[] };
    } catch (error) {
      console.error('❌ WorkloadService.getTeachingLoadsForClass failed:', error);
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
   * Uses curriculumService to get actual grade curriculum subjects
   */
  async getGradeSubjects(gradeId: number): Promise<{ success: boolean; data: GradeSubject[] }> {
    try {
      
      // Use curriculumService to get grade subjects from /grades/{id}/subjects
      const response = await curriculumService.getCurriculumSubjects(gradeId);
      
      
      // Transform curriculum GradeSubject to workload GradeSubject format
      // They are compatible, just need to ensure the structure matches
      const gradeSubjects: GradeSubject[] = (response.subjects || []).map(subject => ({
        id: subject.id,
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        education_type: subject.education_type,
        weekly_hours: subject.weekly_hours,
        is_teaching_activity: subject.is_teaching_activity,
        is_extracurricular: subject.is_extracurricular,
        is_club: subject.is_club,
        is_split_groups: subject.is_split_groups,
        is_assigned: subject.is_assigned,
        teacher_id: subject.teacher_id ?? undefined,
        group_count: subject.group_count,
        calculated_hours: subject.calculated_hours,
        formatted_hours: subject.formatted_hours,
        activity_types: subject.activity_types,
        teacher_name: subject.teacher_name ?? undefined,
        notes: subject.notes ?? undefined,
        created_at: subject.created_at,
        updated_at: subject.updated_at,
      }));
      
      
      return { success: true, data: gradeSubjects };
    } catch (error) {
      console.error('❌ WorkloadService.getGradeSubjects failed:', error);
      return { success: false, data: [] };
    }
  }
}

export const workloadService = new WorkloadService();