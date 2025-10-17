import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const createFilterOption = (value: string, label: string, disabled?: boolean): FilterOption => ({
  value,
  label,
  disabled,
});

export const createGradeLevelOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün səviyyələr'),
  createFilterOption('0', 'Anasinifi'),
  ...Array.from({ length: 11 }, (_, i) =>
    createFilterOption((i + 1).toString(), `${i + 1}. sinif`)
  ),
];

export const createStatusOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün statuslar'),
  createFilterOption('true', 'Aktiv'),
  createFilterOption('false', 'Passiv'),
];

export const createGenderOptions = (): FilterOption[] => [
  createFilterOption('all', 'Hamısı'),
  createFilterOption('male', 'Kişi'),
  createFilterOption('female', 'Qadın'),
];

export const createEnrollmentStatusOptions = (): FilterOption[] => [
  createFilterOption('all', 'Bütün statuslar'),
  createFilterOption('active', 'Aktiv'),
  createFilterOption('inactive', 'Passiv'),
  createFilterOption('transferred', 'Köçürülmüş'),
  createFilterOption('graduated', 'Məzun'),
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
  createFilterOption('other', 'Digər'),
];

export const createInstitutionOptions = (
  institutions: Array<{ id: number; name: string }>
): FilterOption[] => [
  createFilterOption('all', 'Bütün müəssisələr'),
  ...(institutions.length > 0
    ? institutions.map(inst => createFilterOption(inst.id.toString(), inst.name))
    : [createFilterOption('no-institutions', 'Müəssisələr yüklənir...', true)]),
];

export const useInstitutionFilter = (
  institutionFilter: string | undefined,
  setInstitutionFilter: ((value: string) => void) | undefined,
  availableInstitutions: Array<{ id: number; name: string }> | undefined
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
