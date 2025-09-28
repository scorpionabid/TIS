/**
 * Unified Notification Type Definitions
 * Centralized interfaces for all notification-related types across ATİS
 */

// Core notification types and priorities
export type NotificationType = 'system' | 'task' | 'survey' | 'document' | 'assessment' | 'schedule';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationDisplayType = 'info' | 'success' | 'warning' | 'error';
export type NotificationUIType = 'task' | 'survey' | 'document' | 'system';

// Core unified notification interface
export interface UnifiedNotification {
  id: number | string;
  type: string; // Backend notification type (task_assigned, survey_published, etc.)
  ui_type?: NotificationUIType; // Logical grouping for UI
  display_type?: NotificationDisplayType; // UI styling type
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  read_at?: string | null;
  action_url?: string;
  metadata?: Record<string, any>;
  createdAt?: string; // Backend alias
  data?: {
    action_url?: string;
    [key: string]: any;
  };
  // Additional fields from different sources
  related_entity_type?: string;
  related_entity_id?: number;
  institution_id?: number;
  user_id?: number;
  priority?: NotificationPriority;
  language?: string;
  channel?: string;
}

// Real-time notification interface (extends unified)
export interface RealTimeNotification extends UnifiedNotification {
  broadcast_channel?: string; // WebSocket channel information
  timestamp?: number; // Real-time timestamp for ordering
}

// Notification update events
export interface NotificationUpdate {
  type: 'new_notification' | 'notification_read' | 'bulk_update';
  notification?: UnifiedNotification;
  notifications?: UnifiedNotification[];
  count?: number;
}

// School admin specific notification (legacy support)
export interface SchoolNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  user_id?: number;
  related_entity_type?: string;
  related_entity_id?: number;
  // Add minimal required fields to avoid empty interface
  institution_id?: number;
}

// Notification statistics
export interface NotificationStatistics {
  total: number;
  unread: number;
  read: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  recent_count: number;
  today_count: number;
  this_week_count: number;
  this_month_count: number;
}

// Create notification data interface
export interface CreateNotificationData {
  title: string;
  message: string;
  type: string;
  priority?: NotificationPriority;
  channel?: string;
  user_id?: number;
  metadata?: Record<string, any>;
  action_url?: string;
  scheduled_at?: string;
  language?: string;
}

// Notification filters
export interface NotificationFilters {
  type?: string;
  priority?: NotificationPriority;
  is_read?: boolean;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

// Notification settings
export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  sound_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  categories: {
    tasks: boolean;
    surveys: boolean;
    documents: boolean;
    assessments: boolean;
    system: boolean;
  };
}

// UI notification events (for toast notifications)
export interface NotificationEvent {
  type: NotificationDisplayType;
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
}

// Component props for notification components
export interface NotificationProps {
  notification: UnifiedNotification;
  onRead?: (id: number | string) => void;
  onAction?: (actionUrl: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

// Resource notification data (specific to resource management)
export interface ResourceNotificationData {
  resource_id: number;
  resource_type: string;
  action: 'created' | 'updated' | 'deleted' | 'shared';
  actor_name: string;
  resource_title: string;
}

// System notification (for dashboard)
export interface SystemNotification extends UnifiedNotification {
  severity: 'low' | 'medium' | 'high' | 'critical';
  system_component?: string;
  auto_resolve?: boolean;
  resolution_steps?: string[];
}

// Hook options and return types
export interface UseRealTimeNotificationsOptions {
  autoToast?: boolean;
  maxToastNotifications?: number;
  enableSound?: boolean;
  enableWebSocket?: boolean;
  fallbackPollingInterval?: number;
}

export interface UseRealTimeNotificationsReturn {
  notifications: UnifiedNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<any>;
  clearNotifications: () => void;
}

// Type mappings for backend compatibility
export const NOTIFICATION_TYPE_MAPPINGS: Record<string, { ui_type: NotificationUIType; display_type: NotificationDisplayType }> = {
  'task_assigned': { ui_type: 'task', display_type: 'info' },
  'task_updated': { ui_type: 'task', display_type: 'info' },
  'task_completed': { ui_type: 'task', display_type: 'success' },
  'task_overdue': { ui_type: 'task', display_type: 'warning' },
  'task_deadline_approaching': { ui_type: 'task', display_type: 'warning' },
  'survey_published': { ui_type: 'survey', display_type: 'info' },
  'survey_assigned': { ui_type: 'survey', display_type: 'info' },
  'survey_approved': { ui_type: 'survey', display_type: 'success' },
  'survey_deadline_approaching': { ui_type: 'survey', display_type: 'warning' },
  'document_shared': { ui_type: 'document', display_type: 'info' },
  'document_uploaded': { ui_type: 'document', display_type: 'success' },
  'document_updated': { ui_type: 'document', display_type: 'info' },
  'system_alert': { ui_type: 'system', display_type: 'warning' },
  'system_maintenance': { ui_type: 'system', display_type: 'info' },
  'system_error': { ui_type: 'system', display_type: 'error' },
};

// Utility functions
export function normalizeNotification(notification: any): UnifiedNotification {
  const mapping = NOTIFICATION_TYPE_MAPPINGS[notification.type];

  return {
    ...notification,
    is_read: notification.is_read ?? (notification.read_at ? true : false),
    action_url: notification.action_url || notification.data?.action_url,
    ui_type: mapping?.ui_type || 'system',
    display_type: mapping?.display_type || 'info',
  };
}

export function mapTypeToUIType(type: string): NotificationUIType {
  return NOTIFICATION_TYPE_MAPPINGS[type]?.ui_type || 'system';
}

export function mapTypeToDisplayType(type: string): NotificationDisplayType {
  return NOTIFICATION_TYPE_MAPPINGS[type]?.display_type || 'info';
}

// Legacy compatibility types (for gradual migration)
export type Notification = UnifiedNotification; // Alias for backward compatibility