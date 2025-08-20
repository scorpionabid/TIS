import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuGroup, MenuItem } from "./types";

interface SuperAdminMenuProps {
  menuStructure: MenuGroup[];
  openGroups: Record<string, boolean>;
  itemSubmenus: Record<string, boolean>;
  isExpanded: boolean;
  currentPath: string;
  onGroupToggle: (groupLabel: string) => void;
  onItemSubmenuToggle: (itemKey: string) => void;
  onNavigate: (path: string) => void;
}

export const SuperAdminMenu = ({
  menuStructure,
  openGroups,
  itemSubmenus,
  isExpanded,
  currentPath,
  onGroupToggle,
  onItemSubmenuToggle,
  onNavigate
}: SuperAdminMenuProps) => {
  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/";
    return currentPath === path;
  };

  const renderMenuItem = (item: MenuItem, itemIndex: number) => {
    if (item.hasSubmenu) {
      return (
        <div key={itemIndex}>
          <button
            onClick={() => onItemSubmenuToggle(item.key!)}
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md mx-1",
              "hover:bg-sidebar-accent text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isExpanded && (
              <>
                <span className="ml-3 truncate">{item.label}</span>
                <ChevronRightIcon
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform duration-200",
                    itemSubmenus[item.key!] ? "rotate-90" : "rotate-0"
                  )}
                />
              </>
            )}
          </button>
          {/* Submenu */}
          {isExpanded && itemSubmenus[item.key!] && (
            <div className="ml-8 mt-1 space-y-1">
              {item.submenu?.map((subItem, subIndex) => (
                <button
                  key={subIndex}
                  onClick={() => onNavigate(subItem.path)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md",
                    isActive(subItem.path)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <span className="truncate">{subItem.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={itemIndex}
        onClick={() => onNavigate(item.path!)}
        className={cn(
          "w-full flex items-center px-3 py-2 text-sm transition-colors duration-200 rounded-md mx-1",
          isActive(item.path!)
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {isExpanded && <span className="ml-3 truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {menuStructure.map((group, groupIndex) => {
        const isGroupOpen = openGroups[group.groupLabel];
        
        return (
          <div key={groupIndex} className="mb-4">
            {/* Group Header - Only show when expanded */}
            {isExpanded && (
              <button
                type="button"
                className="w-full flex items-center px-3 py-2 mb-2 focus:outline-none group hover:bg-sidebar-accent/50 transition-colors duration-200 rounded-md mx-1"
                onClick={() => onGroupToggle(group.groupLabel)}
                aria-expanded={isGroupOpen}
              >
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1 text-left">
                  {group.groupLabel}
                </h3>
                <ChevronRightIcon
                  className={cn(
                    "ml-2 h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isGroupOpen ? "rotate-90" : "rotate-0"
                  )}
                />
              </button>
            )}

            {/* Group Items */}
            {(isGroupOpen || !isExpanded) && (
              <div className="space-y-1">
                {group.items.map((item, itemIndex) => renderMenuItem(item, itemIndex))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};