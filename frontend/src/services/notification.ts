import { BaseService } from './BaseService';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'survey' | 'document' | 'system';
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

class NotificationService extends BaseService {
  constructor() {
    super('/notifications');
  }

  async getNotifications(filters?: NotificationFilters): Promise<{ success: boolean; data: Notification[] }> {
    console.log('🔍 NotificationService.getNotifications called with filters:', filters);
    try {
      // First try survey-notifications endpoint (no permission required)
      try {
        const surveyResponse = await this.get<Notification[]>('/survey-notifications', filters);
        console.log('✅ NotificationService.getNotifications via survey-notifications successful:', surveyResponse);
        return surveyResponse as { success: boolean; data: Notification[] };
      } catch (surveyError) {
        console.log('⚠️ survey-notifications failed, trying general notifications:', surveyError);
        // Fallback to general notifications (requires permissions)
        const response = await this.get<Notification[]>(this.baseUrl, filters);
        console.log('✅ NotificationService.getNotifications via general notifications successful:', response);
        return response as { success: boolean; data: Notification[] };
      }
    } catch (error) {
      console.error('❌ NotificationService.getNotifications failed:', error);
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
    console.log('🔍 NotificationService.createNotification called with:', data);
    try {
      const response = await this.post<Notification>(this.baseUrl, data);
      console.log('✅ NotificationService.createNotification successful:', response);
      return response as { success: boolean; message: string; data: Notification };
    } catch (error) {
      console.error('❌ NotificationService.createNotification failed:', error);
      throw error;
    }
  }

  async markAsRead(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NotificationService.markAsRead called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/read`, {});
      console.log('✅ NotificationService.markAsRead successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ NotificationService.markAsRead failed:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NotificationService.markAllAsRead called');
    try {
      const response = await this.post<void>(`${this.baseUrl}/mark-all-read`, {});
      console.log('✅ NotificationService.markAllAsRead successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ NotificationService.markAllAsRead failed:', error);
      throw error;
    }
  }

  async archiveNotification(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NotificationService.archiveNotification called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/archive`, {});
      console.log('✅ NotificationService.archiveNotification successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ NotificationService.archiveNotification failed:', error);
      throw error;
    }
  }

  async deleteNotification(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 NotificationService.deleteNotification called for ID:', id);
    try {
      const response = await this.delete<void>(`${this.baseUrl}/${id}`);
      console.log('✅ NotificationService.deleteNotification successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ NotificationService.deleteNotification failed:', error);
      throw error;
    }
  }

  async getNotificationStatistics(): Promise<{ 
    success: boolean; 
    data: NotificationStatistics 
  }> {
    console.log('🔍 NotificationService.getNotificationStatistics called');
    try {
      const response = await this.get<NotificationStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ NotificationService.getNotificationStatistics successful:', response);
      return response as { 
        success: boolean; 
        data: NotificationStatistics 
      };
    } catch (error) {
      console.error('❌ NotificationService.getNotificationStatistics failed:', error);
      // Return mock data if API not available
      return {
        success: true,
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
    console.log('🔍 NotificationService.getUnreadCount called');
    try {
      const response = await this.get<{ count: number }>(`${this.baseUrl}/unread-count`);
      console.log('✅ NotificationService.getUnreadCount successful:', response);
      return response as { success: boolean; data: { count: number } };
    } catch (error) {
      console.error('❌ NotificationService.getUnreadCount failed:', error);
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
        type: 'survey',
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
        type: 'task',
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
        type: 'system',
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