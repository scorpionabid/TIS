import { apiClient } from '../api';
import { Assessment } from '../schoolAdmin';
import { PaginationParams } from '../BaseService';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Assessment Service for SuperAdmin
 * Handles all assessment-related operations
 */
class AssessmentService {
  async getAssessments(classId?: number, params?: PaginationParams): Promise<Assessment[]> {
    try {
      logger.debug('SuperAdmin fetching assessments', {
        component: 'AssessmentService',
        action: 'getAssessments',
        data: { classId, params }
      });

      const response = await apiClient.get<Assessment[]>('/assessments', {
        ...params,
        class_id: classId
      });
      return handleArrayResponse<Assessment>(response, 'AssessmentService.getAssessments');
    } catch (error) {
      logger.error('Failed to fetch assessments', error);
      throw error;
    }
  }

  async createAssessment(data: Partial<Assessment>): Promise<Assessment> {
    try {
      logger.debug('SuperAdmin creating assessment', {
        component: 'AssessmentService',
        action: 'createAssessment',
        data: { title: data.title }
      });

      const response = await apiClient.post<Assessment>('/assessments', data);
      return handleApiResponseWithError<Assessment>(response, 'AssessmentService.createAssessment', 'AssessmentService');
    } catch (error) {
      logger.error('Failed to create assessment', error);
      throw error;
    }
  }

  async getAssessment(assessmentId: number): Promise<Assessment> {
    try {
      logger.debug('SuperAdmin fetching assessment', {
        component: 'AssessmentService',
        action: 'getAssessment',
        data: { assessmentId }
      });

      const response = await apiClient.get<Assessment>(`/assessments/${assessmentId}`);
      return handleApiResponseWithError<Assessment>(response, `AssessmentService.getAssessment(${assessmentId})`, 'AssessmentService');
    } catch (error) {
      logger.error(`Failed to fetch assessment ${assessmentId}`, error);
      throw error;
    }
  }

  async updateAssessment(assessmentId: number, data: Partial<Assessment>): Promise<Assessment> {
    try {
      logger.debug('SuperAdmin updating assessment', {
        component: 'AssessmentService',
        action: 'updateAssessment',
        data: { assessmentId }
      });

      const response = await apiClient.put<Assessment>(`/assessments/${assessmentId}`, data);
      return handleApiResponseWithError<Assessment>(response, `AssessmentService.updateAssessment(${assessmentId})`, 'AssessmentService');
    } catch (error) {
      logger.error(`Failed to update assessment ${assessmentId}`, error);
      throw error;
    }
  }

  async deleteAssessment(assessmentId: number): Promise<void> {
    try {
      await apiClient.delete(`/assessments/${assessmentId}`);
      logger.info(`Successfully deleted assessment ${assessmentId}`, {
        component: 'AssessmentService',
        action: 'deleteAssessment'
      });
    } catch (error) {
      logger.error(`Failed to delete assessment ${assessmentId}`, error);
      throw error;
    }
  }
}

export const assessmentService = new AssessmentService();
export { AssessmentService };
