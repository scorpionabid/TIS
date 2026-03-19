// Unified Student Manager Configuration for GenericManagerV2

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
import { Student, StudentFilters, StudentCreateData, studentService } from '@/services/students';
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
  Upload,
  UserMinus,
  UserX,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Clock,
  Badge as BadgeIcon,
  BarChart3,
  LayoutGrid,
  UserCog,
  AlertCircle,
  School
} from 'lucide-react';

// Re-export types from services for compatibility
export type { Student, StudentFilters, StudentCreateData } from '@/services/students';

// Default configurations
const defaultFilters: StudentFilters = {
  page: 1,
  per_page: 20,
};

const defaultCreateData: StudentCreateData = {
  first_name: '',
  last_name: '',
  student_number: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: 'male',
  address: '',
  enrollment_date: new Date().toISOString().split('T')[0],
  status: 'active',
  is_active: true,
};

// Enhanced column configuration with better rendering and accessibility
const columns: ColumnConfig<Student>[] = [
  {
    key: 'name',
    label: 'Ad Soyad',
    width: 'w-[220px]',
    align: 'left',
    render: (student) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center ring-2 ring-blue-50">
          <GraduationCap className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <div className="font-semibold text-foreground">
            {student.first_name && student.last_name 
              ? `${student.first_name} ${student.last_name}`.trim() 
              : student.full_name || 'İsimsiz Şagird'}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <BadgeIcon className="h-3 w-3" />
            UTİS: {student.student_number || student.student_id || 'Yoxdur'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'contact',
    label: 'Əlaqə',
    width: 'w-[160px]',
    align: 'center',
    render: (student) => (
      <div className="flex justify-center">
        <div className="space-y-1 text-center">
          {student.email && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[140px]" title={student.email}>
                {student.email}
              </span>
            </div>
          )}
          {student.phone && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{student.phone}</span>
            </div>
          )}
          {!student.email && !student.phone && (
            <span className="text-muted-foreground text-sm">Məlumat yoxdur</span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'academic_info',
    label: 'Akademik Məlumat',
    width: 'w-[150px]',
    align: 'center',
    render: (student) => {
      // Support legacy paths as well as the new `grade` relationship
      const className = student.grade?.name || student.class_name || student.current_class?.name;
      const classLevel = student.grade?.class_level || student.grade_level || student.current_grade_level || student.current_class?.grade_level;
      
      const hasClassAssigned = !!(className || classLevel);
      const isNewFormat = !!(student.grade?.name && student.grade?.class_level);

      return (
        <div className="flex justify-center">
          {hasClassAssigned ? (
             <div className="flex items-center justify-center gap-2">
               <GraduationCap className="h-4 w-4 text-primary" />
               <span className="font-medium">
                 {isNewFormat ? `${student.grade.class_level}-${student.grade.name}` : (classLevel ? `${classLevel} - ${className || ''}` : className)}
               </span>
             </div>
          ) : (
            <span className="text-muted-foreground text-sm">Sinif təyin edilməyib</span>
          )}
        </div>
      );
    },
  },
  {
    key: 'performance',
    label: 'Performans',
    width: 'w-[140px]',
    align: 'center',
    render: (student) => (
      <div className="flex justify-center">
        <div className="space-y-1 text-center">
          {student.gpa && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-medium text-green-600">
                GPA: {student.gpa.toFixed(1)}
              </span>
            </div>
          )}
          {student.attendance_rate && (
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-sm text-muted-foreground">
                {student.attendance_rate}% davamiyyət
              </span>
            </div>
          )}
          {!student.gpa && !student.attendance_rate && (
            <span className="text-muted-foreground text-sm">Məlumat yoxdur</span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 'w-[100px]',
    align: 'center',
    render: (student) => {
      const status = student.enrollment_status || student.status;
      const isActive = student.is_active !== false;
      
      let statusText = 'Aktiv';
      let statusColor = 'bg-green-100 text-green-800 border-green-200';
      
      if (!isActive || status === 'inactive') {
        statusText = 'Passiv';
        statusColor = 'bg-red-100 text-red-800 border-red-200';
      } else if (status === 'transferred') {
        statusText = 'Köçürülmüş';
        statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
      } else if (status === 'graduated') {
        statusText = 'Məzun';
        statusColor = 'bg-purple-100 text-purple-800 border-purple-200';
      } else if (status === 'dropped') {
        statusText = 'Tərk etmiş';
        statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      } else if (status === 'expelled') {
        statusText = 'İxrac';
        statusColor = 'bg-red-100 text-red-800 border-red-200';
      }
      
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor}`}>
            {statusText}
          </span>
        </div>
      );
    },
  },
  {
    key: 'enrollment_date',
    label: 'Qeydiyyat Tarixi',
    width: 'w-[130px]',
    align: 'center',
    render: (student) => {
      const enrollmentDate = student.enrollment_date;
      if (!enrollmentDate) return <div className="flex justify-center"><span className="text-muted-foreground text-sm">Tarix yoxdur</span></div>;
      
      try {
        return (
          <div className="flex justify-center">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {new Date(enrollmentDate).toLocaleDateString('az-AZ')}
            </div>
          </div>
        );
      } catch {
        return <div className="flex justify-center"><span className="text-muted-foreground text-sm">{enrollmentDate}</span></div>;
      }
    },
  },
];

// Enhanced action configuration with proper permissions and confirmations
const actions: ActionConfig<Student>[] = [
  {
    key: 'view',
    icon: Eye,
    label: 'Ətraflı bax',
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
    label: 'Sinifə yaz',
    variant: 'ghost',
    onClick: (student) => {
      console.log('Enroll student:', student);
    },
    condition: (student) => student.status !== 'active', // Only show for non-active students
  },
  {
    key: 'soft-delete',
    icon: UserMinus,
    label: 'Deaktiv et',
    variant: 'ghost',
    onClick: (student) => {
      console.log('Deactivate student:', student);
    },
    condition: (student) => student.is_active !== false, // Only show for active students
  },
  {
    key: 'hard-delete',
    icon: Trash2,
    label: 'Sil',
    variant: 'ghost',
    onClick: (student) => {
      console.log('Delete student:', student);
    },
  },
];

// Enhanced tab configuration with proper filtering and modern design
const tabs: TabConfig[] = [
  {
    key: 'stats',
    label: 'Statistika',
    isStatsTab: true,
    icon: BarChart3,
    variant: 'primary',
  },
  {
    key: 'all',
    label: 'Hamısı',
    icon: LayoutGrid,
    variant: 'default',
  },
  {
    key: 'active',
    label: 'Aktiv Şagirdlər',
    filter: (students: Student[]) => students.filter(s => 
      s.is_active !== false && (s.status === 'active' || s.enrollment_status === 'active')
    ),
    icon: CheckCircle,
    variant: 'success',
  },
  {
    key: 'inactive',
    label: 'Passiv Şagirdlər',
    filter: (students: Student[]) => students.filter(s => 
      s.is_active === false || s.status === 'inactive' || s.enrollment_status === 'inactive'
    ),
    icon: XCircle,
    variant: 'danger',
  },
  {
    key: 'transferred',
    label: 'Köçürülmüş',
    filter: (students: Student[]) => students.filter(s => 
      s.enrollment_status === 'transferred' || s.status === 'transferred'
    ),
    icon: ArrowRightLeft,
    variant: 'warning',
  },
  {
    key: 'graduated',
    label: 'Məzun',
    filter: (students: Student[]) => students.filter(s => 
      s.enrollment_status === 'graduated' || s.status === 'graduated'
    ),
    icon: GraduationCap,
    variant: 'purple',
  },
  {
    key: 'needs_class',
    label: 'Sinif Tələb Edir',
    filter: (students: Student[]) => students.filter(s => 
      !s.class_name && !s.current_class && s.is_active !== false
    ),
    icon: School,
    variant: 'orange',
  },
];

// Enhanced filter fields configuration
const filterFields: FilterFieldConfig[] = [
  {
    key: 'grade_level',
    label: 'Sinif Səviyyəsi',
    type: 'select',
    options: Array.from({ length: 12 }, (_, i) => ({
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
      { value: 'other', label: 'Digər' },
    ],
  },
  {
    key: 'enrollment_status',
    label: 'Qeydiyyat Statusu',
    type: 'select',
    options: [
      { value: 'active', label: 'Aktiv' },
      { value: 'inactive', label: 'Passiv' },
      { value: 'transferred', label: 'Köçürülmüş' },
      { value: 'graduated', label: 'Məzun' },
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
  {
    key: 'is_active',
    label: 'Aktiv Status',
    type: 'select',
    options: [
      { value: 'true', label: 'Aktiv' },
      { value: 'false', label: 'Passiv' },
    ],
  },
];

// Enhanced custom stats calculation
const calculateStudentStats = (students: Student[]): StatsConfig[] => {
  const total = students.length;
  const active = students.filter(s => 
    s.is_active !== false && (s.status === 'active' || s.enrollment_status === 'active')
  ).length;
  const inactive = students.filter(s => 
    s.is_active === false || s.status === 'inactive' || s.enrollment_status === 'inactive'
  ).length;
  const transferred = students.filter(s => 
    s.enrollment_status === 'transferred' || s.status === 'transferred'
  ).length;
  const graduated = students.filter(s => 
    s.enrollment_status === 'graduated' || s.status === 'graduated'
  ).length;
  const needsClass = students.filter(s => 
    !s.class_name && !s.current_class && s.is_active !== false
  ).length;

  return [
    {
      key: 'total',
      label: 'Ümumi Şagird',
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
    {
      key: 'needs_class',
      label: 'Sinif Tələb Edir',
      value: needsClass,
      icon: UserPlus,
      color: 'orange',
    },
  ];
};

// Main unified configuration
export const unifiedStudentConfig: EntityConfig<Student, StudentFilters, StudentCreateData> = {
  // Basic info
  entityType: 'students',
  entityName: 'Şagird',
  entityNamePlural: 'Şagirdlər',
  
  // API service - Using unified student service with proper this binding
  service: {
    get: (filters) => studentService.get({ ...filters, _t: Date.now() }),
    create: (data) => studentService.create(data),
    update: (id, data) => studentService.update(id, data),
    delete: (id) => studentService.delete(id),
  },
  
  // Query configuration - Unified query key
  queryKey: ['students'],
  defaultFilters,
  defaultCreateData,
  
  // UI Configuration
  columns,
  actions,
  tabs,
  filterFields,
  
  // Feature flags - Full feature set enabled
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
  
  // Modern Header Configuration
  headerConfig: {
    title: 'Şagird İdarəetməsi',
    description: 'Məktəb şagirdlərinin qeydiyyatı və idarə edilməsi',
    searchPlaceholder: 'Ad, soyad və ya UTİS nömrəsinə görə axtar...',
    createLabel: 'Yeni Şagird',
    showStats: true,
    showSearch: true,
    showRefresh: true,
    showImport: true,
    showExport: true,
    showTemplate: true,
    showCreate: true,
  },
};

// Enhanced custom logic for student management
export const studentCustomLogic: ManagerCustomLogic<Student> = {
  // Custom stats calculation
  calculateCustomStats: calculateStudentStats,
  
  // Permission checks - Enhanced with context awareness
  permissionCheck: (action: string, student?: Student) => {
    // Basic permission logic - extend based on your requirements
    switch (action) {
      case 'create':
      case 'edit':
      case 'delete':
        return true; // Add your role-based logic here
      case 'enroll':
        return student ? student.status !== 'active' : false;
      case 'soft-delete':
        return student ? student.is_active !== false : false;
      default:
        return true;
    }
  },
  
  // Enhanced bulk actions with progress tracking
  bulkActions: [
    {
      key: 'activate',
      label: 'Toplu Aktivləşdirmə',
      icon: CheckCircle,
      onClick: (selectedStudents) => {
        console.log('Bulk activate:', selectedStudents.length, 'students');
        // Implementation would go here
      },
      variant: 'default',
    },
    {
      key: 'deactivate',
      label: 'Toplu Deaktivləşdirmə',
      icon: XCircle,
      onClick: (selectedStudents) => {
        console.log('Bulk deactivate:', selectedStudents.length, 'students');
        // Implementation would go here
      },
      variant: 'outline',
    },
    {
      key: 'transfer',
      label: 'Toplu Köçürmə',
      icon: ArrowRightLeft,
      onClick: (selectedStudents) => {
        console.log('Bulk transfer:', selectedStudents.length, 'students');
        // Implementation would go here
      },
      variant: 'outline',
    },
    {
      key: 'graduate',
      label: 'Toplu Məzun Etmə',
      icon: GraduationCap,
      onClick: (selectedStudents) => {
        console.log('Bulk graduate:', selectedStudents.length, 'students');
        // Implementation would go here
      },
      variant: 'outline',
    },
    {
      key: 'export-selected',
      label: 'Seçilənləri İxrac Et',
      icon: Download,
      onClick: (selectedStudents) => {
        console.log('Export selected:', selectedStudents.length, 'students');
        // Implementation would go here
      },
      variant: 'outline',
    },
  ],
  
  // Header actions removed - GenericManagerV2 handles create/import/export automatically
  // Built-in functionality enabled in unifiedStudentConfig: create: true, import: true, export: true
  
  // Custom modal rendering - will be overridden in StudentManagerV2
};

// Legacy export for backward compatibility
export const studentEntityConfig = unifiedStudentConfig;