import { UserProfile } from "@/components/layout/components/Header/UserProfile";
import { NotificationDropdown } from "@/components/layout/components/Header/NotificationDropdown";
import { MessagingIndicator } from "@/components/messaging/MessagingIndicator";
import { MessagingPanel } from "@/components/messaging/MessagingPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { CurriculumCountdown } from "@/components/curriculum/CurriculumCountdown";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
  onLogout?: () => void;
}

export const DashboardHeader = ({
  title,
  onLogout,
}: DashboardHeaderProps) => {
  const { currentUser } = useAuth();
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between w-full">
        {/* Title Section */}
        <div className="min-w-0 flex-1 pr-4 flex items-center gap-4">
          <h1 className="text-lg lg:text-xl font-bold text-foreground font-heading truncate">{title}</h1>
          <div className="hidden md:block">
            <CurriculumCountdown />
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
          <NotificationDropdown />
          <MessagingIndicator onClick={() => setIsMessagingOpen(true)} />
          {currentUser && onLogout && (
            <UserProfile user={currentUser} onLogout={onLogout} />
          )}
        </div>
      </div>

      <MessagingPanel open={isMessagingOpen} onClose={() => setIsMessagingOpen(false)} />
    </>
  );
};
