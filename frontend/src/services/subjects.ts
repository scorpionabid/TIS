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
  async getAll(params?: { category?: string; grade?: number }): Promise<Subject[]> {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    const response = await apiClient.get<Subject[]>(url);
    return response.data;
  }

  /**
   * Get subjects grouped by category
   */
  async getByCategory(): Promise<SubjectsByCategory> {
    const response = await apiClient.get<SubjectsByCategory>(`${this.baseUrl}/by-category`);
    return response.data;
  }

  /**
   * Get subjects for a specific grade
   */
  async getForGrade(grade: number): Promise<Subject[]> {
    const response = await apiClient.get<Subject[]>(`${this.baseUrl}/for-grade/${grade}`);
    return response.data;
  }

  /**
   * Get a single subject by ID
   */
  async getById(id: number): Promise<Subject> {
    const response = await apiClient.get<Subject>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Create a new subject
   */
  async create(data: CreateSubjectData): Promise<Subject> {
    console.log('🔥 SubjectService.create called', data);
    
    try {
      const response = await apiClient.post<Subject>(this.baseUrl, data);
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
  async getSubjects(): Promise<ApiResponse<Subject[]>> {
    console.log('🔍 SubjectService.getSubjects called');
    
    try {
      const subjects = await this.getAll();
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
}

// Query keys for react-query
export const subjectKeys = {
  all: ['subjects'] as const,
  lists: () => [...subjectKeys.all, 'list'] as const,
  list: (filters: string) => [...subjectKeys.lists(), { filters }] as const,
  details: () => [...subjectKeys.all, 'detail'] as const,
  detail: (id: number) => [...subjectKeys.details(), id] as const,
  statistics: () => [...subjectKeys.all, 'statistics'] as const,
};

// Export a singleton instance
export const subjectService = new SubjectService();
export default subjectService;