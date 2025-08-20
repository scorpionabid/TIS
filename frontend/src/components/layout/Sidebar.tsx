import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/layout/useSidebar";
import { 
  SidebarHeader, 
  SidebarFooter, 
  SuperAdminMenu, 
  SimpleMenu,
  getSuperAdminMenuStructure,
  getOtherRoleMenuStructure
} from "./sidebar";

interface SidebarProps {
  userRole: string;
  currentUser: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
}

export const Sidebar = ({ userRole, currentUser, onNavigate, onLogout, currentPath }: SidebarProps) => {
  const {
    // State
    isHovered,
    setIsHovered,
    profileData,
    sidebarState,
    
    // Computed
    isExpanded,
    
    // Actions
    toggleItemSubmenu,
    handleGroupToggle,
    handleNavigateAndCollapse,
    handleProfileClick,
    handleProfileUpdate,
    handleProfileModalClose,
    handlePasswordModalClose,
  } = useSidebar();


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
        <SidebarHeader userRole={userRole} isExpanded={isExpanded} />
        
        <SuperAdminMenu
          menuStructure={menuStructure}
          openGroups={sidebarState.openGroups}
          itemSubmenus={sidebarState.itemSubmenus}
          isExpanded={isExpanded}
          currentPath={currentPath}
          onGroupToggle={handleGroupToggle}
          onItemSubmenuToggle={toggleItemSubmenu}
          onNavigate={(path) => handleNavigateAndCollapse(path, onNavigate)}
        />
        
        <SidebarFooter
          currentUser={currentUser}
          profileData={profileData}
          isExpanded={isExpanded}
          isProfileEditOpen={sidebarState.isProfileEditOpen}
          isPasswordChangeOpen={sidebarState.isPasswordChangeOpen}
          onLogout={onLogout}
          onProfileClick={handleProfileClick}
          onProfileModalClose={handleProfileModalClose}
          onPasswordModalClose={handlePasswordModalClose}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    );
  }

  // For other roles, use simpler structure
  const menuItems = getOtherRoleMenuStructure(userRole);
  
  return (
    <div 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col shadow-elevated",
        isExpanded ? "w-64" : "w-14"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SidebarHeader userRole={userRole} isExpanded={isExpanded} />
      
      <SimpleMenu
        menuItems={menuItems}
        currentPath={currentPath}
        isExpanded={isExpanded}
        onNavigate={(path) => handleNavigateAndCollapse(path, onNavigate)}
      />
      
      <SidebarFooter
        currentUser={currentUser}
        profileData={profileData}
        isExpanded={isExpanded}
        isProfileEditOpen={sidebarState.isProfileEditOpen}
        isPasswordChangeOpen={sidebarState.isPasswordChangeOpen}
        onLogout={onLogout}
        onProfileClick={handleProfileClick}
        onProfileModalClose={handleProfileModalClose}
        onPasswordModalClose={handlePasswordModalClose}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};