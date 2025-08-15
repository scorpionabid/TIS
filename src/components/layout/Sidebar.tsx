import { useState, useCallback, useEffect } from "react";
import { 
  HomeIcon, 
  UsersIcon, 
  FileTextIcon, 
  BarChart3Icon,
  SettingsIcon,
  BellIcon,
  LogOutIcon,
  SchoolIcon,
  ClipboardListIcon,
  FolderIcon,
  BuildingIcon,
  MapPinIcon,
  GraduationCapIcon,
  ShieldIcon,
  DatabaseIcon,
  MonitorIcon,
  ClipboardIcon,
  ChevronRightIcon,
  DownloadIcon,
  BabyIcon,
  LinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileService, ProfileResponse } from "@/services/profile";
import { useToast } from "@/hooks/use-toast";
import { ProfileEditModal } from "@/components/modals/ProfileEditModal";
import { PasswordChangeModal } from "@/components/modals/PasswordChangeModal";

interface SidebarProps {
  userRole: string;
  currentUser: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
}

export const Sidebar = ({ userRole, currentUser, onNavigate, onLogout, currentPath }: SidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const { toast } = useToast();
  
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
  
  // Collapsible group state for SuperAdmin
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "İdarəetmə": true,
    "Struktur": false,
    "Sorğular": false,
    "Məzmun": false,
    "Hesabatlar": false,
    "Sistem": false,
  });

  // Individual item submenu states
  const [itemSubmenus, setItemSubmenus] = useState<Record<string, boolean>>({});

  const toggleItemSubmenu = (itemKey: string) => {
    setItemSubmenus(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const handleGroupToggle = (label: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleNavigateAndCollapse = useCallback((path: string) => {
    onNavigate(path);
    setIsHovered(false);
  }, [onNavigate]);

  const handleProfileClick = () => {
    console.log('📍 Sidebar profile clicked, current state:', isProfileEditOpen);
    setIsProfileEditOpen(true);
    console.log('📍 Setting profile modal to true');
  };

  const handleProfileUpdate = (updatedProfile: ProfileResponse) => {
    setProfileData(updatedProfile);
  };

  const getSuperAdminMenuStructure = () => [
    {
      groupLabel: "İdarəetmə",
      items: [
        { icon: HomeIcon, label: "Ana səhifə", path: "/" },
        { icon: BellIcon, label: "Bildirişlər", path: "/notifications" },
        { icon: UsersIcon, label: "İstifadəçilər", path: "/users" },
        { icon: ShieldIcon, label: "Rollar", path: "/roles" },
        { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
      ]
    },
    {
      groupLabel: "Struktur", 
      items: [
        { icon: BuildingIcon, label: "Departmentlər", path: "/departments" },
        { icon: SchoolIcon, label: "Müəssisələr", path: "/institutions" },
        { icon: BabyIcon, label: "Məktəbəqədər müəssisələr", path: "/preschools" },
        { icon: MapPinIcon, label: "Regionlar", path: "/regions" },
        { icon: UsersIcon, label: "Sektorlar", path: "/sectors" },
        { icon: DatabaseIcon, label: "İerarxiya İdarəetməsi", path: "/hierarchy" },
      ]
    },
    {
      groupLabel: "Sorğular",
      items: [
        { 
          icon: ClipboardListIcon, 
          label: "Sorğu İdarəetməsi", 
          hasSubmenu: true,
          key: "surveys",
          submenu: [
            { label: "Sorğular", path: "/surveys" },
            { label: "Təsdiq", path: "/survey-approval" },
            { label: "Sorğu nəticələri", path: "/survey-results" },
            { label: "Arxiv", path: "/survey-archive" },
          ]
        },
        {
          icon: GraduationCapIcon,
          label: "Məktəb İdarəetməsi",
          hasSubmenu: true,
          key: "school",
          submenu: [
            { label: "Dərs Yükü", path: "/school/workload" },
            { label: "Dərs Cədvəli", path: "/school/schedules" },
            { label: "Davamiyyət", path: "/school/attendance" },
            { label: "Qiymətləndirmələr", path: "/school/assessments" },
          ]
        }
      ]
    },
    {
      groupLabel: "Məzmun",
      items: [
        { icon: FolderIcon, label: "Sənədlər", path: "/documents" },
        { icon: LinkIcon, label: "Linklər", path: "/links" },
      ]
    },
    {
      groupLabel: "Hesabatlar",
      items: [
        { icon: DownloadIcon, label: "Hesabatlar", path: "/reports" },
        { icon: BarChart3Icon, label: "Sistem Statistikası", path: "/analytics" },
      ]
    },
    {
      groupLabel: "Sistem",
      items: [
        { icon: SettingsIcon, label: "Sistem Parametrləri", path: "/settings" },
        { icon: ClipboardIcon, label: "Audit Logları", path: "/audit-logs" },
        { icon: MonitorIcon, label: "Performans Monitorinqi", path: "/performance" },
      ]
    }
  ];

  const getOtherRoleMenuStructure = () => {
    const baseItems = [
      { icon: HomeIcon, label: "Ana səhifə", path: "/" },
      { icon: BellIcon, label: "Bildirişlər", path: "/notifications" },
    ];

    const roleSpecificItems = {
      RegionAdmin: [
        { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
        { icon: BarChart3Icon, label: "Sorğu Nəticələri", path: "/survey-results" },
        { icon: UsersIcon, label: "Sektorlar", path: "/sectors" },
        { icon: FolderIcon, label: "Sənədlər", path: "/documents" },
        { icon: BarChart3Icon, label: "Hesabatlar", path: "/reports" },
      ],
      RegionOperator: [
        { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
        { icon: FolderIcon, label: "Sənədlər", path: "/documents" },
        { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
      ],
      SektorAdmin: [
        { icon: SchoolIcon, label: "Təhsil müəssisələri", path: "/institutions" },
        { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
        { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
        { icon: BarChart3Icon, label: "Sektor hesabatları", path: "/sector-reports" },
      ],
      SchoolAdmin: [
        { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
        { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
        { icon: UsersIcon, label: "Personallar", path: "/staff" },
        { icon: BarChart3Icon, label: "Məktəb hesabatları", path: "/school-reports" },
      ],
      Teacher: [
        { icon: ClipboardListIcon, label: "Tapşırıqlar", path: "/assignments" },
        { icon: FileTextIcon, label: "Dərs planları", path: "/lesson-plans" },
        { icon: BarChart3Icon, label: "Qiymətləndirmələr", path: "/assessments" },
      ]
    };

    return [...baseItems, ...(roleSpecificItems[userRole as keyof typeof roleSpecificItems] || [])];
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/";
    return currentPath === path;
  };

  const isExpanded = isHovered;

  // SuperAdmin layout with grouped menu structure
  if (userRole === "SuperAdmin") {
    const menuStructure = getSuperAdminMenuStructure();
    
    return (
      <div 
        className={cn(
          "h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col shadow-elevated",
          isExpanded ? "w-64" : "w-14"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="h-14 flex items-center px-3 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-primary flex-shrink-0">
              <SchoolIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className={cn("transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>
              <h2 className="font-semibold text-sm text-sidebar-foreground">ATİS</h2>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {menuStructure.map((group, groupIndex) => {
            const isGroupOpen = openGroups[group.groupLabel];
            
            return (
              <div key={groupIndex} className="mb-4">
                {/* Group Header - Only show when expanded */}
                {isExpanded && (
                  <button
                    type="button"
                    className="w-full flex items-center px-3 py-2 mb-2 focus:outline-none group hover:bg-sidebar-accent/50 transition-colors duration-200 rounded-md mx-1"
                    onClick={() => handleGroupToggle(group.groupLabel)}
                    aria-expanded={isGroupOpen}
                  >
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1 text-left">
                      {group.groupLabel}
                    </h3>
                    <ChevronRightIcon
                      className={cn(
                        "ml-2 h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isGroupOpen ? "rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                )}

                {/* Group Items */}
                {(isGroupOpen || !isExpanded) && (
                  <div className="space-y-1">
                    {group.items.map((item: any, itemIndex: number) =>
                      item.hasSubmenu ? (
                        <div key={itemIndex}>
                          <button
                            onClick={() => toggleItemSubmenu(item.key)}
                            className={cn(
                              "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md mx-1",
                              "hover:bg-sidebar-accent text-sidebar-foreground"
                            )}
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {isExpanded && (
                              <>
                                <span className="ml-3 truncate">{item.label}</span>
                                <ChevronRightIcon
                                  className={cn(
                                    "ml-auto h-4 w-4 transition-transform duration-200",
                                    itemSubmenus[item.key] ? "rotate-90" : "rotate-0"
                                  )}
                                />
                              </>
                            )}
                          </button>
                          {/* Submenu */}
                          {isExpanded && itemSubmenus[item.key] && (
                            <div className="ml-8 mt-1 space-y-1">
                              {item.submenu?.map((subItem: any, subIndex: number) => (
                                <button
                                  key={subIndex}
                                  onClick={() => handleNavigateAndCollapse(subItem.path)}
                                  className={cn(
                                    "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md",
                                    isActive(subItem.path)
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                  )}
                                >
                                  <span className="truncate">{subItem.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          key={itemIndex}
                          onClick={() => handleNavigateAndCollapse(item.path!)}
                          className={cn(
                            "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md mx-1",
                            isActive(item.path!)
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {isExpanded && <span className="ml-3 truncate">{item.label}</span>}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          {isExpanded && (
            <div 
              onClick={handleProfileClick}
              className="w-full mb-3 px-2 py-2 bg-sidebar-accent rounded-lg hover:bg-sidebar-accent/80 transition-colors duration-200 cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}
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
                  <p className="text-xs text-muted-foreground truncate">{userRole}</p>
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

        {/* Profile Modals for SuperAdmin */}
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => {
            console.log('📍 Profile modal closing');
            setIsProfileEditOpen(false);
          }}
          profileData={profileData}
          onProfileUpdate={handleProfileUpdate}
        />

        <PasswordChangeModal
          isOpen={isPasswordChangeOpen}
          onClose={() => setIsPasswordChangeOpen(false)}
        />
      </div>
    );
  }

  // For other roles, use simpler structure
  const menuItems = getOtherRoleMenuStructure();
  
  return (
    <div 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col shadow-elevated",
        isExpanded ? "w-64" : "w-14"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-primary flex-shrink-0">
            <SchoolIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className={cn("transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>
            <h2 className="font-semibold text-sm text-sidebar-foreground">ATİS</h2>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigateAndCollapse(item.path)}
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md mx-1",
              isActive(item.path)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isExpanded && <span className="ml-3 truncate">{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {isExpanded && (
          <div
            onClick={handleProfileClick}
            className="w-full mb-3 px-2 py-2 bg-sidebar-accent rounded-lg hover:bg-sidebar-accent/80 transition-colors duration-200 cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}
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
                <p className="text-xs text-muted-foreground truncate">{userRole}</p>
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
        onClose={() => setIsProfileEditOpen(false)}
        profileData={profileData}
        onProfileUpdate={handleProfileUpdate}
      />

      <PasswordChangeModal
        isOpen={isPasswordChangeOpen}
        onClose={() => setIsPasswordChangeOpen(false)}
      />
    </div>
  );
};