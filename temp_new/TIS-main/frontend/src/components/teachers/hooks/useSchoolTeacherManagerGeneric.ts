import { useEntityManagerV2 } from '@/hooks/useEntityManagerV2';
import { schoolAdminService, SchoolTeacher } from '@/services/schoolAdmin';
import { useRoleBasedService } from '@/hooks/useRoleBasedService';
import { EntityConfig, BaseFilters } from '@/components/generic/types';

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
  const { getTeachers, createTeacher, updateTeacher, deleteTeacher } = useRoleBasedService();
  
  const config: EntityConfig<SchoolTeacher, TeacherFilters, NewTeacherData> = {
    entityType: 'teachers',
    entityName: 'Müəllim',
    entityNamePlural: 'Müəllimlər',
    service: {
      get: (filters) => getTeachers(filters),
      create: (data) => createTeacher(data),
      update: (id, data) => updateTeacher(id, data),
      delete: (id) => deleteTeacher(id),
    },
    queryKey: ['schoolAdmin'],
    defaultFilters,
    defaultCreateData,
    columns: [], // TODO: Define columns for generic table
    actions: [], // TODO: Define actions for generic table
    tabs: [
      { key: 'all', label: 'Bütün Müəllimlər' },
      { key: 'active', label: 'Aktiv' },
      { key: 'inactive', label: 'Passiv' }
    ],
    filterFields: [], // TODO: Define filter fields
  };
  
  return useEntityManagerV2<SchoolTeacher, TeacherFilters, NewTeacherData>(config);
};

// Re-export types for backward compatibility
export type { SchoolTeacher } from '@/services/schoolAdmin';
