import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/components/layout/components/Header/UserProfile";
import { NotificationDropdown } from "@/components/layout/components/Header/NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { surveyService } from "@/services/surveys";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
  onLogout?: () => void;
}

interface SurveyNotification {
  id: string | number;
  type: string;
  title: string;
  message: string;
  data: {
    survey_id?: number;
    survey_title?: string;
    survey_description?: string;
    due_date?: string;
    priority: string;
    questions_count: number;
    action_url?: string;
    related_entity_type?: string;
    related_entity_id?: number;
  };
  read_at?: string;
  created_at: string;
  is_read: boolean;
  priority: string;
  category: string;
}

export const DashboardHeader = ({ 
  title, 
  subtitle, 
  notificationCount = 0,
  onLogout
}: DashboardHeaderProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [surveyNotifications, setSurveyNotifications] = useState<SurveyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const toBoolean = (value: unknown) => {
    if (value === null || typeof value === 'undefined') return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'read'].includes(normalized)) return true;
      if (['0', 'false', 'no', 'unread'].includes(normalized)) return false;
      return normalized.length > 0;
    }
    return Boolean(value);
  };

  // Convert survey notifications to NotificationDropdown format
  const convertToNotificationFormat = (surveyNotification: SurveyNotification) => ({
    id: typeof surveyNotification.id === 'string' && surveyNotification.id.startsWith('survey_')
        ? parseInt(surveyNotification.id.replace('survey_', ''))
        : typeof surveyNotification.id === 'number'
        ? surveyNotification.id
        : parseInt(String(surveyNotification.id)),
    title: surveyNotification.title,
    message: surveyNotification.message,
    type: surveyNotification.priority === 'overdue' ? 'error' as const :
          surveyNotification.priority === 'high' ? 'warning' as const :
          'info' as const,
    isRead: toBoolean(surveyNotification.is_read ?? surveyNotification.read_at),
    createdAt: surveyNotification.created_at
  });

  const notifications = surveyNotifications.map(convertToNotificationFormat);
  const computedUnreadCount = notifications.filter(notification => !notification.isRead).length;
  const effectiveUnreadCount = Math.max(computedUnreadCount, unreadCount);

  // Debug: Log converted notifications
  useEffect(() => {
    console.log('🔍 DashboardHeader: Raw survey notifications:', surveyNotifications);
    console.log('🔍 DashboardHeader: Converted notifications:', notifications);
    console.log('🔍 DashboardHeader: Unread count:', unreadCount);
  }, [surveyNotifications, notifications, unreadCount]);

  // Load survey notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        console.log('🔍 DashboardHeader: Loading survey notifications...');

        const [notificationsResponse, unreadCount] = await Promise.all([
          surveyService.getSurveyNotifications({ limit: 10 }),
          surveyService.getUnreadSurveyCount()
        ]);

        console.log('📊 DashboardHeader: Notifications response:', notificationsResponse);
        console.log('📊 DashboardHeader: Unread count:', unreadCount);

        const rawNotifications = Array.isArray(notificationsResponse)
          ? notificationsResponse
          : Array.isArray((notificationsResponse as any)?.data)
            ? (notificationsResponse as any).data
            : [];

        setSurveyNotifications(rawNotifications as SurveyNotification[]);

        const derivedUnreadFromPayload = (rawNotifications as SurveyNotification[]).filter(notification =>
          !toBoolean(notification.is_read ?? notification.read_at)
        ).length;

        const normalizedCount = Number(unreadCount);
        setUnreadCount(
          Number.isFinite(normalizedCount)
            ? normalizedCount
            : derivedUnreadFromPayload
        );

        console.log('✅ DashboardHeader: Survey notifications loaded:', notificationsResponse?.length || 0);
      } catch (error) {
        console.error('❌ DashboardHeader: Error loading survey notifications:', error);
        // Fallback to empty state
        setSurveyNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  const handleMarkAsRead = async (id: number) => {
    try {
      // Find the survey notification that matches this id
      const surveyNotification = surveyNotifications.find(n => {
        const notificationId = typeof n.id === 'string' && n.id.startsWith('survey_')
          ? parseInt(n.id.replace('survey_', ''))
          : typeof n.id === 'number'
          ? n.id
          : parseInt(String(n.id));
        return notificationId === id;
      });

      if (surveyNotification) {
        // For real notifications, use the notification ID directly as the API expects notification ID now
        // The backend route is /survey-notifications/{notificationId}/mark-read
        await surveyService.markSurveyNotificationAsRead(id);

        // Update local state
        setSurveyNotifications(prev =>
          prev.map(notification => {
            const notificationId = typeof notification.id === 'string' && notification.id.startsWith('survey_')
              ? parseInt(notification.id.replace('survey_', ''))
              : typeof notification.id === 'number'
              ? notification.id
              : parseInt(String(notification.id));
            return notificationId === id
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification;
          })
        );

        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all unread survey notifications as read
      const unreadNotifications = surveyNotifications.filter(n => !n.is_read);

      await Promise.all(
        unreadNotifications.map(notification => {
          const notificationId = typeof notification.id === 'string' && notification.id.startsWith('survey_')
            ? parseInt(notification.id.replace('survey_', ''))
            : typeof notification.id === 'number'
            ? notification.id
            : parseInt(String(notification.id));
          return surveyService.markSurveyNotificationAsRead(notificationId);
        })
      );

      // Update local state
      setSurveyNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = (id: number) => {
    // Remove from local state (we don't have a delete API, so just hide it locally)
    setSurveyNotifications(prev => prev.filter(notification => {
      const notificationId = typeof notification.id === 'string' && notification.id.startsWith('survey_')
        ? parseInt(notification.id.replace('survey_', ''))
        : typeof notification.id === 'number'
        ? notification.id
        : parseInt(String(notification.id));
      return notificationId !== id;
    }));
    
    // Update unread count if this was unread
    const wasUnread = notifications.find(n => n.id === id && !n.isRead);
    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleNotificationClick = (id: number) => {
    // Find the survey notification that matches this id
    const surveyNotification = surveyNotifications.find(n => {
      const notificationId = typeof n.id === 'string' && n.id.startsWith('survey_')
        ? parseInt(n.id.replace('survey_', ''))
        : typeof n.id === 'number'
        ? n.id
        : parseInt(String(n.id));
      return notificationId === id;
    });

    if (surveyNotification) {
      // Extract survey ID from the notification data
      const surveyId = surveyNotification.data.survey_id || surveyNotification.data.related_entity_id;

      if (surveyId) {
        // Navigate to survey response page
        navigate(`/survey-response/${surveyId}`);

        // Mark as read if it's unread
        if (!surveyNotification.is_read) {
          handleMarkAsRead(id);
        }
      } else {
        console.warn('Survey ID not found in notification data:', surveyNotification);
      }
    }
  };
  return (
    <div className="flex items-center justify-between w-full">
      {/* Title Section */}
      <div className="min-w-0 flex-1 pr-4">
        <h1 className="text-lg lg:text-xl font-bold text-foreground font-heading truncate">{title}</h1>
      </div>

      {/* Actions Section */}
      <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
        {/* Search - Hidden on smaller screens */}
        <div className="relative hidden xl:block">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Axtarış..."
            className="pl-10 w-40 xl:w-48 focus:ring-input-focus focus:border-input-focus"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <NotificationDropdown
            enableRealTime={false}
            notifications={notifications}
            unreadCount={effectiveUnreadCount}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDelete={handleDeleteNotification}
            onNotificationClick={handleNotificationClick}
          />
          {effectiveUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center text-[10px] font-medium z-10">
              {effectiveUnreadCount > 9 ? "9+" : effectiveUnreadCount}
            </span>
          )}
        </div>

        {/* User Profile */}
        {currentUser && onLogout && (
          <UserProfile user={currentUser} onLogout={onLogout} />
        )}
      </div>
    </div>
  );
};
