import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';

// Filter option interface
export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

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

// Utility functions for common filter patterns
export const createFilterOption = (value: string, label: string, disabled?: boolean): FilterOption => ({
  value,
  label,
  disabled
});

export const createGradeLevelOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün səviyyələr'),
  createFilterOption('0', 'Anasinifi'),
  ...Array.from({ length: 11 }, (_, i) => 
    createFilterOption((i + 1).toString(), `${i + 1}. sinif`)
  )
];

export const createStatusOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün statuslar'),
  createFilterOption('true', 'Aktiv'),
  createFilterOption('false', 'Passiv')
];

export const createGenderOptions = (): FilterOption[] => [
  createFilterOption('all', 'Hamısı'),
  createFilterOption('male', 'Kişi'),
  createFilterOption('female', 'Qadın')
];

export const createEnrollmentStatusOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün statuslar'),
  createFilterOption('active', 'Aktiv'),
  createFilterOption('inactive', 'Passiv'),
  createFilterOption('transferred', 'Köçürülmüş'),
  createFilterOption('graduated', 'Məzun')
];

export const createDepartmentOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün şöbələr'),
  createFilterOption('academic', 'Akademik'),
  createFilterOption('administrative', 'İnzibati'),
  createFilterOption('support', 'Dəstək'),
  createFilterOption('science', 'Elm'),
  createFilterOption('humanities', 'Humanitar'),
  createFilterOption('arts', 'İncəsənət'),
  createFilterOption('sports', 'İdman'),
  createFilterOption('language', 'Dil'),
  createFilterOption('mathematics', 'Riyaziyyat'),
  createFilterOption('other', 'Digər')
];

export const createInstitutionOptions = (institutions: Array<{id: number, name: string}>): FilterOption[] => [
  createFilterOption('all', 'Bütün müəssisələr'),
  ...(institutions.length > 0 
    ? institutions.map(inst => createFilterOption(inst.id.toString(), inst.name))
    : [createFilterOption('no-institutions', 'Müəssisələr yüklənir...', true)]
  )
];

// Hook for managing institution filters separately (for backward compatibility)
export const useInstitutionFilter = (
  institutionFilter: string | undefined,
  setInstitutionFilter: ((value: string) => void) | undefined,
  availableInstitutions: Array<{id: number, name: string}> | undefined
) => {
  if (!setInstitutionFilter || !availableInstitutions) return null;

  return (
    <Select value={institutionFilter || 'all'} onValueChange={setInstitutionFilter}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Müəssisə" />
      </SelectTrigger>
      <SelectContent>
        {createInstitutionOptions(availableInstitutions).map(option => (
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
  );
};