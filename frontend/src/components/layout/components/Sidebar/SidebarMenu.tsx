import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MenuGroup, MenuItem } from '@/config/navigation';
import { useSidebarBehavior } from '@/hooks/useSidebar';

interface SidebarMenuProps {
  menuGroups: MenuGroup[];
}

// Hər bölməyə rəngli sol kənar + başlıq rəngi
const GROUP_STYLES: Record<string, { border: string; label: string; dot: string }> = {
  'dashboard':           { border: 'border-l-blue-400',    label: 'text-blue-500',    dot: 'bg-blue-400' },
  'academic-tracking':   { border: 'border-l-violet-400',  label: 'text-violet-500',  dot: 'bg-violet-400' },
  'content':             { border: 'border-l-amber-500',   label: 'text-amber-600',   dot: 'bg-amber-400' },
  'education-rating':    { border: 'border-l-emerald-400', label: 'text-emerald-600', dot: 'bg-emerald-400' },
  'schedule-management': { border: 'border-l-teal-400',    label: 'text-teal-600',    dot: 'bg-teal-400' },
  'teacher-profile':     { border: 'border-l-indigo-400',  label: 'text-indigo-500',  dot: 'bg-indigo-400' },
  'school-management':   { border: 'border-l-sky-400',     label: 'text-sky-600',     dot: 'bg-sky-400' },
  'sector-management':   { border: 'border-l-cyan-400',    label: 'text-cyan-600',    dot: 'bg-cyan-400' },
  'system-structure':    { border: 'border-l-slate-400',   label: 'text-slate-500',   dot: 'bg-slate-400' },
  'analytics':           { border: 'border-l-green-400',   label: 'text-green-600',   dot: 'bg-green-400' },
  'notifications':       { border: 'border-l-rose-400',    label: 'text-rose-500',    dot: 'bg-rose-400' },
  'system-settings':     { border: 'border-l-gray-400',    label: 'text-gray-500',    dot: 'bg-gray-400' },
};

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ menuGroups }) => {
  const { isExpanded, currentPath, handleNavigation } = useSidebarBehavior();
  const navigate = useNavigate();
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
    const IconComponent = item.icon ?? Circle;

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
                  <IconComponent className="h-4 w-4" />
                </Link>
              ) : (
                <div>
                  <IconComponent className="h-4 w-4" />
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
      const buttonClasses = cn(
        "w-full h-10 my-1",
        isExpanded ? "px-4 justify-start" : "px-2 justify-center",
        level > 0 && isExpanded && "ml-4",
        isItemActive && "bg-primary text-primary-foreground"
      );

      return (
        <Collapsible key={item.id} open={isGroupOpen} onOpenChange={() => toggleGroup(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={buttonClasses}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                  handleNavigation(item.path);
                }
              }}
            >
              <IconComponent className={cn("h-4 w-4", isExpanded && "mr-3")} />
              <span
                className={cn(
                  "flex-1 text-left transition-opacity duration-150",
                  !isExpanded && "opacity-0 pointer-events-none absolute"
                )}
              >
                {item.label}
              </span>
              {isExpanded && (
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isGroupOpen && "rotate-90"
                  )}
                />
              )}
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
          <IconComponent className="h-4 w-4 mr-3" />
          <span>{item.label}</span>
        </Link>
      </Button>
    );
  };

  return (
    <nav className="flex-1 py-4 overflow-y-auto">
      {menuGroups.map(group => {
        const gs = GROUP_STYLES[group.id];
        return (
          <div
            key={group.id}
            className={cn(
              "mb-5",
              isExpanded && gs && `border-l-2 ml-2 pl-0 rounded-r-sm ${gs.border}`
            )}
          >
            {isExpanded && (
              <h3 className={cn(
                "px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5",
                gs ? gs.label : "text-muted-foreground"
              )}>
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", gs ? gs.dot : "bg-muted-foreground/40")} />
                {group.label}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => renderMenuItem(item))}
            </div>
          </div>
        );
      })}
    </nav>
  );
};