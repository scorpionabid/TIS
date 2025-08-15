import { BaseService } from './BaseService';

export interface SurveyApproval {
  id: number;
  survey_id: number;
  requester_id: number;
  approver_id?: number;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  comments?: string;
  approval_notes?: string;
  rejection_reason?: string;
  requested_at: string;
  approved_at?: string;
  rejected_at?: string;
  survey: {
    id: number;
    title: string;
    description?: string;
    status: string;
    questions_count: number;
    target_audience: string;
    created_at: string;
  };
  requester: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    institution: string;
  };
  approver?: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  workflow_step: {
    step_number: number;
    step_name: string;
    required_role: string;
    is_current: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ApprovalStatistics {
  pending_approvals: number;
  approved_today: number;
  rejected_today: number;
  needs_revision: number;
  total_processed: number;
  average_processing_time: number; // in hours
  by_priority: Array<{
    priority: string;
    count: number;
  }>;
  by_status: Array<{
    status: string;
    count: number;
  }>;
  workflow_bottlenecks: Array<{
    step_name: string;
    pending_count: number;
    average_wait_time: number;
  }>;
}

export interface ApprovalFilters {
  status?: string;
  priority?: string;
  requester_id?: number;
  survey_type?: string;
  date_from?: string;
  date_to?: string;
  institution_id?: number;
  workflow_step?: number;
  search?: string;
}

export interface ApprovalAction {
  action: 'approve' | 'reject' | 'request_revision';
  comments?: string;
  approval_notes?: string;
  rejection_reason?: string;
  conditions?: string;
  next_approver_id?: number;
}

export interface BulkApprovalAction {
  approval_ids: number[];
  action: 'approve' | 'reject';
  comments?: string;
  reason?: string;
}

export interface ApprovalWorkflow {
  id: number;
  survey_type: string;
  institution_level: number;
  steps: Array<{
    step_number: number;
    step_name: string;
    required_role: string;
    required_permissions: string[];
    can_skip: boolean;
    auto_approve_conditions?: Record<string, any>;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class ApprovalService extends BaseService {
  constructor() {
    super('/approvals');
  }

  async getPendingApprovals(filters?: ApprovalFilters): Promise<{ success: boolean; data: SurveyApproval[] }> {
    console.log('🔍 ApprovalService.getPendingApprovals called with filters:', filters);
    try {
      const response = await this.get<SurveyApproval[]>(`${this.baseUrl}/pending`, filters);
      console.log('✅ ApprovalService.getPendingApprovals successful:', response);
      return response as { success: boolean; data: SurveyApproval[] };
    } catch (error) {
      console.error('❌ ApprovalService.getPendingApprovals failed:', error);
      throw error;
    }
  }

  async getAllApprovals(filters?: ApprovalFilters): Promise<{ success: boolean; data: SurveyApproval[] }> {
    console.log('🔍 ApprovalService.getAllApprovals called with filters:', filters);
    try {
      const response = await this.get<SurveyApproval[]>(this.baseUrl, filters);
      console.log('✅ ApprovalService.getAllApprovals successful:', response);
      return response as { success: boolean; data: SurveyApproval[] };
    } catch (error) {
      console.error('❌ ApprovalService.getAllApprovals failed:', error);
      throw error;
    }
  }

  async getApproval(id: number): Promise<{ success: boolean; data: SurveyApproval }> {
    console.log('🔍 ApprovalService.getApproval called for ID:', id);
    try {
      const response = await this.get<SurveyApproval>(`${this.baseUrl}/${id}`);
      console.log('✅ ApprovalService.getApproval successful:', response);
      return response as { success: boolean; data: SurveyApproval };
    } catch (error) {
      console.error('❌ ApprovalService.getApproval failed:', error);
      throw error;
    }
  }

  async processApproval(id: number, action: ApprovalAction): Promise<{ success: boolean; message: string; data: SurveyApproval }> {
    console.log('🔍 ApprovalService.processApproval called for ID:', id, 'with action:', action);
    try {
      const response = await this.post<SurveyApproval>(`${this.baseUrl}/${id}/process`, action);
      console.log('✅ ApprovalService.processApproval successful:', response);
      return response as { success: boolean; message: string; data: SurveyApproval };
    } catch (error) {
      console.error('❌ ApprovalService.processApproval failed:', error);
      throw error;
    }
  }

  async approveSurvey(id: number, data: {
    comments?: string;
    approval_notes?: string;
    conditions?: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ApprovalService.approveSurvey called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/approve`, data);
      console.log('✅ ApprovalService.approveSurvey successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ApprovalService.approveSurvey failed:', error);
      throw error;
    }
  }

  async rejectSurvey(id: number, data: {
    rejection_reason: string;
    comments?: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ApprovalService.rejectSurvey called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/reject`, data);
      console.log('✅ ApprovalService.rejectSurvey successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ApprovalService.rejectSurvey failed:', error);
      throw error;
    }
  }

  async requestRevision(id: number, data: {
    comments: string;
    suggested_changes?: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ApprovalService.requestRevision called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/request-revision`, data);
      console.log('✅ ApprovalService.requestRevision successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ApprovalService.requestRevision failed:', error);
      throw error;
    }
  }

  async processBulkApproval(data: BulkApprovalAction): Promise<{ 
    success: boolean; 
    message: string; 
    data: { processed: number; failed: number; details: any[] }
  }> {
    console.log('🔍 ApprovalService.processBulkApproval called with:', data);
    try {
      const response = await this.post<{ 
        processed: number; 
        failed: number; 
        details: any[] 
      }>(`${this.baseUrl}/bulk-process`, data);
      console.log('✅ ApprovalService.processBulkApproval successful:', response);
      return response as { 
        success: boolean; 
        message: string; 
        data: { processed: number; failed: number; details: any[] }
      };
    } catch (error) {
      console.error('❌ ApprovalService.processBulkApproval failed:', error);
      throw error;
    }
  }

  async getApprovalStatistics(): Promise<{ 
    success: boolean; 
    data: ApprovalStatistics 
  }> {
    console.log('🔍 ApprovalService.getApprovalStatistics called');
    try {
      const response = await this.get<ApprovalStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ ApprovalService.getApprovalStatistics successful:', response);
      return response as { 
        success: boolean; 
        data: ApprovalStatistics 
      };
    } catch (error) {
      console.error('❌ ApprovalService.getApprovalStatistics failed:', error);
      // Return mock data if API not available
      return {
        success: true,
        data: {
          pending_approvals: 0,
          approved_today: 0,
          rejected_today: 0,
          needs_revision: 0,
          total_processed: 0,
          average_processing_time: 0,
          by_priority: [],
          by_status: [],
          workflow_bottlenecks: []
        }
      };
    }
  }

  async getApprovalWorkflows(): Promise<{ success: boolean; data: ApprovalWorkflow[] }> {
    console.log('🔍 ApprovalService.getApprovalWorkflows called');
    try {
      const response = await this.get<ApprovalWorkflow[]>(`${this.baseUrl}/workflows`);
      console.log('✅ ApprovalService.getApprovalWorkflows successful:', response);
      return response as { success: boolean; data: ApprovalWorkflow[] };
    } catch (error) {
      console.error('❌ ApprovalService.getApprovalWorkflows failed:', error);
      throw error;
    }
  }

  async delegateApproval(id: number, data: {
    delegate_to_user_id: number;
    delegation_reason?: string;
    temporary?: boolean;
    expires_at?: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ApprovalService.delegateApproval called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/delegate`, data);
      console.log('✅ ApprovalService.delegateApproval successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ApprovalService.delegateApproval failed:', error);
      throw error;
    }
  }

  async getApprovalHistory(survey_id: number): Promise<{ 
    success: boolean; 
    data: Array<{
      id: number;
      action: string;
      user: { first_name: string; last_name: string; role: string };
      comments?: string;
      created_at: string;
    }>
  }> {
    console.log('🔍 ApprovalService.getApprovalHistory called for survey ID:', survey_id);
    try {
      const response = await this.get<Array<{
        id: number;
        action: string;
        user: { first_name: string; last_name: string; role: string };
        comments?: string;
        created_at: string;
      }>>(`${this.baseUrl}/history/${survey_id}`);
      console.log('✅ ApprovalService.getApprovalHistory successful:', response);
      return response as { 
        success: boolean; 
        data: Array<{
          id: number;
          action: string;
          user: { first_name: string; last_name: string; role: string };
          comments?: string;
          created_at: string;
        }>
      };
    } catch (error) {
      console.error('❌ ApprovalService.getApprovalHistory failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
  getMockApprovals(): SurveyApproval[] {
    return [
      {
        id: 1,
        survey_id: 15,
        requester_id: 3,
        status: 'pending',
        priority: 'medium',
        comments: 'Müəllim məmnuniyyəti sorğusu üçün təsdiq tələb olunur.',
        requested_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        survey: {
          id: 15,
          title: 'Müəllim məmnuniyyəti sorğusu 2024',
          description: 'Müəllimlərin iş şəraitindən məmnuniyyət dərəcəsini ölçmək üçün sorğu',
          status: 'pending_approval',
          questions_count: 25,
          target_audience: 'Bütün müəllimlər',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        requester: {
          id: 3,
          first_name: 'Elnur',
          last_name: 'Məmmədov',
          role: 'SchoolAdmin',
          institution: '1 saylı tam orta məktəb'
        },
        workflow_step: {
          step_number: 1,
          step_name: 'Regional Manager Approval',
          required_role: 'RegionAdmin',
          is_current: true
        },
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        survey_id: 18,
        requester_id: 5,
        status: 'pending',
        priority: 'high',
        comments: 'Şagird davamiyyət analizi üçün təcili təsdiq lazımdır.',
        requested_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        survey: {
          id: 18,
          title: 'Şagird davamiyyəti analizi',
          description: 'Şagirdlərin davamiyyət vəziyyətinin təhlili üçün məlumat toplama',
          status: 'pending_approval',
          questions_count: 15,
          target_audience: 'Sinif müəllimləri',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        requester: {
          id: 5,
          first_name: 'Leyla',
          last_name: 'Həsənova',
          role: 'Teacher',
          institution: '5 saylı lisey'
        },
        workflow_step: {
          step_number: 1,
          step_name: 'School Admin Approval',
          required_role: 'SchoolAdmin',
          is_current: true
        },
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        survey_id: 12,
        requester_id: 4,
        approver_id: 2,
        status: 'approved',
        priority: 'low',
        comments: 'Adi rutin sorğu, təsdiq edildi.',
        approval_notes: 'Heç bir əlavə şərt tələb olunmur.',
        requested_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        approved_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        survey: {
          id: 12,
          title: 'Kafeterya xidmələri qiymətləndirməsi',
          description: 'Məktəb kafeteryasının xidmət keyfiyyətinin qiymətləndirilməsi',
          status: 'published',
          questions_count: 10,
          target_audience: 'Şagirdlər',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        requester: {
          id: 4,
          first_name: 'Rəşad',
          last_name: 'Quliyev',
          role: 'Teacher',
          institution: '3 saylı gimnaziya'
        },
        approver: {
          id: 2,
          first_name: 'Aynur',
          last_name: 'Əliyeva',
          role: 'RegionAdmin'
        },
        workflow_step: {
          step_number: 2,
          step_name: 'Final Approval',
          required_role: 'RegionAdmin',
          is_current: false
        },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  getMockStatistics(): ApprovalStatistics {
    return {
      pending_approvals: 8,
      approved_today: 5,
      rejected_today: 1,
      needs_revision: 2,
      total_processed: 157,
      average_processing_time: 18.5,
      by_priority: [
        { priority: 'low', count: 45 },
        { priority: 'medium', count: 78 },
        { priority: 'high', count: 28 },
        { priority: 'urgent', count: 6 }
      ],
      by_status: [
        { status: 'pending', count: 8 },
        { status: 'approved', count: 142 },
        { status: 'rejected', count: 5 },
        { status: 'needs_revision', count: 2 }
      ],
      workflow_bottlenecks: [
        { step_name: 'Regional Manager Approval', pending_count: 5, average_wait_time: 24.5 },
        { step_name: 'Department Head Review', pending_count: 3, average_wait_time: 12.3 }
      ]
    };
  }
}

export const approvalService = new ApprovalService();