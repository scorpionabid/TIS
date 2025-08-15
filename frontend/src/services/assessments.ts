import { BaseService } from './baseService';
import { apiClient } from './api';

export interface KSQResult {
  id: number;
  institution_id: number;
  academic_year_id: number;
  assessment_date: string;
  assessment_type: string;
  assessor_id: number;
  total_score: number;
  max_possible_score: number;
  percentage_score: number;
  grade_level?: string;
  subject_id?: number;
  criteria_scores: Record<string, number>;
  detailed_results?: any[];
  strengths?: string[];
  improvement_areas?: string[];
  recommendations?: string[];
  status: 'draft' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  notes?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  previous_assessment_id?: number;
  improvement_percentage?: number;
  performance_level?: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
  improvement_status?: 'significant_improvement' | 'slight_improvement' | 'no_change' | 'slight_decline' | 'significant_decline' | 'no_comparison';
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  academic_year?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  assessor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  created_at: string;
  updated_at: string;
}

export interface BSQResult {
  id: number;
  institution_id: number;
  academic_year_id: number;
  assessment_date: string;
  international_standard: string;
  assessment_body: string;
  assessor_id: number;
  total_score: number;
  max_possible_score: number;
  percentage_score: number;
  international_ranking?: number;
  national_ranking?: number;
  regional_ranking?: number;
  competency_areas: Record<string, number>;
  detailed_scores?: any[];
  international_comparison?: any[];
  certification_level?: string;
  certification_valid_until?: string;
  improvement_plan?: string[];
  action_items?: string[];
  status: 'draft' | 'approved' | 'rejected';
  external_report_url?: string;
  compliance_score?: number;
  accreditation_status?: 'full_accreditation' | 'conditional_accreditation' | 'provisional_accreditation' | 'denied' | 'not_applicable';
  approved_by?: number;
  approved_at?: string;
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  academic_year?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  assessor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssessmentAnalytics {
  ksq_analytics?: {
    average_score: number;
    total_assessments: number;
    improvement_trend: number;
    performance_distribution: Record<string, number>;
    subject_performance?: Record<string, number>;
    recent_assessments: KSQResult[];
  };
  bsq_analytics?: {
    average_score: number;
    total_assessments: number;
    international_ranking_trend: number;
    certification_status: string;
    competency_analysis: Record<string, number>;
    recent_assessments: BSQResult[];
  };
  overall_analytics: {
    total_assessments: number;
    average_performance: number;
    improvement_percentage: number;
    recommendations: string[];
    risk_areas: string[];
    success_factors: string[];
  };
}

export interface CreateKSQData {
  institution_id: number;
  academic_year_id: number;
  assessment_date: string;
  assessment_type: string;
  total_score: number;
  max_possible_score: number;
  grade_level?: string;
  subject_id?: number;
  criteria_scores: Record<string, number>;
  detailed_results?: any[];
  strengths?: string[];
  improvement_areas?: string[];
  recommendations?: string[];
  notes?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  previous_assessment_id?: number;
}

export interface CreateBSQData {
  institution_id: number;
  academic_year_id: number;
  assessment_date: string;
  international_standard: string;
  assessment_body: string;
  total_score: number;
  max_possible_score: number;
  international_ranking?: number;
  national_ranking?: number;
  regional_ranking?: number;
  competency_areas: Record<string, number>;
  detailed_scores?: any[];
  international_comparison?: any[];
  certification_level?: string;
  certification_valid_until?: string;
  improvement_plan?: string[];
  action_items?: string[];
  external_report_url?: string;
  compliance_score?: number;
  accreditation_status?: 'full_accreditation' | 'conditional_accreditation' | 'provisional_accreditation' | 'denied' | 'not_applicable';
}

export interface AssessmentFilters {
  institution_id?: number;
  academic_year_id?: number;
  assessment_type?: 'ksq' | 'bsq' | 'all';
  status?: 'draft' | 'approved' | 'rejected';
  date_from?: string;
  date_to?: string;
  performance_level?: string;
  per_page?: number;
  page?: number;
}

export interface AssessmentRankings {
  ranking_type: 'regional' | 'national' | 'international';
  academic_year_id?: number;
  rankings: Array<{
    institution: {
      id: number;
      name: string;
      type: string;
    };
    overall_score: number;
    ksq_score: number;
    bsq_score: number;
    rank_position: number;
  }>;
  generated_at: string;
}

class AssessmentService {
  private baseURL = '/assessments';

  /**
   * Get assessment overview and statistics
   */
  async getAssessmentOverview(filters: AssessmentFilters = {}) {
    console.log('🎯 Getting assessment overview with filters:', JSON.stringify(filters, null, 2));
    console.log('🔑 Current API token:', apiClient.getToken());
    
    // Create a clean copy of filters, explicitly removing any empty or undefined values
    const cleanFilters: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      console.log(`🔍 Processing filter: ${key} = "${value}" (type: ${typeof value})`);
      
      // Skip undefined, null, empty string values
      if (value === undefined || value === null || value === '') {
        console.log(`⏩ Skipping empty/null/undefined param: ${key} = ${value}`);
        return;
      }
      
      // Special handling for institution_id - absolutely no empty values
      if (key === 'institution_id') {
        if (value === '' || value === 'all' || value === 0 || !value) {
          console.log(`⏩ Skipping invalid institution_id: "${value}"`);
          return;
        }
        console.log(`✅ Valid institution_id: ${value}`);
      }
      
      // Special handling for assessment_type 'all'
      if (key === 'assessment_type' && value === 'all') {
        console.log(`⏩ Skipping assessment_type 'all'`);
        return;
      }
      
      console.log(`✅ Adding clean param: ${key} = ${value}`);
      cleanFilters[key] = value;
    });

    console.log('🧹 Clean filters after processing:', JSON.stringify(cleanFilters, null, 2));

    const params = new URLSearchParams();
    Object.entries(cleanFilters).forEach(([key, value]) => {
      params.append(key, value.toString());
    });

    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}?${queryString}` : this.baseURL;
    console.log('📡 Final URL:', url);
    console.log('📡 Query params:', queryString);
    
    console.log('📡 Fetching from URL:', url);
    console.log('📡 Full URL will be:', (apiClient.baseURL || 'http://localhost:8000/api') + url);
    
    try {
      const response = await apiClient.get(url);
      console.log('✅ Assessment API response received');
      return response.data;
    } catch (error) {
      console.error('❌ Assessment API error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        url: url,
        fullUrl: (apiClient.baseURL || 'http://localhost:8000/api') + url
      });
      throw error;
    }
  }

  /**
   * Create new KSQ assessment
   */
  async createKSQ(data: CreateKSQData): Promise<{ success: boolean; data: KSQResult; message: string }> {
    const response = await apiClient.post(`${this.baseURL}/ksq`, data);
    return response.data;
  }

  /**
   * Create new BSQ assessment
   */
  async createBSQ(data: CreateBSQData): Promise<{ success: boolean; data: BSQResult; message: string }> {
    const response = await apiClient.post(`${this.baseURL}/bsq`, data);
    return response.data;
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(institutionId: number, academicYearId?: number, options?: {
    include_trends?: boolean;
    include_rankings?: boolean;
    include_recommendations?: boolean;
  }): Promise<{ success: boolean; data: AssessmentAnalytics }> {
    const params = new URLSearchParams();
    params.append('institution_id', institutionId.toString());
    
    if (academicYearId) {
      params.append('academic_year_id', academicYearId.toString());
    }
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`${this.baseURL}/analytics?${params.toString()}`);
    return response.data;
  }

  /**
   * Approve assessment result
   */
  async approve(type: 'ksq' | 'bsq', id: number, comments?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${this.baseURL}/${type}/${id}/approve`, {
      comments
    });
    return response.data;
  }

  /**
   * Get performance rankings
   */
  async getRankings(
    rankingType: 'regional' | 'national' | 'international',
    academicYearId?: number,
    institutionType?: string,
    limit?: number
  ): Promise<{ success: boolean; data: AssessmentRankings }> {
    const params = new URLSearchParams();
    params.append('ranking_type', rankingType);
    
    if (academicYearId) {
      params.append('academic_year_id', academicYearId.toString());
    }
    
    if (institutionType) {
      params.append('institution_type', institutionType);
    }
    
    if (limit) {
      params.append('limit', limit.toString());
    }

    const response = await apiClient.get(`${this.baseURL}/rankings?${params.toString()}`);
    return response.data;
  }

  /**
   * Export assessment data
   */
  async exportData(
    institutionId: number,
    assessmentType: 'ksq' | 'bsq' | 'both',
    format: 'excel' | 'pdf' | 'csv',
    academicYearId?: number
  ): Promise<{ success: boolean; message: string; export_id: string }> {
    const response = await apiClient.post(`${this.baseURL}/export`, {
      institution_id: institutionId,
      assessment_type: assessmentType,
      format,
      academic_year_id: academicYearId
    });
    return response.data;
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
   * Helper method to format improvement status
   */
  getImprovementLabel(status: string): string {
    const labels = {
      significant_improvement: 'Əhəmiyyətli təkmilləşmə',
      slight_improvement: 'Kiçik təkmilləşmə',
      no_change: 'Dəyişiklik yox',
      slight_decline: 'Kiçik azalma',
      significant_decline: 'Əhəmiyyətli azalma',
      no_comparison: 'Müqayisə yox'
    };
    return labels[status as keyof typeof labels] || status;
  }
}

export const assessmentService = new AssessmentService();
export default assessmentService;