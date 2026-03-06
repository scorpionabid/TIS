import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { type FilterOption } from './GenericFilter.helpers';

// Select filter configuration
export interface SelectFilterConfig {
  key: string;
  placeholder: string;
  width?: string;
  options: FilterOption[];
  type?: 'string' | 'number' | 'boolean';
}

// Generic filter props
export interface GenericFilterProps<TFilters = Record<string, any>> {
  // Search configuration
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder?: string;
  
  // Filters state
  filters: TFilters;
  setFilters: React.Dispatch<React.SetStateAction<TFilters>>;
  
  // Select filters configuration
  selectFilters?: SelectFilterConfig[];
  
  // Custom filter elements (for special cases)
  customFilters?: React.ReactNode;
  
  // Layout
  className?: string;
}

export const GenericFilter = <TFilters extends Record<string, any>>({
  searchTerm,
  setSearchTerm,
  searchPlaceholder = "Axtarın...",
  filters,
  setFilters,
  selectFilters = [],
  customFilters,
  className = ""
}: GenericFilterProps<TFilters>) => {
  
  const handleSelectChange = (key: string, value: string, type: 'string' | 'number' | 'boolean' = 'string') => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (value === 'all') {
        // Remove filter when 'all' is selected
        delete newFilters[key];
      } else {
        // Convert value based on type
        switch (type) {
          case 'number':
            newFilters[key] = parseInt(value);
            break;
          case 'boolean':
            newFilters[key] = value === 'true';
            break;
          default:
            newFilters[key] = value;
        }
      }
      
      return newFilters;
    });
  };

  const getSelectValue = (key: string, type: 'string' | 'number' | 'boolean' = 'string'): string => {
    const filterValue = filters[key];
    
    if (filterValue === undefined || filterValue === null) {
      return 'all';
    }
    
    return filterValue.toString();
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex gap-2 flex-wrap">
            {selectFilters.map(filter => (
              <Select
                key={filter.key}
                value={getSelectValue(filter.key, filter.type)}
                onValueChange={(value) => handleSelectChange(filter.key, value, filter.type)}
              >
                <SelectTrigger className={filter.width || 'w-[150px]'}>
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            
            {/* Custom filters */}
            {customFilters}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
