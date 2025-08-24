import { useEntityManager, BaseFilters } from '@/hooks/useEntityManager';
import { schoolAdminService, SchoolTeacher } from '@/services/schoolAdmin';

export interface TeacherFilters extends BaseFilters {
  subject_id?: number;
  department_id?: number;
  is_active?: boolean;
  employment_type?: 'full_time' | 'part_time' | 'contract';
  institution_id?: number;
}

export interface NewTeacherData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  teacher_id: string;
  subjects: string[];
  qualifications?: string;
  experience_years?: string;
  employment_type: 'full_time' | 'part_time' | 'contract';
  hire_date: string;
  department_id?: string;
  salary?: string;
}

export interface TeacherStats {
  total: number;
  active: number;
  inactive: number;
  full_time: number;
  part_time: number;
  needs_assignment: number;
}

const defaultFilters: TeacherFilters = {
  page: 1,
  per_page: 20,
};

const defaultCreateData: NewTeacherData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  teacher_id: '',
  subjects: [],
  qualifications: '',
  experience_years: '',
  employment_type: 'full_time',
  hire_date: new Date().toISOString().split('T')[0],
  department_id: '',
  salary: '',
};

export const useSchoolTeacherManager = () => {
  return useEntityManager<SchoolTeacher, TeacherFilters, NewTeacherData>({
    entityType: 'teachers',
    entityName: 'Müəllim',
    service: {
      get: (filters) => schoolAdminService.getTeachers(filters),
      create: (data) => schoolAdminService.createTeacher(data),
      update: (id, data) => schoolAdminService.updateTeacher(id, data),
      delete: (id) => schoolAdminService.deleteTeacher(id),
    },
    defaultFilters,
    defaultCreateData,
    queryKey: ['schoolAdmin'],
  });
};

// Re-export types for backward compatibility
export type { SchoolTeacher } from '@/services/schoolAdmin';
