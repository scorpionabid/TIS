import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationContextType {
  currentPath: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path: string }>) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string; path: string }>>([]);

  useEffect(() => {
    // Auto-generate breadcrumbs based on current path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const generatedBreadcrumbs = pathSegments.map((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { label, path };
    });

    // Add home breadcrumb if not on home page
    if (location.pathname !== '/') {
      generatedBreadcrumbs.unshift({ label: 'Ana Səhifə', path: '/' });
    }

    setBreadcrumbs(generatedBreadcrumbs);
  }, [location.pathname]);

  const value: NavigationContextType = {
    currentPath: location.pathname,
    breadcrumbs,
    setBreadcrumbs
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};