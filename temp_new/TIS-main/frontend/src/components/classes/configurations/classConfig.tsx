// Class Manager Configuration for GenericManagerV2

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
import { SchoolClass, schoolAdminService } from '@/services/schoolAdmin';
import { 
  School, 
  CheckCircle, 
  XCircle, 
  Users,
  MapPin,
  User,
  AlertTriangle,
  Eye, 
  Edit, 
  Trash2,
  Download,
  Upload,
  UserPlus
} from 'lucide-react';

// Class filters interface
export interface ClassFilters {
  page?: number;
  per_page?: number;
  search?: string;
  grade_level?: number;
  academic_year?: string;
  is_active?: boolean;
  institution_id?: number;
  capacity_status?: 'normal' | 'overcrowded' | 'underutilized';
}

// Create class data interface  
export interface NewClassData {
  name: string;
  grade_level: number;
  capacity: number;
  room_number?: string;
  class_teacher_id?: number;
  academic_year?: string;
  description?: string;
  is_active?: boolean;
  institution_id?: number;
}

// Default configurations
const defaultFilters: ClassFilters = {
  page: 1,
  per_page: 20,
};

const defaultCreateData: NewClassData = {
  name: '',
  grade_level: 1,
  capacity: 25,
  room_number: '',
  academic_year: new Date().getFullYear().toString(),
  description: '',
  is_active: true,
};

// Column configuration
const columns: ColumnConfig<SchoolClass>[] = [
  {
    key: 'name',
    label: 'Sinif adı',
    width: 'w-[200px]',
    render: (schoolClass) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
          <School className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <div className="font-medium">{schoolClass.name}</div>
          <div className="text-sm text-muted-foreground">
            {typeof schoolClass.academic_year === 'object' 
              ? schoolClass.academic_year.name || schoolClass.academic_year.year || 'Akademik il'
              : schoolClass.academic_year || 'Akademik il'
            } akademik ili
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'grade_level',
    label: 'Sinif səviyyəsi',
    render: (schoolClass) => {
      const getGradeLevelText = (level: number) => {
        if (level <= 4) return 'İbtidai';
        if (level <= 9) return 'Ümumi';
        return 'Orta';
      };
      return (
        <div className="text-sm">
          {getGradeLevelText(schoolClass.grade_level)} - {schoolClass.grade_level}
        </div>
      );
    },
  },
  {
    key: 'room_number',
    label: 'Otaq',
    render: (schoolClass) => (
      <div className="flex items-center gap-1 text-sm">
        {schoolClass.room_number ? (
          <>
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {schoolClass.room_number}
          </>
        ) : (
          <span className="text-muted-foreground">Təyin edilməyib</span>
        )}
      </div>
    ),
  },
  {
    key: 'class_teacher',
    label: 'Sinif rəhbəri',
    render: (schoolClass) => (
      <div className="flex items-center gap-1 text-sm">
        {schoolClass.class_teacher ? (
          <>
            <User className="h-4 w-4 text-muted-foreground" />
            {typeof schoolClass.class_teacher === 'object' 
              ? schoolClass.class_teacher.name || schoolClass.class_teacher.full_name || 'Müəllim'
              : schoolClass.class_teacher
            }
          </>
        ) : (
          <span className="text-orange-600">Təyin edilməyib</span>
        )}
      </div>
    ),
  },
  {
    key: 'enrollment',
    label: 'Şagird sayı',
    render: (schoolClass) => (
      <div className="text-sm">
        <span className="font-medium">
          {schoolClass.current_enrollment || 0}/{schoolClass.capacity || 0}
        </span>
        {(schoolClass.current_enrollment || 0) > (schoolClass.capacity || 0) && (
          <span className="text-red-600 ml-1">
            (+{(schoolClass.current_enrollment || 0) - (schoolClass.capacity || 0)})
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'is_active',
    label: 'Status',
    render: (schoolClass) => (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        schoolClass.is_active 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {schoolClass.is_active ? 'Aktiv' : 'Passiv'}
      </span>
    ),
  },
];

// Action configuration
const actions: ActionConfig<SchoolClass>[] = [
  {
    key: 'view',
    icon: Eye,
    label: 'Bax',
    variant: 'ghost',
    onClick: (schoolClass) => {
      console.log('View class:', schoolClass);
    },
  },
  {
    key: 'edit',
    icon: Edit,
    label: 'Redaktə et',
    variant: 'ghost',
    onClick: (schoolClass) => {
      console.log('Edit class:', schoolClass);
    },
  },
  {
    key: 'manage-students',
    icon: UserPlus,
    label: 'Şagirdləri İdarə Et',
    variant: 'ghost',
    onClick: (schoolClass) => {
      console.log('Manage students for class:', schoolClass);
    },
  },
  {
    key: 'delete',
    icon: Trash2,
    label: 'Sil',
    variant: 'ghost',
    onClick: (schoolClass) => {
      console.log('Delete class:', schoolClass);
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
    filter: (classes: SchoolClass[]) => classes.filter(c => c.is_active === true),
  },
  {
    key: 'inactive',
    label: 'Passiv',
    filter: (classes: SchoolClass[]) => classes.filter(c => c.is_active === false),
  },
  {
    key: 'overcrowded',
    label: 'Həddindən Çox',
    filter: (classes: SchoolClass[]) => classes.filter(c => 
      (c.current_enrollment || 0) > (c.capacity || 0)
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
    key: 'academic_year',
    label: 'Akademik İl',
    type: 'select',
    options: [
      { value: '2023', label: '2023-2024' },
      { value: '2024', label: '2024-2025' },
      { value: '2025', label: '2025-2026' },
    ],
  },
  {
    key: 'capacity_status',
    label: 'Tutum Statusu',
    type: 'select',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'overcrowded', label: 'Həddindən çox' },
      { value: 'underutilized', label: 'Az istifadə' },
    ],
  },
];

// Custom stats calculation
const calculateClassStats = (classes: SchoolClass[]): StatsConfig[] => {
  const total = classes.length;
  const active = classes.filter(c => c.is_active === true).length;
  const inactive = classes.filter(c => c.is_active === false).length;
  const overcrowded = classes.filter(c => 
    (c.current_enrollment || 0) > (c.capacity || 0)
  ).length;
  const needsTeacher = classes.filter(c => !c.class_teacher_id).length;

  return [
    {
      key: 'total',
      label: 'Ümumi',
      value: total,
      icon: School,
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
      key: 'overcrowded',
      label: 'Həddindən Çox',
      value: overcrowded,
      icon: AlertTriangle,
      color: 'orange',
    },
    {
      key: 'needs_teacher',
      label: 'Müəllim Lazım',
      value: needsTeacher,
      icon: User,
      color: 'purple',
    },
  ];
};

// Main configuration
export const classEntityConfig: EntityConfig<SchoolClass, ClassFilters, NewClassData> = {
  // Basic info
  entityType: 'classes',
  entityName: 'Sinif',
  entityNamePlural: 'Siniflər',
  
  // API service
  service: {
    get: (filters) => schoolAdminService.getClasses(filters),
    create: (data) => schoolAdminService.createClass(data),
    update: (id, data) => schoolAdminService.updateClass(id, data),
    delete: (id) => schoolAdminService.deleteClass(id),
  },
  
  // Query configuration
  queryKey: ['schoolAdmin', 'classes'],
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
    import: false, // Classes usually aren't imported
    create: true,
    edit: true,
    delete: true,
  },
};

// Custom logic for class management
export const classCustomLogic: ManagerCustomLogic<SchoolClass> = {
  // Custom stats calculation
  calculateCustomStats: calculateClassStats,
  
  // Permission checks
  permissionCheck: (action: string, schoolClass?: SchoolClass) => {
    // Add your permission logic here
    return true;
  },
  
  // Bulk actions
  bulkActions: [
    {
      key: 'activate',
      label: 'Aktivləşdir',
      icon: CheckCircle,
      onClick: (selectedClasses) => {
        console.log('Bulk activate:', selectedClasses);
      },
      variant: 'default',
    },
    {
      key: 'deactivate',
      label: 'Passivləşdir',
      icon: XCircle,
      onClick: (selectedClasses) => {
        console.log('Bulk deactivate:', selectedClasses);
      },
      variant: 'outline',
    },
    {
      key: 'assign-teacher',
      label: 'Müəllim Təyin Et',
      icon: User,
      onClick: (selectedClasses) => {
        console.log('Bulk assign teacher:', selectedClasses);
      },
      variant: 'outline',
    },
    {
      key: 'export',
      label: 'İxrac Et',
      icon: Download,
      onClick: (selectedClasses) => {
        console.log('Bulk export:', selectedClasses);
      },
      variant: 'outline',
    },
  ],
  
  // Header actions
  headerActions: [
    {
      key: 'export',
      label: 'İxrac Et',
      icon: Download,
      onClick: () => {
        console.log('Export all classes');
      },
      variant: 'outline',
    },
  ],
};