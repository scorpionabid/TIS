import { apiClient } from './api';
import bulkJobService, { BulkJobResult, BulkJobProgress } from './bulkJobService';

export interface SurveyResponseForApproval {
  id: number;
  survey_id: number;
  institution_id: number;
  department_id?: number;
  respondent_id?: number;
  respondent_role?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
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
  };
  institution?: {
    id: number;
    name: string;
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
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  approval_status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned';
  institution_id?: number;
  institution_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
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

class SurveyResponseApprovalService {
  private baseURL = '/survey-response-approval';
  private responseURL = '/survey-responses';

  /**
   * Get all published surveys available for approval
   */
  async getPublishedSurveys(): Promise<PublishedSurvey[]> {
    console.log('🔍 [SurveyResponseApproval] Fetching published surveys...');
    console.log('📡 API URL:', `${this.baseURL}/surveys/published`);
    console.log('🔗 Full API URL will be:', `${this.baseURL}/surveys/published`);
    console.log('🔑 Will use apiClient.get with URL:', `${this.baseURL}/surveys/published`);
    
    try {
      console.log('🚀 [SurveyResponseApproval] Making API call...');
      const response = await apiClient.get(`${this.baseURL}/surveys/published`);
      
      console.log('✅ [SurveyResponseApproval] Published surveys response received:', {
        response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : null,
        successField: response?.success,
        dataField: response?.data,
        messageField: response?.message
      });
      
      if (!response) {
        console.error('❌ [SurveyResponseApproval] No response received');
        throw new Error('No response received from server');
      }
      
      if (!response.success) {
        console.error('❌ [SurveyResponseApproval] API returned failure:', response);
        throw new Error(response.message || 'API request failed');
      }
      
      const surveys = response.data || [];
      console.log('📊 [SurveyResponseApproval] Published surveys count:', surveys.length);
      console.log('📋 [SurveyResponseApproval] Surveys data:', surveys);
      return surveys;
      
    } catch (error: any) {
      console.error('💥 [SurveyResponseApproval] Error fetching published surveys:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config,
        stack: error.stack
      });
      
      // Re-throw the error for the calling component to handle
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
    console.log('🔍 [SurveyResponseApproval] Getting responses for approval:', { surveyId, filters });
    
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    try {
      const response = await apiClient.get(
        `${this.baseURL}/surveys/${surveyId}/responses?${params.toString()}`
      );
      
      console.log('✅ [SurveyResponseApproval] Responses response received:', {
        response,
        responseType: typeof response,
        successField: response?.success,
        dataField: response?.data,
        messageField: response?.message
      });
      
      if (!response) {
        console.error('❌ [SurveyResponseApproval] No response received for responses');
        throw new Error('No response received from server');
      }
      
      if (!response.success) {
        console.error('❌ [SurveyResponseApproval] API returned failure for responses:', response);
        throw new Error(response.message || 'Failed to fetch survey responses');
      }
      
      const responsesData = response.data || { responses: [], pagination: {}, stats: {} };
      console.log('📊 [SurveyResponseApproval] Responses data:', responsesData);
      return responsesData;
      
    } catch (error: any) {
      console.error('💥 [SurveyResponseApproval] Error fetching responses:', {
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
    console.log('🔍 [SurveyResponseApproval] Getting approval stats:', { surveyId });
    
    try {
      const response = await apiClient.get(`${this.baseURL}/surveys/${surveyId}/stats`);
      
      console.log('✅ [SurveyResponseApproval] Stats response received:', {
        response,
        responseType: typeof response,
        successField: response?.success,
        dataField: response?.data
      });
      
      if (!response || !response.success) {
        console.error('❌ [SurveyResponseApproval] API returned failure for stats:', response);
        throw new Error(response?.message || 'Failed to fetch approval stats');
      }
      
      const stats = response.data || {};
      console.log('📊 [SurveyResponseApproval] Stats data:', stats);
      return stats;
      
    } catch (error: any) {
      console.error('💥 [SurveyResponseApproval] Error fetching stats:', {
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
    console.log('🔍 [SurveyResponseApproval] Getting response detail:', { responseId });
    
    try {
      const response = await apiClient.get(`${this.responseURL}/${responseId}/detail`);
      
      console.log('✅ [SurveyResponseApproval] Detail response received:', {
        response,
        responseType: typeof response,
        successField: response?.success,
        dataField: response?.data
      });
      
      if (!response || !response.success) {
        console.error('❌ [SurveyResponseApproval] API returned failure for detail:', response);
        throw new Error(response?.message || 'Failed to fetch response detail');
      }
      
      const detailData = response.data || {};
      console.log('📊 [SurveyResponseApproval] Detail data:', detailData);
      return detailData;
      
    } catch (error: any) {
      console.error('💥 [SurveyResponseApproval] Error fetching detail:', {
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
    console.log('🔍 [SurveyResponseApproval] Updating response data:', { responseId, responseData });
    
    try {
      const response = await apiClient.put(`${this.responseURL}/${responseId}/update`, {
        responses: responseData
      });
      
      console.log('✅ [SurveyResponseApproval] Update response received:', response);
      
      if (!response || !response.success) {
        console.error('❌ [SurveyResponseApproval] API returned failure for update:', response);
        throw new Error(response?.message || 'Failed to update response data');
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error('💥 [SurveyResponseApproval] Error updating response:', {
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
    return response.data.data;
  }

  /**
   * Approve a survey response
   */
  async approveResponse(
    responseId: number,
    data: { comments?: string; metadata?: any }
  ): Promise<{ status: string; message: string }> {
    const response = await apiClient.post(`${this.responseURL}/${responseId}/approve`, data);
    return response.data.data;
  }

  /**
   * Reject a survey response
   */
  async rejectResponse(
    responseId: number,
    data: { comments: string; metadata?: any }
  ): Promise<{ status: string; message: string }> {
    const response = await apiClient.post(`${this.responseURL}/${responseId}/reject`, data);
    return response.data.data;
  }

  /**
   * Return response for revision
   */
  async returnForRevision(
    responseId: number,
    data: { comments: string; metadata?: any }
  ): Promise<{ status: string; message: string }> {
    const response = await apiClient.post(`${this.responseURL}/${responseId}/return`, data);
    return response.data.data;
  }

  /**
   * Bulk approval operations with background job support
   */
  async bulkApprovalOperation(data: BulkApprovalRequest): Promise<BulkApprovalResult> {
    const response = await apiClient.post(`${this.responseURL}/bulk-approval`, data);
    const result = response.data.data;
    
    // If operation was queued as a background job, return job info
    if (result.status === 'queued' && result.job_id) {
      return {
        ...result,
        successful: 0,
        failed: 0,
        errors: []
      } as BulkApprovalResult;
    }
    
    // For synchronous operations, return the result directly
    return result;
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
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data : response.data.data.data || [];
    }
    
    return [];
  }
}

export const surveyResponseApprovalService = new SurveyResponseApprovalService();
export default surveyResponseApprovalService;