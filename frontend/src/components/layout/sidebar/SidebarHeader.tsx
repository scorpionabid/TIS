import { SchoolIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  userRole: string;
  isExpanded: boolean;
}

export const SidebarHeader = ({ userRole, isExpanded }: SidebarHeaderProps) => {
  return (
    <div className="h-14 flex items-center px-3 border-b border-sidebar-border bg-sidebar">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-primary flex-shrink-0">
          <SchoolIcon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className={cn("transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>
          <h2 className="font-semibold text-sm text-sidebar-foreground">ATİS</h2>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </div>
      </div>
    </div>
  );
};