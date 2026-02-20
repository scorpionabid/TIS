import { BaseService } from './BaseService';
import { apiClient } from './api';
import { logger } from '@/utils/logger';
import bulkJobService, { BulkJobResult, BulkJobProgress } from './bulkJobService';
import { SurveyQuestion } from './surveys';

export interface SurveyResponseForApproval {
  id: number;
  survey_id: number;
  institution_id: number;
  department_id?: number;
  respondent_id?: number;
  respondent_role?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'returned';
  responses: Record<string, any>;
  progress_percentage: number;
  is_complete: boolean;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  
  // Relationships
  survey?: {
    id: number;
    title: string;
    description?: string;
    questions?: SurveyQuestion[];
  };
  institution?: {
    id: number;
    name: string;
    short_name?: string;
    type?: string;
    level?: number;
  };
  department?: {
    id: number;
    name: string;
  };
  respondent?: {
    id: number;
    name: string;
    email?: string;
  };
  approvalRequest?: ApprovalRequestData;
}

export interface ApprovalRequestData {
  id: number;
  workflow_id: number;
  current_status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned';
  current_approval_level: number;
  submission_notes?: string;
  deadline?: string;
  submitted_at: string;
  completed_at?: string;
  
  workflow?: {
    id: number;
    name: string;
    workflow_type: string;
    approval_chain: ApprovalLevel[];
  };
  
  approvalActions?: ApprovalAction[];
}

export interface ApprovalLevel {
  level: number;
  role: string;
  required: boolean;
  title: string;
}

export interface ApprovalAction {
  id: number;
  approval_request_id: number;
  approver_id: number;
  approval_level: number;
  action: 'approved' | 'rejected' | 'returned' | 'delegated' | 'edited';
  comments?: string;
  action_metadata?: any;
  action_taken_at: string;
  
  approver?: {
    id: number;
    name: string;
    email?: string;
  };
}

export interface PublishedSurvey {
  id: number;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  target_institutions?: number[];
  current_questions_count?: number;
  questions?: Array<{
    id: number;
    title: string;
    type: string;
    options?: string[];
    required?: boolean;
    order_index?: number;
  }>;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
  completion_rate: number;
}

export interface ResponsesForApprovalData {
  responses: SurveyResponseForApproval[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  stats: ApprovalStats;
}

export interface ResponseFilters {
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'returned';
  approval_status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned';
  institution_id?: number;
  institution_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
  response_ids?: number[];
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface BulkApprovalRequest {
  response_ids: number[];
  action: 'approve' | 'reject' | 'return';
  comments?: string;
  metadata?: any;
}

export interface BulkApprovalResult {
  successful: number;
  failed: number;
  results: Array<{
    response_id: number;
    status: string;
    result: any;
  }>;
  errors: Array<{
    response_id: number;
    error: string;
  }>;
}

class SurveyApprovalService {
  private baseURL = '/survey-approval';
  private responseURL = '/responses';

  /**
   * Get all published surveys available for approval
   */
  async getPublishedSurveys(): Promise<PublishedSurvey[]> {
    try {
      // Disable cache for published surveys to ensure user sees only their authorized surveys
      const response = await apiClient.get(
        `${this.baseURL}/surveys/published`,
        undefined,
        { cache: false } // User-specific data, no cache
      );

      const typedResponse = response as any;
      if (!typedResponse || !typedResponse.success) {
        throw new Error(typedResponse?.message || 'Failed to fetch published surveys');
      }

      return typedResponse.data || [];
    } catch (error: any) {
      console.error('Error fetching published surveys:', error);
      throw error;
    }
  }

  /**
   * Get survey responses for approval with filtering and pagination
   */
  async getResponsesForApproval(
    surveyId: number,
    filters: ResponseFilters = {}
  ): Promise<ResponsesForApprovalData> {
    console.log('🔍 [SurveyApproval] Getting responses for approval:', { surveyId, filters });
    
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    try {
      // CRITICAL: Disable caching for approval responses to ensure fresh data per user
      // Different users (especially SektorAdmin) must see only their authorized institutions
      const response = await apiClient.get(
        `${this.baseURL}/surveys/${surveyId}/responses?${params.toString()}`,
        undefined, // no additional params
        { cache: false } // Disable cache - security critical for role-based data
      );
      
      const typedResponse = response as any;
      console.log('✅ [SurveyApproval] Responses response received:', {
        response,
        responseType: typeof response,
        successField: typedResponse?.success,
        dataField: typedResponse?.data,
        messageField: typedResponse?.message
      });
      
      if (!typedResponse) {
        console.error('❌ [SurveyApproval] No response received for responses');
        throw new Error('No response received from server');
      }
      
      if (!typedResponse.success) {
        console.error('❌ [SurveyApproval] API returned failure for responses:', typedResponse);
        throw new Error(typedResponse.message || 'Failed to fetch survey responses');
      }
      
      const responsesData = typedResponse.data || { responses: [], pagination: {}, stats: {} };
      console.log('📊 [SurveyApproval] Responses data:', responsesData);
      return responsesData;
      
    } catch (error: any) {
      console.error('💥 [SurveyApproval] Error fetching responses:', {
        surveyId,
        filters,
        message: error.message,
        error
      });
      throw error;
    }
  }

  /**
   * Get approval statistics for a survey
   */
  async getApprovalStats(surveyId: number): Promise<ApprovalStats> {
    console.log('🔍 [SurveyApproval] Getting approval stats:', { surveyId });
    
    try {
      const response = await apiClient.get(`${this.baseURL}/surveys/${surveyId}/stats`);
      
      const typedResponse = response as any;
      console.log('✅ [SurveyApproval] Stats response received:', {
        response,
        responseType: typeof response,
        successField: typedResponse?.success,
        dataField: typedResponse?.data
      });
      
      if (!typedResponse || !typedResponse.success) {
        console.error('❌ [SurveyApproval] API returned failure for stats:', typedResponse);
        throw new Error(typedResponse?.message || 'Failed to fetch approval stats');
      }
      
      const stats = typedResponse.data || {};
      console.log('📊 [SurveyApproval] Stats data:', stats);
      return stats;
      
    } catch (error: any) {
      console.error('💥 [SurveyApproval] Error fetching stats:', {
        surveyId,
        message: error.message,
        error
      });
      throw error;
    }
  }

  /**
   * Get detailed response data with approval history
   */
  async getResponseDetail(responseId: number): Promise<{
    response: SurveyResponseForApproval;
    approval_history: ApprovalAction[];
    can_edit: boolean;
    can_approve: boolean;
  }> {
    console.log('🔍 [SurveyApproval] Getting response detail:', { responseId });
    
    try {
      const response = await apiClient.get(`${this.responseURL}/${responseId}/detail`);
      
      const typedResponse = response as any;
      console.log('✅ [SurveyApproval] Detail response received:', {
        response,
        responseType: typeof response,
        successField: typedResponse?.success,
        dataField: typedResponse?.data
      });
      
      if (!typedResponse || !typedResponse.success) {
        console.error('❌ [SurveyApproval] API returned failure for detail:', typedResponse);
        throw new Error(typedResponse?.message || 'Failed to fetch response detail');
      }
      
      const detailData = typedResponse.data || {};
      console.log('📊 [SurveyApproval] Detail data:', detailData);
      return detailData;
      
    } catch (error: any) {
      console.error('💥 [SurveyApproval] Error fetching detail:', {
        responseId,
        message: error.message,
        error
      });
      throw error;
    }
  }

  /**
   * Update survey response data
   */
  async updateResponseData(
    responseId: number,
    responseData: Record<string, any>
  ): Promise<SurveyResponseForApproval> {
    console.log('🔍 [SurveyApproval] Updating response data:', { responseId, responseData });
    
    try {
      const response = await apiClient.put(`${this.responseURL}/${responseId}/update`, {
        responses: responseData
      });
      
      const typedResponse = response as any;
      console.log('✅ [SurveyApproval] Update response received:', typedResponse);
      
      if (!typedResponse || !typedResponse.success) {
        console.error('❌ [SurveyApproval] API returned failure for update:', typedResponse);
        throw new Error(typedResponse?.message || 'Failed to update response data');
      }
      
      return typedResponse.data;
      
    } catch (error: any) {
      console.error('💥 [SurveyApproval] Error updating response:', {
        responseId,
        message: error.message,
        error
      });
      throw error;
    }
  }

  /**
   * Create approval request for a response
   */
  async createApprovalRequest(
    responseId: number,
    data: { notes?: string; deadline?: string }
  ): Promise<ApprovalRequestData> {
    const response = await apiClient.post(`${this.responseURL}/${responseId}/submit-approval`, data);
    const typedResponse = response as any;
    return typedResponse.data.data;
  }

  /**
   * Approve a survey response
   */
  async approveResponse(
    responseId: number,
    data: { comments?: string; metadata?: any }
  ): Promise<{ status: string; message: string }> {
    console.log('🚀 [IndividualApproval] Starting approve operation:', { responseId, data });

    try {
      const response = await apiClient.post(`${this.responseURL}/${responseId}/approve`, data);
      console.log('✅ [IndividualApproval] Approve API response received:', response);

      const typedResponse = response as any;
      const result = typedResponse?.data?.data || typedResponse?.data || { status: 'success', message: 'Approved' };
      console.log('📊 [IndividualApproval] Approve result:', result);

      return result;
    } catch (error: any) {
      console.error('❌ [IndividualApproval] Error in approve operation:', error);
      throw error;
    }
  }

  /**
   * Reject a survey response
   */
  async rejectResponse(
    responseId: number,
    data: { comments: string; metadata?: any }
  ): Promise<{ status: string; message: string }> {
    console.log('🚀 [IndividualApproval] Starting reject operation:', { responseId, data });

    try {
      const response = await apiClient.post(`${this.responseURL}/${responseId}/reject`, data);
      console.log('✅ [IndividualApproval] Reject API response received:', response);

      const typedResponse = response as any;
      const result = typedResponse?.data?.data || typedResponse?.data || { status: 'success', message: 'Rejected' };
      console.log('📊 [IndividualApproval] Reject result:', result);

      return result;
    } catch (error: any) {
      console.error('❌ [IndividualApproval] Error in reject operation:', error);
      throw error;
    }
  }

  /**
   * Return response for revision
   */
  async returnForRevision(
    responseId: number,
    data: { comments: string; metadata?: any }
  ): Promise<{ status: string; message: string }> {
    console.log('🚀 [IndividualApproval] Starting return operation:', { responseId, data });

    try {
      const response = await apiClient.post(`${this.responseURL}/${responseId}/return`, data);
      console.log('✅ [IndividualApproval] Return API response received:', response);

      const typedResponse = response as any;
      const result = typedResponse?.data?.data || typedResponse?.data || { status: 'success', message: 'Returned' };
      console.log('📊 [IndividualApproval] Return result:', result);

      return result;
    } catch (error: any) {
      console.error('❌ [IndividualApproval] Error in return operation:', error);
      throw error;
    }
  }

  /**
   * Bulk approval operations with background job support
   */
  async bulkApprovalOperation(data: BulkApprovalRequest): Promise<BulkApprovalResult> {
    console.log('🚀 [BulkApproval] Starting bulk approval operation:', data);

    try {
      const response = await apiClient.post(`${this.responseURL}/bulk-approval`, data);
      console.log('✅ [BulkApproval] API response received:', response);

      const typedResponse = response as any;
      const result = typedResponse?.data?.data || typedResponse?.data || {};
      console.log('📊 [BulkApproval] Extracted result:', result);

      // Log errors in detail if any
      if (result.errors && result.errors.length > 0) {
        console.error('❌ [BulkApproval] Detailed errors:', JSON.stringify(result.errors, null, 2));
      }

      // If operation was queued as a background job, return job info
      if (result.status === 'queued' && result.job_id) {
        console.log('⏰ [BulkApproval] Operation queued as background job');
        return {
          ...result,
          successful: 0,
          failed: 0,
          errors: [],
          results: []
        } as BulkApprovalResult;
      }

      // For synchronous operations, ensure we have required properties
      const bulkResult: BulkApprovalResult = {
        successful: result.successful || result.success_count || 0,
        failed: result.failed || result.error_count || 0,
        results: result.results || [],
        errors: result.errors || []
      };

      console.log('✅ [BulkApproval] Final result:', bulkResult);
      return bulkResult;

    } catch (error: any) {
      console.error('❌ [BulkApproval] Error in bulk approval operation:', error);
      throw error;
    }
  }

  /**
   * Monitor bulk approval job progress
   */
  async monitorBulkApprovalJob(
    jobId: string,
    onProgress?: (progress: BulkJobProgress) => void,
    onComplete?: (result: BulkJobResult) => void,
    onError?: (error: Error) => void
  ): Promise<BulkJobResult> {
    return bulkJobService.pollJobStatus(
      jobId,
      onProgress,
      onComplete,
      onError
    );
  }

  /**
   * Cancel a running bulk approval job
   */
  async cancelBulkApprovalJob(jobId: string): Promise<{ message: string; job_id: string }> {
    return bulkJobService.cancelJob(jobId);
  }

  /**
   * Get user's bulk approval job history
   */
  async getBulkApprovalHistory(params?: {
    page?: number;
    per_page?: number;
  }): Promise<{
    jobs: BulkJobResult[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  }> {
    return bulkJobService.getUserJobHistory(params);
  }

  /**
   * Export survey responses to Excel/CSV format
   */
  async exportSurveyResponses(
    surveyId: number,
    filters: ResponseFilters & { format?: 'xlsx' | 'csv' } = {}
  ): Promise<Blob> {
    console.log('🔍 [SurveyApproval] Exporting survey responses:', { surveyId, filters });

    const format = filters.format || 'xlsx';

    try {
      console.log('🚀 [SurveyApproval] Making export API call using apiClient...');

      const response = await apiClient.get<Blob>(
        `survey-approval/surveys/${surveyId}/export`,
        filters,
        {
          responseType: 'blob',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Accept': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }
        }
      );

      if (!response.data) {
        throw new Error('Received empty file response');
      }

      console.log('✅ [SurveyApproval] Export response received:', {
        size: response.data.size,
        type: response.data.type
      });

      return response.data;

    } catch (error: any) {
      console.error('💥 [SurveyApproval] Error exporting survey responses:', {
        surveyId,
        filters,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        error
      });

      // Provide user-friendly error messages
      if (error.response?.status === 403) {
        throw new Error('İxrac etmək üçün icazəniz yoxdur');
      } else if (error.response?.status === 404) {
        throw new Error('Sorğu tapılmadı');
      } else if (error.response?.status === 422) {
        throw new Error('Yanlış filtr parametrləri');
      } else {
        throw new Error('İxrac zamanı xəta baş verdi: ' + error.message);
      }
    }
  }

  /**
   * Download exported file with proper filename
   */
  downloadExportedFile(blob: Blob, surveyId: number, format: string = 'xlsx'): void {
    try {
      // Create download URL
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
      link.download = `survey_${surveyId}_responses_${timestamp}.${format}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ [SurveyApproval] File download triggered successfully');

    } catch (error: any) {
      console.error('💥 [SurveyApproval] Error downloading file:', error);
      throw new Error('Fayl yüklənmədi: ' + error.message);
    }
  }

  /**
   * Get institutions list for filtering (cached)
   */
  async getInstitutions(): Promise<Array<{
    id: number;
    name: string;
    type?: string;
    level?: number;
    parent_id?: number;
  }>> {
    const response = await apiClient.get('/institutions');
    const typedResponse = response as any;

    // Handle different response formats
    if (Array.isArray(typedResponse.data)) {
      return typedResponse.data;
    } else if (typedResponse.data.data) {
      return Array.isArray(typedResponse.data.data) ? typedResponse.data.data : typedResponse.data.data.data || [];
    }

    return [];
  }

  /**
   * Perform bulk approval operation - wrapper for bulkApprovalOperation
   */
  async performBulkApproval(
    responseIds: number[],
    action: 'approve' | 'reject' | 'return',
    comments?: string
  ): Promise<BulkApprovalResult> {
    console.log('🚀 [performBulkApproval] Starting bulk approval:', {
      responseIds,
      action,
      comments
    });

    const data: BulkApprovalRequest = {
      response_ids: responseIds,
      action,
      comments: comments || `Bulk ${action} operation`
    };

    return await this.bulkApprovalOperation(data);
  }
}

export const surveyApprovalService = new SurveyApprovalService();
export default surveyApprovalService;
