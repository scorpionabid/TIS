import { apiClientOptimized } from '@/services/apiOptimized';

export interface TeacherVerification {
  id: number;
  name: string;
  email: string;
  username: string;
  institution: {
    id: number;
    name: string;
  };
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_date?: string;
  verified_by?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface VerificationStatistics {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  total_teachers: number;
}

export interface VerificationResponse {
  success: boolean;
  data: TeacherVerification[];
  statistics: VerificationStatistics;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApproveRejectResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  approved_count?: number;
  rejected_count?: number;
  errors: string[];
}

export interface FilterParams {
  status?: string;
  institution_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface AnalyticsData {
  monthly_trends: Array<{
    month: string;
    verification_status: string;
    count: number;
  }>;
  institution_breakdown: Array<{
    institution_id: number;
    institution_name: string;
    total_teachers: number;
    approved_count: number;
    rejected_count: number;
    pending_count: number;
    approval_rate: number;
  }>;
  average_verification_days: number;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

class TeacherVerificationService {
  private apiClient: typeof apiClientOptimized;

  constructor() {
    this.apiClient = apiClientOptimized;
  }

  // Get teacher verifications with advanced filtering
  async getTeacherVerifications(params: FilterParams = {}): Promise<VerificationResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await this.apiClient.get(`/sektoradmin/teachers/verifications?${queryParams.toString()}`);
    return response as VerificationResponse;
  }

  // Get pending teacher verifications (legacy)
  async getPendingVerifications(): Promise<VerificationResponse> {
    const response = await this.apiClient.get('/sektoradmin/teachers/verifications/pending');
    return response as VerificationResponse;
  }

  // Approve teacher verification
  async approveTeacher(teacherId: number, verifiedData?: any): Promise<ApproveRejectResponse> {
    const response = await this.apiClient.post(`/sektoradmin/teachers/${teacherId}/approve`, {
      verified_data: verifiedData
    });
    return response as ApproveRejectResponse;
  }

  // Reject teacher verification
  async rejectTeacher(teacherId: number, rejectionReason: string): Promise<ApproveRejectResponse> {
    const response = await this.apiClient.post(`/sektoradmin/teachers/${teacherId}/reject`, {
      rejection_reason: rejectionReason
    });
    return response as ApproveRejectResponse;
  }

  // Bulk approve teachers
  async bulkApproveTeachers(teacherIds: number[], verifiedData?: any): Promise<BulkOperationResponse> {
    const response = await this.apiClient.post('/sektoradmin/teachers/verifications/bulk-approve', {
      teacher_ids: teacherIds,
      verified_data: verifiedData
    });
    return response as BulkOperationResponse;
  }

  // Bulk reject teachers
  async bulkRejectTeachers(teacherIds: number[], rejectionReason: string): Promise<BulkOperationResponse> {
    const response = await this.apiClient.post('/sektoradmin/teachers/verifications/bulk-reject', {
      teacher_ids: teacherIds,
      rejection_reason: rejectionReason
    });
    return response as BulkOperationResponse;
  }

  // Get analytics data
  async getAnalytics(): Promise<AnalyticsResponse> {
    const response = await this.apiClient.get('/sektoradmin/teachers/verifications/analytics');
    return response as AnalyticsResponse;
  }

  // Get sector schools for filter dropdown
  async getSectorSchools(): Promise<Array<{ id: number; name: string }>> {
    const response = await this.apiClient.get('/sektoradmin/available-schools');
    return response.schools || [];
  }

  // Get sector teachers (existing method)
  async getSectorTeachers(params?: {
    school_id?: number;
    subject?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    return this.apiClient.get('/sektoradmin/teachers', params);
  }
}

export const teacherVerificationService = new TeacherVerificationService();
