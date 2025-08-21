import { useState, useCallback, useEffect } from "react";
import { profileService, ProfileResponse } from "@/services/profile";
import { useToast } from "@/hooks/use-toast";
import { SidebarState } from "@/components/layout/sidebar/types";

export const useSidebar = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { toast } = useToast();
  
  // Sidebar state
  const [sidebarState, setSidebarState] = useState<SidebarState>({
    openGroups: {
      "İdarəetmə": true,
      "Struktur": true,
      "Sorğular": false,
      "Cədvəl İdarəetməsi": false,
      "Regional İdarəetmə": false,
      "Qiymətləndirmə": false,
      "Məzmun": false,
      "Hesabatlar": false,
      "Sistem": false,
    },
    itemSubmenus: {},
    isProfileEditOpen: false,
    isPasswordChangeOpen: false,
  });

  // Load profile data when component mounts
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoadingProfile(true);
      const profile = await profileService.getProfile();
      setProfileData(profile);
    } catch (error) {
      console.error('Sidebar profil yüklənərkən xəta:', error);
      // Don't show toast for sidebar profile loading errors to avoid spam
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const toggleItemSubmenu = (itemKey: string) => {
    setSidebarState(prev => ({
      ...prev,
      itemSubmenus: {
        ...prev.itemSubmenus,
        [itemKey]: !prev.itemSubmenus[itemKey]
      }
    }));
  };

  const handleGroupToggle = (label: string) => {
    setSidebarState(prev => ({
      ...prev,
      openGroups: {
        ...prev.openGroups,
        [label]: !prev.openGroups[label],
      }
    }));
  };

  const handleNavigateAndCollapse = useCallback((path: string, onNavigate: (path: string) => void) => {
    onNavigate(path);
    setIsHovered(false);
  }, []);

  const handleProfileClick = () => {
    console.log('📍 Sidebar profile clicked, current state:', sidebarState.isProfileEditOpen);
    setSidebarState(prev => ({ ...prev, isProfileEditOpen: true }));
    console.log('📍 Setting profile modal to true');
  };

  const handleProfileUpdate = (updatedProfile: ProfileResponse) => {
    setProfileData(updatedProfile);
  };

  const handleProfileModalClose = () => {
    console.log('📍 Profile modal closing');
    setSidebarState(prev => ({ ...prev, isProfileEditOpen: false }));
  };

  const handlePasswordModalClose = () => {
    setSidebarState(prev => ({ ...prev, isPasswordChangeOpen: false }));
  };

  return {
    // State
    isHovered,
    setIsHovered,
    profileData,
    isLoadingProfile,
    sidebarState,
    
    // Computed
    isExpanded: isHovered,
    
    // Actions
    loadProfileData,
    toggleItemSubmenu,
    handleGroupToggle,
    handleNavigateAndCollapse,
    handleProfileClick,
    handleProfileUpdate,
    handleProfileModalClose,
    handlePasswordModalClose,
  };
};