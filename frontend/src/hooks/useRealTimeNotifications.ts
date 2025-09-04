import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { USER_ROLES } from '@/constants/roles';

export interface RealTimeNotification {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface NotificationUpdate {
  type: 'new_notification' | 'notification_read' | 'bulk_update';
  notification?: RealTimeNotification;
  notifications?: RealTimeNotification[];
  count?: number;
}

interface UseRealTimeNotificationsOptions {
  autoToast?: boolean;
  maxToastNotifications?: number;
  enableSound?: boolean;
}

interface UseRealTimeNotificationsReturn {
  notifications: RealTimeNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearNotifications: () => void;
}

export const useRealTimeNotifications = (
  options: UseRealTimeNotificationsOptions = {}
): UseRealTimeNotificationsReturn => {
  const { 
    autoToast = true, 
    maxToastNotifications = 3,
    enableSound = false 
  } = options;
  
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [toastCount, setToastCount] = useState(0);
  
  // Check if user role supports notifications
  const supportsNotifications = currentUser?.roles?.some(role => 
    [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.REGIONADMIN].includes(role.name)
  );
  
  // For SuperAdmin and others without school association, disable schooladmin notifications
  const canUseSchoolAdminNotifications = currentUser?.roles?.some(role => 
    role.name === USER_ROLES.SCHOOLADMIN
  ) && currentUser?.institution_id;

  // Fetch initial notifications
  const { 
    data: initialNotifications, 
    isLoading,
    refetch: refreshNotifications
  } = useQuery({
    queryKey: canUseSchoolAdminNotifications ? schoolAdminKeys.notifications() : ['notifications', 'general'],
    queryFn: () => {
      if (canUseSchoolAdminNotifications) {
        return schoolAdminService.getNotifications({ per_page: 50 });
      }
      // For SuperAdmin and others, return empty notifications or use a different service
      return Promise.resolve([]);
    },
    enabled: !!currentUser && supportsNotifications,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Initialize notifications from query
  useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications);
      logger.debug('Initialized notifications', {
        hook: 'useRealTimeNotifications',
        count: initialNotifications.length
      });
    }
  }, [initialNotifications]);

  // WebSocket simulation (since real WebSocket might not be configured)
  useEffect(() => {
    if (!currentUser || !canUseSchoolAdminNotifications) return;

    // Simulate periodic notification checks (replace with real WebSocket)
    const interval = setInterval(async () => {
      try {
        const latestNotifications = await schoolAdminService.getNotifications({ per_page: 5 });
        
        // Check for new notifications
        const existingIds = new Set(notifications.map(n => n.id));
        const newNotifications = latestNotifications.filter(n => !existingIds.has(n.id));
        
        if (newNotifications.length > 0) {
          setNotifications(prev => [...newNotifications, ...prev]);
          
          // Show toast for new notifications
          if (autoToast && toastCount < maxToastNotifications) {
            newNotifications.forEach(notification => {
              toast[notification.type]?.(notification.title, {
                description: notification.message,
                action: notification.action_url ? {
                  label: 'Bax',
                  onClick: () => window.location.href = notification.action_url!
                } : undefined
              });
            });
            setToastCount(prev => prev + newNotifications.length);
          }
          
          // Play sound if enabled
          if (enableSound && newNotifications.length > 0) {
            playNotificationSound();
          }
          
          logger.info(`Received ${newNotifications.length} new notifications`, {
            hook: 'useRealTimeNotifications',
            notifications: newNotifications.map(n => ({ id: n.id, type: n.type, title: n.title }))
          });
        }
      } catch (error) {
        logger.error('Failed to check for new notifications', error, {
          hook: 'useRealTimeNotifications'
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [currentUser, notifications, autoToast, toastCount, maxToastNotifications, enableSound, canUseSchoolAdminNotifications]);

  // Reset toast count periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      setToastCount(0);
    }, 300000); // Reset every 5 minutes

    return () => clearInterval(resetInterval);
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      logger.warn('Failed to play notification sound', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!canUseSchoolAdminNotifications) return;
    
    try {
      await schoolAdminService.markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.notifications() });
      
      logger.debug(`Marked notification ${notificationId} as read`, {
        hook: 'useRealTimeNotifications'
      });
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as read`, error);
      throw error;
    }
  }, [queryClient, canUseSchoolAdminNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!canUseSchoolAdminNotifications) return;
    
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      await Promise.all(
        unreadNotifications.map(notification =>
          schoolAdminService.markNotificationAsRead(notification.id)
        )
      );
      
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.notifications() });
      
      logger.info(`Marked ${unreadNotifications.length} notifications as read`, {
        hook: 'useRealTimeNotifications'
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }, [notifications, queryClient, canUseSchoolAdminNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setToastCount(0);
    logger.debug('Cleared all notifications from state', {
      hook: 'useRealTimeNotifications'
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearNotifications
  };
};

export default useRealTimeNotifications;