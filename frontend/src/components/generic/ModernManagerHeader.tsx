import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  LayoutTemplate,
  Filter,
  X,
  MoreVertical,
  Users,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface HeaderAction {
  key: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  onClick: () => void;
  isVisible?: boolean;
  isLoading?: boolean;
}

export interface HeaderStat {
  key: string;
  label: string;
  value: number;
  icon?: React.ElementType;
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber';
  tooltip?: string;
}

export interface ModernManagerHeaderProps {
  // Title section
  title: string;
  description?: string;
  
  // Stats
  stats?: HeaderStat[];
  
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Tabs integration
  tabs?: {
    key: string;
    label: string;
    count?: number;
    icon?: React.ElementType;
    variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info';
  }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  
  // Actions
  actions?: HeaderAction[];
  primaryAction?: {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    isLoading?: boolean;
  };
  
  // Filter
  filterCount?: number;
  onFilterClick?: () => void;
  
  // Refresh
  onRefresh?: () => void;
  isRefreshing?: boolean;
  
  // Import/Export
  onImport?: () => void;
  onExport?: () => void;
  onTemplate?: () => void;
  showImport?: boolean;
  showExport?: boolean;
  showTemplate?: boolean;
  
  // Responsive
  className?: string;
  hideTitleSection?: boolean;
}

const getStatColorClasses = (color: string) => {
  switch (color) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    case 'red':
      return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    case 'blue':
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    case 'amber':
      return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
  }
};

const getStatDotColor = (color: string) => {
  switch (color) {
    case 'green':
      return 'bg-emerald-500';
    case 'red':
      return 'bg-rose-500';
    case 'blue':
      return 'bg-blue-500';
    case 'amber':
      return 'bg-amber-500';
    default:
      return 'bg-slate-500';
  }
};

export const ModernManagerHeader: React.FC<ModernManagerHeaderProps> = ({
  title,
  description,
  stats = [],
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Axtar...',
  tabs = [],
  activeTab,
  onTabChange,
  actions = [],
  primaryAction,
  filterCount = 0,
  onFilterClick,
  onRefresh,
  isRefreshing = false,
  onImport,
  onExport,
  onTemplate,
  showImport = false,
  showExport = false,
  showTemplate = false,
  className,
  hideTitleSection = false,
}) => {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  
  // Filter visible actions
  const visibleActions = actions.filter(a => a.isVisible !== false);
  
  // Determine which actions go to dropdown (on mobile or when too many)
  const mainActions = visibleActions.slice(0, 2);
  const dropdownActions = visibleActions.slice(2);
  
  return (
    <TooltipProvider>
      <div className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
        className
      )}>
        {/* Top Row - Title and Primary Actions */}
        {!hideTitleSection && (
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                    {title}
                  </h1>
                  {description && (
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Primary Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Refresh */}
              {onRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    >
                      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Yenilə</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Secondary Actions Group */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Template Button */}
                {showTemplate && onTemplate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTemplate}
                    className="h-9 px-4 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium bg-white"
                  >
                    <LayoutTemplate className="h-4 w-4 mr-2 text-slate-400" />
                    Şablon
                  </Button>
                )}
                
                {/* Import Button */}
                {showImport && onImport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onImport}
                    className="h-9 px-4 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium bg-white"
                  >
                    <Upload className="h-4 w-4 mr-2 text-slate-400" />
                    İdxal
                  </Button>
                )}
                
                {/* Export Button */}
                {showExport && onExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                    className="h-9 px-4 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium bg-white"
                  >
                    <Download className="h-4 w-4 mr-2 text-slate-400" />
                    İxrac
                  </Button>
                )}
              </div>
              
              {/* More Actions Dropdown */}
              {(dropdownActions.length > 0) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {dropdownActions.map(action => (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={action.onClick}
                        disabled={action.isLoading}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Primary Create Button */}
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.isLoading}
                  size="sm"
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
                >
                  {primaryAction.isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />
                  )}
                  {primaryAction.label}
                </Button>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Bottom Row - Search and Tabs */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full lg:max-w-xs">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                isSearchFocused ? "text-blue-500" : "text-slate-400"
              )} />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "pl-10 pr-9 h-10 bg-white border-slate-200 rounded-lg transition-all text-sm",
                  "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm",
                  isSearchFocused && "border-blue-500 ring-2 ring-blue-500/20"
                )}
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Tabs Row */}
            {tabs.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => onTabChange?.(tab.key)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                        isActive 
                          ? tab.variant === 'success' 
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      {tab.icon && <tab.icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-slate-400")} />}
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center",
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Spacer */}
            <div className="flex-1 hidden lg:block" />
            
            {/* Filter Button (if needed) */}
            {onFilterClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFilterClick}
                className={cn(
                  "h-10 px-4 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-medium",
                  filterCount > 0 && "border-blue-500 text-blue-600 bg-blue-50/50"
                )}
              >
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                Filtrlər
                {filterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 flex items-center justify-center bg-blue-100 text-blue-700">
                    {filterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ModernManagerHeader;
