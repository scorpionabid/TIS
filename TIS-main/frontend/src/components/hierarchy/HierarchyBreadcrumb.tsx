import React from 'react';
import { ChevronRight, Home, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HierarchyPath, hierarchyService } from '@/services/hierarchy';
import { cn } from '@/lib/utils';

interface HierarchyBreadcrumbProps {
  path: HierarchyPath[];
  onNavigate?: (institutionId: number) => void;
  className?: string;
  maxItems?: number;
}

export const HierarchyBreadcrumb: React.FC<HierarchyBreadcrumbProps> = ({
  path,
  onNavigate,
  className,
  maxItems = 5,
}) => {
  if (!path || path.length === 0) {
    return null;
  }

  // If path is too long, show first item, ellipsis, and last few items
  const shouldTruncate = path.length > maxItems;
  let displayPath = path;

  if (shouldTruncate) {
    const keepLast = maxItems - 2; // Keep space for first item and ellipsis
    displayPath = [
      path[0], // First item (root)
      { id: -1, name: '...', type: 'ellipsis', level: 0 }, // Ellipsis indicator
      ...path.slice(-keepLast), // Last few items
    ];
  }

  const handleItemClick = (item: HierarchyPath) => {
    if (item.id !== -1 && onNavigate) { // -1 is ellipsis
      onNavigate(item.id);
    }
  };

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)} aria-label="Breadcrumb">
      <div className="flex items-center space-x-1">
        {/* Home icon for root */}
        <Home className="h-4 w-4 text-muted-foreground" />
        
        {displayPath.map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex items-center">
            {/* Separator */}
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mr-1" />
            )}
            
            {/* Breadcrumb Item */}
            {item.id === -1 ? (
              // Ellipsis indicator
              <span className="px-2 py-1 text-muted-foreground font-medium">
                ...
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto p-1 font-normal hover:bg-muted/50",
                  index === displayPath.length - 1 
                    ? "font-medium text-foreground cursor-default" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleItemClick(item)}
                disabled={index === displayPath.length - 1} // Last item is not clickable
              >
                <div className="flex items-center gap-1.5">
                  {/* Institution icon */}
                  <span className="text-xs">
                    {hierarchyService.getTypeIcon(item.type)}
                  </span>
                  
                  {/* Institution name */}
                  <span className="truncate max-w-[120px] md:max-w-[200px]">
                    {item.name}
                  </span>
                  
                  {/* Level indicator */}
                  <span className="text-xs text-muted-foreground ml-1">
                    L{item.level}
                  </span>
                </div>
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {/* Path summary for mobile */}
      <div className="ml-auto flex items-center md:hidden">
        <span className="text-xs text-muted-foreground">
          {path.length} səviyyə
        </span>
      </div>
    </nav>
  );
};

interface HierarchyPathDisplayProps {
  path: HierarchyPath[];
  className?: string;
  separator?: string;
}

export const HierarchyPathDisplay: React.FC<HierarchyPathDisplayProps> = ({
  path,
  className,
  separator = ' > ',
}) => {
  if (!path || path.length === 0) {
    return null;
  }

  const pathText = path.map(item => item.name).join(separator);

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <Building2 className="h-3 w-3 flex-shrink-0" />
        <span className="truncate" title={pathText}>
          {pathText}
        </span>
      </div>
    </div>
  );
};

interface CompactBreadcrumbProps {
  path: HierarchyPath[];
  onNavigate?: (institutionId: number) => void;
  className?: string;
}

export const CompactBreadcrumb: React.FC<CompactBreadcrumbProps> = ({
  path,
  onNavigate,
  className,
}) => {
  if (!path || path.length === 0) {
    return null;
  }

  const current = path[path.length - 1];
  const parent = path.length > 1 ? path[path.length - 2] : null;

  return (
    <div className={cn("flex items-center text-sm", className)}>
      {parent && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-muted-foreground hover:text-foreground"
            onClick={() => onNavigate?.(parent.id)}
          >
            <div className="flex items-center gap-1">
              <span className="text-xs">
                {hierarchyService.getTypeIcon(parent.type)}
              </span>
              <span className="truncate max-w-[100px]">
                {parent.name}
              </span>
            </div>
          </Button>
          <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
        </>
      )}
      
      <div className="flex items-center gap-1 font-medium">
        <span className="text-xs">
          {hierarchyService.getTypeIcon(current.type)}
        </span>
        <span className="truncate max-w-[150px]">
          {current.name}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          L{current.level}
        </span>
      </div>
    </div>
  );
};

export default HierarchyBreadcrumb;