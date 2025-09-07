import React, { useState } from 'react';
import { LogOut, User, Settings, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileEditModal } from '@/components/modals/ProfileEditModal';
import { PasswordChangeModal } from '@/components/modals/PasswordChangeModal';
import { profileService } from '@/services/profile';

interface SidebarFooterProps {
  isExpanded: boolean;
  onLogout: () => void;
}

const getRoleDisplayName = (role: string) => {
  const roleMap: Record<string, string> = {
    'SuperAdmin': 'Super Administrator',
    'RegionAdmin': 'Regional Administrator', 
    'RegionOperator': 'Regional Operator',
    'SektorAdmin': 'Sector Administrator',
    'SchoolAdmin': 'School Administrator',
    'Teacher': 'Teacher'
  };
  return roleMap[role] || role;
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'SuperAdmin': return 'destructive';
    case 'RegionAdmin': return 'default';
    case 'RegionOperator': return 'secondary';
    case 'SektorAdmin': return 'outline';
    case 'SchoolAdmin': return 'secondary';
    case 'Teacher': return 'outline';
    default: return 'secondary';
  }
};

const getUserInitials = (name: string | undefined | null) => {
  if (!name || typeof name !== 'string') return 'U';
  
  return name
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
};

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ isExpanded, onLogout }) => {
  const { currentUser } = useAuth();
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const handleProfileClick = () => {
    console.log('📍 SidebarFooter profile clicked, current state:', isProfileEditOpen);
    setIsProfileEditOpen(true);
    console.log('📍 Setting profile modal to true');
    
    // Additional debug
    setTimeout(() => {
      console.log('📍 Modal state after 100ms:', isProfileEditOpen);
    }, 100);
  };

  if (!currentUser) return null;

  return (
    <div className="border-t border-border p-3">
      {isExpanded ? (
        <div className="space-y-3">
          {/* User Profile Card */}
          <div className="bg-accent/50 rounded-lg p-3 space-y-3">
            <div className="flex items-start space-x-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                  {getUserInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentUser.name || 'İstifadəçi'}
                </p>
                <Badge variant={getRoleBadgeVariant(currentUser.role)} className="text-xs h-5">
                  {getRoleDisplayName(currentUser.role)}
                </Badge>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser.email || ''}
                </p>
              </div>
            </div>

            {/* Institution/Region Info */}
            {(currentUser.institution || currentUser.region) && (
              <div className="space-y-1 text-xs">
                {currentUser.institution && (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {currentUser.institution.name}
                    </span>
                  </div>
                )}
                {currentUser.region && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {currentUser.region.name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={handleProfileClick}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="text-xs">Profil Ayarları</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="text-xs">Çıxış</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    {getUserInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{currentUser.name || 'İstifadəçi'}</p>
                <p className="text-xs text-muted-foreground">{getRoleDisplayName(currentUser.role)}</p>
                {currentUser.institution && (
                  <p className="text-xs text-muted-foreground">{currentUser.institution.name}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleProfileClick}>
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Profil Ayarları
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Çıxış
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Profile Modals */}
      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => {
          console.log('📍 SidebarFooter modal closing');
          setIsProfileEditOpen(false);
        }}
        profileData={profileData}
        onProfileUpdate={(updatedProfile) => {
          console.log('📍 Profile updated in SidebarFooter');
          setProfileData(updatedProfile);
        }}
      />

      <PasswordChangeModal
        isOpen={isPasswordChangeOpen}
        onClose={() => setIsPasswordChangeOpen(false)}
      />
    </div>
  );
};