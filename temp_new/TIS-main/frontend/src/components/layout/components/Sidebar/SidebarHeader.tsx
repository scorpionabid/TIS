import React from 'react';
import { GraduationCap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLayout } from '@/contexts/LayoutContext';

interface SidebarHeaderProps {
  isExpanded: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isExpanded }) => {
  const { openPreferencesModal } = useLayout();

  if (!isExpanded) {
    // Collapsed state: Show only logo and settings button
    return (
      <div className="h-16 flex flex-col items-center justify-center px-2 border-b border-border space-y-2">
        <div className="flex-shrink-0">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={openPreferencesModal}
            >
              <Settings className="h-3 w-3" />
              <span className="sr-only">Sidebar tənzimləmələri</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Sidebar tənzimləmələri
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded state: Show full header with title and settings
  return (
    <div className="h-16 flex items-center justify-between px-4 border-b border-border">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <div className="transition-all duration-300 ease-in-out">
          <h2 className="text-lg font-bold text-foreground whitespace-nowrap">
            Təhsil İdarəsi
          </h2>
        </div>
      </div>
      
      {/* Settings Button - Expanded */}
      <div className="transition-all duration-300 ease-in-out">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              onClick={openPreferencesModal}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Sidebar tənzimləmələri</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Sidebar tənzimləmələri
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};