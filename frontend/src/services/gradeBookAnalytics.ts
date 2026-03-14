import { apiClient } from './api';

export interface RegionSummary {
  total_grade_books: number;
  active_grade_books: number;
  total_assessments: number;
  by_institution: Array<{
    institution_id: number;
    institution_name: string;
    grade_book_count: number;
  }>;
  by_subject: Array<{
    subject_id: number;
    subject_name: string;
    grade_book_count: number;
  }>;
}

export interface PerformanceData {
  grade_books: Array<{
    grade_book_id: number;
    grade_name: string;
    subject_name: string;
    institution_name: string;
    averages: {
      i_semester: number;
      ii_semester: number;
      annual: number;
    };
    grade_distribution: Record<string, number>;
    total_students: number;
  }>;
  overall_stats: {
    avg_annual_score: number;
    grade_distribution_total: Record<string, number>;
  };
}

export interface YearComparison {
  academic_year_id: number;
  academic_year_name: string;
  grade_book_count: number;
  average_annual_score: number | null;
}

export interface SubjectRanking {
  subject_id: number;
  subject_name: string;
  grade_book_count: number;
  student_count: number;
  average_score: number | null;
  max_score: number | null;
  min_score: number | null;
}

export interface InstitutionDetail {
  institution_id: number;
  grade_books: Array<{
    grade_book_id: number;
    grade_name: string;
    subject_name: string;
    student_count: number;
    assessment_count: number;
    grade_distribution: Record<string, number>;
    status: string;
  }>;
  total_grade_books: number;
  active_grade_books: number;
}

class GradeBookAnalyticsService {
  private baseUrl = '/analytics/grade-books';

  // Region summary
  async getRegionSummary(regionId: number, academicYearId: number, semester?: 'I' | 'II'): Promise<{ data: RegionSummary }> {
    const response = await apiClient.get(`${this.baseUrl}/region-summary`, {
      params: { region_id: regionId, academic_year_id: academicYearId, semester },
    });
    return response.data;
  }

  // Performance analytics
  async getPerformanceAnalytics(params: {
    region_id?: number;
    institution_id?: number;
    academic_year_id: number;
    grade_level?: number;
    subject_id?: number;
  }): Promise<{ data: PerformanceData }> {
    const response = await apiClient.get(`${this.baseUrl}/performance`, { params });
    return response.data;
  }

  // Year comparison
  async getYearComparison(regionId: number, gradeLevel?: number, subjectId?: number): Promise<{ data: YearComparison[] }> {
    const response = await apiClient.get(`${this.baseUrl}/year-comparison`, {
      params: { region_id: regionId, grade_level: gradeLevel, subject_id: subjectId },
    });
    return response.data;
  }

  // Subject ranking
  async getSubjectRanking(regionId: number, academicYearId: number, semester?: 'I' | 'II' | 'annual'): Promise<{ data: SubjectRanking[] }> {
    const response = await apiClient.get(`${this.baseUrl}/subject-ranking`, {
      params: { region_id: regionId, academic_year_id: academicYearId, semester },
    });
    return response.data;
  }

  // Institution detail
  async getInstitutionDetail(institutionId: number, academicYearId: number): Promise<{ data: InstitutionDetail }> {
    const response = await apiClient.get(`${this.baseUrl}/institution-detail`, {
      params: { institution_id: institutionId, academic_year_id: academicYearId },
    });
    return response.data;
  }
}

export const gradeBookAnalyticsService = new GradeBookAnalyticsService();
export default gradeBookAnalyticsService;
