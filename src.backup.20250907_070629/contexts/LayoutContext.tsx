import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface LayoutContextType {
  sidebarCollapsed: boolean;
  sidebarHovered: boolean;
  isMobile: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHovered: (hovered: boolean) => void;
  toggleSidebar: () => void;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const value: LayoutContextType = {
    sidebarCollapsed,
    sidebarHovered,
    isMobile,
    setSidebarCollapsed,
    setSidebarHovered,
    toggleSidebar
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};