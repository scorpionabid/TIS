import { BaseService, BaseEntity } from './BaseService';

export interface AcademicYear extends BaseEntity {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  metadata?: any[];
}

class AcademicYearService extends BaseService<AcademicYear> {
  constructor() {
    super('/academic-years');
  }

  /**
   * Get active academic year
   */
  async getActive(): Promise<AcademicYear | null> {
    const response = await this.getAll({ per_page: 50 });
    const activeYear = response.data.find(year => year.is_active);
    return activeYear || null;
  }

  /**
   * Get all academic years for dropdown
   */
  async getAllForDropdown(): Promise<AcademicYear[]> {
    const response = await this.getAll({ per_page: 50, sort_by: 'start_date', sort_direction: 'desc' });
    return response.data;
  }

  /**
   * Activate a specific academic year
   */
  async activate(id: number): Promise<AcademicYear> {
    const response = await this.apiClient.post(`${this.endpoint}/${id}/activate`);
    return response.data;
  }

  /**
   * Ensure the base academic year is active and generate future years.
   */
  async generateFutureYears(baseYear: string = '2025-2026', count: number = 5) {
    const response = await this.apiClient.post<{
      success: boolean;
      data: AcademicYear[];
      generated?: string[];
      message?: string;
    }>(`${this.endpoint}/generate`, {
      base_year: baseYear,
      count,
    });

    return response.data;
  }
}

export const academicYearService = new AcademicYearService();
export default academicYearService;
