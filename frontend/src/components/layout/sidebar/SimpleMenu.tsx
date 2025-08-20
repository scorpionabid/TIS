import { cn } from "@/lib/utils";
import { MenuItem } from "./types";

interface SimpleMenuProps {
  menuItems: MenuItem[];
  currentPath: string;
  isExpanded: boolean;
  onNavigate: (path: string) => void;
}

export const SimpleMenu = ({
  menuItems,
  currentPath,
  isExpanded,
  onNavigate
}: SimpleMenuProps) => {
  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/";
    return currentPath === path;
  };

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-1">
      {menuItems.map((item) => (
        <button
          key={item.path}
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
      ))}
    </div>
  );
};