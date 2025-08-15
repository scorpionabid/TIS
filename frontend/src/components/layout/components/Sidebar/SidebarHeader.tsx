import React from 'react';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarHeaderProps {
  isExpanded: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isExpanded }) => {
  return (
    <div className="h-16 flex items-center px-4 border-b border-border">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out",
            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
          )}
        >
          <h2 className="text-lg font-bold text-foreground whitespace-nowrap">
            Təhsil İdarəsi
          </h2>
        </div>
      </div>
    </div>
  );
};