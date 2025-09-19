import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { notificationService } from '@/services/notification';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { USER_ROLES } from '@/constants/roles';

export interface RealTimeNotification {
  id: number | string;
  type: 'info' | 'warning' | 'success' | 'error' | 'task_assigned' | 'survey_assigned' | 'survey_assignment';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  createdAt?: string; // Backend alias
  read_at?: string | null; // Survey notifications use read_at instead of is_read
  data?: {
    action_url?: string;
    [key: string]: any;
  };
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
  refreshNotifications: () => Promise<any>;
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

  // Normalize notifications from different sources
  const normalizeNotification = (notification: any): RealTimeNotification => {
    return {
      ...notification,
      is_read: notification.is_read ?? (notification.read_at ? true : false),
      action_url: notification.action_url || notification.data?.action_url,
    };
  };
  
  // Check if user role supports notifications
  const supportsNotifications = currentUser?.roles?.some(role =>
    [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.TEACHER].includes(role.name)
  );

  // For SuperAdmin and others without school association, disable schooladmin notifications
  const canUseSchoolAdminNotifications = currentUser?.roles?.some(role =>
    role.name === USER_ROLES.SCHOOLADMIN
  ) && currentUser?.institution_id;

  // All authenticated users can use general notifications
  const canUseGeneralNotifications = !!currentUser;

  // Fetch initial notifications
  const {
    data: initialNotifications,
    isLoading,
    refetch: refreshNotifications
  } = useQuery({
    queryKey: canUseSchoolAdminNotifications ? schoolAdminKeys.notifications() : ['notifications', 'general'],
    queryFn: async () => {
      if (canUseSchoolAdminNotifications) {
        return schoolAdminService.getNotifications({ per_page: 50 });
      }
      // Use general notification service for all other users
      if (canUseGeneralNotifications) {
        const response = await notificationService.getNotifications({ per_page: 50 });
        logger.debug('General notifications fetched:', response);
        // Handle both direct array and wrapped response formats
        let rawNotifications = [];
        if (Array.isArray(response)) {
          rawNotifications = response;
        } else if (response.data) {
          rawNotifications = response.data;
        } else if (response.success && response.data) {
          rawNotifications = response.data;
        }
        return rawNotifications.map(normalizeNotification);
      }
      return [];
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
    if (!currentUser || (!canUseSchoolAdminNotifications && !canUseGeneralNotifications)) return;

    // Simulate periodic notification checks (replace with real WebSocket)
    const interval = setInterval(async () => {
      try {
        let latestNotifications = [];

        if (canUseSchoolAdminNotifications) {
          latestNotifications = await schoolAdminService.getNotifications({ per_page: 5 });
        } else if (canUseGeneralNotifications) {
          const response = await notificationService.getNotifications({ per_page: 5 });
          // Handle both direct array and wrapped response formats
          let rawNotifications = [];
          if (Array.isArray(response)) {
            rawNotifications = response;
          } else if (response.data) {
            rawNotifications = response.data;
          } else if (response.success && response.data) {
            rawNotifications = response.data;
          }
          latestNotifications = rawNotifications.map(normalizeNotification);
        }

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
  }, [currentUser, notifications, autoToast, toastCount, maxToastNotifications, enableSound, canUseSchoolAdminNotifications, canUseGeneralNotifications]);

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
    if (!canUseSchoolAdminNotifications && !canUseGeneralNotifications) return;

    try {
      if (canUseSchoolAdminNotifications) {
        await schoolAdminService.markNotificationAsRead(notificationId);
      } else if (canUseGeneralNotifications) {
        await notificationService.markAsRead(notificationId);
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Invalidate notifications query
      if (canUseSchoolAdminNotifications) {
        queryClient.invalidateQueries({ queryKey: schoolAdminKeys.notifications() });
      } else {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'general'] });
      }

      logger.debug(`Marked notification ${notificationId} as read`, {
        hook: 'useRealTimeNotifications'
      });
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as read`, error);
      throw error;
    }
  }, [queryClient, canUseSchoolAdminNotifications, canUseGeneralNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!canUseSchoolAdminNotifications && !canUseGeneralNotifications) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);

      if (canUseSchoolAdminNotifications) {
        await Promise.all(
          unreadNotifications.map(notification =>
            schoolAdminService.markNotificationAsRead(notification.id)
          )
        );
      } else if (canUseGeneralNotifications) {
        await notificationService.markAllAsRead();
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );

      if (canUseSchoolAdminNotifications) {
        queryClient.invalidateQueries({ queryKey: schoolAdminKeys.notifications() });
      } else {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'general'] });
      }

      logger.info(`Marked ${unreadNotifications.length} notifications as read`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }, [notifications, queryClient, canUseSchoolAdminNotifications, canUseGeneralNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setToastCount(0);
    logger.debug('Cleared all notifications from state');
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read && !n.read_at).length;

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