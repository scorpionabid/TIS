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
  Upload,
  BarChart3,
  BookOpen
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

// Column configuration with modern design
const columns: ColumnConfig<SchoolTeacher>[] = [
  {
    key: 'name',
    label: 'Ad Soyad',
    width: 'w-[200px]',
    align: 'left',
    render: (teacher) => (
      <div className="flex items-center gap-3 py-1">
        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center shadow-sm">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-900">
            {teacher.first_name && teacher.last_name 
              ? `${teacher.first_name} ${teacher.last_name}`.trim() 
              : teacher.email}
          </div>
          <div className="text-xs text-slate-500">
            {teacher.employee_id}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'workplace_type',
    label: 'İş yeri növü',
    width: 'w-[130px]',
    align: 'center',
    render: (teacher: any) => {
      const workplaceLabels: Record<string, string> = {
        primary: 'Əsas iş yeri',
        secondary: 'Əlavə iş yeri',
        remote: 'Uzaqdan iş',
      };
      const workplaceColors: Record<string, string> = {
        primary: 'bg-blue-100 text-blue-800 border border-blue-200',
        secondary: 'bg-amber-100 text-amber-800 border border-amber-200',
        remote: 'bg-purple-100 text-purple-800 border border-purple-200',
      };
      const type = teacher.workplace_type || 'primary';
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium shadow-sm whitespace-nowrap ${workplaceColors[type]}`}>
            {workplaceLabels[type] || type}
          </span>
        </div>
      );
    },
  },
  {
    key: 'position_type',
    label: 'Vəzifə',
    width: 'w-[160px]',
    align: 'center',
    render: (teacher: any) => {
      const positionLabels: Record<string, string> = {
        direktor: 'Direktor',
        direktor_muavini_tedris: 'Direktor Müavini (Tədris)',
        direktor_muavini_inzibati: 'Direktor Müavini (İnzibati)',
        terbiye_isi_uzre_direktor_muavini: 'Direktor Müavini (Tərbiyə)',
        'metodik_birlesme_rəhbəri': 'Metodik Birləşmə Rəhbəri',
        'muəllim_sinif_rəhbəri': 'Müəllim-Sinif Rəhbəri',
        'muəllim': 'Müəllim',
        psixoloq: 'Psixoloq',
        kitabxanaçı: 'Kitabxanaçı',
        laborant: 'Laborant',
        'tibb_işçisi': 'Tibb İşçisi',
        'təsərrüfat_işçisi': 'Təsərrüfat İşçisi',
      };
      return (
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm whitespace-nowrap">
            {teacher.position_type ? positionLabels[teacher.position_type] || teacher.position_type : 'Təyin edilməyib'}
          </span>
        </div>
      );
    },
  },
  {
    key: 'specialty',
    label: 'İxtisas',
    width: 'w-[140px]',
    align: 'center',
    render: (teacher: any) => (
      <div className="flex justify-center">
        <span className="text-sm text-slate-700 font-medium">
          {teacher.specialty || 'Təyin edilməyib'}
        </span>
      </div>
    ),
  },
  {
    key: 'assessment_score',
    label: 'Qiymətləndirmə balı',
    width: 'w-[130px]',
    align: 'center',
    render: (teacher: any) => {
      const score = teacher.assessment_score;
      const hasScore = score !== undefined && score !== null && score !== '';
      const numScore = hasScore ? Number(score) : NaN;
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm ${
            hasScore && !isNaN(numScore)
              ? numScore >= 40 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : numScore >= 30 
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {hasScore && !isNaN(numScore) ? Math.round(numScore) : '—'}
          </span>
        </div>
      );
    },
  },
  {
    key: 'is_active',
    label: 'Status',
    width: 'w-[100px]',
    align: 'center',
    render: (teacher) => (
      <div className="flex justify-center">
        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
          teacher.is_active
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {teacher.is_active ? 'Aktiv' : 'Passiv'}
        </span>
      </div>
    ),
  },
];

// Workload-specific column configuration (Dərs bölgüsü)
export const workloadColumns: ColumnConfig<SchoolTeacher>[] = [
  {
    key: 'full_name',
    label: 'Müəllimin Soyadı, Adı, Ata adı',
    width: 'w-[250px]',
    align: 'left',
    render: (teacher) => (
      <div className="font-medium text-sm text-slate-900">
        {teacher.last_name} {teacher.first_name} {teacher.patronymic || ''}
      </div>
    ),
  },
  {
    key: 'position_type',
    label: 'Vəzifəsi',
    width: 'w-[150px]',
    align: 'center',
    render: (teacher: any) => {
      const positionLabels: Record<string, string> = {
        direktor: 'Direktor',
        direktor_muavini_tedris: 'Direktor Müavini (Tədris)',
        direktor_muavini_inzibati: 'Direktor Müavini (İnzibati)',
        terbiye_isi_uzre_direktor_muavini: 'Direktor Müavini (Tərbiyə)',
        'muəllim': 'Müəllim',
      };
      return <span className="text-xs">{positionLabels[teacher.position_type] || teacher.position_type || 'Müəllim'}</span>;
    },
  },
  {
    key: 'employee_id',
    label: 'Müəllimin UTİS kodu',
    width: 'w-[120px]',
    align: 'center',
    render: (teacher) => <span className="text-xs font-mono">{teacher.employee_id || '—'}</span>,
  },
  {
    key: 'specialty',
    label: 'Müəllimin ixtisası',
    width: 'w-[150px]',
    align: 'center',
    render: (teacher) => <span className="text-xs">{teacher.specialty || '—'}</span>,
  },
  {
    key: 'assessment_type',
    label: 'Qiymətləndirmə növü',
    width: 'w-[140px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs">{(teacher as any).assessment_type || '—'}</span>,
  },
  {
    key: 'assessment_score',
    label: 'Qiymətləndirmə balı',
    width: 'w-[100px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs font-bold">{teacher.assessment_score ?? '—'}</span>,
  },
  {
    key: 'workload_teaching_hours',
    label: 'Dərs yükü (ümumi təhsil)',
    width: 'w-[90px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs font-bold text-blue-700">{teacher.workload_teaching_hours ?? 0}</span>,
  },
  {
    key: 'workload_individual_school',
    label: 'Fərdi təhsil (məktəbdə)',
    width: 'w-[120px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs">{(teacher as any).workload_individual_school ?? 0}</span>,
  },
  {
    key: 'workload_home_education',
    label: 'Evdə təhsil',
    width: 'w-[100px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs">{(teacher as any).workload_home_education ?? 0}</span>,
  },
  {
    key: 'workload_special_education',
    label: 'Xüsusi təhsil',
    width: 'w-[100px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs">{(teacher as any).workload_special_education ?? 0}</span>,
  },
  {
    key: 'workload_extracurricular_hours',
    label: 'Dərsdən kənar məşğələ',
    width: 'w-[120px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs font-bold text-amber-700">{teacher.workload_extracurricular_hours ?? 0}</span>,
  },
  {
    key: 'workload_club_hours',
    label: 'Dərnək',
    width: 'w-[90px]',
    align: 'center',
    render: (teacher: any) => <span className="text-xs font-bold text-purple-700">{teacher.workload_club_hours ?? 0}</span>,
  },
  {
    key: 'workload_total_hours',
    label: 'Ümumi dərs yükü',
    width: 'w-[110px]',
    align: 'center',
    render: (teacher: any) => (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
        {teacher.workload_total_hours ?? 0}
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
    },
  },
  {
    key: 'edit',
    icon: Edit,
    label: 'Redaktə et',
    variant: 'ghost',
    onClick: (teacher) => {
      // This will be handled by custom logic
    },
  },
  {
    key: 'delete',
    icon: Trash2,
    label: 'Sil',
    variant: 'ghost',
    onClick: (teacher) => {
      // This will be handled by custom logic
    },
  },
];

// Tab configuration
const tabs: TabConfig[] = [
  {
    key: 'stats',
    label: 'Statistika',
    isStatsTab: true,
    icon: BarChart3,
    variant: 'primary',
  },
  {
    key: 'active',
    label: 'Aktiv',
    filter: (teachers) => teachers.filter(t => t.is_active === true),
    icon: CheckCircle,
    variant: 'primary',
  },
  {
    key: 'inactive',
    label: 'Passiv',
    filter: (teachers) => teachers.filter(t => t.is_active === false),
    icon: XCircle,
    variant: 'danger',
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
    key: 'position_type',
    label: 'Vəzifə',
    type: 'select',
    options: [
      { value: 'direktor', label: 'Direktor' },
      { value: 'direktor_muavini_tedris', label: 'Direktor Müavini (Tədris)' },
      { value: 'direktor_muavini_inzibati', label: 'Direktor Müavini (İnzibati)' },
      { value: 'terbiye_isi_uzre_direktor_muavini', label: 'Direktor Müavini (Tərbiyə)' },
      { value: 'metodik_birlesme_rəhbəri', label: 'Metodik Birləşmə Rəhbəri' },
      { value: 'muəllim_sinif_rəhbəri', label: 'Müəllim-Sinif Rəhbəri' },
      { value: 'muəllim', label: 'Müəllim' },
      { value: 'psixoloq', label: 'Psixoloq' },
      { value: 'kitabxanaçı', label: 'Kitabxanaçı' },
      { value: 'laborant', label: 'Laborant' },
      { value: 'tibb_işçisi', label: 'Tibb İşçisi' },
      { value: 'təsərrüfat_işçisi', label: 'Təsərrüfat İşçisi' },
    ],
  },
  {
    key: 'employment_status',
    label: 'İş Statusu',
    type: 'select',
    options: [
      { value: 'full_time', label: 'Tam Ştat' },
      { value: 'part_time', label: 'Yarım Ştat' },
      { value: 'contract', label: 'Müqavilə' },
      { value: 'temporary', label: 'Müvəqqəti' },
      { value: 'substitute', label: 'Əvəzedici' },
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
export const calculateTeacherStats = (teachers: SchoolTeacher[]): StatsConfig[] => {
  const total = teachers.length;
  const active = teachers.filter(t => t.is_active === true).length;
  const inactive = teachers.filter(t => t.is_active === false).length;
  const fullTime = teachers.filter(t => t.employment_status === 'full_time').length;
  const partTime = teachers.filter(t => t.employment_status === 'part_time').length;
  const contract = teachers.filter(t => t.employment_status === 'contract').length;
  const needsAssignment = teachers.filter(t => !t.position_type || !t.employment_status).length;

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
      key: 'contract',
      label: 'Müqavilə',
      value: contract,
      icon: UserCheck,
      color: 'purple',
    },
    {
      key: 'needs_assignment',
      label: 'Təyinat Lazım',
      value: needsAssignment,
      icon: UserCheck,
      color: 'yellow',
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
    create: (data) => schoolAdminService.createTeacher(data as any),
    update: (id, data) => schoolAdminService.updateTeacher(id, data as any),
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
  defaultTab: 'active',
  filterFields,
  
  // Feature flags
  features: {
    search: true,
    filters: true,
    stats: false, // Disabled - stats now shown in separate tab only
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
    title: 'Müəllim İdarəetməsi',
    description: 'Məktəb müəllimlərinin qeydiyyatı və idarə edilməsi',
    searchPlaceholder: 'Ad, soyad vəya fənnə görə axtar...',
    createLabel: 'Yeni Müəllim',
    showStats: true,
    showSearch: true,
    showRefresh: true,
    showImport: true,
    showExport: true,
    showTemplate: true,
    showCreate: true,
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
        // Implement bulk activate logic
      },
      variant: 'default',
    },
    {
      key: 'deactivate',
      label: 'Passivləşdir',
      icon: XCircle,
      onClick: (selectedTeachers) => {
        // Implement bulk deactivate logic
      },
      variant: 'outline',
    },
    {
      key: 'export',
      label: 'İxrac Et',
      icon: Download,
      onClick: (selectedTeachers) => {
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
        // This will be handled in the component
      },
      variant: 'outline',
    },
  ],
};
