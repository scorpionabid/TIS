import { BaseService, BaseEntity } from './BaseService';
import { apiClient } from './api';
import { AcademicYear } from './academicYears';

export interface CalendarEntry {
  date: string;
  name: string;
  type: 'holiday' | 'vacation' | 'mourning' | 'non_teaching';
  description?: string;
}

export interface AcademicCalendar extends BaseEntity {
  academic_year_id: number;
  institution_id: number;
  name: string;
  calendar_type: 'school' | 'exam' | 'holiday' | 'event' | 'training';
  start_date: string;
  end_date: string;
  holidays: CalendarEntry[];
  special_events: CalendarEntry[];
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'archived';
  is_default: boolean;
  academic_year?: AcademicYear;
}

class AcademicCalendarService extends BaseService<AcademicCalendar> {
  constructor() {
    super('/academic-calendars');
  }

  /**
   * Get calendar by institution and academic year
   */
  async getByAcademicYear(academicYearId: number, institutionId: number = 1): Promise<AcademicCalendar | null> {
    const response = await this.getAll({ 
      academic_year_id: academicYearId as any, 
      institution_id: institutionId as any 
    } as any);
    
    return response.data.length > 0 ? response.data[0] : null;
  }

  /**
   * Toggle date status (Add/Remove holiday/event)
   */
  async toggleDate(
    calendarId: number, 
    date: string, 
    isSet: boolean, 
    type: string = 'holiday', 
    name?: string
  ): Promise<AcademicCalendar> {
    const response = await apiClient.post<AcademicCalendar>(
      `${this.baseEndpoint}/${calendarId}/toggle-date`, 
      { date, is_set: isSet, type, name }
    );
    
    this.invalidateCache(['list', 'detail']);
    return response.data;
  }
}

export const academicCalendarService = new AcademicCalendarService();
export default academicCalendarService;
