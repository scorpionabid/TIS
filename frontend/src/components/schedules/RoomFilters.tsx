import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/common/FilterBar';
import {
  Search,
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

export const RoomFilters: React.FC<RoomFiltersProps> = ({
  searchTerm,
  filterType,
  onSearchChange,
  onFilterTypeChange,
  onRefresh,
  onClear,
  className
}) => {
  const hasActiveFilters = Boolean(searchTerm) || filterType !== 'all';

  return (
    <div className={cn("space-y-3", className)}>
      <FilterBar>
        <FilterBar.Group>
          <FilterBar.Field>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Otaq adı, bina və ya mərtəbə axtarın..."
                className="pl-10 h-11"
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

          <FilterBar.Field>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="h-11">
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
          </FilterBar.Field>
        </FilterBar.Group>

        <FilterBar.Actions>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
              <X className="h-4 w-4" />
              Təmizlə
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </FilterBar.Actions>
      </FilterBar>

      <div className="filter-panel">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Sürətli filtrlər
        </p>
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

      {hasActiveFilters && (
        <div className="filter-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Aktiv filtrlər
            </span>
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
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
                  aria-label="Axtarışı sıfırla"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filterType !== 'all' && (
              <span className="filter-chip">
                Növ: {roomTypes.find(t => t.value === filterType)?.label}
                <button
                  onClick={() => onFilterTypeChange('all')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  aria-label="Otaq növü filtrini sıfırla"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
