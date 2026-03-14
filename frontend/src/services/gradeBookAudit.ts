import { apiClient } from './api';

export interface AuditLog {
  id: number;
  grade_book_session_id: number;
  grade_book_column_id: number;
  student_id: number;
  user_id: number;
  action_type: 'create' | 'update' | 'bulk_update' | 'column_archive';
  old_score: number | null;
  new_score: number | null;
  old_is_present: boolean | null;
  new_is_present: boolean | null;
  ip_address: string;
  user_agent: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    student_number: string;
  };
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
  };
  column?: {
    id: number;
    column_label: string;
    semester: 'I' | 'II';
  };
}

export interface AuditLogFilters {
  student_id?: number;
  user_id?: number;
  action_type?: 'create' | 'update' | 'bulk_update' | 'column_archive';
  start_date?: string;
  end_date?: string;
}

export interface RecentActivity {
  stats: Record<string, number>;
  recent_changes: AuditLog[];
  total_changes: number;
}

export interface SuspiciousActivity {
  bulk_updates: Array<{
    user_id: number;
    update_count: number;
  }>;
  large_changes: AuditLog[];
  conflicts: Array<{
    student_id: number;
    user_count: number;
  }>;
  has_suspicious_activity: boolean;
}

class GradeBookAuditService {
  private baseUrl = '/grade-books';

  /**
   * Get audit logs for a grade book
   */
  async getAuditLogs(
    gradeBookId: number,
    filters?: AuditLogFilters,
    perPage: number = 50
  ): Promise<{ data: { data: AuditLog[]; meta: any } }> {
    const params: any = { per_page: perPage };
    if (filters?.student_id) params.student_id = filters.student_id;
    if (filters?.user_id) params.user_id = filters.user_id;
    if (filters?.action_type) params.action_type = filters.action_type;
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;

    return apiClient.get(`${this.baseUrl}/${gradeBookId}/audit-logs`, { params });
  }

  /**
   * Get student's grade history
   */
  async getStudentHistory(
    gradeBookId: number,
    studentId: number
  ): Promise<{ data: AuditLog[] }> {
    return apiClient.get(`${this.baseUrl}/${gradeBookId}/audit-logs/student/${studentId}`);
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(gradeBookId: number): Promise<{ data: RecentActivity }> {
    return apiClient.get(`${this.baseUrl}/${gradeBookId}/audit-logs/recent-activity`);
  }

  /**
   * Detect suspicious activity
   */
  async getSuspiciousActivity(gradeBookId: number): Promise<{ data: SuspiciousActivity }> {
    return apiClient.get(`${this.baseUrl}/${gradeBookId}/audit-logs/suspicious-activity`);
  }

  /**
   * Get cell history
   */
  async getCellHistory(cellId: number): Promise<{ data: AuditLog[] }> {
    return apiClient.get(`${this.baseUrl}/cells/${cellId}/history`);
  }
}

export const gradeBookAuditService = new GradeBookAuditService();
export default gradeBookAuditService;
