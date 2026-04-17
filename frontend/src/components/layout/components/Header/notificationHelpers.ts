import type { UnifiedNotification } from '@/types/notifications';

export type NotificationUIType = 'task' | 'survey' | 'document' | 'system';

export const UI_TYPE_LABELS: Record<NotificationUIType, string> = {
  task: 'Tapşırıqlar',
  survey: 'Sorğular',
  document: 'Sənədlər',
  system: 'Sistem',
};

export const GROUP_THRESHOLD = 3;

export function getNotificationTypeText(notification: Pick<UnifiedNotification, 'ui_type' | 'display_type' | 'type'>): string {
  const typeForText = notification.ui_type || notification.display_type || notification.type;
  switch (typeForText) {
    case 'task': return 'Tapşırıq';
    case 'survey': return 'Sorğu';
    case 'document': return 'Sənəd';
    case 'system': return 'Sistem';
    case 'success': return 'Uğurlu';
    case 'warning': return 'Xəbərdarlıq';
    case 'error': return 'Xəta';
    default: return 'Məlumat';
  }
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return 'İndi';
  if (diffInMinutes < 60) return `${diffInMinutes} dəqiqə əvvəl`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} saat əvvəl`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} gün əvvəl`;

  return date.toLocaleDateString('az-AZ');
}

export function isNotificationCompleted(notification: UnifiedNotification): boolean {
  const meta = notification.metadata as { status?: string; action_type?: string } | undefined;
  return meta?.status === 'completed' || meta?.action_type === 'survey_completed';
}

export function getCompletionStatus(notification: UnifiedNotification): string | null {
  if (!isNotificationCompleted(notification)) return null;
  const meta = notification.metadata as { final_status?: string } | undefined;
  return meta?.final_status ?? 'completed';
}

export function getCompletionStyling(status: string | null): string {
  switch (status) {
    case 'approved':
      return 'opacity-60 bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500';
    case 'rejected':
      return 'opacity-60 bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500';
    default:
      return 'opacity-60 bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500';
  }
}

export function getCompletionText(status: string | null): string {
  switch (status) {
    case 'approved': return 'Təsdiqləndi';
    case 'rejected': return 'Rədd edildi';
    default: return 'Tamamlandı';
  }
}
