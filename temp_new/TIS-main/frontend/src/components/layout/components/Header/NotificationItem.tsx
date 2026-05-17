import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Eye,
  Trash2,
  CheckCircle2,
  FileText,
  File,
  AlertTriangle,
} from 'lucide-react';
import { notificationService } from '@/services/notification';
import type { UnifiedNotification } from '@/types/notifications';
import {
  getNotificationTypeText,
  formatTimeAgo,
  isNotificationCompleted,
  getCompletionStatus,
  getCompletionStyling,
  getCompletionText,
} from './notificationHelpers';

export function getNotificationIcon(
  notification: Pick<UnifiedNotification, 'ui_type' | 'display_type' | 'type'>,
): React.ReactElement {
  const iconType = notification.ui_type || notification.display_type || notification.type;
  switch (iconType) {
    case 'task': return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'survey': return <FileText className="h-4 w-4 text-green-500" />;
    case 'document': return <File className="h-4 w-4 text-purple-500" />;
    case 'system': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Info className="h-4 w-4 text-gray-500" />;
  }
}

export interface NotificationItemProps {
  notification: UnifiedNotification;
  onMarkAsRead: (id: number) => void;
  onDelete?: (id: number) => void;
  onNotificationClick?: (id: number) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onNotificationClick,
}) => {
  const isRead = notification.is_read;
  const completionStatus = getCompletionStatus(notification);
  const createdAt = notification.created_at ?? notification.createdAt ?? '';

  return (
    <div
      className={`relative p-3 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
        !isRead ? 'bg-accent/30' : ''
      } ${completionStatus ? getCompletionStyling(completionStatus) : ''}`}
      onClick={() => {
        notificationService.trackClick(notification.id as number);
        if (notification.action_url) {
          window.location.href = notification.action_url;
        } else if (onNotificationClick) {
          onNotificationClick(notification.id as number);
        }
        if (!isRead) {
          onMarkAsRead(notification.id as number);
        }
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {isNotificationCompleted(notification) ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            getNotificationIcon(notification)
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between">
            <h4 className="text-sm font-medium text-foreground truncate pr-2">
              {notification.title}
            </h4>
            {!isRead && (
              <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge
                variant={isNotificationCompleted(notification) ? 'secondary' : 'outline'}
                className={`text-xs h-4 ${
                  isNotificationCompleted(notification)
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : ''
                }`}
              >
                {completionStatus
                  ? getCompletionText(completionStatus)
                  : getNotificationTypeText(notification)}
              </Badge>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(createdAt)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {!isRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id as number); }}
                  className="h-6 w-6"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onDelete(notification.id as number); }}
                  className="h-6 w-6 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
