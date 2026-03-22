import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MenuGroup, MenuItem } from '@/config/navigation';
import { useSidebarBehavior } from '@/hooks/useSidebar';
import type { PageBadgeCounts } from '@/services/notification';

interface SidebarMenuProps {
  menuGroups: MenuGroup[];
  badgeCounts?: PageBadgeCounts;
}

// Hər bölməyə rəngli sol kənar + başlıq rəngi
const GROUP_STYLES: Record<string, { border: string; label: string; dot: string }> = {
  'dashboard':           { border: 'border-l-blue-400',    label: 'text-blue-500',    dot: 'bg-blue-400' },
  'messages':            { border: 'border-l-indigo-400',  label: 'text-indigo-500',  dot: 'bg-indigo-400' },
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

/** Oxunmamış sayını compact formada göstər: 1-99 → rəqəm, 100+ → "99+" */
function BadgeCount({ count, collapsed = false }: { count: number; collapsed?: boolean }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  if (collapsed) {
    // Collapsed sidebar: icon üzərində kiçik qırmızı nöqtə/rəqəm
    return (
      <span
        className={cn(
          "absolute top-0.5 right-0.5 flex items-center justify-center",
          "min-w-[14px] h-[14px] px-0.5",
          "text-[9px] font-bold leading-none",
          "bg-rose-500 text-white rounded-full",
        )}
      >
        {count > 9 ? '9+' : label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "ml-auto flex items-center justify-center",
        "min-w-[18px] h-[18px] px-1",
        "text-[11px] font-bold leading-none",
        "bg-rose-500 text-white rounded-full shrink-0",
      )}
    >
      {label}
    </span>
  );
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ menuGroups, badgeCounts }) => {
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

  const getBadgeCount = (item: MenuItem): number => {
    if (!item.badgeKey || !badgeCounts) return 0;
    return badgeCounts[item.badgeKey] ?? 0;
  };

  /** Recursive: toplam badge count (children dahil) */
  const getTotalBadgeCount = (item: MenuItem): number => {
    let total = getBadgeCount(item);
    if (item.children) {
      for (const child of item.children) {
        total += getTotalBadgeCount(child);
      }
    }
    return total;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.path);
    const isGroupOpen = openGroups.includes(item.id);
    const IconComponent = item.icon ?? Circle;
    const badgeCount = getBadgeCount(item);
    const totalBadgeCount = getTotalBadgeCount(item); // parent üçün children-i də sayır

    if (!isExpanded && !hasChildren) {
      const tooltipLabel = badgeCount > 0
        ? `${item.label} (${badgeCount} oxunmamış)`
        : item.label;

      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 mx-2 my-1 relative",
                isItemActive && "bg-primary text-primary-foreground"
              )}
              asChild={!!item.path}
            >
              {item.path ? (
                <Link to={item.path} onClick={() => handleNavigation(item.path!)}>
                  <IconComponent className="h-4 w-4" />
                  <BadgeCount count={badgeCount} collapsed />
                </Link>
              ) : (
                <div>
                  <IconComponent className="h-4 w-4" />
                  <BadgeCount count={badgeCount} collapsed />
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            {tooltipLabel}
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
              {isExpanded && totalBadgeCount > 0 && !isGroupOpen && (
                <BadgeCount count={totalBadgeCount} />
              )}
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
          <span className="flex-1">{item.label}</span>
          <BadgeCount count={badgeCount} />
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
