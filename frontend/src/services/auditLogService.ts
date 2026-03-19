import { apiClient, PaginatedResponse } from './api';

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  event: string;
  auditable_type: string | null;
  auditable_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  tags: string[] | null;
  institution_id: number | null;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  };
  institution?: {
    id: number;
    name: string;
  };
}

export interface ActivityLogEntry {
  id: number;
  user_id: number | null;
  ip_address: string | null;
  activity_type: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  properties: Record<string, unknown> | null;
  institution_id: number | null;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
  };
}

export interface AuditLogFilters {
  event?: string;
  user_id?: number;
  auditable_type?: string;
  institution_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
  page?: number;
}

export interface AuditSummary {
  today: number;
  this_week: number;
  this_month: number;
  active_users_24h: number;
  security_events_week: number;
}

const auditLogService = {
  async getLogs(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> {
    const response = await apiClient.get<AuditLogEntry[]>('/audit-logs', filters);
    return response as PaginatedResponse<AuditLogEntry>;
  },

  async getActivities(filters?: AuditLogFilters): Promise<PaginatedResponse<ActivityLogEntry>> {
    const response = await apiClient.get<ActivityLogEntry[]>('/audit-logs/activities', filters);
    return response as PaginatedResponse<ActivityLogEntry>;
  },

  async getSummary(): Promise<AuditSummary> {
    const response = await apiClient.get<AuditSummary>('/audit-logs/summary');
    return (response as { data: AuditSummary }).data;
  },

  async getEventTypes(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/audit-logs/event-types');
    return (response as { data: string[] }).data ?? [];
  },
};

export default auditLogService;
