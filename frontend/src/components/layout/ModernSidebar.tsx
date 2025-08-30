import React, { useEffect } from 'react';
import { SidebarContainer } from '@/components/layout/components/Sidebar/SidebarContainer';
import { SidebarHeader } from '@/components/layout/components/Sidebar/SidebarHeader';
import { SidebarMenu } from '@/components/layout/components/Sidebar/SidebarMenu';
import { SidebarFooter } from '@/components/layout/components/Sidebar/SidebarFooter';
import { useSidebarBehavior } from '@/hooks/useSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigationCache, useNavigationPerformance } from '@/hooks/useNavigationCache';

interface ModernSidebarProps {
  onLogout: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ onLogout }) => {
  const { isExpanded } = useSidebarBehavior();
  const { currentUser } = useAuth();
  const { navigationMenu, getCacheStats, cacheKey } = useNavigationCache();
  const { measureMenuGeneration } = useNavigationPerformance();

  // Debug user role and menu groups with performance monitoring
  useEffect(() => {
    if (currentUser && navigationMenu.length > 0) {
      console.log('Current User Role:', currentUser.role);
      console.log('Cache Key:', cacheKey);
      
      // Measure performance
      const perfStats = measureMenuGeneration(navigationMenu);
      console.log('Navigation Performance:', perfStats);
      
      // Cache statistics
      const cacheStats = getCacheStats();
      console.log('Navigation Cache Stats:', cacheStats);
      
      // Debug each menu group
      navigationMenu.forEach((group, index) => {
        console.log(`Menu Group ${index + 1}:`, group.label, 'Items:', group.items.length);
        group.items.forEach((item, itemIndex) => {
          console.log(`  Item ${itemIndex + 1}:`, item.label, 'Path:', item.path, 'Children:', item.children?.length || 0);
        });
      });
    }
  }, [currentUser, navigationMenu, cacheKey, measureMenuGeneration, getCacheStats]);

  if (!currentUser) return null;

  return (
    <SidebarContainer>
      <div className="flex flex-col h-full">
        <SidebarHeader isExpanded={isExpanded} />
        <SidebarMenu menuGroups={navigationMenu} />
        <SidebarFooter isExpanded={isExpanded} onLogout={onLogout} />
      </div>
    </SidebarContainer>
  );
};