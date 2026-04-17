import { BaseService } from './BaseService';
import { logger } from '@/utils/logger';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string; // Backend notification type (task_assigned, survey_published, etc.)
  ui_type?: 'task' | 'survey' | 'document' | 'system'; // NEW: Logical grouping for UI
  display_type?: 'info' | 'success' | 'warning' | 'error'; // NEW: UI styling type
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  user_id: number;
  sender_id?: number;
  related_entity_type?: string;
  related_entity_id?: number;
  metadata?: Record<string, unknown>;
  expires_at?: string;
  read_at?: string;
  sender?: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export interface NotificationStatistics {
  total_notifications: number;
  unread_notifications: number;
  new_today: number;
  this_week: number;
  by_type: Array<{
    type: string;
    count: number;
  }>;
  by_priority: Array<{
    priority: string;
    count: number;
  }>;
  recent_activity: Array<{
    date: string;
    count: number;
  }>;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'survey' | 'document' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipients: number[]; // User IDs
  related_entity_type?: string;
  related_entity_id?: number;
  metadata?: Record<string, unknown>;
  expires_at?: string;
  schedule_at?: string;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  priority?: string;
  is_read?: boolean;
  date_from?: string;
  date_to?: string;
  sender_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
}

/** Unread notification counts grouped by sidebar page category */
export interface PageBadgeCounts {
  tasks: number;
  tasks_assigned: number;
  surveys: number;
  documents: number;
  report_tables: number;
  attendance: number;
  system: number;
}

export interface NotificationSettings {
  email_notifications: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  notification_types: {
    task_notifications: boolean;
    survey_notifications: boolean;
    document_notifications: boolean;
    system_notifications: boolean;
    announcement_notifications: boolean;
  };
  digest_frequency: 'none' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

class NotificationService extends BaseService<Notification> {
  constructor() {
    super('/notifications');
  }

  // Normalize school notification to standard notification format
  private normalizeSchoolNotification(raw: Record<string, unknown>): Notification {
    const rawType = raw['type'] as string | undefined;
    return {
      id: raw['id'] as number,
      title: (raw['title'] as string | undefined) || (raw['message'] as string | undefined) || 'Notification',
      message: (raw['message'] as string | undefined) || (raw['description'] as string | undefined) || '',
      type: rawType || 'info',
      ui_type: this.mapTypeToUIType(rawType || ''),
      display_type: this.mapTypeToDisplayType(rawType || ''),
      priority: (raw['priority'] as Notification['priority'] | undefined) || 'medium',
      status: raw['is_read'] ? 'read' : 'unread',
      user_id: (raw['user_id'] as number | undefined) || 0,
      sender_id: raw['sender_id'] as number | undefined,
      related_entity_type: raw['related_entity_type'] as string | undefined,
      related_entity_id: raw['related_entity_id'] as number | undefined,
      metadata: (raw['metadata'] as Record<string, unknown> | undefined) || {},
      expires_at: raw['expires_at'] as string | undefined,
      read_at: raw['read_at'] as string | undefined,
      sender: raw['sender'] as Notification['sender'] | undefined,
      created_at: raw['created_at'] as string,
      updated_at: raw['updated_at'] as string,
    };
  }

  // Map backend types to UI types
  private mapTypeToUIType(type: string): 'task' | 'survey' | 'document' | 'system' {
    if (type?.includes('task')) return 'task';
    if (type?.includes('survey')) return 'survey';
    if (type?.includes('document')) return 'document';
    return 'system';
  }

  // Map backend types to display types
  private mapTypeToDisplayType(type: string): 'info' | 'success' | 'warning' | 'error' {
    if (type?.includes('approved') || type?.includes('completed')) return 'success';
    if (type?.includes('rejected') || type?.includes('failed')) return 'error';
    if (type?.includes('deadline') || type?.includes('warning')) return 'warning';
    return 'info';
  }

  async getNotifications(filters?: NotificationFilters): Promise<{ success: boolean; data: Notification[] }> {
    logger.debug('NotificationService.getNotifications called');

    try {
      const response = await this.get<Notification[]>(this.baseUrl, filters as Record<string, unknown>);
      logger.debug('NotificationService.getNotifications successful');
      return response as { success: boolean; data: Notification[] };
    } catch (error) {
      logger.error('NotificationService.getNotifications failed', error);
      throw error;
    }
  }

  async getNotification(id: number): Promise<{ success: boolean; data: Notification }> {
    logger.debug('NotificationService.getNotification called', { id });
    try {
      const response = await this.get<Notification>(`${this.baseUrl}/${id}`);
      logger.debug('NotificationService.getNotification successful');
      return response as { success: boolean; data: Notification };
    } catch (error) {
      logger.error('NotificationService.getNotification failed', error);
      throw error;
    }
  }

  async createNotification(data: CreateNotificationData): Promise<{ success: boolean; message: string; data: Notification }> {
    logger.debug('NotificationService.createNotification called');
    try {
      const response = await this.post<Notification>(this.baseUrl, data as unknown as Record<string, unknown>);
      logger.debug('NotificationService.createNotification successful');
      return response as { success: boolean; message: string; data: Notification };
    } catch (error) {
      logger.error('NotificationService.createNotification failed', error);
      throw error;
    }
  }

  async markAsRead(id: number): Promise<{ success: boolean; message: string }> {
    logger.debug('NotificationService.markAsRead called');
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/read`, {});
      logger.debug('NotificationService.markAsRead successful');
      return response as unknown as { success: boolean; message: string };
    } catch (error) {
      logger.error('NotificationService.markAsRead failed', error);
      throw error;
    }
  }

  async trackClick(id: number): Promise<void> {
    try {
      await this.post<void>(`${this.baseUrl}/${id}/click`, {});
    } catch (error) {
      // Click tracking is non-critical — log and continue
      logger.warn('NotificationService.trackClick failed', error);
    }
  }

  async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    logger.debug('NotificationService.markAllAsRead called');
    try {
      const response = await this.post<void>(`${this.baseUrl}/mark-all-read`, {});
      logger.debug('NotificationService.markAllAsRead successful');
      return response as { success: boolean; message: string };
    } catch (error) {
      logger.error('NotificationService.markAllAsRead failed', error);
      throw error;
    }
  }

  async archiveNotification(id: number): Promise<{ success: boolean; message: string }> {
    // Archive is not a separate backend feature — treat it as delete for now
    logger.debug('NotificationService.archiveNotification -> delete');
    return this.deleteNotification(id);
  }

  async deleteNotification(id: number): Promise<{ success: boolean; message: string }> {
    logger.debug('NotificationService.deleteNotification called');
    try {
      // BaseService.delete(id) expects a number, so call super.delete(id)
      await super.delete(id);
      logger.debug('NotificationService.deleteNotification successful');
      return { success: true, message: 'Bildiriş silindi' };
    } catch (error) {
      logger.error('NotificationService.deleteNotification failed', error);
      throw error;
    }
  }

  async getNotificationStatistics(): Promise<{
    success: boolean;
    data: NotificationStatistics;
  }> {
    logger.debug('NotificationService.getNotificationStatistics called');
    try {
      const response = await this.get<NotificationStatistics>(`${this.baseUrl}/statistics`);
      logger.debug('NotificationService.getNotificationStatistics successful');
      return response as { success: boolean; data: NotificationStatistics };
    } catch (error) {
      logger.warn('NotificationService.getNotificationStatistics failed, returning empty stats', error);
      return {
        success: false,
        data: {
          total_notifications: 0,
          unread_notifications: 0,
          new_today: 0,
          this_week: 0,
          by_type: [],
          by_priority: [],
          recent_activity: []
        }
      };
    }
  }

  async getUnreadCount(): Promise<{ success: boolean; data: { count: number } }> {
    logger.debug('NotificationService.getUnreadCount called');
    try {
      const response = await this.get<{ count: number }>(`${this.baseUrl}/unread-count`);
      logger.debug('NotificationService.getUnreadCount successful');
      return response as { success: boolean; data: { count: number } };
    } catch (error) {
      logger.error('NotificationService.getUnreadCount failed', error);
      throw error;
    }
  }

  /** Fetch unread counts grouped by page category for sidebar badges. */
  async getPageBadgeCounts(): Promise<{ success: boolean; data: PageBadgeCounts }> {
    try {
      const response = await this.get<PageBadgeCounts>(`${this.baseUrl}/page-badge-counts`);
      return response as { success: boolean; data: PageBadgeCounts };
    } catch (error) {
      logger.warn('NotificationService.getPageBadgeCounts failed', error);
      return {
        success: false,
        data: { tasks: 0, surveys: 0, documents: 0, report_tables: 0, attendance: 0, system: 0 },
      };
    }
  }

  async getUserSettings(): Promise<{ success: boolean; data: NotificationSettings }> {
    logger.debug('NotificationService.getUserSettings called');
    try {
      const response = await this.get<NotificationSettings>(`${this.baseUrl}/settings`);
      logger.debug('NotificationService.getUserSettings successful');
      return response as { success: boolean; data: NotificationSettings };
    } catch (error) {
      logger.error('NotificationService.getUserSettings failed', error);
      throw error;
    }
  }

  async updateUserSettings(settings: Partial<NotificationSettings>): Promise<{ success: boolean; message: string }> {
    logger.debug('NotificationService.updateUserSettings called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/settings`, settings);
      logger.debug('NotificationService.updateUserSettings successful');
      return response as { success: boolean; message: string };
    } catch (error) {
      logger.error('NotificationService.updateUserSettings failed', error);
      throw error;
    }
  }

  async sendBulkNotification(data: {
    title: string;
    message: string;
    type: string;
    priority: string;
    recipient_filters: {
      roles?: string[];
      institutions?: number[];
      departments?: string[];
    };
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; message: string; data: { sent_count: number } }> {
    logger.debug('NotificationService.sendBulkNotification called');
    try {
      const response = await this.post<{ sent_count: number }>(`${this.baseUrl}/bulk`, data);
      logger.debug('NotificationService.sendBulkNotification successful');
      return response as { success: boolean; message: string; data: { sent_count: number } };
    } catch (error) {
      logger.error('NotificationService.sendBulkNotification failed', error);
      throw error;
    }
  }

  async subscribeToNotifications(): Promise<{ success: boolean; message: string }> {
    logger.debug('NotificationService.subscribeToNotifications called');
    try {
      const response = await this.post<void>(`${this.baseUrl}/subscribe`, {});
      logger.debug('NotificationService.subscribeToNotifications successful');
      return response as { success: boolean; message: string };
    } catch (error) {
      logger.error('NotificationService.subscribeToNotifications failed', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();