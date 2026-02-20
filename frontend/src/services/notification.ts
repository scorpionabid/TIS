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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
  expires_at?: string;
  schedule_at?: string;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  sender_id?: number;
  search?: string;
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
  private normalizeSchoolNotification(schoolNotification: any): Notification {
    return {
      id: schoolNotification.id,
      title: schoolNotification.title || schoolNotification.message || 'Notification',
      message: schoolNotification.message || schoolNotification.description || '',
      type: schoolNotification.type || 'info',
      ui_type: this.mapTypeToUIType(schoolNotification.type),
      display_type: this.mapTypeToDisplayType(schoolNotification.type),
      priority: schoolNotification.priority || 'medium',
      status: schoolNotification.is_read ? 'read' : 'unread',
      user_id: schoolNotification.user_id || 0,
      sender_id: schoolNotification.sender_id,
      related_entity_type: schoolNotification.related_entity_type,
      related_entity_id: schoolNotification.related_entity_id,
      metadata: schoolNotification.metadata || {},
      expires_at: schoolNotification.expires_at,
      read_at: schoolNotification.read_at,
      sender: schoolNotification.sender,
      created_at: schoolNotification.created_at,
      updated_at: schoolNotification.updated_at
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
    console.log('🔍 NotificationService.getNotification called for ID:', id);
    try {
      const response = await this.get<Notification>(`${this.baseUrl}/${id}`);
      console.log('✅ NotificationService.getNotification successful:', response);
      return response as { success: boolean; data: Notification };
    } catch (error) {
      console.error('❌ NotificationService.getNotification failed:', error);
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
      // Backend supports both /read and /mark-read
      const response = await this.post<void>(`${this.baseUrl}/${id}/read`, {});
      logger.debug('NotificationService.markAsRead successful');
      return response as unknown as { success: boolean; message: string };
    } catch (error) {
      logger.error('NotificationService.markAsRead failed', error);
      throw error;
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

  async getUserSettings(): Promise<{ success: boolean; data: NotificationSettings }> {
    console.log('🔍 NotificationService.getUserSettings called');
    try {
      const response = await this.get<NotificationSettings>(`${this.baseUrl}/settings`);
      console.log('✅ NotificationService.getUserSettings successful:', response);
      return response as { success: boolean; data: NotificationSettings };
    } catch (error) {
      console.error('❌ NotificationService.getUserSettings failed:', error);
      throw error;
    }
  }

  async updateUserSettings(settings: Partial<NotificationSettings>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NotificationService.updateUserSettings called with:', settings);
    try {
      const response = await this.put<void>(`${this.baseUrl}/settings`, settings);
      console.log('✅ NotificationService.updateUserSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ NotificationService.updateUserSettings failed:', error);
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
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; data: { sent_count: number } }> {
    console.log('🔍 NotificationService.sendBulkNotification called with:', data);
    try {
      const response = await this.post<{ sent_count: number }>(`${this.baseUrl}/bulk`, data);
      console.log('✅ NotificationService.sendBulkNotification successful:', response);
      return response as { success: boolean; message: string; data: { sent_count: number } };
    } catch (error) {
      console.error('❌ NotificationService.sendBulkNotification failed:', error);
      throw error;
    }
  }

  async subscribeToNotifications(): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NotificationService.subscribeToNotifications called');
    try {
      const response = await this.post<void>(`${this.baseUrl}/subscribe`, {});
      console.log('✅ NotificationService.subscribeToNotifications successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ NotificationService.subscribeToNotifications failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
  getMockNotifications(): Notification[] {
    return [
      {
        id: 1,
        title: 'Yeni sorğu yaradıldı',
        message: 'Məktəb infrastrukturu sorğusu yaradıldı və təsdiq gözləyir.',
        type: 'survey_assigned', // Backend type
        ui_type: 'survey', // NEW: UI grouping
        display_type: 'info', // NEW: Styling type
        priority: 'medium',
        status: 'unread',
        user_id: 1,
        sender_id: 2,
        related_entity_type: 'Survey',
        related_entity_id: 15,
        sender: {
          id: 2,
          first_name: 'Admin',
          last_name: 'İstifadəçi',
          role: 'SuperAdmin'
        },
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        title: 'Yeni tapşırıq təyin edildi',
        message: 'Sizə yeni tapşırıq təyin edildi: "Şagird qiymətləndirmə sistemi"',
        type: 'task_assigned', // Backend type
        ui_type: 'task', // NEW: UI grouping
        display_type: 'info', // NEW: Styling type
        priority: 'high',
        status: 'unread',
        user_id: 1,
        sender_id: 3,
        related_entity_type: 'Task',
        related_entity_id: 24,
        sender: {
          id: 3,
          first_name: 'Müdür',
          last_name: 'Əliyev',
          role: 'SchoolAdmin'
        },
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        title: 'Yeni sənəd paylaşıldı',
        message: 'Dərs planı şablonu sizinlə paylaşıldı.',
        type: 'document',
        priority: 'low',
        status: 'read',
        user_id: 1,
        sender_id: 4,
        related_entity_type: 'Document',
        related_entity_id: 42,
        read_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        sender: {
          id: 4,
          first_name: 'Məryəm',
          last_name: 'Həsənova',
          role: 'Teacher'
        },
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        title: 'Sistem yenilənməsi',
        message: 'Sistem texniki baxım üçün sabah 02:00-04:00 arası dayandırılacaq.',
        type: 'maintenance', // Backend type
        ui_type: 'system', // NEW: UI grouping
        display_type: 'warning', // NEW: Styling type
        priority: 'urgent',
        status: 'unread',
        user_id: 1,
        sender_id: 1,
        related_entity_type: 'Maintenance',
        related_entity_id: 1,
        sender: {
          id: 1,
          first_name: 'Sistem',
          last_name: 'Administrator',
          role: 'SuperAdmin'
        },
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        title: 'Sorğu nəticələri hazırlandı',
        message: 'Müəllim məmnuniyyəti sorğusunun nəticələri hazır.',
        type: 'survey',
        priority: 'medium',
        status: 'read',
        user_id: 1,
        sender_id: 2,
        related_entity_type: 'Survey',
        related_entity_id: 12,
        read_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        sender: {
          id: 2,
          first_name: 'Admin',
          last_name: 'İstifadəçi',
          role: 'SuperAdmin'
        },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
  }

  getMockStatistics(): NotificationStatistics {
    return {
      total_notifications: 156,
      unread_notifications: 12,
      new_today: 8,
      this_week: 25,
      by_type: [
        { type: 'task', count: 45 },
        { type: 'survey', count: 38 },
        { type: 'document', count: 32 },
        { type: 'system', count: 28 },
        { type: 'info', count: 13 }
      ],
      by_priority: [
        { priority: 'low', count: 78 },
        { priority: 'medium', count: 52 },
        { priority: 'high', count: 21 },
        { priority: 'urgent', count: 5 }
      ],
      recent_activity: [
        { date: '2024-08-15', count: 8 },
        { date: '2024-08-14', count: 12 },
        { date: '2024-08-13', count: 15 },
        { date: '2024-08-12', count: 9 },
        { date: '2024-08-11', count: 6 },
        { date: '2024-08-10', count: 4 },
        { date: '2024-08-09', count: 7 }
      ]
    };
  }
}

export const notificationService = new NotificationService();