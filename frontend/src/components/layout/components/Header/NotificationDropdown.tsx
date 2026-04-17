import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UnifiedNotification } from '@/types/notifications';
import { NotificationItem, getNotificationIcon } from './NotificationItem';
import { UI_TYPE_LABELS, GROUP_THRESHOLD, type NotificationUIType } from './notificationHelpers';

interface NotificationDropdownProps {
  className?: string;
  enableRealTime?: boolean;
  maxNotifications?: number;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className,
  enableRealTime = true,
  maxNotifications = 10,
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useRealTimeNotifications({ autoToast: enableRealTime, maxToastNotifications: 3, enableSound: false });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) =>
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      toast.success('Bildiriş oxundu olaraq qeyd edildi');
    } catch {
      toast.error('Xəta baş verdi');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('Bütün bildirişlər oxundu olaraq qeyd edildi');
    } catch {
      toast.error('Xəta baş verdi');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshNotifications();
      toast.success('Bildirişlər yeniləndi');
    } catch {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    }
  };

  const displayNotifications = notifications.slice(0, maxNotifications);

  // Group notifications by ui_type when GROUP_THRESHOLD+ of the same type exist
  const groupedMap = displayNotifications.reduce<Record<string, UnifiedNotification[]>>((acc, n) => {
    const key = n.ui_type ?? 'system';
    acc[key] = acc[key] ?? [];
    acc[key].push(n);
    return acc;
  }, {});

  const shouldGroup = Object.values(groupedMap).some(g => g.length >= GROUP_THRESHOLD);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0', className)}>
          <Bell className={cn('h-4 w-4', unreadCount > 0 && enableRealTime ? 'animate-pulse text-primary' : '')} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center text-[10px] font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {/* Header */}
        <DropdownMenuLabel className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Bildirişlər</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs h-6 px-2">
                <CheckCheck className="h-3 w-3 mr-1" />
                Hamısını oxundu qeyd et
              </Button>
            )}
            {enableRealTime && (
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-6 px-2" disabled={isLoading}>
                <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Notifications List */}
        {displayNotifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Bildirişlər yüklənir...' : 'Bildiriş yoxdur'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {shouldGroup
              ? Object.entries(groupedMap).map(([typeKey, items]) => {
                  const isExpanded = expandedGroups[typeKey] ?? false;
                  const label = UI_TYPE_LABELS[typeKey as NotificationUIType] ?? typeKey;
                  const unreadInGroup = items.filter(n => !n.is_read).length;
                  const showCollapsed = items.length >= GROUP_THRESHOLD && !isExpanded;
                  return (
                    <div key={typeKey}>
                      <button
                        onClick={() => toggleGroup(typeKey)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-accent/30 rounded-md transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {getNotificationIcon({ ui_type: typeKey as UnifiedNotification['ui_type'], type: typeKey, display_type: undefined })}
                          {label}
                          {unreadInGroup > 0 && (
                            <Badge variant="destructive" className="h-4 text-[10px] px-1">
                              {unreadInGroup}
                            </Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-[11px]">{items.length}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      </button>
                      {showCollapsed && items[0] && (
                        <NotificationItem
                          notification={items[0]}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      )}
                      {isExpanded && items.map(n => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      ))}
                    </div>
                  );
                })
              : displayNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
            }
          </div>
        )}

        {notifications.length > maxNotifications && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { window.location.href = '/notifications'; }}
              >
                Bütün bildirişləri gör ({notifications.length})
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
