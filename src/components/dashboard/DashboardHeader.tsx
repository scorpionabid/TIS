import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/components/layout/components/Header/UserProfile";
import { NotificationDropdown } from "@/components/layout/components/Header/NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
  onLogout?: () => void;
}

export const DashboardHeader = ({ 
  title, 
  subtitle, 
  notificationCount = 0,
  onLogout
}: DashboardHeaderProps) => {
  const { currentUser } = useAuth();
  
  // Sample notification data for testing
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Yeni sorğu təsdiqi",
      message: "Əməkdaşların motivasiyası sorğusu təsdiq üçün göndərildi",
      type: "info" as const,
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    },
    {
      id: 2,
      title: "Sistem yeniləməsi",
      message: "Sistem yeniləməsi uğurla tamamlandı",
      type: "success" as const,
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 3,
      title: "Xəbərdarlıq",
      message: "Serverdə yaddaş istifadəsi yüksək səviyyədədir",
      type: "warning" as const,
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const handleDeleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  return (
    <div className="flex items-center justify-between w-full">
      {/* Title Section */}
      <div className="min-w-0 flex-1 pr-4">
        <h1 className="text-lg lg:text-xl font-bold text-foreground font-heading truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">{subtitle}</p>
        )}
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
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDeleteNotification}
        />

        {/* User Profile */}
        {currentUser && onLogout && (
          <UserProfile user={currentUser} onLogout={onLogout} />
        )}
      </div>
    </div>
  );
};