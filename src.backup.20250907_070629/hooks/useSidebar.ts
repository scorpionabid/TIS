import { useCallback } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { useNavigation } from '@/contexts/NavigationContext';

export const useSidebarBehavior = () => {
  const { 
    sidebarCollapsed, 
    sidebarHovered, 
    isMobile,
    setSidebarCollapsed, 
    setSidebarHovered,
    toggleSidebar 
  } = useLayout();
  
  const { currentPath } = useNavigation();

  const handleMouseEnter = useCallback(() => {
    if (sidebarCollapsed && !isMobile) {
      setSidebarHovered(true);
    }
  }, [sidebarCollapsed, isMobile, setSidebarHovered]);

  const handleMouseLeave = useCallback(() => {
    setSidebarHovered(false);
  }, [setSidebarHovered]);

  const handleNavigation = useCallback((path: string) => {
    // Auto-collapse sidebar after navigation on mobile
    if (isMobile) {
      setSidebarCollapsed(true);
    }
    // On desktop, collapse if sidebar was only temporarily expanded via hover
    else if (sidebarHovered && sidebarCollapsed) {
      setSidebarHovered(false);
    }
  }, [isMobile, sidebarHovered, sidebarCollapsed, setSidebarCollapsed, setSidebarHovered]);

  const isExpanded = !sidebarCollapsed || sidebarHovered;

  return {
    isExpanded,
    sidebarCollapsed,
    sidebarHovered,
    isMobile,
    currentPath,
    handleMouseEnter,
    handleMouseLeave,
    handleNavigation,
    toggleSidebar
  };
};