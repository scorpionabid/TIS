// Student Manager Configuration for GenericManagerV2

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
import { SchoolStudent, schoolAdminService } from '@/services/schoolAdmin';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  UserPlus,
  GraduationCap,
  ArrowRightLeft,
  Eye, 
  Edit, 
  Trash2,
  UserCheck,
  Download,
  Upload
} from 'lucide-react';

// Student filters interface
export interface StudentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  class_id?: number;
  status?: string;
  grade_level?: number;
  enrollment_status?: 'active' | 'inactive' | 'transferred' | 'graduated';
}

// Create student data interface
export interface NewStudentData {
  first_name: string;
  last_name: string;
  student_number: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  class_id?: number;
  enrollment_date?: string;
  status?: 'active' | 'inactive';
}

// Default configurations
const defaultFilters: StudentFilters = {
  page: 1,
  per_page: 20,
};

const defaultCreateData: NewStudentData = {
  first_name: '',
  last_name: '',
  student_number: '',
  email: '',
  date_of_birth: '',
  gender: 'male',
  address: '',
  parent_name: '',
  parent_phone: '',
  enrollment_date: new Date().toISOString().split('T')[0],
  status: 'active',
};

// Column configuration
const columns: ColumnConfig<SchoolStudent>[] = [
  {
    key: 'name',
    label: 'Ad Soyad',
    width: 'w-[200px]',
    render: (student) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="font-medium">
            {student.first_name && student.last_name 
              ? `${student.first_name} ${student.last_name}`.trim() 
              : 'İsimsiz Şagird'}
          </div>
          <div className="text-sm text-muted-foreground">
            {student.student_number || student.student_id || 'ID yoxdur'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'email',
    label: 'Email',
    render: (student) => student.email || 'Email yoxdur',
  },
  {
    key: 'class',
    label: 'Sinif',
    render: (student) => {
      const className = student.class_name || student.current_class;
      return className || 'Sinif təyin edilməyib';
    },
  },
  {
    key: 'grade_level',
    label: 'Səviyyə',
    render: (student) => {
      const gradeLevel = student.grade_level || student.current_grade_level;
      return gradeLevel ? `${gradeLevel}-ci sinif` : 'Səviyyə yoxdur';
    },
  },
  {
    key: 'enrollment_status',
    label: 'Status',
    render: (student) => {
      const status = student.enrollment_status || student.status;
      const isActive = student.is_active !== false;
      
      let statusText = 'Aktiv';
      let statusColor = 'bg-green-100 text-green-800';
      
      if (!isActive || status === 'inactive') {
        statusText = 'Passiv';
        statusColor = 'bg-red-100 text-red-800';
      } else if (status === 'transferred') {
        statusText = 'Köçürülmüş';
        statusColor = 'bg-blue-100 text-blue-800';
      } else if (status === 'graduated') {
        statusText = 'Məzun';
        statusColor = 'bg-purple-100 text-purple-800';
      }
      
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {statusText}
        </span>
      );
    },
  },
  {
    key: 'enrollment_date',
    label: 'Qeydiyyat Tarixi',
    render: (student) => {
      const enrollmentDate = student.enrollment_date;
      if (!enrollmentDate) return 'Tarix yoxdur';
      
      try {
        return new Date(enrollmentDate).toLocaleDateString('az-AZ');
      } catch {
        return enrollmentDate;
      }
    },
  },
];

// Action configuration
const actions: ActionConfig<SchoolStudent>[] = [
  {
    key: 'view',
    icon: Eye,
    label: 'Bax',
    variant: 'ghost',
    onClick: (student) => {
      console.log('View student:', student);
    },
  },
  {
    key: 'edit',
    icon: Edit,
    label: 'Redaktə et',
    variant: 'ghost',
    onClick: (student) => {
      console.log('Edit student:', student);
    },
  },
  {
    key: 'enroll',
    icon: UserCheck,
    label: 'Qeydiyyat',
    variant: 'ghost',
    onClick: (student) => {
      console.log('Enroll student:', student);
    },
  },
  {
    key: 'delete',
    icon: Trash2,
    label: 'Sil',
    variant: 'ghost',
    onClick: (student) => {
      console.log('Delete student:', student);
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
    filter: (students: SchoolStudent[]) => students.filter(s => s.is_active !== false),
  },
  {
    key: 'inactive',
    label: 'Passiv',
    filter: (students: SchoolStudent[]) => students.filter(s => s.is_active === false),
  },
  {
    key: 'transferred',
    label: 'Köçürülmüş',
    filter: (students: SchoolStudent[]) => students.filter(s => 
      s.enrollment_status === 'transferred' || s.status === 'transferred'
    ),
  },
  {
    key: 'graduated',
    label: 'Məzun',
    filter: (students: SchoolStudent[]) => students.filter(s => 
      s.enrollment_status === 'graduated' || s.status === 'graduated'
    ),
  },
];

// Filter fields configuration
const filterFields: FilterFieldConfig[] = [
  {
    key: 'grade_level',
    label: 'Sinif Səviyyəsi',
    type: 'select',
    options: Array.from({ length: 11 }, (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}-ci sinif`
    })),
  },
  {
    key: 'gender',
    label: 'Cins',
    type: 'select',
    options: [
      { value: 'male', label: 'Kişi' },
      { value: 'female', label: 'Qadın' },
    ],
  },
  {
    key: 'enrollment_date_from',
    label: 'Qeydiyyat Tarixi (Başlanğıc)',
    type: 'date',
  },
  {
    key: 'enrollment_date_to',
    label: 'Qeydiyyat Tarixi (Son)',
    type: 'date',
  },
];

// Custom stats calculation
const calculateStudentStats = (students: SchoolStudent[]): StatsConfig[] => {
  const total = students.length;
  const active = students.filter(s => s.is_active !== false).length;
  const inactive = students.filter(s => s.is_active === false).length;
  const transferred = students.filter(s => 
    s.enrollment_status === 'transferred' || s.status === 'transferred'
  ).length;
  const graduated = students.filter(s => 
    s.enrollment_status === 'graduated' || s.status === 'graduated'
  ).length;

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
      key: 'transferred',
      label: 'Köçürülmüş',
      value: transferred,
      icon: ArrowRightLeft,
      color: 'blue',
    },
    {
      key: 'graduated',
      label: 'Məzun',
      value: graduated,
      icon: GraduationCap,
      color: 'purple',
    },
  ];
};

// Main configuration
export const studentEntityConfig: EntityConfig<SchoolStudent, StudentFilters, NewStudentData> = {
  // Basic info
  entityType: 'students',
  entityName: 'Şagird',
  entityNamePlural: 'Şagirdlər',
  
  // API service
  service: {
    get: (filters) => schoolAdminService.getSchoolStudents(filters),
    create: (data) => schoolAdminService.createStudent(data),
    update: (id, data) => schoolAdminService.updateStudent(id, data),
    delete: (id) => schoolAdminService.deleteStudent(id),
  },
  
  // Query configuration
  queryKey: ['schoolAdmin', 'students'],
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

// Custom logic for student management
export const studentCustomLogic: ManagerCustomLogic<SchoolStudent> = {
  // Custom stats calculation
  calculateCustomStats: calculateStudentStats,
  
  // Permission checks
  permissionCheck: (action: string, student?: SchoolStudent) => {
    // Add your permission logic here
    return true;
  },
  
  // Bulk actions
  bulkActions: [
    {
      key: 'activate',
      label: 'Aktivləşdir',
      icon: CheckCircle,
      onClick: (selectedStudents) => {
        console.log('Bulk activate:', selectedStudents);
      },
      variant: 'default',
    },
    {
      key: 'transfer',
      label: 'Köçür',
      icon: ArrowRightLeft,
      onClick: (selectedStudents) => {
        console.log('Bulk transfer:', selectedStudents);
      },
      variant: 'outline',
    },
    {
      key: 'graduate',
      label: 'Məzun Et',
      icon: GraduationCap,
      onClick: (selectedStudents) => {
        console.log('Bulk graduate:', selectedStudents);
      },
      variant: 'outline',
    },
    {
      key: 'export',
      label: 'İxrac Et',
      icon: Download,
      onClick: (selectedStudents) => {
        console.log('Bulk export:', selectedStudents);
      },
      variant: 'outline',
    },
  ],
  
  // Header actions
  headerActions: [
    {
      key: 'import',
      label: 'İdxal Et',
      icon: Upload,
      onClick: () => {
        console.log('Open import modal');
      },
      variant: 'outline',
    },
  ],
};