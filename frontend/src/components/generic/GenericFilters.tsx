import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import { FilterFieldConfig } from './types';
import { cn } from '@/lib/utils';

interface GenericFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: any;
  setFilters: (filters: any) => void;
  filterFields: FilterFieldConfig[];
  className?: string;
}

export function GenericFilters({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  filterFields,
  className,
}: GenericFiltersProps) {
  
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== '' && value !== 'all'
  );

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const renderFilterField = (field: FilterFieldConfig) => {
    const currentValue = filters[field.key];

    switch (field.type) {
      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <Select
              value={currentValue || 'all'}
              onValueChange={(value) => handleFilterChange(field.key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `${field.label} seçin`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <Input
              value={currentValue || ''}
              onChange={(e) => handleFilterChange(field.key, e.target.value)}
              placeholder={field.placeholder || `${field.label} daxil edin`}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <Input
              type="date"
              value={currentValue || ''}
              onChange={(e) => handleFilterChange(field.key, e.target.value)}
            />
          </div>
        );

      case 'daterange':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={currentValue?.from || ''}
                onChange={(e) => handleFilterChange(field.key, {
                  ...currentValue,
                  from: e.target.value
                })}
                placeholder="Başlanğıc"
              />
              <Input
                type="date"
                value={currentValue?.to || ''}
                onChange={(e) => handleFilterChange(field.key, {
                  ...currentValue,
                  to: e.target.value
                })}
                placeholder="Son"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Axtarış..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter Toggle Button */}
          {filterFields.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                hasActiveFilters && "border-primary bg-primary/5 text-primary"
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          
          {/* Clear Filters Button */}
          {(hasActiveFilters || searchTerm) && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {isExpanded && filterFields.length > 0 && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterFields.map(renderFilterField)}
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Aktiv filtrlər:</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(filters).map(([key, value]) => {
                if (!value || value === 'all') return null;
                
                const field = filterFields.find(f => f.key === key);
                if (!field) return null;
                
                const displayValue = field.options?.find(o => String(o.value) === String(value))?.label || String(value);
                
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                  >
                    {field.label}: {displayValue}
                    <button
                      onClick={() => handleFilterChange(key, undefined)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}