import { useEntityManager, BaseFilters } from '@/hooks/useEntityManager';
import { schoolAdminService, SchoolStudent } from '@/services/schoolAdmin';

export interface StudentFilters extends BaseFilters {
  grade_level?: number;
  class_id?: number;
  is_active?: boolean;
  academic_year?: string;
}

export interface NewStudentData {
  first_name: string;
  last_name: string;
  student_number: string;
  email?: string;
  phone?: string;
  birth_date: string;
  grade_level: string;
  class_id?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  address?: string;
}

export interface StudentStats {
  total: number;
  active: number;
  inactive: number;
  enrolled: number;
  needs_class: number;
}

const defaultFilters: StudentFilters = {
  page: 1,
  per_page: 20,
};

const defaultCreateData: NewStudentData = {
  first_name: '',
  last_name: '',
  student_number: '',
  email: '',
  phone: '',
  birth_date: '',
  grade_level: '',
  class_id: '',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  address: '',
};

export const useSchoolStudentManager = () => {
  return useEntityManager<SchoolStudent, StudentFilters, NewStudentData>({
    entityType: 'students',
    entityName: 'Şagird',
    service: {
      get: schoolAdminService.getStudents,
      create: schoolAdminService.createStudent,
      update: schoolAdminService.updateStudent,
      delete: schoolAdminService.deleteStudent,
    },
    defaultFilters,
    defaultCreateData,
    queryKey: ['schoolAdmin'],
  });
};

// Re-export types for backward compatibility
export type { SchoolStudent } from '@/services/schoolAdmin';
