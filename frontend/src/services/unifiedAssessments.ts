import { apiClient } from './api';

// Re-export types from existing service for backward compatibility
export type {
  KSQResult,
  BSQResult,
  AssessmentAnalytics,
  CreateKSQData,
  CreateBSQData,
  AssessmentFilters,
  AssessmentRankings
} from './assessments';

// Import existing AssessmentEntry types
export interface AssessmentEntry {
  id: number;
  assessment_type_id: number;
  student_id: number;
  institution_id: number;
  created_by: number;
  assessment_date: string;
  score: number;
  grade_level?: string;
  subject?: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  assessment_type?: {
    id: number;
    name: string;
    max_score: number;
    description?: string;
  };
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    student_number?: string;
  };
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssessmentType {
  id: number;
  name: string;
  description?: string;
  max_score: number;
  is_active: boolean;
  institution_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Unified assessment dashboard data
export interface UnifiedDashboardData {
  statistics: {
    total_assessments: number;
    completed_assessments: number;
    active_assessments: number;
    ksq_assessments: number;
    bsq_assessments: number;
    regular_assessments: number;
  };
  recent_assessments: Array<{
    type: 'KSQ' | 'BSQ' | 'REGULAR';
    id: number;
    title: string;
    date: string;
    score: number;
    status: string;
  }>;
  performance_trends: {
    monthly_performance: any[];
    subject_performance: any[];
    grade_level_performance: any[];
  };
  assessment_types: AssessmentType[];
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    count?: number;
  }>;
}

// Unified assessment overview data
export interface UnifiedOverviewData {
  ksq_results: {
    data: any[];
    current_page: number;
    per_page: number;
    total: number;
  };
  bsq_results: {
    data: any[];
    current_page: number;
    per_page: number;
    total: number;
  };
  recent_entries: {
    data: AssessmentEntry[];
    current_page: number;
    per_page: number;
    total: number;
  };
  summary_stats: {
    total_students_assessed: number;
    average_performance: number;
    assessment_completion_rate: number;
  };
}

// Gradebook data interface
export interface GradebookData {
  entries: AssessmentEntry[];
  assessment_types: AssessmentType[];
  students: Array<{
    id: number;
    first_name: string;
    last_name: string;
    student_number?: string;
    current_class?: {
      id: number;
      name: string;
    };
  }>;
  statistics: {
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
  };
}

// Analytics data interface
export interface UnifiedAnalyticsData {
  analytics: any; // From PerformanceAnalyticsService
  charts_data: {
    performance_over_time: any[];
    assessment_type_distribution: any[];
    grade_level_performance: any[];
  };
  performance_indicators: {
    overall_grade: string;
    improvement_rate: number;
    areas_of_strength: string[];
    areas_for_improvement: string[];
  };
}

export interface UnifiedAssessmentFilters {
  institution_id?: number;
  academic_year_id?: number;
  assessment_type_id?: number;
  class_id?: number;
  grade_level?: string;
  subject?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  include_trends?: boolean;
  include_comparisons?: boolean;
}

class UnifiedAssessmentService {
  private baseURL = '/unified-assessments';

  /**
   * Get unified dashboard data for SchoolAssessments.tsx
   */
  async getDashboardData(filters: UnifiedAssessmentFilters = {}): Promise<{
    success: boolean;
    data: UnifiedDashboardData;
  }> {
    console.log('📊 Getting unified dashboard data with filters:', JSON.stringify(filters, null, 2));
    
    const cleanFilters = this.cleanFilters(filters);
    const params = new URLSearchParams();
    
    Object.entries(cleanFilters).forEach(([key, value]) => {
      params.append(key, value.toString());
    });

    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/dashboard?${queryString}` : `${this.baseURL}/dashboard`;
    
    console.log('📡 Dashboard API URL:', url);
    
    try {
      const response = await apiClient.get(url);
      console.log('✅ Dashboard data received');
      return response.data;
    } catch (error) {
      console.error('❌ Dashboard data error:', error);
      throw this.handleError(error, 'Dashboard məlumatları yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get unified assessment overview data for Assessments tab
   */
  async getAssessmentOverview(filters: UnifiedAssessmentFilters = {}): Promise<{
    success: boolean;
    data: UnifiedOverviewData;
  }> {
    console.log('📋 Getting assessment overview with filters:', JSON.stringify(filters, null, 2));
    
    const cleanFilters = this.cleanFilters(filters);
    const params = new URLSearchParams();
    
    Object.entries(cleanFilters).forEach(([key, value]) => {
      params.append(key, value.toString());
    });

    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/overview?${queryString}` : `${this.baseURL}/overview`;
    
    console.log('📡 Overview API URL:', url);
    
    try {
      const response = await apiClient.get(url);
      console.log('✅ Assessment overview received');
      return response.data;
    } catch (error) {
      console.error('❌ Assessment overview error:', error);
      throw this.handleError(error, 'Qiymətləndirmə məlumatları yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get gradebook data with filtering
   */
  async getGradebookData(filters: UnifiedAssessmentFilters = {}): Promise<{
    success: boolean;
    data: GradebookData;
  }> {
    console.log('📚 Getting gradebook data with filters:', JSON.stringify(filters, null, 2));
    
    const cleanFilters = this.cleanFilters(filters);
    const params = new URLSearchParams();
    
    Object.entries(cleanFilters).forEach(([key, value]) => {
      params.append(key, value.toString());
    });

    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/gradebook?${queryString}` : `${this.baseURL}/gradebook`;
    
    console.log('📡 Gradebook API URL:', url);
    
    try {
      const response = await apiClient.get(url);
      console.log('✅ Gradebook data received');
      return response.data;
    } catch (error) {
      console.error('❌ Gradebook data error:', error);
      throw this.handleError(error, 'Gradebook məlumatları yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get comprehensive analytics data for reports
   */
  async getAnalyticsData(filters: UnifiedAssessmentFilters = {}): Promise<{
    success: boolean;
    data: UnifiedAnalyticsData;
  }> {
    console.log('📈 Getting analytics data with filters:', JSON.stringify(filters, null, 2));
    
    const cleanFilters = this.cleanFilters(filters);
    const params = new URLSearchParams();
    
    Object.entries(cleanFilters).forEach(([key, value]) => {
      params.append(key, value.toString());
    });

    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}/analytics?${queryString}` : `${this.baseURL}/analytics`;
    
    console.log('📡 Analytics API URL:', url);
    
    try {
      const response = await apiClient.get(url);
      console.log('✅ Analytics data received');
      return response.data;
    } catch (error) {
      console.error('❌ Analytics data error:', error);
      throw this.handleError(error, 'Analitik məlumatlar yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get assessment types for current user's institution
   */
  async getAssessmentTypes(institutionId?: number): Promise<AssessmentType[]> {
    try {
      const params = institutionId ? `?institution_id=${institutionId}` : '';
      const response = await apiClient.get(`/assessment-types${params}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Assessment types error:', error);
      throw this.handleError(error, 'Qiymətləndirmə növləri yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Create new assessment entry
   */
  async createAssessmentEntry(data: {
    assessment_type_id: number;
    student_id: number;
    score: number;
    assessment_date: string;
    notes?: string;
    grade_level?: string;
    subject?: string;
  }): Promise<{
    success: boolean;
    data: AssessmentEntry;
    message: string;
  }> {
    try {
      const response = await apiClient.post('/assessment-entries', data);
      return response.data;
    } catch (error) {
      console.error('❌ Create assessment entry error:', error);
      throw this.handleError(error, 'Qiymətləndirmə əlavə edilərkən xəta baş verdi');
    }
  }

  /**
   * Update existing assessment entry
   */
  async updateAssessmentEntry(id: number, data: {
    score: number;
    notes?: string;
    grade_level?: string;
    subject?: string;
  }): Promise<{
    success: boolean;
    data: AssessmentEntry;
    message: string;
  }> {
    try {
      const response = await apiClient.put(`/assessment-entries/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Update assessment entry error:', error);
      throw this.handleError(error, 'Qiymətləndirmə yenilənərkən xəta baş verdi');
    }
  }

  /**
   * Submit assessment entry for approval
   */
  async submitAssessmentEntry(id: number): Promise<{
    success: boolean;
    data: AssessmentEntry;
    message: string;
  }> {
    try {
      const response = await apiClient.post(`/assessment-entries/${id}/submit`);
      return response.data;
    } catch (error) {
      console.error('❌ Submit assessment entry error:', error);
      throw this.handleError(error, 'Qiymətləndirmə təqdim edilərkən xəta baş verdi');
    }
  }

  /**
   * Approve assessment entry
   */
  async approveAssessmentEntry(id: number, notes?: string): Promise<{
    success: boolean;
    data: AssessmentEntry;
    message: string;
  }> {
    try {
      const response = await apiClient.post(`/assessment-entries/${id}/approve`, { notes });
      return response.data;
    } catch (error) {
      console.error('❌ Approve assessment entry error:', error);
      throw this.handleError(error, 'Qiymətləndirmə təsdiqləərkən xəta baş verdi');
    }
  }

  /**
   * Reject assessment entry
   */
  async rejectAssessmentEntry(id: number, notes: string): Promise<{
    success: boolean;
    data: AssessmentEntry;
    message: string;
  }> {
    try {
      const response = await apiClient.post(`/assessment-entries/${id}/reject`, { notes });
      return response.data;
    } catch (error) {
      console.error('❌ Reject assessment entry error:', error);
      throw this.handleError(error, 'Qiymətləndirmə rədd edilərkən xəta baş verdi');
    }
  }

  /**
   * Delete assessment entry
   */
  async deleteAssessmentEntry(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.delete(`/assessment-entries/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Delete assessment entry error:', error);
      throw this.handleError(error, 'Qiymətləndirmə silinərkən xəta baş verdi');
    }
  }

  /**
   * Create bulk assessment entries
   */
  async createBulkAssessmentEntries(data: {
    assessment_type_id: number;
    institution_id: number;
    assessment_date: string;
    grade_level?: string;
    subject?: string;
    entries: Array<{
      student_id: number;
      score: number;
      notes?: string;
    }>;
  }): Promise<{
    success: boolean;
    data: {
      created_count: number;
      error_count: number;
      entries: AssessmentEntry[];
    };
    warnings?: string[];
    message: string;
  }> {
    try {
      const response = await apiClient.post('/assessment-entries', data);
      return response.data;
    } catch (error) {
      console.error('❌ Bulk create assessment entries error:', error);
      throw this.handleError(error, 'Qiymətləndirmələr əlavə edilərkən xəta baş verdi');
    }
  }

  /**
   * Helper method to clean filters
   */
  private cleanFilters(filters: UnifiedAssessmentFilters): Record<string, any> {
    const cleanFilters: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      // Skip undefined, null, empty string values
      if (value === undefined || value === null || value === '') {
        return;
      }
      
      // Special handling for institution_id - absolutely no empty values
      if (key === 'institution_id') {
        if (value === '' || value === 'all' || value === 0 || !value) {
          return;
        }
      }
      
      cleanFilters[key] = value;
    });

    return cleanFilters;
  }

  /**
   * Helper method to handle API errors
   */
  private handleError(error: any, defaultMessage: string): Error {
    const message = error?.response?.data?.message || error?.message || defaultMessage;
    return new Error(message);
  }

  /**
   * Helper method to format assessment score with color
   */
  getScoreColor(percentage: number): string {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Helper method to format performance level
   */
  getPerformanceLabel(level: string): string {
    const labels = {
      excellent: 'Əla',
      good: 'Yaxşı', 
      satisfactory: 'Qənaətbəxş',
      needs_improvement: 'Təkmilləşdirmə tələb olunur',
      unsatisfactory: 'Qeyri-qənaətbəxş'
    };
    return labels[level as keyof typeof labels] || level;
  }

  /**
   * Helper method to format status
   */
  getStatusLabel(status: string): string {
    const labels = {
      draft: 'Layihə',
      submitted: 'Təqdim edilmiş',
      approved: 'Təsdiqlənmiş',
      rejected: 'Rədd edilmiş'
    };
    return labels[status as keyof typeof labels] || status;
  }

  /**
   * Helper method to get status color
   */
  getStatusColor(status: string): string {
    const colors = {
      draft: 'text-gray-600 bg-gray-100',
      submitted: 'text-blue-600 bg-blue-100',
      approved: 'text-green-600 bg-green-100',
      rejected: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  }

  /**
   * Export assessment data
   */
  async exportAssessmentData(params: {
    institution_id?: number;
    assessment_type_id?: number;
    grade_level?: string;
    class_id?: number;
    date_from?: string;
    date_to?: string;
    format: 'xlsx' | 'csv' | 'pdf';
  }): Promise<Blob> {
    try {
      const response = await apiClient.get('/assessment-entries/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('❌ Export assessment data error:', error);
      throw this.handleError(error, 'Məlumatlar ixrac edilərkən xəta baş verdi');
    }
  }

  /**
   * Download assessment template
   */
  async downloadTemplate(): Promise<Blob> {
    try {
      const response = await apiClient.get('/assessment-entries/template', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('❌ Download template error:', error);
      throw this.handleError(error, 'Template yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Import assessment data
   */
  async importAssessmentData(file: File): Promise<{
    success: boolean;
    data: {
      created_count: number;
      error_count: number;
      entries: AssessmentEntry[];
    };
    errors?: string[];
    message: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/assessment-entries/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Import assessment data error:', error);
      throw this.handleError(error, 'Məlumatlar idxal edilərkən xəta baş verdi');
    }
  }
}

export const unifiedAssessmentService = new UnifiedAssessmentService();
export default unifiedAssessmentService;