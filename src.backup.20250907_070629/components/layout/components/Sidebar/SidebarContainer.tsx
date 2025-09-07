import React from 'react';
import { cn } from '@/lib/utils';
import { useSidebarBehavior } from '@/hooks/useSidebar';

interface SidebarContainerProps {
  children: React.ReactNode;
}

export const SidebarContainer: React.FC<SidebarContainerProps> = ({ children }) => {
  const { 
    isExpanded, 
    isMobile, 
    handleMouseEnter, 
    handleMouseLeave 
  } = useSidebarBehavior();

  if (isMobile) {
    return (
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-card border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out",
          isExpanded ? "translate-x-0" : "-translate-x-full",
          "w-64"
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "bg-card border-r border-border transition-all duration-300 ease-in-out relative z-30",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </aside>
  );
};