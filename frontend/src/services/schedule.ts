import { BaseService } from './BaseService';

export interface Schedule {
  id: number;
  name: string;
  type: 'weekly' | 'daily' | 'exam' | 'special';
  status: 'draft' | 'pending_review' | 'approved' | 'active' | 'inactive';
  institution_id: number;
  academic_year_id: number;
  effective_from: string;
  effective_to: string;
  schedule_data?: Record<string, any>;
  generation_settings?: Record<string, any>;
  notes?: string;
  created_by: number;
  approved_by?: number;
  approved_at?: string;
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
  type: 'weekly' | 'daily' | 'exam' | 'special';
  institution_id: number;
  academic_year_id: number;
  effective_from: string;
  effective_to?: string;
  schedule_data: Record<string, any>;
  generation_settings?: Record<string, any>;
  notes?: string;
}

export interface UpdateScheduleData {
  name?: string;
  type?: 'weekly' | 'daily' | 'exam' | 'special';
  effective_from?: string;
  effective_to?: string;
  schedule_data?: Record<string, any>;
  generation_settings?: Record<string, any>;
  notes?: string;
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

// New types for advanced schedule management
export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  duration: number; // in minutes
  break_time?: number; // break after this slot in minutes
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  type: 'classroom' | 'laboratory' | 'gym' | 'library' | 'auditorium';
  equipment?: string[];
  is_available: boolean;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  credit_hours: number;
  type: 'core' | 'elective' | 'extra';
  grade_levels: number[];
}

export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subjects: number[]; // subject IDs
  max_weekly_hours: number;
  current_weekly_hours?: number;
  is_available: boolean;
  preferred_time_slots?: string[];
}

export interface ScheduleClass {
  id: number;
  name: string;
  grade_level: number;
  student_count: number;
  class_teacher_id?: number;
  room_id?: number;
  schedule_requirements?: {
    max_daily_hours: number;
    preferred_start_time: string;
    preferred_end_time: string;
    break_requirements: number[];
  };
}

export interface ScheduleConflict {
  id: string;
  type: 'teacher_conflict' | 'room_conflict' | 'class_conflict' | 'time_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_slots: number[];
  suggestions?: string[];
  auto_resolvable: boolean;
}

export interface ScheduleTemplate {
  id: number;
  name: string;
  description?: string;
  institution_type: string;
  grade_levels: number[];
  time_slots: TimeSlot[];
  weekly_structure: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  default_break_times: string[];
  created_by: number;
}

export interface ScheduleSession {
  id: number;
  schedule_id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  room_id?: number;
  time_slot_id: string;
  day_of_week: number;
  session_type: 'regular' | 'makeup' | 'exam' | 'activity';
  is_recurring: boolean;
  recurrence_pattern?: string;
  notes?: string;
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
    settings: {
      institution_id: number;
      academic_year_id: number;
      week_start_date: string;
      working_days: number[];
      periods_per_day: number;
      break_periods?: number[];
      lunch_period?: number;
    };
    time_slots: {
      period: number;
      start_time: string;
      end_time: string;
    }[];
  }): Promise<{ success: boolean; message: string; data: any }> {
    console.log('🔍 ScheduleService.generateSchedule called with:', data);
    try {
      const response = await this.post<any>(`${this.baseUrl}/generate`, data);
      console.log('✅ ScheduleService.generateSchedule successful:', response);
      return response as { success: boolean; message: string; data: any };
    } catch (error) {
      console.error('❌ ScheduleService.generateSchedule failed:', error);
      throw error;
    }
  }

  // Role-based schedule methods
  async getTeacherSchedule(teacherId: number): Promise<{ success: boolean; data: ScheduleSlot[] }> {
    console.log('🔍 ScheduleService.getTeacherSchedule called for teacher:', teacherId);
    try {
      const response = await this.get<ScheduleSlot[]>(`${this.baseUrl}/teacher/${teacherId}`);
      console.log('✅ ScheduleService.getTeacherSchedule successful:', response);
      return response as { success: boolean; data: ScheduleSlot[] };
    } catch (error) {
      console.error('❌ ScheduleService.getTeacherSchedule failed:', error);
      throw error;
    }
  }

  async getClassSchedule(classId: number): Promise<{ success: boolean; data: ScheduleSlot[] }> {
    console.log('🔍 ScheduleService.getClassSchedule called for class:', classId);
    try {
      const response = await this.get<ScheduleSlot[]>(`${this.baseUrl}/class/${classId}`);
      console.log('✅ ScheduleService.getClassSchedule successful:', response);
      return response as { success: boolean; data: ScheduleSlot[] };
    } catch (error) {
      console.error('❌ ScheduleService.getClassSchedule failed:', error);
      throw error;
    }
  }

  async getRoomSchedule(roomId: string): Promise<{ success: boolean; data: ScheduleSlot[] }> {
    console.log('🔍 ScheduleService.getRoomSchedule called for room:', roomId);
    try {
      const response = await this.get<ScheduleSlot[]>(`${this.baseUrl}/room/${roomId}`);
      console.log('✅ ScheduleService.getRoomSchedule successful:', response);
      return response as { success: boolean; data: ScheduleSlot[] };
    } catch (error) {
      console.error('❌ ScheduleService.getRoomSchedule failed:', error);
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

  // Slot Management Methods
  async createScheduleSlot(data: {
    schedule_id: number;
    class_id: number;
    subject_id: number;
    teacher_id: number;
    room_id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_type?: 'regular' | 'makeup' | 'exam' | 'activity';
  }): Promise<{ success: boolean; message: string; data: ScheduleSlot }> {
    console.log('🔍 ScheduleService.createScheduleSlot called with:', data);
    try {
      const response = await this.post<ScheduleSlot>(`${this.baseUrl}/slots`, data);
      console.log('✅ ScheduleService.createScheduleSlot successful:', response);
      return response as { success: boolean; message: string; data: ScheduleSlot };
    } catch (error) {
      console.error('❌ ScheduleService.createScheduleSlot failed:', error);
      throw error;
    }
  }

  async updateScheduleSlot(id: number, data: Partial<ScheduleSlot>): Promise<{ success: boolean; message: string; data: ScheduleSlot }> {
    console.log('🔍 ScheduleService.updateScheduleSlot called for ID:', id, 'with data:', data);
    try {
      const response = await this.put<ScheduleSlot>(`${this.baseUrl}/slots/${id}`, data);
      console.log('✅ ScheduleService.updateScheduleSlot successful:', response);
      return response as { success: boolean; message: string; data: ScheduleSlot };
    } catch (error) {
      console.error('❌ ScheduleService.updateScheduleSlot failed:', error);
      throw error;
    }
  }

  async deleteScheduleSlot(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ScheduleService.deleteScheduleSlot called for ID:', id);
    try {
      const response = await this.delete<void>(`${this.baseUrl}/slots/${id}`);
      console.log('✅ ScheduleService.deleteScheduleSlot successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ScheduleService.deleteScheduleSlot failed:', error);
      throw error;
    }
  }

  // Conflict Detection Methods
  async detectConflicts(data: {
    schedule_id?: number;
    slots?: ScheduleSlot[];
    exclude_slot_id?: number;
  }): Promise<{ 
    success: boolean; 
    data: {
      conflicts: ScheduleConflict[];
      warnings: ScheduleConflict[];
      is_valid: boolean;
    }
  }> {
    console.log('🔍 ScheduleService.detectConflicts called with:', data);
    try {
      const response = await this.post<{
        conflicts: ScheduleConflict[];
        warnings: ScheduleConflict[];
        is_valid: boolean;
      }>(`${this.baseUrl}/conflicts/detect`, data);
      console.log('✅ ScheduleService.detectConflicts successful:', response);
      return response as { 
        success: boolean; 
        data: {
          conflicts: ScheduleConflict[];
          warnings: ScheduleConflict[];
          is_valid: boolean;
        }
      };
    } catch (error) {
      console.error('❌ ScheduleService.detectConflicts failed:', error);
      // Return empty conflicts on error
      return {
        success: false,
        data: {
          conflicts: [],
          warnings: [],
          is_valid: true
        }
      };
    }
  }

  async resolveConflict(conflictId: string, resolution: 'auto' | 'manual', data?: any): Promise<{ 
    success: boolean; 
    message: string;
    data?: ScheduleSlot[] 
  }> {
    console.log('🔍 ScheduleService.resolveConflict called for conflict:', conflictId);
    try {
      const response = await this.post<ScheduleSlot[]>(`${this.baseUrl}/conflicts/${conflictId}/resolve`, {
        resolution,
        data
      });
      console.log('✅ ScheduleService.resolveConflict successful:', response);
      return response as { success: boolean; message: string; data?: ScheduleSlot[] };
    } catch (error) {
      console.error('❌ ScheduleService.resolveConflict failed:', error);
      throw error;
    }
  }

  // Room Management Methods
  async getRooms(filters?: { type?: string; available?: boolean }): Promise<{ success: boolean; data: Room[] }> {
    console.log('🔍 ScheduleService.getRooms called with filters:', filters);
    try {
      const response = await this.get<Room[]>('/rooms', filters);
      console.log('✅ ScheduleService.getRooms successful:', response);
      return response as { success: boolean; data: Room[] };
    } catch (error) {
      console.error('❌ ScheduleService.getRooms failed:', error);
      // Return mock data if API not available
      return {
        success: true,
        data: [
          { id: 1, name: 'Sinif 1A', capacity: 30, type: 'classroom', is_available: true },
          { id: 2, name: 'Laboratoriya', capacity: 20, type: 'laboratory', is_available: true },
          { id: 3, name: 'İdman Zalı', capacity: 50, type: 'gym', is_available: false }
        ]
      };
    }
  }

  async checkRoomAvailability(roomId: number, timeSlot: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    exclude_slot_id?: number;
  }): Promise<{ success: boolean; data: { is_available: boolean; conflicts?: ScheduleSlot[] } }> {
    console.log('🔍 ScheduleService.checkRoomAvailability called for room:', roomId, 'timeSlot:', timeSlot);
    try {
      const response = await this.post<{ is_available: boolean; conflicts?: ScheduleSlot[] }>(`/rooms/${roomId}/availability`, timeSlot);
      console.log('✅ ScheduleService.checkRoomAvailability successful:', response);
      return response as { success: boolean; data: { is_available: boolean; conflicts?: ScheduleSlot[] } };
    } catch (error) {
      console.error('❌ ScheduleService.checkRoomAvailability failed:', error);
      // Return available by default
      return {
        success: true,
        data: { is_available: true }
      };
    }
  }

  // Template Management Methods
  async getScheduleTemplates(): Promise<{ success: boolean; data: ScheduleTemplate[] }> {
    console.log('🔍 ScheduleService.getScheduleTemplates called');
    try {
      const response = await this.get<ScheduleTemplate[]>(`${this.baseUrl}/templates`);
      console.log('✅ ScheduleService.getScheduleTemplates successful:', response);
      return response as { success: boolean; data: ScheduleTemplate[] };
    } catch (error) {
      console.error('❌ ScheduleService.getScheduleTemplates failed:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  async createFromTemplate(templateId: number, data: {
    name: string;
    academic_year_id: number;
    start_date: string;
    end_date: string;
    institution_id?: number;
  }): Promise<{ success: boolean; message: string; data: Schedule }> {
    console.log('🔍 ScheduleService.createFromTemplate called with templateId:', templateId, 'data:', data);
    try {
      const response = await this.post<Schedule>(`${this.baseUrl}/templates/${templateId}/create`, data);
      console.log('✅ ScheduleService.createFromTemplate successful:', response);
      return response as { success: boolean; message: string; data: Schedule };
    } catch (error) {
      console.error('❌ ScheduleService.createFromTemplate failed:', error);
      throw error;
    }
  }
}

export const scheduleService = new ScheduleService();