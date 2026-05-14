import React from 'react';
import {
  GenericFilter,
  SelectFilterConfig,
} from '@/components/common/GenericFilter';
import {
  createStatusOptions,
  createDepartmentOptions,
  useInstitutionFilter,
} from '@/components/common/GenericFilter.helpers';
import type { TeacherFilters } from './hooks/useSchoolTeacherManagerGeneric';

interface TeacherFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: TeacherFilters;
  setFilters: React.Dispatch<React.SetStateAction<TeacherFilters>>;
  // Institution filter props
  institutionFilter?: string;
  setInstitutionFilter?: (value: string) => void;
  availableInstitutions?: Array<{id: number, name: string}>;
}

export const TeacherFiltersNew: React.FC<TeacherFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  institutionFilter,
  setInstitutionFilter,
  availableInstitutions
}) => {
  
  const selectFilters: SelectFilterConfig[] = [
    {
      key: 'department',
      placeholder: 'Şöbə',
      width: 'w-[120px]',
      options: createDepartmentOptions()
    },
    {
      key: 'is_active',
      placeholder: 'Status',
      width: 'w-[120px]',
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
      searchPlaceholder="Müəllim adı, email ilə axtarın..."
      filters={filters}
      setFilters={setFilters}
      selectFilters={selectFilters}
      customFilters={institutionFilterElement}
    />
  );
};

// Re-export for backward compatibility
export const TeacherFilters = TeacherFiltersNew;
