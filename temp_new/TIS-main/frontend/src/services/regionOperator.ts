import { apiClient, ApiResponse } from './api';

export interface RegionOperatorDepartmentInfo {
  id: number;
  name: string;
  type: string;
  type_label: string;
  institution: {
    id: number;
    name: string;
    type: string;
  };
  members: {
    total: number;
    active: number;
  };
}

export interface RegionOperatorTaskSummary {
  total: number;
  pending: number;
  in_progress: number;
  review: number;
  completed: number;
  overdue: number;
  upcoming: Array<{
    id: number;
    title: string;
    status: string;
    status_label: string;
    priority: string;
    priority_label: string;
    deadline: string | null;
    deadline_human?: string | null;
    progress?: number | null;
    origin_scope?: string | null;
    assigned_via?: string | null;
    assignment_status?: string | null;
    deadline_days_left?: number | null;
    is_overdue?: boolean;
  }>;
}

export interface RegionOperatorSurveySummary {
  total_responses: number;
  completed_responses: number;
  drafts: number;
  awaiting_approval: number;
  recent_responses: Array<{
    id: number;
    survey_title?: string;
    status: string;
    submitted_at?: string | null;
    created_at: string;
  }>;
}

export interface RegionOperatorDocumentSummary {
  total_uploaded: number;
  uploaded_this_month: number;
  recent_documents: Array<{
    id: number;
    title: string;
    category?: string | null;
    created_at: string;
  }>;
}

export interface RegionOperatorLinkSummary {
  total_active: number;
  recent_links: Array<{
    id: number;
    title: string;
    scope: string;
    created_at: string;
  }>;
}

export interface RegionOperatorActivityItem {
  type: string;
  title?: string | null;
  status?: string | null;
  assignment_status?: string | null;
  timestamp_iso?: string | null;
  timestamp_human?: string | null;
  meta?: Record<string, unknown>;
}

export interface RegionOperatorTeamMember {
  id: number;
  username: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string;
  created_at: string;
}

export interface RegionOperatorTeamOverview {
  department: {
    name: string;
    type: string;
    type_label: string;
  };
  members: RegionOperatorTeamMember[];
  total: number;
  active: number;
}

export interface RegionOperatorDashboardResponse {
  overview: {
    department: RegionOperatorDepartmentInfo;
    tasks: RegionOperatorTaskSummary;
    surveys: RegionOperatorSurveySummary;
    documents: RegionOperatorDocumentSummary;
    links: RegionOperatorLinkSummary;
    recent_activity: RegionOperatorActivityItem[];
  };
  team: RegionOperatorTeamOverview;
}

export interface RegionOperatorStatsResponse {
  tasks: RegionOperatorTaskSummary;
  surveys: RegionOperatorSurveySummary;
  documents: RegionOperatorDocumentSummary;
  links: RegionOperatorLinkSummary;
}

export interface RegionOperatorPendingTasksResponse {
  total: number;
  tasks: RegionOperatorTaskSummary['upcoming'];
}

export interface RegionOperatorDailyReportResponse {
  range: {
    from: string;
    to: string;
    days: number;
  };
  series: Array<{
    date: string;
    tasks_completed: number;
    tasks_updated: number;
    documents_uploaded: number;
    survey_responses_submitted: number;
  }>;
}

class RegionOperatorService {
  private readonly basePath = '/regionoperator';

  async getDashboard<T = RegionOperatorDashboardResponse>(): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/dashboard`);
    return this.unwrap(response);
  }

  async getStats<T = RegionOperatorStatsResponse>(): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/dashboard/stats`);
    return this.unwrap(response);
  }

  async getPendingTasks<T = RegionOperatorPendingTasksResponse>(params: { limit?: number } = {}): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/tasks/pending`, params);
    return this.unwrap(response);
  }

  async getDailyReports<T = RegionOperatorDailyReportResponse>(params: { days?: number } = {}): Promise<T> {
    const response = await apiClient.get<T>(`${this.basePath}/reports/daily`, params);
    return this.unwrap(response);
  }

  private unwrap<T>(response: ApiResponse<T> | any): any {
    if (!response) {
      return null;
    }

    if (typeof response === 'object' && 'data' in response && response.data !== undefined) {
      return response.data;
    }

    return response;
  }
}

export const regionOperatorService = new RegionOperatorService();

