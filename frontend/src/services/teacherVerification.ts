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
}

export interface VerificationResponse {
  success: boolean;
  data: TeacherVerification[];
  statistics: VerificationStatistics;
}

export interface ApproveRejectResponse {
  success: boolean;
  message: string;
  data: any;
}

class TeacherVerificationService {
  private apiClient: typeof apiClientOptimized;

  constructor() {
    this.apiClient = apiClientOptimized;
  }

  // Get pending teacher verifications
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
