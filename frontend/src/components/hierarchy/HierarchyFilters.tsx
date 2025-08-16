import React, { useState } from 'react';
import { Search, Filter, X, RefreshCw, SlidersHorizontal } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HierarchyFilters as IHierarchyFilters } from '@/services/hierarchy';
import { cn } from '@/lib/utils';

interface HierarchyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: IHierarchyFilters;
  onFiltersChange: (filters: IHierarchyFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
}

const INSTITUTION_TYPES = [
  { value: 'ministry', label: 'Nazirlik', icon: '🏛️' },
  { value: 'region', label: 'Regional İdarə', icon: '🌍' },
  { value: 'sektor', label: 'Sektor', icon: '🏢' },
  { value: 'school', label: 'Məktəb', icon: '🏫' },
  { value: 'kindergarten', label: 'Uşaq Bağçası', icon: '🏫' },
  { value: 'preschool_center', label: 'Məktəbəqədər Təhsil Mərkəzi', icon: '🎓' },
  { value: 'nursery', label: 'Uşaq Evləri', icon: '🏡' },
  { value: 'vocational', label: 'Peşə Məktəbi', icon: '⚙️' },
  { value: 'special', label: 'Xüsusi Məktəb', icon: '♿' },
  { value: 'private', label: 'Özəl Məktəb', icon: '🔒' },
];

const LEVELS = [
  { value: 1, label: 'Səviyyə 1 (Nazirlik)' },
  { value: 2, label: 'Səviyyə 2 (Regional İdarələr)' },
  { value: 3, label: 'Səviyyə 3 (Sektorlar)' },
  { value: 4, label: 'Səviyyə 4 (Məktəblər/Bağçalar)' },
  { value: 5, label: 'Səviyyə 5 (Alt Bölmələr)' },
];

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
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Müəssisə adı, növü və ya kodu ilə axtarın..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Advanced Filters Toggle */}
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
                    <h4 className="font-medium">Ətraflı Filterlər</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onReset}
                      disabled={activeFiltersCount === 0}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sıfırla
                    </Button>
                  </div>

                  {/* Display Options */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-muted-foreground">Görünüş Seçimləri</h5>
                    
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
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="quick-inactive"
                checked={filters.include_inactive || false}
                onCheckedChange={(checked) => handleFilterChange('include_inactive', checked)}
              />
              <Label htmlFor="quick-inactive" className="text-sm text-muted-foreground">
                Qeyri-aktivlər
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
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

          {/* Active Search/Filter Indicators */}
          {(searchTerm || activeFiltersCount > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  Axtarış: "{searchTerm}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onSearchChange('')}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}

              {filters.include_inactive && (
                <Badge variant="secondary" className="gap-1">
                  Qeyri-aktivlər daxil
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleFilterChange('include_inactive', false)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}

              {filters.expand_all && (
                <Badge variant="secondary" className="gap-1">
                  Hamısı genişləndirilmiş
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleFilterChange('expand_all', false)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}

              {filters.max_depth !== undefined && filters.max_depth !== 5 && (
                <Badge variant="secondary" className="gap-1">
                  Max {filters.max_depth} səviyyə
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleFilterChange('max_depth', 5)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}

              {(searchTerm || activeFiltersCount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  Hamısını sıfırla
                </Button>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Filterlənir...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HierarchyFilters;