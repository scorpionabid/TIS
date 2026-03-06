import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolAdminService } from '@/services/schoolAdmin';
import { notificationService } from '@/services/notification';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { USER_ROLES } from '@/constants/roles';
import {
  UnifiedNotification,
  NotificationUpdate,
  UseRealTimeNotificationsOptions,
  UseRealTimeNotificationsReturn,
  normalizeNotification
} from '@/types/notifications';

export const useRealTimeNotifications = (
  options: UseRealTimeNotificationsOptions = {}
): UseRealTimeNotificationsReturn => {
  const {
    autoToast = true,
    maxToastNotifications = 3,
    enableSound = false,
    enableWebSocket = true,
    fallbackPollingInterval = 30000
  } = options;
  
  const { currentUser, getAuthToken } = useAuth();
  const {
    isConnected,
    isEchoConnected,
    connect,
    disconnect,
    listenToUserChannel,
    listenToInstitutionChannel,
    listenToRoleChannel,
    isWebSocketConnected
  } = useWebSocket();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [toastCount, setToastCount] = useState(0);
  const notificationsRef = useRef<UnifiedNotification[]>([]);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Use unified normalize function from types/notifications
  
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
  const extractNotifications = (response: any): any[] => {
    if (!response) return [];
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  };

  const {
    data: initialNotifications,
    isLoading,
    refetch: refreshNotifications
  } = useQuery({
    queryKey: ['notifications', 'unified', currentUser?.id, canUseSchoolAdminNotifications],
    queryFn: async () => {
      if (!currentUser || !supportsNotifications) return [];

      const response = await notificationService.getNotifications(
        { per_page: 50 },
        {
          useSchoolAdmin: canUseSchoolAdminNotifications,
          userInstitutionId: currentUser.institution_id,
          userRoles: currentUser.roles?.map(r => r.name) || [],
        }
      );

      logger.debug('Unified notifications fetched:', response);
      return extractNotifications(response).map(normalizeNotification);
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

  const handleIncomingNotification = useCallback((notification: any) => {
    const normalizedNotification = normalizeNotification(notification);

    // Check if this notification already exists
    setNotifications(prev => {
      const exists = prev.some(n => n.id === normalizedNotification.id);
      if (exists) return prev;

      // Add new notification to top, but limit total notifications to prevent memory issues
      const maxNotifications = 50;
      const updated = [normalizedNotification, ...prev].slice(0, maxNotifications);

      // Show toast for new notification
      if (autoToast && toastCount < maxToastNotifications) {
        const toastType = normalizedNotification.display_type || 'info';
        const toastMethod = toast[toastType] || toast.info;

        toastMethod(normalizedNotification.title, {
          description: normalizedNotification.message,
          action: normalizedNotification.action_url ? {
            label: 'Bax',
            onClick: () => window.location.href = normalizedNotification.action_url!
          } : undefined
        });

        setToastCount(prevCount => prevCount + 1);
      }

      // Play sound if enabled
      if (enableSound) {
        playNotificationSound();
      }

      logger.info('Received new real-time notification', {
        id: normalizedNotification.id,
        type: normalizedNotification.type,
        title: normalizedNotification.title,
        method: isWebSocketConnected() ? 'WebSocket' : 'Polling'
      });

      return updated;
    });
  }, [autoToast, toastCount, maxToastNotifications, enableSound, playNotificationSound, isWebSocketConnected]);

  // WebSocket real-time connection with polling fallback
  useEffect(() => {
    if (!currentUser || !supportsNotifications) return;

    let pollingInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      pollingInterval = setInterval(async () => {
        try {
          const response = await notificationService.getNotifications(
            { per_page: 5 },
            {
              useSchoolAdmin: canUseSchoolAdminNotifications,
              userInstitutionId: currentUser.institution_id,
              userRoles: currentUser.roles?.map(r => r.name) || [],
            }
          );

          const latestNotifications = extractNotifications(response).map(normalizeNotification);

          // Check for new notifications
          const existingIds = new Set(notificationsRef.current.map(n => n.id));
          const newNotifications = latestNotifications.filter(n => !existingIds.has(n.id));

          if (newNotifications.length > 0) {
            newNotifications.forEach(handleIncomingNotification);
          }
        } catch (error) {
          logger.error('Polling failed', error);
        }
      }, fallbackPollingInterval);
    };

    const initializeRealTime = async () => {
      if (enableWebSocket) {
        try {
          // Connect to WebSocket via WebSocketContext
          await connect();

          // Wait for connection to be established
          if (isEchoConnected || isConnected) {
            // Listen to user-specific channel
            listenToUserChannel(currentUser.id, (data) => {
              handleIncomingNotification(data.notification);
            });

            // Listen to institution channel if applicable
            if (currentUser.institution_id) {
              listenToInstitutionChannel(currentUser.institution_id, (data) => {
                handleIncomingNotification(data.notification);
              });
            }

            // Listen to role channels
            currentUser.roles?.forEach(role => {
              listenToRoleChannel(role.name, (data) => {
                handleIncomingNotification(data.notification);
              });
            });

            logger.info('WebSocket real-time notifications activated via WebSocketContext');
          } else {
            throw new Error('WebSocket connection not established');
          }

        } catch (error) {
          logger.warn('WebSocket failed, falling back to polling', error);
          startPolling();
        }
      } else {
        logger.info('WebSocket disabled, using polling mode');
        startPolling();
      }
    };

    initializeRealTime();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (enableWebSocket && isWebSocketConnected()) {
        disconnect();
      }
    };
  }, [
    currentUser,
    supportsNotifications,
    enableWebSocket,
    connect,
    isEchoConnected,
    isConnected,
    listenToUserChannel,
    listenToInstitutionChannel,
    listenToRoleChannel,
    fallbackPollingInterval,
    canUseSchoolAdminNotifications,
    handleIncomingNotification,
    disconnect,
    isWebSocketConnected
  ]);

  // Reset toast count periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      setToastCount(0);
    }, 300000); // Reset every 5 minutes

    return () => clearInterval(resetInterval);
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!currentUser || !supportsNotifications) return;

    try {
      // Try school admin service first if applicable
      if (canUseSchoolAdminNotifications) {
        await schoolAdminService.markNotificationAsRead(notificationId);
      } else {
        // Use general notification service
        await notificationService.markAsRead(notificationId);
      }

      const readTimestamp = new Date().toISOString();

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                isRead: true,
                read_at: notification.read_at ?? readTimestamp,
                readAt: notification.readAt ?? readTimestamp,
              }
            : notification
        )
      );

      // Invalidate unified notifications query
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unified', currentUser.id, canUseSchoolAdminNotifications]
      });

      logger.debug(`Marked notification ${notificationId} as read`, {
        hook: 'useRealTimeNotifications'
      });
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as read`, error);
      throw error;
    }
  }, [queryClient, canUseSchoolAdminNotifications, currentUser, supportsNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser || !supportsNotifications) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);

      if (canUseSchoolAdminNotifications) {
        // For school admin, mark each notification individually
        await Promise.all(
          unreadNotifications.map(notification =>
            schoolAdminService.markNotificationAsRead(notification.id)
          )
        );
      } else {
        // Use general notification service bulk mark
        await notificationService.markAllAsRead();
      }

      const readTimestamp = new Date().toISOString();

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          isRead: true,
          read_at: notification.read_at ?? readTimestamp,
          readAt: notification.readAt ?? readTimestamp,
        }))
      );

      // Invalidate unified notifications query
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unified', currentUser.id, canUseSchoolAdminNotifications]
      });

      logger.info(`Marked ${unreadNotifications.length} notifications as read`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }, [notifications, queryClient, canUseSchoolAdminNotifications, currentUser, supportsNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setToastCount(0);
    logger.debug('Cleared all notifications from state');
  }, []);

  const unreadCount = notifications.filter((notification) => {
    const readFlag = notification.is_read ?? notification.isRead;
    const readTimestamp = notification.read_at ?? notification.readAt;
    return !readFlag && !readTimestamp;
  }).length;

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
