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
}

export const academicYearService = new AcademicYearService();
export default academicYearService;