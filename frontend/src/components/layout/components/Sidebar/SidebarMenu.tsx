import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MenuGroup, MenuItem } from '@/config/navigation';
import { useSidebarBehavior } from '@/hooks/useSidebar';

interface SidebarMenuProps {
  menuGroups: MenuGroup[];
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ menuGroups }) => {
  const { isExpanded, currentPath, handleNavigation } = useSidebarBehavior();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActive = (path?: string) => path === currentPath;

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.path);
    const isGroupOpen = openGroups.includes(item.id);

    if (!isExpanded && !hasChildren) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 mx-2 my-1",
                isItemActive && "bg-primary text-primary-foreground"
              )}
              asChild={!!item.path}
            >
              {item.path ? (
                <Link to={item.path} onClick={() => handleNavigation(item.path!)}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                </Link>
              ) : (
                <div>
                  {item.icon && <item.icon className="h-4 w-4" />}
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isGroupOpen} onOpenChange={() => toggleGroup(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-10 px-4 my-1",
                level > 0 && "ml-4",
                isItemActive && "bg-primary text-primary-foreground"
              )}
            >
              {item.icon && <item.icon className="h-4 w-4 mr-3" />}
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight 
                className={cn(
                  "h-4 w-4 transition-transform",
                  isGroupOpen && "rotate-90"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          "w-full justify-start h-10 px-4 my-1",
          level > 0 && "ml-4",
          isItemActive && "bg-primary text-primary-foreground"
        )}
        asChild
      >
        <Link to={item.path!} onClick={() => handleNavigation(item.path!)}>
          {item.icon && <item.icon className="h-4 w-4 mr-3" />}
          <span>{item.label}</span>
        </Link>
      </Button>
    );
  };

  return (
    <nav className="flex-1 py-4 overflow-y-auto">
      {menuGroups.map(group => (
        <div key={group.id} className="mb-6">
          {isExpanded && (
            <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </h3>
          )}
          <div className="space-y-1">
            {group.items.map(item => renderMenuItem(item))}
          </div>
        </div>
      ))}
    </nav>
  );
};