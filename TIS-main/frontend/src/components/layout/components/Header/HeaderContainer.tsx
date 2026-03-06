import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayout } from '@/contexts/LayoutContext';

interface HeaderContainerProps {
  children: React.ReactNode;
}

export const HeaderContainer: React.FC<HeaderContainerProps> = ({ children }) => {
  const { toggleSidebar, isMobile } = useLayout();

  return (
    <header
      className="min-h-14 flex items-center border-b border-border bg-card/60 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2 lg:px-5 sticky top-0 z-40 overflow-hidden"
      style={isMobile ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' } : undefined}
    >
      <div className="flex items-center justify-between w-full min-w-0">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 sm:mr-4 h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        
        {/* Header Content */}
        <div className="min-w-0 w-full">
          {children}
        </div>
      </div>
    </header>
  );
};
