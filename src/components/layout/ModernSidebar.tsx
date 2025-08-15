import React, { useEffect } from 'react';
import { SidebarContainer } from '@/components/layout/components/Sidebar/SidebarContainer';
import { SidebarHeader } from '@/components/layout/components/Sidebar/SidebarHeader';
import { SidebarMenu } from '@/components/layout/components/Sidebar/SidebarMenu';
import { SidebarFooter } from '@/components/layout/components/Sidebar/SidebarFooter';
import { useSidebarBehavior } from '@/hooks/useSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuForRole } from '@/config/navigation';

interface ModernSidebarProps {
  onLogout: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ onLogout }) => {
  const { isExpanded } = useSidebarBehavior();
  const { currentUser } = useAuth();

  // Debug user role and menu groups
  useEffect(() => {
    if (currentUser) {
      console.log('Current User Role:', currentUser.role);
      console.log('Current User:', currentUser);
      const menuGroups = getMenuForRole(currentUser.role);
      console.log('Menu Groups for Role:', menuGroups);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const menuGroups = getMenuForRole(currentUser.role);

  return (
    <SidebarContainer>
      <div className="flex flex-col h-full">
        <SidebarHeader isExpanded={isExpanded} />
        <SidebarMenu menuGroups={menuGroups} />
        <SidebarFooter isExpanded={isExpanded} onLogout={onLogout} />
      </div>
    </SidebarContainer>
  );
};