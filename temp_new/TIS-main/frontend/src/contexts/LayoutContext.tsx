import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { SidebarPreferences, DEFAULT_SIDEBAR_PREFERENCES } from '@/types/sidebar';
import { SidebarStorage } from '@/utils/sidebarStorage';

interface LayoutContextType {
  sidebarCollapsed: boolean;
  sidebarHovered: boolean;
  isMobile: boolean;
  sidebarPreferences: SidebarPreferences;
  preferencesModalOpen: boolean;
  tempPreferences: SidebarPreferences;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHovered: (hovered: boolean) => void;
  toggleSidebar: () => void;
  setSidebarPreferences: (preferences: SidebarPreferences) => void;
  setPreferencesModalOpen: (open: boolean) => void;
  setTempPreferences: (preferences: SidebarPreferences) => void;
  savePreferences: () => void;
  resetPreferences: () => void;
  openPreferencesModal: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [sidebarPreferences, setSidebarPreferences] = useState<SidebarPreferences>(() => 
    SidebarStorage.loadPreferences()
  );
  const [tempPreferences, setTempPreferences] = useState<SidebarPreferences>(sidebarPreferences);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedState = SidebarStorage.loadSidebarState();
    if (savedState && sidebarPreferences.persistState) {
      return !savedState.isExpanded;
    }
    return !sidebarPreferences.defaultExpanded;
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle mobile detection and responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save sidebar state when it changes (if persistence is enabled)
  useEffect(() => {
    if (sidebarPreferences.persistState && !isMobile) {
      SidebarStorage.saveSidebarState(!sidebarCollapsed);
    }
  }, [sidebarCollapsed, sidebarPreferences.persistState, isMobile]);

  // Update sidebar state when preferences change
  useEffect(() => {
    if (!sidebarPreferences.persistState) {
      setSidebarCollapsed(!sidebarPreferences.defaultExpanded);
    }
    // If keepAlwaysExpanded is enabled, force sidebar to be expanded
    if (sidebarPreferences.keepAlwaysExpanded) {
      setSidebarCollapsed(false);
    }
  }, [sidebarPreferences.defaultExpanded, sidebarPreferences.persistState, sidebarPreferences.keepAlwaysExpanded]);

  const toggleSidebar = useCallback(() => {
    // Prevent toggling if keepAlwaysExpanded is enabled
    if (sidebarPreferences.keepAlwaysExpanded) {
      return;
    }
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, sidebarPreferences.keepAlwaysExpanded]);

  const openPreferencesModal = useCallback(() => {
    setTempPreferences(sidebarPreferences);
    setPreferencesModalOpen(true);
  }, [sidebarPreferences]);

  const savePreferences = useCallback(() => {
    setSidebarPreferences(tempPreferences);
    SidebarStorage.savePreferences(tempPreferences);
    setPreferencesModalOpen(false);
  }, [tempPreferences]);

  const resetPreferences = useCallback(() => {
    const defaultPrefs = SidebarStorage.resetToDefaults();
    setTempPreferences(defaultPrefs);
    setSidebarPreferences(defaultPrefs);
    setSidebarCollapsed(!defaultPrefs.defaultExpanded);
  }, []);

  const enhancedSetSidebarCollapsed = useCallback((collapsed: boolean) => {
    // Prevent collapsing if keepAlwaysExpanded is enabled
    if (sidebarPreferences.keepAlwaysExpanded && collapsed) {
      return;
    }
    if (sidebarPreferences.behavior === 'manual' || isMobile) {
      setSidebarCollapsed(collapsed);
    }
  }, [sidebarPreferences.behavior, sidebarPreferences.keepAlwaysExpanded, isMobile]);

  const enhancedSetSidebarHovered = useCallback((hovered: boolean) => {
    // If keepAlwaysExpanded is enabled, prevent hover behavior
    if (sidebarPreferences.keepAlwaysExpanded) {
      return;
    }
    if (sidebarPreferences.behavior === 'auto' && !isMobile) {
      setSidebarHovered(hovered);
    }
  }, [sidebarPreferences.behavior, sidebarPreferences.keepAlwaysExpanded, isMobile]);

  const value: LayoutContextType = {
    sidebarCollapsed,
    sidebarHovered,
    isMobile,
    sidebarPreferences,
    preferencesModalOpen,
    tempPreferences,
    setSidebarCollapsed: enhancedSetSidebarCollapsed,
    setSidebarHovered: enhancedSetSidebarHovered,
    toggleSidebar,
    setSidebarPreferences,
    setPreferencesModalOpen,
    setTempPreferences,
    savePreferences,
    resetPreferences,
    openPreferencesModal
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};