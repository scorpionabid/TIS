import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getNotificationTypeText = (type: Notification['type']) => {
  switch (type) {
    case 'success': return 'Uğurlu';
    case 'warning': return 'Xəbərdarlıq';
    case 'error': return 'Xəta';
    default: return 'Məlumat';
  }
};

const formatTimeAgo = (dateString: string) => {
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
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center text-[10px] font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
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
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs h-6 px-2"
            >
              Hamısını oxundu qeyd et
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Bildiriş yoxdur</p>
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative p-3 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                  !notification.isRead ? 'bg-accent/30' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-foreground truncate pr-2">
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs h-4">
                          {getNotificationTypeText(notification.type)}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notification.id);
                            }}
                            className="h-6 w-6"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                          }}
                          className="h-6 w-6 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full">
                Bütün bildirişləri gör
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};