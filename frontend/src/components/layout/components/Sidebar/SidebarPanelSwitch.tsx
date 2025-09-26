import React from 'react';
import { Settings, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarPanel } from '@/types/sidebar';
import { useLayout } from '@/contexts/LayoutContext';

interface SidebarPanelSwitchProps {
  isExpanded: boolean;
}

export const SidebarPanelSwitch: React.FC<SidebarPanelSwitchProps> = ({ isExpanded }) => {
  const { sidebarPreferences, setSidebarPreferences } = useLayout();

  const handlePanelSwitch = (panel: SidebarPanel) => {
    setSidebarPreferences({
      ...sidebarPreferences,
      activePanel: panel
    });
  };

  const getPanelIcon = (panel: SidebarPanel) => {
    return panel === 'management' ? Settings : Briefcase;
  };

  const getPanelLabel = (panel: SidebarPanel) => {
    return panel === 'management' ? 'İdarə Paneli' : 'İş Paneli';
  };

  if (!isExpanded) {
    // Collapsed state: Show only active panel icon
    const ActiveIcon = getPanelIcon(sidebarPreferences.activePanel);
    const inactivePanel: SidebarPanel = sidebarPreferences.activePanel === 'management' ? 'work' : 'management';
    const InactiveIcon = getPanelIcon(inactivePanel);

    return (
      <div className="flex flex-col items-center space-y-1 px-2 py-2 border-b border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                "bg-primary/10 text-primary border border-primary/20"
              )}
            >
              <ActiveIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {getPanelLabel(sidebarPreferences.activePanel)}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-60 hover:opacity-100"
              onClick={() => handlePanelSwitch(inactivePanel)}
            >
              <InactiveIcon className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {getPanelLabel(inactivePanel)}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded state: Show tab-like interface
  return (
    <div className="px-3 py-2 border-b border-border">
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {(['management', 'work'] as SidebarPanel[]).map((panel) => {
          const isActive = sidebarPreferences.activePanel === panel;
          const Icon = getPanelIcon(panel);

          return (
            <Button
              key={panel}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 h-8 text-xs transition-all duration-200",
                isActive && "bg-background shadow-sm text-foreground",
                !isActive && "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handlePanelSwitch(panel)}
            >
              <Icon className="h-3 w-3 mr-2" />
              {getPanelLabel(panel)}
            </Button>
          );
        })}
      </div>
    </div>
  );
};