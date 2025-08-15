import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Building2, 
  MapPin,
  Mail,
  Clock,
  ChevronDown,
  Edit
} from 'lucide-react';
import { User as AuthUser } from '@/contexts/AuthContext';
import { profileService, ProfileResponse } from '@/services/profile';
import { useToast } from '@/hooks/use-toast';
import { ProfileEditModal } from '@/components/modals/ProfileEditModal';
import { PasswordChangeModal } from '@/components/modals/PasswordChangeModal';

interface UserProfileProps {
  user: AuthUser;
  onLogout: () => void;
  onProfileUpdate?: (updatedProfile: ProfileResponse) => void;
}

const getRoleName = (role: any): string => {
  if (typeof role === 'object' && role) {
    return role.display_name || role.name || 'Təyin edilməyib';
  }
  return String(role || 'Təyin edilməyib');
};

const getRoleDisplayName = (role: any) => {
  const roleName = getRoleName(role);
  const roleMap: Record<string, string> = {
    'superadmin': 'Super Administrator',
    'regionadmin': 'Regional Administrator', 
    'regionoperator': 'Regional Operator',
    'sektoradmin': 'Sector Administrator',
    'məktəbadmin': 'School Administrator',
    'müəllim': 'Teacher'
  };
  return roleMap[roleName.toLowerCase()] || roleName;
};

const getRoleBadgeVariant = (role: any) => {
  const roleName = getRoleName(role).toLowerCase();
  switch (roleName) {
    case 'superadmin': return 'destructive';
    case 'regionadmin': return 'default';
    case 'regionoperator': return 'secondary';
    case 'sektoradmin': return 'outline';
    case 'məktəbadmin': return 'secondary';
    case 'müəllim': return 'outline';
    default: return 'secondary';
  }
};

// Remove getUserInitials function as it's now in profileService

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onProfileUpdate }) => {
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const { toast } = useToast();

  // Load profile data on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const profile = await profileService.getProfile();
      setProfileData(profile);
      onProfileUpdate?.(profile);
    } catch (error) {
      console.error('Profil yüklənərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: 'Profil məlumatları yüklənə bilmədi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsProfileEditOpen(true);
  };

  const handlePasswordChange = () => {
    setIsPasswordChangeOpen(true);
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    // Refresh profile data to get updated avatar
    await loadProfileData();
  };

  // Use profile data if available, otherwise fallback to user data
  const displayData = profileData?.user || user;
  const avatarUrl = profileData?.avatar_url;
  const profile = profileData?.user?.profile;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center space-x-3 p-2 hover:bg-accent hover:text-accent-foreground rounded-lg"
        >
          {/* User Avatar */}
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayData.name} />}
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
              {profileService.getUserInitials(displayData.name)}
            </AvatarFallback>
          </Avatar>
          
          {/* User Info - Hidden on mobile */}
          <div className="hidden lg:block text-left min-w-0">
            <p className="text-sm font-medium text-foreground truncate max-w-[120px] xl:max-w-none">
              {profileService.getDisplayName(profile, displayData.name) || 'İstifadəçi'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {getRoleDisplayName(displayData.role)}
            </p>
          </div>
          
          {/* Chevron Icon */}
          <ChevronDown className="hidden lg:block h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        {/* Profile Header */}
        <DropdownMenuLabel className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayData.name} />}
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                {profileService.getUserInitials(displayData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {profileService.getDisplayName(profile, displayData.name) || 'İstifadəçi'}
              </p>
              <p className="text-sm text-muted-foreground truncate">{displayData.email || ''}</p>
              <Badge variant={getRoleBadgeVariant(displayData.role)} className="mt-1 text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {getRoleDisplayName(displayData.role)}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* User Details */}
        <div className="p-3 space-y-3">
          {/* Institution Info */}
          {displayData.institution && (
            <div className="flex items-center space-x-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{displayData.institution.name}</p>
                <p className="text-xs text-muted-foreground">Müəssisə</p>
              </div>
            </div>
          )}

          {/* Region Info */}
          {displayData.region && (
            <div className="flex items-center space-x-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{displayData.region.name}</p>
                <p className="text-xs text-muted-foreground">Region</p>
              </div>
            </div>
          )}

          {/* Department Info */}
          {displayData.department && (
            <div className="flex items-center space-x-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{displayData.department.name}</p>
                <p className="text-xs text-muted-foreground">Departament</p>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="flex items-center space-x-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{displayData.email || 'E-poçt məlum deyil'}</p>
              <p className="text-xs text-muted-foreground">E-poçt</p>
            </div>
          </div>

          {/* Phone Info */}
          {profile?.contact_phone && (
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{profile.contact_phone}</p>
                <p className="text-xs text-muted-foreground">Telefon</p>
              </div>
            </div>
          )}

          {/* Login info */}
          <div className="flex items-center space-x-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Qeydiyyat: {new Date(displayData.created_at).toLocaleDateString('az-AZ')}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem className="cursor-pointer" onClick={handleEditProfile}>
          <Edit className="h-4 w-4 mr-3" />
          Profil Redaktə Et
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={handlePasswordChange}>
          <Settings className="h-4 w-4 mr-3" />
          Şifrəni Dəyişdir
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Çıxış
        </DropdownMenuItem>
      </DropdownMenuContent>
      
      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        profileData={profileData}
        onProfileUpdate={(updatedProfile) => {
          setProfileData(updatedProfile);
          onProfileUpdate?.(updatedProfile);
        }}
      />

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={isPasswordChangeOpen}
        onClose={() => setIsPasswordChangeOpen(false)}
      />
    </DropdownMenu>
  );
};