import { BaseService } from './BaseService';

export interface Schedule {
  id: number;
  name: string;
  type: 'weekly' | 'daily' | 'custom';
  status: 'draft' | 'active' | 'inactive' | 'pending_approval';
  institution_id: number;
  academic_year_id: number;
  start_date: string;
  end_date: string;
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  metadata?: Record<string, any>;
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  approver?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ScheduleSlot {
  id: number;
  schedule_id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  room_id?: number;
  day_of_week: number; // 1-7 (Monday to Sunday)
  start_time: string;
  end_time: string;
  duration: number; // in minutes
  class?: {
    id: number;
    name: string;
  };
  subject?: {
    id: number;
    name: string;
  };
  teacher?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  room?: {
    id: number;
    name: string;
  };
}

export interface CreateScheduleData {
  name: string;
  type: 'weekly' | 'daily' | 'custom';
  institution_id?: number;
  academic_year_id: number;
  start_date: string;
  end_date: string;
  metadata?: Record<string, any>;
}

export interface UpdateScheduleData {
  name?: string;
  type?: 'weekly' | 'daily' | 'custom';
  start_date?: string;
  end_date?: string;
  status?: 'draft' | 'active' | 'inactive' | 'pending_approval';
  metadata?: Record<string, any>;
}

export interface ScheduleFilters {
  status?: string;
  type?: string;
  institution_id?: number;
  academic_year_id?: number;
}

export interface ScheduleStatistics {
  total_schedules: number;
  active_schedules: number;
  pending_approval: number;
  total_slots: number;
  teachers_with_schedules: number;
  classes_with_schedules: number;
}

class ScheduleService extends BaseService {
  constructor() {
    super('/schedules');
  }

  async getSchedules(filters?: ScheduleFilters): Promise<{ success: boolean; data: Schedule[] }> {
    console.log('🔍 ScheduleService.getSchedules called with filters:', filters);
    try {
      const response = await this.get<Schedule[]>(this.baseUrl, filters);
      console.log('✅ ScheduleService.getSchedules successful:', response);
      return response as { success: boolean; data: Schedule[] };
    } catch (error) {
      console.error('❌ ScheduleService.getSchedules failed:', error);
      throw error;
    }
  }

  async getSchedule(id: number): Promise<{ success: boolean; data: Schedule }> {
    console.log('🔍 ScheduleService.getSchedule called for ID:', id);
    try {
      const response = await this.get<Schedule>(`${this.baseUrl}/${id}`);
      console.log('✅ ScheduleService.getSchedule successful:', response);
      return response as { success: boolean; data: Schedule };
    } catch (error) {
      console.error('❌ ScheduleService.getSchedule failed:', error);
      throw error;
    }
  }

  async createSchedule(data: CreateScheduleData): Promise<{ success: boolean; message: string; data: Schedule }> {
    console.log('🔍 ScheduleService.createSchedule called with:', data);
    try {
      const response = await this.post<Schedule>(this.baseUrl, data);
      console.log('✅ ScheduleService.createSchedule successful:', response);
      return response as { success: boolean; message: string; data: Schedule };
    } catch (error) {
      console.error('❌ ScheduleService.createSchedule failed:', error);
      throw error;
    }
  }

  async updateSchedule(id: number, data: UpdateScheduleData): Promise<{ success: boolean; message: string; data: Schedule }> {
    console.log('🔍 ScheduleService.updateSchedule called for ID:', id, 'with data:', data);
    try {
      const response = await this.put<Schedule>(`${this.baseUrl}/${id}`, data);
      console.log('✅ ScheduleService.updateSchedule successful:', response);
      return response as { success: boolean; message: string; data: Schedule };
    } catch (error) {
      console.error('❌ ScheduleService.updateSchedule failed:', error);
      throw error;
    }
  }

  async deleteSchedule(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ScheduleService.deleteSchedule called for ID:', id);
    try {
      const response = await this.delete<void>(`${this.baseUrl}/${id}`);
      console.log('✅ ScheduleService.deleteSchedule successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ScheduleService.deleteSchedule failed:', error);
      throw error;
    }
  }

  async generateSchedule(data: {
    institution_id?: number;
    academic_year_id: number;
    type: 'weekly' | 'daily' | 'custom';
    preferences?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; data: Schedule }> {
    console.log('🔍 ScheduleService.generateSchedule called with:', data);
    try {
      const response = await this.post<Schedule>(`${this.baseUrl}/generate`, data);
      console.log('✅ ScheduleService.generateSchedule successful:', response);
      return response as { success: boolean; message: string; data: Schedule };
    } catch (error) {
      console.error('❌ ScheduleService.generateSchedule failed:', error);
      throw error;
    }
  }

  async validateSchedule(data: {
    schedule_data: any;
    check_conflicts?: boolean;
  }): Promise<{ 
    success: boolean; 
    data: {
      is_valid: boolean;
      conflicts: any[];
      warnings: any[];
      suggestions: any[];
    }
  }> {
    console.log('🔍 ScheduleService.validateSchedule called with:', data);
    try {
      const response = await this.post<{
        is_valid: boolean;
        conflicts: any[];
        warnings: any[];
        suggestions: any[];
      }>(`${this.baseUrl}/validate`, data);
      console.log('✅ ScheduleService.validateSchedule successful:', response);
      return response as { 
        success: boolean; 
        data: {
          is_valid: boolean;
          conflicts: any[];
          warnings: any[];
          suggestions: any[];
        }
      };
    } catch (error) {
      console.error('❌ ScheduleService.validateSchedule failed:', error);
      throw error;
    }
  }

  async approveSchedule(id: number, comments?: string): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ScheduleService.approveSchedule called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/approve`, { comments });
      console.log('✅ ScheduleService.approveSchedule successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ScheduleService.approveSchedule failed:', error);
      throw error;
    }
  }

  async exportSchedule(data: {
    schedule_id?: number;
    format: 'pdf' | 'excel' | 'csv';
    filters?: ScheduleFilters;
  }): Promise<{ success: boolean; data: { download_url: string } }> {
    console.log('🔍 ScheduleService.exportSchedule called with:', data);
    try {
      const response = await this.post<{ download_url: string }>(`${this.baseUrl}/export`, data);
      console.log('✅ ScheduleService.exportSchedule successful:', response);
      return response as { success: boolean; data: { download_url: string } };
    } catch (error) {
      console.error('❌ ScheduleService.exportSchedule failed:', error);
      throw error;
    }
  }

  async getScheduleStatistics(): Promise<{ 
    success: boolean; 
    data: ScheduleStatistics
  }> {
    console.log('🔍 ScheduleService.getScheduleStatistics called');
    try {
      const response = await this.get<ScheduleStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ ScheduleService.getScheduleStatistics successful:', response);
      return response as { 
        success: boolean; 
        data: ScheduleStatistics
      };
    } catch (error) {
      console.error('❌ ScheduleService.getScheduleStatistics failed:', error);
      // Return mock data if API not available
      return {
        success: true,
        data: {
          total_schedules: 0,
          active_schedules: 0,
          pending_approval: 0,
          total_slots: 0,
          teachers_with_schedules: 0,
          classes_with_schedules: 0
        }
      };
    }
  }

  async getWeeklySchedule(params: {
    class_id?: number;
    teacher_id?: number;
    week_start?: string;
  }): Promise<{ 
    success: boolean; 
    data: {
      week_start: string;
      week_end: string;
      slots: ScheduleSlot[];
    }
  }> {
    console.log('🔍 ScheduleService.getWeeklySchedule called with:', params);
    try {
      const response = await this.get<{
        week_start: string;
        week_end: string;
        slots: ScheduleSlot[];
      }>(`${this.baseUrl}/weekly`, params);
      console.log('✅ ScheduleService.getWeeklySchedule successful:', response);
      return response as { 
        success: boolean; 
        data: {
          week_start: string;
          week_end: string;
          slots: ScheduleSlot[];
        }
      };
    } catch (error) {
      console.error('❌ ScheduleService.getWeeklySchedule failed:', error);
      throw error;
    }
  }
}

export const scheduleService = new ScheduleService();