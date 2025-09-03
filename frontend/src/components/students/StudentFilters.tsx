import React from 'react';
import { 
  GenericFilter, 
  SelectFilterConfig,
  createGradeLevelOptions,
  createEnrollmentStatusOptions,
  createGenderOptions,
  useInstitutionFilter
} from '@/components/common/GenericFilter';
import type { StudentFilters } from './hooks/useSchoolStudentManagerGeneric';
import { Grade } from '@/services/grades';

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: StudentFilters;
  setFilters: React.Dispatch<React.SetStateAction<StudentFilters>>;
  classes?: Grade[];
}

export const StudentFiltersNew: React.FC<StudentFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  classes
}) => {
  
  const classOptions = [
    { value: 'all', label: 'Bütün siniflər' },
    ...(classes?.map(cls => ({
      value: cls.id.toString(),
      label: cls.name
    })) || [])
  ];

  const selectFilters: SelectFilterConfig[] = [
    {
      key: 'class_id',
      placeholder: 'Sinif seçin',
      width: 'w-40',
      options: classOptions,
      type: 'number'
    },
    {
      key: 'grade_level',
      placeholder: 'Səviyyə seçin',
      width: 'w-40',
      options: createGradeLevelOptions(),
      type: 'number'
    },
    {
      key: 'enrollment_status',
      placeholder: 'Status seçin',
      width: 'w-40',
      options: createEnrollmentStatusOptions()
    },
    {
      key: 'gender',
      placeholder: 'Cins seçin',
      width: 'w-40',
      options: createGenderOptions()
    }
  ];

  return (
    <GenericFilter
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Şagird adı, ID və ya email ilə axtarın..."
      filters={filters}
      setFilters={setFilters}
      selectFilters={selectFilters}
    />
  );
};

// Re-export for backward compatibility
export const StudentFilters = StudentFiltersNew;