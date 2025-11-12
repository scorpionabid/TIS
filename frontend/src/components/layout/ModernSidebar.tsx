import React, { useEffect } from 'react';
import { SidebarContainer } from '@/components/layout/components/Sidebar/SidebarContainer';
import { SidebarHeader } from '@/components/layout/components/Sidebar/SidebarHeader';
import { SidebarPanelSwitch } from '@/components/layout/components/Sidebar/SidebarPanelSwitch';
import { SidebarMenu } from '@/components/layout/components/Sidebar/SidebarMenu';
import { SidebarFooter } from '@/components/layout/components/Sidebar/SidebarFooter';
import { useSidebarBehavior } from '@/hooks/useSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useNavigationCache } from '@/hooks/useNavigationCache';

interface ModernSidebarProps {
  onLogout: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ onLogout }) => {
  const { isExpanded } = useSidebarBehavior();
  const { currentUser } = useAuth();
  const { sidebarPreferences } = useLayout();
  const { navigationMenu } = useNavigationCache({
    panel: sidebarPreferences.activePanel
  });

  // Debug panel-based navigation
  useEffect(() => {
    if (currentUser && navigationMenu.length > 0) {
      console.log('Current User Role:', currentUser.role);
      console.log('Active Panel:', sidebarPreferences.activePanel);
      console.log('Panel Menu Groups:', navigationMenu.length);

      // Debug each menu group for current panel
      navigationMenu.forEach((group, index) => {
        console.log(`Panel[${sidebarPreferences.activePanel}] Group ${index + 1}:`, group.label, 'Items:', group.items.length);
        group.items.forEach((item, itemIndex) => {
          console.log(`  Item ${itemIndex + 1}:`, item.label, 'Path:', item.path, 'Children:', item.children?.length || 0);
        });
      });
    }
  }, [currentUser, navigationMenu, sidebarPreferences.activePanel]);

  if (!currentUser) return null;

  return (
    <SidebarContainer>
      <div className="flex flex-col h-full">
        <SidebarHeader isExpanded={isExpanded} />
        <SidebarPanelSwitch isExpanded={isExpanded} />
        <SidebarMenu menuGroups={navigationMenu} />
        <SidebarFooter isExpanded={isExpanded} onLogout={onLogout} />
      </div>
    </SidebarContainer>
  );
};
