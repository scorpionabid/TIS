import React from 'react';
import { Grade, GradeFilters, gradeService } from '@/services/grades';
import { EntityConfig } from '@/components/generic/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logger } from '@/utils/logger';
import {
  Users,
  MapPin,
  UserCheck,
  Calendar,
  School,
  Settings,
  BookOpen,
  Edit,
  UserPlus,
  BarChart3,
  Trash2,
  Archive,
  Copy,
  LayoutGrid,
  CheckCircle,
  XCircle,
  UserX,
  RefreshCw,
  Activity,
  Music,
  Eye,
} from 'lucide-react';

// Calculate assigned students count from students data
export const calculateAssignedStudents = (grades: Grade[], students: any[]): Grade[] => {
  if (!grades || !students) return grades;
  
  // Create a map of grade_id to count of students
  const gradeStudentCounts = new Map<number, number>();
  
  students.forEach(student => {
    // Check various possible grade ID fields
    const gradeId = student.grade_id || student.grade?.id || student.current_class?.id;
    if (gradeId) {
      const currentCount = gradeStudentCounts.get(gradeId) || 0;
      gradeStudentCounts.set(gradeId, currentCount + 1);
    }
  });
  
  // Merge counts into grades
  return grades.map(grade => ({
    ...grade,
    assigned_student_count: gradeStudentCounts.get(grade.id) || 0
  }));
};

// Status badge configurations
const getCapacityStatusBadge = (status: string, utilizationRate: number) => {
  const configs = {
    available: { variant: 'default' as const, label: 'Müsait' },
    near_capacity: { variant: 'secondary' as const, label: 'Dolmağa Yaxın' },
    full: { variant: 'outline' as const, label: 'Dolu' },
    over_capacity: { variant: 'destructive' as const, label: 'Həddindən Çox' },
    no_room: { variant: 'secondary' as const, label: 'Otaq Yoxdur' }
  };

  const config = configs[status as keyof typeof configs] || configs.available;
  const displayLabel = status === 'no_room' ? config.label : `${config.label} (${utilizationRate}%)`;

  return (
    <Badge variant={config.variant} className="text-xs">
      {displayLabel}
    </Badge>
  );
};

// Grade entity configuration for GenericManagerV2
export const gradeEntityConfig: EntityConfig<Grade, GradeFilters, any> = {
  // Basic info
  entityType: 'grades',
  entityName: 'Sinif',
  entityNamePlural: 'Siniflər',

  // Service configuration
  service: gradeService,
  queryKey: ['grades'],

  // Feature configuration
  features: {
    create: true,    // Enable create button
    tabs: true,      // Enable tabs
    filters: true,   // Enable filters
    bulk: true,      // Enable bulk selection
    stats: false,    // Hide stats cards from main view - will show in separate tab
    export: true,    // Enable export
    import: true,    // Enable import
  },

  // Modern Header Configuration
  headerConfig: {
    title: 'Sinif İdarəetməsi',
    description: 'Məktəb siniflərinin idarə edilməsi və tələbə yazılışları',
    searchPlaceholder: 'Sinif adına və ya ixtisasına görə axtar...',
    createLabel: 'Yeni Sinif',
    showStats: true,
    showSearch: true,
    showRefresh: true,
    showImport: true,
    showExport: true,
    showTemplate: true,
    showCreate: true,
  },

  // Tab configuration
  serverSide: {
    pagination: true,
    filtering: false,
  },

  tabs: [
    {
      key: 'all',
      label: 'Bütün Siniflər',
      filter: (grades: Grade[]) => grades,
      serverFilters: {
        is_active: undefined,
      },
      icon: LayoutGrid,
      variant: 'default',
    },
    {
      key: 'active',
      label: 'Aktiv Siniflər',
      filter: (grades: Grade[]) => grades.filter(g => g.is_active),
      serverFilters: {
        is_active: true,
      },
      icon: CheckCircle,
      variant: 'success',
    },
    {
      key: 'inactive',
      label: 'Deaktiv Siniflər',
      filter: (grades: Grade[]) => grades.filter(g => !g.is_active),
      serverFilters: {
        is_active: false,
      },
      icon: XCircle,
      variant: 'danger',
    },
    {
      key: 'no_teacher',
      label: 'Müəllimsiz',
      filter: (grades: Grade[]) => grades.filter(g => !g.homeroom_teacher_id && g.is_active),
      serverFilters: {
        has_teacher: false,
        is_active: true,
      },
      icon: UserX,
      variant: 'warning',
    },
  ],
  
  // Table configuration
  columns: [
    {
      key: 'name',
      label: 'Sinif',
      width: 'w-[120px]',
      render: (grade: Grade) => (
        <div className="flex flex-col">
          <span className="font-semibold text-base">{grade.full_name || `${grade.class_level || ''}-${grade.name || ''}`}</span>
          <span className="text-xs text-muted-foreground">
            {grade.class_level || 0}. sinif səviyyəsi
          </span>
        </div>
      )
    },
    {
      key: 'student_count',
      label: 'Tələbələr',
      width: 'w-[130px]',
      sortable: true,
      align: 'center',
      render: (grade: Grade) => {
        const maleCount = grade.male_student_count ?? 0;
        const femaleCount = grade.female_student_count ?? 0;
        const totalCount = grade.student_count || 0;
        const hasGenderData = maleCount > 0 || femaleCount > 0;

        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{totalCount}</span>
            </div>
            {hasGenderData && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-blue-600 font-medium">{maleCount}</span>♂
                <span className="text-pink-600 font-medium">{femaleCount}</span>♀
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'real_student_count',
      label: 'Şagirdlər',
      width: 'w-[130px]',
      sortable: true,
      align: 'center',
      render: (grade: Grade) => {
        const total  = grade.real_student_count ?? 0;
        const male   = grade.real_male_count    ?? 0;
        const female = grade.real_female_count  ?? 0;
        const hasGender = male > 0 || female > 0;

        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{total}</span>
            </div>
            {hasGender && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-blue-600 font-medium">{male}</span>♂
                <span className="text-pink-600 font-medium">{female}</span>♀
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'teaching_shift',
      label: 'Növbə',
      width: 'w-[90px]',
      align: 'center',
      render: (grade: Grade) => {
        const teachingShift = (grade as any).teaching_shift;
        return teachingShift ? (
          <Badge variant="outline" className="text-xs py-0.5">
            {teachingShift}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs italic">-</span>
        );
      }
    },
    {
      key: 'education_program',
      label: 'Təhsil Proqramı',
      width: 'w-[150px]',
      render: (grade: Grade) => grade.education_program ? (
        <Badge variant="outline" className="text-xs py-0.5 text-center justify-center">
          {grade.education_program === 'umumi' ? 'Ümumi' : grade.education_program}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs italic">-</span>
      )
    },
    {
      key: 'class_profile',
      label: 'Profil',
      width: 'w-[150px]',
      render: (grade: Grade) => grade.class_profile ? (
        <Badge variant="secondary" className="text-xs py-0.5">
          {grade.class_profile}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs italic">-</span>
      )
    },
    {
      key: 'homeroom_teacher',
      label: 'Sinif Rəhbəri',
      width: 'w-[160px]',
      render: (grade: Grade) => grade.homeroom_teacher ? (
        <div className="flex items-center gap-1 text-sm">
          <UserCheck className="h-3 w-3 text-muted-foreground" />
          <span className="truncate font-medium">{grade.homeroom_teacher.full_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs italic">-</span>
      )
    },
    {
      key: 'academic_year',
      label: 'Təhsil İli',
      width: 'w-[110px]',
      align: 'center',
      render: (grade: Grade) => {
        if (!grade.academic_year) {
          return <span className="text-muted-foreground text-xs italic">-</span>;
        }

        const isActive = grade.is_active;
        const isCurrentYear = grade.academic_year?.is_active;

        let variant: 'default' | 'secondary' | 'destructive';

        if (!isActive) {
          variant = 'destructive'; // Red - inactive grade
        } else if (isCurrentYear) {
          variant = 'default'; // Green - active + current year
        } else {
          variant = 'secondary'; // Gray - active + past year
        }

        return (
          <Badge variant={variant} className="text-xs py-0.5">
            {grade.academic_year.name}
          </Badge>
        );
      }
    },
    {
      key: 'institution',
      label: 'Məktəb',
      width: 'w-[200px]',
      // Hide for SchoolAdmin, SektorAdmin and below - they already know their institution
      isVisible: (grade: Grade, userRole?: string) => {
        return ['superadmin', 'regionadmin'].includes(userRole || '');
      },
      render: (grade: Grade) => grade.institution ? (
        <div className="flex items-center gap-1 text-sm">
          <School className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{grade.institution.name}</span>
        </div>
      ) : null
    }
  ],

  // Action configuration
  // Kurikulum is the primary action (always visible as button)
  // Other actions are grouped in dropdown menu
  actions: [
    {
      key: 'edit',
      label: 'Redaktə Et',
      icon: Edit,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle edit action - will be overridden in component
        logger.log('Edit grade', { component: 'gradeConfig', action: 'editGrade', data: { gradeId: grade.id } });
      }
    },
    {
      key: 'duplicate',
      label: 'Kopyala',
      icon: Copy,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle duplicate action - will be overridden in component
      }
    },
    {
      key: 'activate',
      label: 'Aktivləşdir',
      icon: RefreshCw,
      variant: 'ghost' as const,
      onClick: (_grade: Grade) => {
        // Handle activate action - will be overridden in component
      },
      isVisible: (grade: Grade) => !grade.is_active
    },
    {
      key: 'soft-delete',
      label: 'Deaktiv Et',
      icon: Archive,
      variant: 'ghost' as const,
      onClick: (_grade: Grade) => {
        // Handle soft delete action - will be overridden in component
      },
      isVisible: (grade: Grade) => grade.is_active
    },
    {
      key: 'hard-delete',
      label: 'Sil',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: (grade: Grade) => {
        // Handle hard delete action - will be overridden in component
      }
    }
  ],

  // Default filter values
  defaultFilters: {
    is_active: true,
    page: 1,
    per_page: 20,
  },

  // Default create data
  defaultCreateData: {
    name: '',
    class_level: 1,
    academic_year_id: 0,
    institution_id: 0,
    specialty: '',
    description: '',
    student_count: 0
  },
  
  filterFields: [],
};

// Custom logic for grade-specific operations
export const gradeCustomLogic = {
  // Validation logic
  validateCreateData: (data: any) => {
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim() === '') {
      errors.name = 'Sinif adı mütləqdir';
    } else if (!/^[A-Z]$/.test(data.name)) {
      errors.name = 'Sinif adı yalnız tək böyük hərf ola bilər (A, B, C, və s.)';
    }

    if (!data.class_level || data.class_level < 1 || data.class_level > 12) {
      errors.class_level = 'Sinif səviyyəsi 1-12 arasında olmalıdır';
    }

    if (!data.academic_year_id) {
      errors.academic_year_id = 'Təhsil ili seçimi mütləqdir';
    }

    if (!data.institution_id) {
      errors.institution_id = 'Məktəb seçimi mütləqdir';
    }

    if (data.student_count && (data.student_count < 0 || data.student_count > 50)) {
      errors.student_count = 'Tələbə sayı 0-50 arasında olmalıdır';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Data transformation
  transformCreateData: (data: any) => {
    return {
      ...data,
      name: data.name.trim(),
      specialty: data.specialty?.trim() || undefined,
      description: data.description?.trim() || undefined,
      student_count: parseInt(data.student_count) || 0
    };
  },

  // Status helpers
  getStatusColor: (grade: Grade) => {
    if (!grade.is_active) return 'text-muted-foreground';
    if (grade.capacity_status === 'over_capacity') return 'text-red-600';
    if (grade.capacity_status === 'full') return 'text-yellow-600';
    if (grade.capacity_status === 'no_room') return 'text-orange-600';
    return 'text-green-600';
  },

  // Capacity helpers
  getCapacityWarnings: (grade: Grade) => {
    const warnings: string[] = [];

    if (!grade.room_id) {
      warnings.push('Otaq təyin edilməyib');
    }

    if (!grade.homeroom_teacher_id) {
      warnings.push('Sinif rəhbəri təyin edilməyib');
    }

    if (grade.capacity_status === 'over_capacity') {
      warnings.push('Sinif həddindən çox doludur');
    }

    if (grade.utilization_rate < 60) {
      warnings.push('Sinif az istifadə olunur');
    }

    return warnings;
  },

  // Sort helpers
  getSortValue: (grade: Grade, key: string) => {

    try {
      switch (key) {
        case 'name': {
          const name = grade?.name;
          return name && typeof name === 'string' ? name.toLowerCase() : '';
        }
        case 'class_level':
          return grade?.class_level || 0;
        case 'student_count':
          return grade?.student_count || 0;
        case 'utilization_rate':
          return grade?.utilization_rate || 0;
        case 'created_at':
          return grade?.created_at ? new Date(grade.created_at).getTime() : 0;
        default:
          return '';
      }
    } catch (error) {
      console.error('❌ getSortValue ERROR:', { error, grade, key });
      return '';
    }
  }
};

const renderHours = (val: number | null | undefined) =>
  val != null ? (
    <span className="font-bold tabular-nums text-sm text-slate-700">{val}</span>
  ) : (
    <span className="text-muted-foreground text-xs italic opacity-40">-</span>
  );

// Curriculum-specific grade config — includes workload columns + Tədris planı action
// Used in CurriculumPlan → "Sinif tədris planı" tab
export const curriculumGradeEntityConfig: EntityConfig<Grade, GradeFilters, any> = {
  ...gradeEntityConfig,

  // Feature configuration
  features: {
    ...gradeEntityConfig.features,
    create: false,
    tabs: false,
    export: false,
    import: false,
    bulk: false,
    showTotals: true,
  },

  // Header: yalnız axtarış qalsın
  headerConfig: {
    ...gradeEntityConfig.headerConfig,
    title: '',
    description: '',
    showStats: false,
    showSearch: true,
    showExport: false,
    showImport: false,
    showTemplate: false,
    showRefresh: false,
    showCreate: false,
    hideTitleSection: true,
  },

  // Pre-calculate derived fields for proper footer summation
  dataTransformer: (grades: Grade[]) => {
    return grades.map(grade => {
      const gs = grade.grade_subjects || [];
      
      // Calculate raw totals from subjects - STRICTLY FROM GRADE_SUBJECTS (Order/Əmr)
      const club = gs.filter(i => Number(i.subject_id) === 57).reduce((a, b) => a + (Number(b.weekly_hours) * (Number((b as any).group_count) || 1)), 0);
      const extra = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== 57).reduce((a, b) => a + (Number(b.weekly_hours) * (Number((b as any).group_count) || 1)), 0);
      
      const umumi = gs.filter(i => {
         const ed = i.education_type?.toLowerCase() || '';
         const sid = Number(i.subject_id);
         return (ed === 'umumi' || ed === 'ümumi' || ed === '') && !i.is_extracurricular && sid !== 57 && !!i.is_teaching_activity;
      }).reduce((a, b) => a + (Number(b.weekly_hours) * (Number((b as any).group_count) || 1)), 0);
      
      const ferdi = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + (Number(b.weekly_hours) * (Number((b as any).group_count) || 1)), 0);
      const evde = gs.filter(i => i.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + (Number(b.weekly_hours) * (Number((b as any).group_count) || 1)), 0);
      const xususi = gs.filter(i => i.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + (Number(b.weekly_hours) * (Number((b as any).group_count) || 1)), 0);

      return {
        ...grade,
        club_hours: club,
        extracurricular_hours: extra,
        umumi_edu_hours: umumi,
        ferdi_edu_hours: ferdi,
        evde_edu_hours: evde,
        xususi_edu_hours: xususi,
        lesson_load_hours: umumi + extra + ferdi + evde + xususi + club
      };
    });
  },

  // Sütunlar: 14 sütunlu tam struktur (İstifadəçi tələbi ilə)
  columns: [
    // 1-7: Baza sütunlar
    {
      key: 'name',
      label: 'Sinif',
      width: 'w-[120px]',
      render: (grade: Grade) => (
        <div className="flex flex-col">
          <span className="font-semibold text-base">{grade.full_name || `${grade.class_level || ''}-${grade.name || ''}`}</span>
          <span className="text-xs text-muted-foreground">{grade.class_level || 0}. sinif səviyyəsi</span>
        </div>
      ),
    },
    {
      key: 'real_student_count',
      label: 'Şagirdlər',
      width: 'w-[100px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => (
        <div className="flex items-center justify-center gap-1.5 font-bold">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{grade.real_student_count ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'teaching_shift',
      label: 'Növbə',
      width: 'w-[90px]',
      align: 'center' as const,
      render: (grade: Grade) => {
        const shift = (grade as any).teaching_shift;
        return shift ? <Badge variant="outline" className="text-xs">{shift}</Badge> : <span className="text-muted-foreground italic">-</span>;
      },
    },
    {
      key: 'education_program',
      label: 'Təhsil Proqramı',
      width: 'w-[140px]',
      render: (grade: Grade) => grade.education_program ? (
        <Badge variant="outline" className="text-xs">
          {grade.education_program === 'umumi' ? 'Ümumi' : grade.education_program}
        </Badge>
      ) : <span className="text-muted-foreground italic">-</span>,
    },
    {
      key: 'class_profile',
      label: 'Profil',
      width: 'w-[130px]',
      render: (grade: Grade) => grade.class_profile ? (
        <Badge variant="secondary" className="text-xs">{grade.class_profile}</Badge>
      ) : <span className="text-muted-foreground italic">-</span>,
    },
    {
      key: 'homeroom_teacher',
      label: 'Sinif Rəhbəri',
      width: 'w-[150px]',
      render: (grade: Grade) => grade.homeroom_teacher ? (
        <div className="flex items-center gap-1 text-xs font-medium">
          <UserCheck className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{grade.homeroom_teacher.full_name}</span>
        </div>
      ) : <span className="text-muted-foreground italic">-</span>,
    },
    // 8-14: Saat kateqoriyaları (education_type əsaslı, grade_subjects-dən hesablanmış)
    {
      key: 'lesson_load_hours',
      label: 'Cəmi dərs yükü',
      width: 'w-[130px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => {
        const total = grade.lesson_load_hours ?? 0;
        return total > 0
          ? <span className="font-black text-indigo-700 tabular-nums text-base underline decoration-indigo-200 underline-offset-4">{total}</span>
          : <span className="text-muted-foreground italic opacity-40">-</span>;
      },
    },
    {
      key: 'umumi_edu_hours',
      label: 'Ümumi',
      width: 'w-[90px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => renderHours(grade.umumi_edu_hours),
    },
    {
      key: 'extracurricular_hours',
      label: 'Dərsdənkənar',
      width: 'w-[110px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => renderHours(grade.extracurricular_hours),
    },
    {
      key: 'club_hours',
      label: 'Dərnək',
      width: 'w-[90px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => renderHours(grade.club_hours),
    },
    {
      key: 'ferdi_edu_hours',
      label: 'Fərdi',
      width: 'w-[90px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => renderHours(grade.ferdi_edu_hours),
    },
    {
      key: 'evde_edu_hours',
      label: 'Evdə',
      width: 'w-[90px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => renderHours(grade.evde_edu_hours),
    },
    {
      key: 'xususi_edu_hours',
      label: 'Xüsusi',
      width: 'w-[90px]',
      align: 'center' as const,
      showTotal: true,
      render: (grade: Grade) => renderHours(grade.xususi_edu_hours),
    },
    {
      key: 'academic_year',
      label: 'Təhsil İli',
      width: 'w-[100px]',
      align: 'center' as const,
      render: (grade: Grade) => grade.academic_year ? (
        <Badge variant={grade.academic_year.is_active ? 'default' : 'secondary'} className="text-xs">
          {grade.academic_year.name}
        </Badge>
      ) : <span className="text-muted-foreground italic">-</span>,
    },
  ],

  actions: [
    {
      key: 'view',
      label: 'Tədris planı',
      icon: Eye,
      variant: 'default' as const,
      isPrimary: true,
      onClick: (_grade: Grade) => {},
    },
    ...gradeEntityConfig.actions,
  ],
};

const CLASS_LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);

// Filter component for grades
export const GradeFiltersComponent: React.FC<{
  filters: GradeFilters;
  onFiltersChange: (filters: GradeFilters) => void;
  availableInstitutions?: Array<{ id: number; name: string }>;
  availableAcademicYears?: Array<{ id: number; name: string; is_active: boolean }>;
}> = ({ filters, onFiltersChange, availableInstitutions = [], availableAcademicYears = [] }) => {
  const currentFilters = filters || {};

  const applyFilterChange = (patch: Partial<GradeFilters>) => {
    onFiltersChange({ ...currentFilters, ...patch, page: 1 });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* Institution filter — yalnız superadmin/regionadmin üçün görünür */}
      {availableInstitutions.length > 1 && (
        <Select
          value={currentFilters.institution_id?.toString() ?? ''}
          onValueChange={(v) =>
            applyFilterChange({ institution_id: v ? Number(v) : undefined })
          }
        >
          <SelectTrigger className="h-9 min-w-[180px] text-sm">
            <SelectValue placeholder="Məktəb seçin..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Bütün məktəblər</SelectItem>
            {availableInstitutions.map((inst) => (
              <SelectItem key={inst.id} value={inst.id.toString()}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Academic year filter */}
      {availableAcademicYears.length > 0 && (
        <Select
          value={currentFilters.academic_year_id?.toString() ?? ''}
          onValueChange={(v) =>
            applyFilterChange({ academic_year_id: v ? Number(v) : undefined })
          }
        >
          <SelectTrigger className="h-9 min-w-[150px] text-sm">
            <SelectValue placeholder="Tədris ili..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Bütün illər</SelectItem>
            {availableAcademicYears.map((y) => (
              <SelectItem key={y.id} value={y.id.toString()}>
                {y.name}{y.is_active ? ' (cari)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Class level filter */}
      <Select
        value={currentFilters.class_level?.toString() ?? ''}
        onValueChange={(v) =>
          applyFilterChange({ class_level: v ? Number(v) : undefined })
        }
      >
        <SelectTrigger className="h-9 min-w-[130px] text-sm">
          <SelectValue placeholder="Sinif səviyyəsi..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Bütün səviyyələr</SelectItem>
          {CLASS_LEVELS.map((lvl) => (
            <SelectItem key={lvl} value={lvl.toString()}>
              {lvl}. sinif
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Room filter */}
      <Select
        value={
          currentFilters.has_room === true
            ? 'true'
            : currentFilters.has_room === false
              ? 'false'
              : ''
        }
        onValueChange={(v) =>
          applyFilterChange({
            has_room: v === '' ? undefined : v === 'true',
          })
        }
      >
        <SelectTrigger className="h-9 min-w-[130px] text-sm">
          <SelectValue placeholder="Otaq..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Otaq (hamısı)</SelectItem>
          <SelectItem value="true">Otaqlı</SelectItem>
          <SelectItem value="false">Otaqsız</SelectItem>
        </SelectContent>
      </Select>

      {/* Teacher filter */}
      <Select
        value={
          currentFilters.has_teacher === true
            ? 'true'
            : currentFilters.has_teacher === false
              ? 'false'
              : ''
        }
        onValueChange={(v) =>
          applyFilterChange({
            has_teacher: v === '' ? undefined : v === 'true',
          })
        }
      >
        <SelectTrigger className="h-9 min-w-[150px] text-sm">
          <SelectValue placeholder="Müəllim..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Müəllim (hamısı)</SelectItem>
          <SelectItem value="true">Müəllimli</SelectItem>
          <SelectItem value="false">Müəllimsiz</SelectItem>
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={
          currentFilters.is_active === true
            ? 'true'
            : currentFilters.is_active === false
              ? 'false'
              : ''
        }
        onValueChange={(v) =>
          applyFilterChange({
            is_active: v === '' ? undefined : v === 'true',
          })
        }
      >
        <SelectTrigger className="h-9 min-w-[120px] text-sm">
          <SelectValue placeholder="Status..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Hər status</SelectItem>
          <SelectItem value="true">Aktiv</SelectItem>
          <SelectItem value="false">Deaktiv</SelectItem>
        </SelectContent>
      </Select>

    </div>
  );
};
