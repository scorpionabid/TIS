import React, { useEffect, useMemo } from 'react';
import { SidebarContainer } from '@/components/layout/components/Sidebar/SidebarContainer';
import { SidebarHeader } from '@/components/layout/components/Sidebar/SidebarHeader';
import { SidebarPanelSwitch } from '@/components/layout/components/Sidebar/SidebarPanelSwitch';
import { SidebarMenu } from '@/components/layout/components/Sidebar/SidebarMenu';
import { SidebarFooter } from '@/components/layout/components/Sidebar/SidebarFooter';
import { useSidebarBehavior } from '@/hooks/useSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useNavigationCache } from '@/hooks/useNavigationCache';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';
import { MenuGroup } from '@/config/navigation';

// Yalnız məktəbəqədər müəssisə admini üçün görünməli nav item ID-ləri
const PRESCHOOL_NAV_IDS = ['preschool-groups', 'preschool-attendance-entry'];

// Məktəbəqədər müəssisə növləri (backend-dən gələn type dəyərləri)
const PRESCHOOL_INSTITUTION_TYPES = ['kindergarten', 'preschool_center', 'nursery'];

/**
 * Institution type-a görə preschool-specific nav item-ləri filter edir.
 * Əgər istifadəçi regular school admin-dirsə, MB items-i gizlədir.
 */
export function applyInstitutionTypeFilter(
  menuGroups: MenuGroup[],
  institutionType: string | undefined,
): MenuGroup[] {
  const isPreschool = institutionType
    ? PRESCHOOL_INSTITUTION_TYPES.includes(institutionType)
    : false;

  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (PRESCHOOL_NAV_IDS.includes(item.id)) {
          return isPreschool;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

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
  const badgeCounts = useNotificationBadges();

  // Institution type-a görə preschool items-i filter et
  const filteredNavigationMenu = useMemo<MenuGroup[]>(() => {
    return applyInstitutionTypeFilter(
      navigationMenu,
      currentUser?.institution?.type,
    );
  }, [navigationMenu, currentUser?.institution?.type]);

  // Debug panel-based navigation
  useEffect(() => {
    if (currentUser && filteredNavigationMenu.length > 0) {
      console.log('Current User Role:', currentUser.role);
      console.log('Active Panel:', sidebarPreferences.activePanel);
      console.log('Panel Menu Groups:', filteredNavigationMenu.length);

      // Debug each menu group for current panel
      filteredNavigationMenu.forEach((group, index) => {
        console.log(`Panel[${sidebarPreferences.activePanel}] Group ${index + 1}:`, group.label, 'Items:', group.items.length);
        group.items.forEach((item, itemIndex) => {
          console.log(`  Item ${itemIndex + 1}:`, item.label, 'Path:', item.path, 'Children:', item.children?.length || 0);
        });
      });
    }
  }, [currentUser, filteredNavigationMenu, sidebarPreferences.activePanel]);

  if (!currentUser) return null;

  return (
    <SidebarContainer>
      <div className="flex flex-col h-full">
        <SidebarHeader isExpanded={isExpanded} />
        <SidebarPanelSwitch isExpanded={isExpanded} />
        <SidebarMenu menuGroups={filteredNavigationMenu} badgeCounts={badgeCounts} />
        <SidebarFooter isExpanded={isExpanded} onLogout={onLogout} />
      </div>
    </SidebarContainer>
  );
};
