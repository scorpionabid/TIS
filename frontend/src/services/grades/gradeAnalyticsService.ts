import { apiClient, ApiResponse } from '../api';
import { logger } from '@/utils/logger';
import { Grade, GradeStatistics } from '@/types/grades';

export class GradeAnalyticsService {
  private readonly baseURL = '/grades';

  /**
   * Get grade statistics overview
   */
  async getStatistics(filters?: {
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<ApiResponse<GradeStatistics>> {
    logger.debug('Fetching grade statistics', {
      component: 'GradeAnalyticsService',
      action: 'getStatistics',
      data: { filters }
    });

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString() 
      ? `${this.baseURL}/statistics/overview?${params}`
      : `${this.baseURL}/statistics/overview`;
    
    return apiClient.get<GradeStatistics>(url);
  }

  /**
   * Get capacity report
   */
  async getCapacityReport(filters?: {
    institution_id?: number;
    academic_year_id?: number;
    capacity_status?: string;
  }): Promise<ApiResponse<{
    grades: Array<Grade & {
      capacity_issues: string[];
      recommendations: string[];
    }>;
    summary: {
      total_capacity: number;
      total_enrolled: number;
      available_spots: number;
      utilization_rate: number;
    };
  }>> {
    logger.debug('Fetching capacity report', {
      component: 'GradeAnalyticsService',
      action: 'getCapacityReport',
      data: { filters }
    });

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString()
      ? `${this.baseURL}/reports/capacity?${params}`
      : `${this.baseURL}/reports/capacity`;
    
    return apiClient.get<{
      grades: Array<Grade & {
        capacity_issues: string[];
        recommendations: string[];
      }>;
      summary: any;
    }>(url);
  }

  /**
   * Get grade analytics and performance metrics
   */
  async getGradeAnalytics(gradeId: number): Promise<ApiResponse<any>> {
    logger.debug('Fetching grade analytics', {
      component: 'GradeAnalyticsService',
      action: 'getGradeAnalytics',
      data: { gradeId }
    });

    return apiClient.get<any>(`${this.baseURL}/${gradeId}/analytics`);
  }
}
