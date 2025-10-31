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
      <>
        {/* Mobile backdrop overlay */}
        {isExpanded && (
          <div
            className="sidebar-overlay"
            onClick={() => handleMouseLeave()}
          />
        )}

        {/* Mobile sidebar using existing CSS classes */}
        <div
          className={cn(
            "sidebar-mobile w-64 bg-card border-r border-border shadow-lg",
            !isExpanded && "closed"
          )}
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          {children}
        </div>
      </>
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
