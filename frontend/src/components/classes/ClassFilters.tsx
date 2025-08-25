import React from 'react';
import { 
  GenericFilter, 
  SelectFilterConfig,
  createGradeLevelOptions,
  createStatusOptions,
  useInstitutionFilter
} from '@/components/common/GenericFilter';
import type { ClassFilters } from './hooks/useSchoolClassManager';

interface ClassFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: ClassFilters;
  setFilters: React.Dispatch<React.SetStateAction<ClassFilters>>;
  getCurrentAcademicYear: () => string;
  // Institution filter props
  institutionFilter?: string;
  setInstitutionFilter?: (value: string) => void;
  availableInstitutions?: Array<{id: number, name: string}>;
}

export const ClassFiltersNew: React.FC<ClassFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  getCurrentAcademicYear, // Note: This function is passed but not used in the original component
  institutionFilter,
  setInstitutionFilter,
  availableInstitutions
}) => {
  
  const selectFilters: SelectFilterConfig[] = [
    {
      key: 'grade_level',
      placeholder: 'Sinif',
      width: 'w-[120px]',
      options: createGradeLevelOptions(),
      type: 'number'
    },
    {
      key: 'is_active',
      placeholder: 'Status',
      width: 'w-[150px]',
      options: createStatusOptions(),
      type: 'boolean'
    }
  ];

  const institutionFilterElement = useInstitutionFilter(
    institutionFilter, 
    setInstitutionFilter, 
    availableInstitutions
  );

  return (
    <GenericFilter
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Sinif adı, otaq və ya müəllim adı ilə axtarın..."
      filters={filters}
      setFilters={setFilters}
      selectFilters={selectFilters}
      customFilters={institutionFilterElement}
    />
  );
};

// Re-export for backward compatibility
export const ClassFilters = ClassFiltersNew;