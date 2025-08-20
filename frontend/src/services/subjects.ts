import { BaseService } from './BaseService';

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

class SubjectService extends BaseService {
  constructor() {
    super('subjects');
  }

  /**
   * Get all active subjects
   */
  async getAll(params?: { category?: string; grade?: number }): Promise<Subject[]> {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    return this.apiClient.get(url);
  }

  /**
   * Get subjects grouped by category
   */
  async getByCategory(): Promise<SubjectsByCategory> {
    return this.apiClient.get(`${this.baseUrl}/categories`);
  }

  /**
   * Get subjects for a specific grade
   */
  async getForGrade(grade: number): Promise<Subject[]> {
    return this.apiClient.get(`${this.baseUrl}/grade/${grade}`);
  }

  /**
   * Get a specific subject
   */
  async getById(id: number): Promise<Subject> {
    return this.apiClient.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new subject (SuperAdmin only)
   */
  async create(data: CreateSubjectData): Promise<Subject> {
    return this.apiClient.post(this.baseUrl, data);
  }

  /**
   * Update a subject (SuperAdmin only)
   */
  async update(id: number, data: UpdateSubjectData): Promise<Subject> {
    return this.apiClient.put(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete a subject (SuperAdmin only)
   */
  async delete(id: number): Promise<void> {
    return this.apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get subject options for forms
   */
  async getSubjectOptions(): Promise<Array<{ label: string; value: string; category: string }>> {
    const subjects = await this.getAll();
    return subjects.map(subject => ({
      label: `${subject.name} (${subject.code})`,
      value: subject.id.toString(),
      category: subject.category
    }));
  }

  /**
   * Get grade level options
   */
  getGradeLevelOptions(): Array<{ label: string; value: number }> {
    return Array.from({ length: 11 }, (_, i) => ({
      label: `${i + 1}. sinif`,
      value: i + 1
    }));
  }

  /**
   * Get category options
   */
  getCategoryOptions(): Array<{ label: string; value: Subject['category'] }> {
    return [
      { label: 'Əsas fənlər', value: 'core' },
      { label: 'Elm fənləri', value: 'science' },
      { label: 'Humanitar fənlər', value: 'humanities' },
      { label: 'Dil fənləri', value: 'language' },
      { label: 'İncəsənət', value: 'arts' },
      { label: 'Bədən tərbiyəsi', value: 'physical' },
      { label: 'Texniki fənlər', value: 'technical' },
      { label: 'Seçmə fənlər', value: 'elective' }
    ];
  }
}

export const subjectService = new SubjectService();
export const subjectKeys = {
  all: ['subjects'] as const,
  lists: () => [...subjectKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...subjectKeys.lists(), { filters }] as const,
  details: () => [...subjectKeys.all, 'detail'] as const,
  detail: (id: number) => [...subjectKeys.details(), id] as const,
  categories: () => [...subjectKeys.all, 'categories'] as const,
  grade: (grade: number) => [...subjectKeys.all, 'grade', grade] as const,
  options: () => [...subjectKeys.all, 'options'] as const,
};