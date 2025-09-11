import { useEntityManager, BaseFilters } from '@/hooks/useEntityManager';
import { schoolAdminService, SchoolClass } from '@/services/schoolAdmin';
import { useRoleBasedService } from '@/hooks/useRoleBasedService';

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
  const { getClasses, getClass, createClass, updateClass, deleteClass } = useRoleBasedService();
  
  return useEntityManager<SchoolClass, ClassFilters, NewClassData>({
    entityType: 'classes',
    entityName: 'Sinif',
    service: {
      get: (filters) => getClasses(filters),
      create: (data) => createClass(data),
      update: (id, data) => updateClass(id, data),
      delete: (id) => deleteClass(id),
    },
    defaultFilters,
    defaultCreateData,
    queryKey: ['schoolAdmin'],
  });
};

// Re-export types for backward compatibility
export type { SchoolClass } from '@/services/schoolAdmin';
