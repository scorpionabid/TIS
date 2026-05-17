import { apiClient } from './api';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type AvailabilityType = 'available' | 'preferred' | 'unavailable' | 'restricted' | 'meeting' | 'training' | 'preparation' | 'examination' | 'consultation';

export type SlotStatus = 'available' | 'preferred' | 'unavailable' | 'none';

export interface TeacherAvailability {
  id: number;
  teacher_id: number;
  academic_year_id?: number | null;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm:ss or HH:mm
  end_time: string; // HH:mm:ss or HH:mm
  availability_type: AvailabilityType;
  recurrence_type?: string;
  effective_date?: string;
  end_date?: string | null;
  priority?: number;
  is_flexible?: boolean;
  is_mandatory?: boolean;
  reason?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string;
  metadata?: any;
}

export interface CreateTeacherAvailabilityData {
  teacher_id: number;
  academic_year_id: number;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  availability_type: AvailabilityType;
  recurrence_type?: string;
  priority?: number;
  is_flexible?: boolean;
  is_mandatory?: boolean;
  reason?: string;
  description?: string;
  location?: string;
  metadata?: any;
}

export interface UpdateTeacherAvailabilityData extends Partial<CreateTeacherAvailabilityData> {
  status?: string;
}

class TeacherAvailabilityService {
  private baseUrl = '/teacher-availabilities';

  async list(params?: {
    teacher_id?: number;
    academic_year_id?: number;
    day_of_week?: DayOfWeek;
  }): Promise<{ success: boolean; data: TeacherAvailability[] }> {
    const response = await apiClient.get<TeacherAvailability[]>(this.baseUrl, params);
    return response as { success: boolean; data: TeacherAvailability[] };
  }

  async create(data: CreateTeacherAvailabilityData): Promise<{ success: boolean; message: string; data: TeacherAvailability }> {
    const response = await apiClient.post<TeacherAvailability>(this.baseUrl, data);
    return response as { success: boolean; message: string; data: TeacherAvailability };
  }

  async update(id: number, data: UpdateTeacherAvailabilityData): Promise<{ success: boolean; message: string; data: TeacherAvailability }> {
    const response = await apiClient.put<TeacherAvailability>(`${this.baseUrl}/${id}`, data);
    return response as { success: boolean; message: string; data: TeacherAvailability };
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<void>(`${this.baseUrl}/${id}`);
    return response as { success: boolean; message: string };
  }
}

export const teacherAvailabilityService = new TeacherAvailabilityService();
