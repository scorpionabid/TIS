import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  grade_levels: number[];
  weekly_hours: number;
  category: 'core' | 'science' | 'humanities' | 'language' | 'arts' | 'physical' | 'technical' | 'elective';
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SubjectsByCategory {
  [key: string]: Subject[];
}

export interface CreateSubjectData {
  name: string;
  code: string;
  description?: string;
  grade_levels: number[];
  weekly_hours: number;
  category: Subject['category'];
  metadata?: any;
}

export interface UpdateSubjectData extends Partial<CreateSubjectData> {
  is_active?: boolean;
}

class SubjectService {
  private baseUrl = '/subjects';

  /**
   * Get all active subjects
   */
  getAll = async (params?: { category?: string; grade?: number }): Promise<Subject[]> => {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = queryString ? `/subjects?${queryString}` : '/subjects';
    const response = await apiClient.get<Subject[]>(url);
    return response.data;
  }

  /**
   * Get subjects grouped by category
   */
  getByCategory = async (): Promise<SubjectsByCategory> => {
    const response = await apiClient.get<SubjectsByCategory>('/subjects/by-category');
    return response.data;
  }

  /**
   * Get subjects for a specific grade
   */
  getForGrade = async (grade: number): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>(`/subjects/for-grade/${grade}`);
    return response.data;
  }

  /**
   * Get a single subject by ID
   */
  getById = async (id: number): Promise<Subject> => {
    const response = await apiClient.get<Subject>(`/subjects/${id}`);
    return response.data;
  }

  /**
   * Create a new subject
   */
  create = async (data: CreateSubjectData): Promise<Subject> => {
    console.log('🔥 SubjectService.create called', data);
    
    try {
      const response = await apiClient.post<Subject>('/subjects', data);
      console.log('✅ SubjectService.create success', response);
      return response.data;
    } catch (error) {
      console.error('❌ SubjectService.create error', error);
      throw error;
    }
  }

  /**
   * Update an existing subject
   */
  async update(id: number, data: UpdateSubjectData): Promise<Subject> {
    console.log(`🔥 SubjectService.update called for ID ${id}`, data);
    
    try {
      const response = await apiClient.put<Subject>(`${this.baseUrl}/${id}`, data);
      console.log('✅ SubjectService.update success', response);
      return response.data;
    } catch (error) {
      console.error('❌ SubjectService.update error', error);
      throw error;
    }
  }

  /**
   * Delete a subject
   */
  async delete(id: number): Promise<void> {
    console.log(`🔥 SubjectService.delete called for ID ${id}`);
    
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);
      console.log('✅ SubjectService.delete success');
    } catch (error) {
      console.error('❌ SubjectService.delete error', error);
      throw error;
    }
  }

  /**
   * Get subjects with detailed data wrapper
   */
  getSubjects = async (): Promise<ApiResponse<Subject[]>> => {
    console.log('🔍 SubjectService.getSubjects called');
    
    try {
      // Use direct URL instead of this.baseUrl to avoid binding issues  
      const response = await apiClient.get<Subject[]>('/subjects');
      const subjects = response.data || [];
      console.log('✅ SubjectService.getSubjects success', subjects);
      
      return {
        data: subjects,
        message: 'Subjects retrieved successfully'
      };
    } catch (error) {
      console.error('❌ SubjectService: Fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get subjects statistics
   */
  async getStatistics(): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/statistics`);
    return response.data;
  }

  /**
   * Bulk create subjects
   */
  async bulkCreate(subjects: CreateSubjectData[]): Promise<Subject[]> {
    const response = await apiClient.post<Subject[]>(`${this.baseUrl}/bulk-create`, { subjects });
    return response.data;
  }

  /**
   * Bulk update subjects
   */
  async bulkUpdate(updates: { id: number; data: UpdateSubjectData }[]): Promise<Subject[]> {
    const response = await apiClient.put<Subject[]>(`${this.baseUrl}/bulk-update`, { updates });
    return response.data;
  }

  /**
   * Bulk delete subjects
   */
  async bulkDelete(ids: number[]): Promise<void> {
    await apiClient.post(`${this.baseUrl}/bulk-delete`, { ids });
  }

  /**
   * Get subject options for select/multiselect components
   */
  async getSubjectOptions(): Promise<Array<{ label: string; value: string }>> {
    const subjects = await this.getAll();
    return subjects.map(subject => ({
      label: subject.name,
      value: subject.id.toString()
    }));
  }
}

// Query keys for react-query
export const subjectKeys = {
  all: ['subjects'] as const,
  lists: () => [...subjectKeys.all, 'list'] as const,
  list: (filters: string) => [...subjectKeys.lists(), { filters }] as const,
  details: () => [...subjectKeys.all, 'detail'] as const,
  detail: (id: number) => [...subjectKeys.details(), id] as const,
  statistics: () => [...subjectKeys.all, 'statistics'] as const,
  options: () => [...subjectKeys.all, 'options'] as const,
};

// Export a singleton instance
export const subjectService = new SubjectService();
export default subjectService;