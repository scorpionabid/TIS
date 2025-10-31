import React, { useState } from 'react';
import { Search, X, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { HierarchyFilters as IHierarchyFilters } from '@/services/hierarchy';
import { cn } from '@/lib/utils';
import { FilterBar } from '@/components/common/FilterBar';

interface HierarchyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: IHierarchyFilters;
  onFiltersChange: (filters: IHierarchyFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
}

export const HierarchyFilters: React.FC<HierarchyFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  onReset,
  isLoading = false,
  className,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleFilterChange = (key: keyof IHierarchyFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.include_inactive) count++;
    if (filters.expand_all) count++;
    if (filters.max_depth !== undefined && filters.max_depth !== 5) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn("space-y-3", className)}>
      <FilterBar>
        <FilterBar.Group>
          <FilterBar.Field>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Müəssisə adı, növü və ya kodu ilə axtarın..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-11"
                disabled={isLoading}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => onSearchChange('')}
                  aria-label="Axtarışı təmizlə"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </FilterBar.Field>
        </FilterBar.Group>

        <FilterBar.Actions>
          <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "relative",
                  activeFiltersCount > 0 && "border-primary"
                )}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filterlər
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Ətraflı filterlər</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onReset}
                    disabled={activeFiltersCount === 0}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sıfırla
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-inactive" className="text-sm">
                      Qeyri-aktiv müəssisələri göstər
                    </Label>
                    <Switch
                      id="include-inactive"
                      checked={filters.include_inactive || false}
                      onCheckedChange={(checked) => handleFilterChange('include_inactive', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="expand-all" className="text-sm">
                      Bütün səviyyələri genişlət
                    </Label>
                    <Switch
                      id="expand-all"
                      checked={filters.expand_all || false}
                      onCheckedChange={(checked) => handleFilterChange('expand_all', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Maksimum dərinlik</Label>
                    <Select 
                      value={filters.max_depth?.toString() || '5'} 
                      onValueChange={(value) => handleFilterChange('max_depth', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dərinlik seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 səviyyə</SelectItem>
                        <SelectItem value="2">2 səviyyə</SelectItem>
                        <SelectItem value="3">3 səviyyə</SelectItem>
                        <SelectItem value="4">4 səviyyə</SelectItem>
                        <SelectItem value="5">5 səviyyə (Hamısı)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {(searchTerm || activeFiltersCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Hamısını sıfırla
            </Button>
          )}
        </FilterBar.Actions>
      </FilterBar>

      <div className="filter-panel">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="quick-inactive"
              checked={filters.include_inactive || false}
              onCheckedChange={(checked) => handleFilterChange('include_inactive', checked)}
            />
            <Label htmlFor="quick-inactive" className="text-sm text-muted-foreground">
              Qeyri-aktivlər
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="quick-expand"
              checked={filters.expand_all || false}
              onCheckedChange={(checked) => handleFilterChange('expand_all', checked)}
            />
            <Label htmlFor="quick-expand" className="text-sm text-muted-foreground">
              Hamısını aç
            </Label>
          </div>
        </div>
      </div>

      {(searchTerm || activeFiltersCount > 0) && (
        <div className="filter-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Aktiv filtrlər
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 gap-1"
            >
              <X className="h-4 w-4" />
              Hamısını təmizlə
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="filter-chip">
                Axtarış: "{searchTerm}"
                <button
                  onClick={() => onSearchChange('')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.include_inactive && (
              <span className="filter-chip">
                Qeyri-aktivlər daxil
                <button
                  onClick={() => handleFilterChange('include_inactive', false)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.expand_all && (
              <span className="filter-chip">
                Hamısı genişləndirilib
                <button
                  onClick={() => handleFilterChange('expand_all', false)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.max_depth !== undefined && filters.max_depth !== 5 && (
              <span className="filter-chip">
                Max {filters.max_depth} səviyyə
                <button
                  onClick={() => handleFilterChange('max_depth', 5)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Filterlənir...
        </div>
      )}
    </div>
  );
};

export default HierarchyFilters;
