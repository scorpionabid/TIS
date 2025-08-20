import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  RefreshCw,
  X,
  Book,
  Zap,
  Users,
  Volume2,
  Monitor,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomFiltersProps {
  searchTerm: string;
  filterType: string;
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: string) => void;
  onRefresh: () => void;
  onClear: () => void;
  className?: string;
}

export const RoomFilters: React.FC<RoomFiltersProps> = ({
  searchTerm,
  filterType,
  onSearchChange,
  onFilterTypeChange,
  onRefresh,
  onClear,
  className
}) => {
  const roomTypes = [
    { value: 'all', label: 'Bütün otaqlar', icon: null, count: null },
    { value: 'classroom', label: 'Sinif', icon: Book, count: null },
    { value: 'laboratory', label: 'Laboratoriya', icon: Zap, count: null },
    { value: 'gymnasium', label: 'İdman Zalı', icon: Users, count: null },
    { value: 'library', label: 'Kitabxana', icon: Book, count: null },
    { value: 'auditorium', label: 'Akt Zalı', icon: Volume2, count: null },
    { value: 'computer_lab', label: 'Kompyuter Lab', icon: Monitor, count: null },
    { value: 'art_room', label: 'İncəsənət Otağı', icon: Edit, count: null },
    { value: 'music_room', label: 'Musiqi Otağı', icon: Volume2, count: null }
  ];

  const hasActiveFilters = searchTerm || filterType !== 'all';

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Filtr və Axtarış</Label>
            </div>
            
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onClear}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Təmizlə
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs text-muted-foreground">
              Otaq adı və ya bina axtarışı
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Otaq adı, bina və ya mərtəbə axtarın..."
                className="pl-10"
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
          </div>

          {/* Room Type Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Otaq növü
            </Label>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Otaq növünü seçin" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{type.label}</span>
                        {type.count && (
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {type.count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filter Buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Sürətli filtrlər
            </Label>
            <div className="flex flex-wrap gap-2">
              {roomTypes.slice(1).map(type => {
                const Icon = type.icon;
                const isActive = filterType === type.value;
                
                return (
                  <Button
                    key={type.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterTypeChange(isActive ? 'all' : type.value)}
                    className="text-xs h-8"
                  >
                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Aktiv filtrlər
              </Label>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Axtarış: "{searchTerm}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => onSearchChange('')}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
                
                {filterType !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Növ: {roomTypes.find(t => t.value === filterType)?.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => onFilterTypeChange('all')}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Filter Summary */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            {hasActiveFilters ? (
              <span>Filtrlər tətbiq edilib</span>
            ) : (
              <span>Bütün otaqlar göstərilir</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};