import { useCallback } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { useNavigation } from '@/contexts/NavigationContext';

export const useSidebarBehavior = () => {
  const { 
    sidebarCollapsed, 
    sidebarHovered, 
    isMobile,
    sidebarPreferences,
    setSidebarCollapsed, 
    setSidebarHovered,
    toggleSidebar 
  } = useLayout();
  
  const { currentPath } = useNavigation();

  const handleMouseEnter = useCallback(() => {
    // Only allow hover expansion in auto mode and when not mobile
    if (sidebarPreferences.behavior === 'auto' && sidebarCollapsed && !isMobile) {
      setSidebarHovered(true);
    }
  }, [sidebarPreferences.behavior, sidebarCollapsed, isMobile, setSidebarHovered]);

  const handleMouseLeave = useCallback(() => {
    // Only allow hover collapse in auto mode
    if (sidebarPreferences.behavior === 'auto') {
      setSidebarHovered(false);
    }
  }, [sidebarPreferences.behavior, setSidebarHovered]);

  const handleNavigation = useCallback((path: string) => {
    // Auto-collapse sidebar after navigation based on preferences
    if (isMobile && sidebarPreferences.autoCollapseOnNavigation) {
      setSidebarCollapsed(true);
    }
    // On desktop in auto mode, collapse if sidebar was only temporarily expanded via hover
    else if (!isMobile && sidebarPreferences.behavior === 'auto' && sidebarHovered && sidebarCollapsed) {
      setSidebarHovered(false);
    }
  }, [isMobile, sidebarPreferences.autoCollapseOnNavigation, sidebarPreferences.behavior, sidebarHovered, sidebarCollapsed, setSidebarCollapsed, setSidebarHovered]);

  const closeSidebar = useCallback(() => {
    setSidebarHovered(false);
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed, setSidebarHovered]);

  // Determine if sidebar should be expanded based on mode and preferences
  const isExpanded = (() => {
    // If keepAlwaysExpanded is enabled, always return true
    if (sidebarPreferences.keepAlwaysExpanded) {
      return true;
    }
    if (sidebarPreferences.behavior === 'manual') {
      return !sidebarCollapsed;
    }
    // Auto mode: expanded if not collapsed OR if hovered
    return !sidebarCollapsed || sidebarHovered;
  })();

  return {
    isExpanded,
    sidebarCollapsed,
    sidebarHovered,
    isMobile,
    sidebarPreferences,
    currentPath,
    handleMouseEnter,
    handleMouseLeave,
    handleNavigation,
    toggleSidebar,
    closeSidebar
  };
};
