import { LogOutIcon, SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileService, ProfileResponse } from "@/services/profile";
import { ProfileEditModal } from "@/components/modals/ProfileEditModal";
import { PasswordChangeModal } from "@/components/modals/PasswordChangeModal";

interface SidebarFooterProps {
  currentUser: string;
  profileData: ProfileResponse | null;
  isExpanded: boolean;
  isProfileEditOpen: boolean;
  isPasswordChangeOpen: boolean;
  onLogout: () => void;
  onProfileClick: () => void;
  onProfileModalClose: () => void;
  onPasswordModalClose: () => void;
  onProfileUpdate: (profile: ProfileResponse) => void;
}

export const SidebarFooter = ({
  currentUser,
  profileData,
  isExpanded,
  isProfileEditOpen,
  isPasswordChangeOpen,
  onLogout,
  onProfileClick,
  onProfileModalClose,
  onPasswordModalClose,
  onProfileUpdate
}: SidebarFooterProps) => {
  return (
    <>
      <div className="border-t border-sidebar-border p-3">
        {isExpanded && (
          <div 
            onClick={onProfileClick}
            className="w-full mb-3 px-2 py-2 bg-sidebar-accent rounded-lg hover:bg-sidebar-accent/80 transition-colors duration-200 cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onProfileClick()}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {profileData?.avatar_url && <AvatarImage src={profileData.avatar_url} alt={currentUser} />}
                <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
                  {profileService.getUserInitials(profileData?.user?.profile ? 
                    profileService.getDisplayName(profileData.user.profile, currentUser) : 
                    currentUser
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profileData?.user?.profile ? 
                    profileService.getDisplayName(profileData.user.profile, currentUser) : 
                    currentUser
                  }
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {typeof profileData?.user?.role === 'object' && profileData.user.role 
                    ? (profileData.user.role.display_name || profileData.user.role.name)
                    : 'Istifadəçi'
                  }
                </p>
              </div>
              <SettingsIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md",
            "text-destructive hover:bg-destructive/10"
          )}
        >
          <LogOutIcon className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="ml-3">Çıxış</span>}
        </button>
      </div>

      {/* Profile Modals */}
      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={onProfileModalClose}
        profileData={profileData}
        onProfileUpdate={onProfileUpdate}
      />

      <PasswordChangeModal
        isOpen={isPasswordChangeOpen}
        onClose={onPasswordModalClose}
      />
    </>
  );
};