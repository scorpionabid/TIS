import { useEntityManager, BaseFilters } from '@/hooks/useEntityManager';
import { schoolAdminService, SchoolClass } from '@/services/schoolAdmin';

export interface ClassFilters extends BaseFilters {
  grade_level?: number;
  academic_year?: string;
  is_active?: boolean;
  class_teacher_id?: number;
  institution_id?: number;
}

export interface NewClassData {
  name: string;
  grade_level: string;
  room_number: string;
  capacity: string;
  class_teacher_id: string;
  academic_year: string;
}

export interface ClassStats {
  total: number;
  active: number;
  inactive: number;
  overcrowded: number;
  needs_teacher: number;
}

const defaultFilters: ClassFilters = {
  page: 1,
  per_page: 20,
};

const defaultCreateData: NewClassData = {
  name: '',
  grade_level: '',
  room_number: '',
  capacity: '',
  class_teacher_id: '',
  academic_year: new Date().getFullYear().toString(),
};

export const useSchoolClassManager = () => {
  return useEntityManager<SchoolClass, ClassFilters, NewClassData>({
    entityType: 'classes',
    entityName: 'Sinif',
    service: {
      get: (filters) => schoolAdminService.getClasses(filters),
      create: (data) => schoolAdminService.createClass(data),
      update: (id, data) => schoolAdminService.updateClass(id, data),
      delete: (id) => schoolAdminService.deleteClass(id),
    },
    defaultFilters,
    defaultCreateData,
    queryKey: ['schoolAdmin'],
  });
};

// Re-export types for backward compatibility
export type { SchoolClass } from '@/services/schoolAdmin';
