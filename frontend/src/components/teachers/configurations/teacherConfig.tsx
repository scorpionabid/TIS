// Teacher Manager Configuration for GenericManagerV2

import React from 'react';
import { 
  EntityConfig, 
  ColumnConfig, 
  ActionConfig, 
  TabConfig, 
  FilterFieldConfig, 
  StatsConfig,
  ManagerCustomLogic 
} from '@/components/generic/types';
import { SchoolTeacher, schoolAdminService } from '@/services/schoolAdmin';
import { TeacherFilters, NewTeacherData } from '../hooks/useSchoolTeacherManagerGeneric';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Briefcase,
  UserCheck,
  Eye, 
  Edit, 
  Trash2,
  Download,
  Upload
} from 'lucide-react';

// Default filters and create data
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

// Column configuration
const columns: ColumnConfig<SchoolTeacher>[] = [
  {
    key: 'name',
    label: 'Ad Soyad',
    width: 'w-[200px]',
    render: (teacher) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="font-medium">
            {teacher.first_name && teacher.last_name 
              ? `${teacher.first_name} ${teacher.last_name}`.trim() 
              : teacher.email}
          </div>
          <div className="text-sm text-muted-foreground">
            {teacher.employee_id}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'email',
    label: 'Email',
    render: (teacher) => teacher.email,
  },
  {
    key: 'department',
    label: 'Şöbə',
    render: (teacher) => teacher.department || 'Təyin edilməyib',
  },
  {
    key: 'subjects',
    label: 'Fənlər',
    render: (teacher) => {
      if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) {
        return teacher.subjects.join(', ');
      }
      return 'Təyin edilməyib';
    },
  },
  {
    key: 'is_active',
    label: 'Status',
    render: (teacher) => (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        teacher.is_active 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {teacher.is_active ? 'Aktiv' : 'Passiv'}
      </span>
    ),
  },
];

// Action configuration
const actions: ActionConfig<SchoolTeacher>[] = [
  {
    key: 'view',
    icon: Eye,
    label: 'Bax',
    variant: 'ghost',
    onClick: (teacher) => {
      // This will be handled by custom logic
      console.log('View teacher:', teacher);
    },
  },
  {
    key: 'edit',
    icon: Edit,
    label: 'Redaktə et',
    variant: 'ghost',
    onClick: (teacher) => {
      // This will be handled by custom logic
      console.log('Edit teacher:', teacher);
    },
  },
  {
    key: 'delete',
    icon: Trash2,
    label: 'Sil',
    variant: 'ghost',
    onClick: (teacher) => {
      // This will be handled by custom logic
      console.log('Delete teacher:', teacher);
    },
  },
];

// Tab configuration
const tabs: TabConfig[] = [
  {
    key: 'all',
    label: 'Hamısı',
  },
  {
    key: 'active',
    label: 'Aktiv',
    filter: (teachers) => teachers.filter(t => t.is_active === true),
  },
  {
    key: 'inactive', 
    label: 'Passiv',
    filter: (teachers) => teachers.filter(t => t.is_active === false),
  },
];

// Filter fields configuration
const filterFields: FilterFieldConfig[] = [
  {
    key: 'department',
    label: 'Şöbə',
    type: 'select',
    options: [
      { value: 'academic', label: 'Akademik' },
      { value: 'administrative', label: 'İnzibati' },
      { value: 'finance', label: 'Maliyyə' },
    ],
  },
  {
    key: 'employment_type',
    label: 'İş Növü',
    type: 'select',
    options: [
      { value: 'full_time', label: 'Tam Ştat' },
      { value: 'part_time', label: 'Yarım Ştat' },
      { value: 'contract', label: 'Müqavilə' },
    ],
  },
  {
    key: 'hire_date_from',
    label: 'İşə Qəbul Tarixi (Başlanğıc)',
    type: 'date',
  },
  {
    key: 'hire_date_to',
    label: 'İşə Qəbul Tarixi (Son)',
    type: 'date',
  },
];

// Custom stats calculation
const calculateTeacherStats = (teachers: SchoolTeacher[]): StatsConfig[] => {
  const total = teachers.length;
  const active = teachers.filter(t => t.is_active === true).length;
  const inactive = teachers.filter(t => t.is_active === false).length;
  const fullTime = teachers.filter(t => t.position?.includes('full') || !t.position).length;
  const partTime = teachers.filter(t => t.position?.includes('part')).length;
  const needsAssignment = teachers.filter(t => !t.department || t.department === '').length;

  return [
    {
      key: 'total',
      label: 'Ümumi',
      value: total,
      icon: Users,
      color: 'default',
    },
    {
      key: 'active',
      label: 'Aktiv',
      value: active,
      icon: CheckCircle,
      color: 'green',
    },
    {
      key: 'inactive',
      label: 'Passiv',
      value: inactive,
      icon: XCircle,
      color: 'red',
    },
    {
      key: 'full_time',
      label: 'Tam Ştat',
      value: fullTime,
      icon: Briefcase,
      color: 'blue',
    },
    {
      key: 'part_time',
      label: 'Yarım Ştat',
      value: partTime,
      icon: Clock,
      color: 'yellow',
    },
    {
      key: 'needs_assignment',
      label: 'Təyinat Lazım',
      value: needsAssignment,
      icon: UserCheck,
      color: 'purple',
    },
  ];
};

// Main configuration
export const teacherEntityConfig: EntityConfig<SchoolTeacher, TeacherFilters, NewTeacherData> = {
  // Basic info
  entityType: 'teachers',
  entityName: 'Müəllim',
  entityNamePlural: 'Müəllimlər',
  
  // API service
  service: {
    get: (filters) => schoolAdminService.getTeachers(filters),
    create: (data) => schoolAdminService.createTeacher(data),
    update: (id, data) => schoolAdminService.updateTeacher(id, data),
    delete: (id) => schoolAdminService.deleteTeacher(id),
  },
  
  // Query configuration
  queryKey: ['schoolAdmin'],
  defaultFilters,
  defaultCreateData,
  
  // UI Configuration
  columns,
  actions,
  tabs,
  filterFields,
  
  // Feature flags
  features: {
    search: true,
    filters: true,
    stats: true,
    tabs: true,
    bulk: true,
    export: true,
    import: true,
    create: true,
    edit: true,
    delete: true,
  },
};

// Custom logic for teacher management
export const teacherCustomLogic: ManagerCustomLogic<SchoolTeacher> = {
  // Custom stats calculation
  calculateCustomStats: calculateTeacherStats,
  
  // Permission checks
  permissionCheck: (action: string, teacher?: SchoolTeacher) => {
    // Add your permission logic here
    return true;
  },
  
  // Bulk actions
  bulkActions: [
    {
      key: 'activate',
      label: 'Aktivləşdir',
      icon: CheckCircle,
      onClick: (selectedTeachers) => {
        console.log('Bulk activate:', selectedTeachers);
        // Implement bulk activate logic
      },
      variant: 'default',
    },
    {
      key: 'deactivate',
      label: 'Passivləşdir',
      icon: XCircle,
      onClick: (selectedTeachers) => {
        console.log('Bulk deactivate:', selectedTeachers);
        // Implement bulk deactivate logic
      },
      variant: 'outline',
    },
    {
      key: 'export',
      label: 'İxrac Et',
      icon: Download,
      onClick: (selectedTeachers) => {
        console.log('Bulk export:', selectedTeachers);
        // Implement bulk export logic
      },
      variant: 'outline',
    },
  ],
  
  // Header actions
  headerActions: [
    {
      key: 'import-export',
      label: 'İdxal/İxrac',
      icon: Upload,
      onClick: () => {
        console.log('Open import/export modal');
        // This will be handled in the component
      },
      variant: 'outline',
    },
  ],
};