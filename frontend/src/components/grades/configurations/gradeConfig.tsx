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
  DoorOpen,
  UserX,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Display configuration
  title: 'Sinif İdarəetməsi',
  description: 'Məktəb siniflərinin idarə edilməsi və tələbə yazılışları',
  
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
      key: 'stats',
      label: 'Statistika',
      isStatsTab: true,
      icon: BarChart3,
      variant: 'primary',
    },
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
      key: 'no_room',
      label: 'Otaqsız',
      filter: (grades: Grade[]) => grades.filter(g => !g.room_id && g.is_active),
      serverFilters: {
        has_room: false,
        is_active: true,
      },
      icon: DoorOpen,
      variant: 'warning',
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
      width: 120,
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
      label: 'Şagirdlər',
      width: 130,
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
      key: 'capacity_status',
      label: 'Doluluk',
      width: 120,
      align: 'center',
      render: (grade: Grade) => {
        if (!grade.room_id) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
              <DoorOpen className="h-3 w-3" /> Otaqsız
            </span>
          );
        }
        const configs: Record<string, { label: string; className: string }> = {
          available:     { label: `Müsait (${grade.utilization_rate}%)`,      className: 'bg-green-100 text-green-700' },
          near_capacity: { label: `Dolmağa yaxın (${grade.utilization_rate}%)`, className: 'bg-yellow-100 text-yellow-700' },
          full:          { label: 'Dolu',                                      className: 'bg-orange-100 text-orange-700' },
          over_capacity: { label: 'Həddindən çox',                             className: 'bg-red-100 text-red-700' },
        };
        const cfg = configs[grade.capacity_status] ?? configs.available;
        return (
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      key: 'room',
      label: 'Otaq',
      width: 110,
      render: (grade: Grade) => grade.room ? (
        <div className="flex items-center gap-1 text-sm">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{grade.room.full_identifier || grade.room.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs italic">-</span>
      )
    },
    {
      key: 'teaching_shift',
      label: 'Növbə',
      width: 90,
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
      width: 150,
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
      width: 150,
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
      width: 160,
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
      width: 110,
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
      width: 200,
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
      key: 'view',
      label: 'Tədris planı',
      icon: BookOpen,
      variant: 'default' as const,
      isPrimary: true, // Mark as primary action - always visible
      onClick: (grade: Grade) => {
        // Handle view action - will be overridden in component
        logger.log('View grade', { component: 'gradeConfig', action: 'viewGrade', data: { gradeId: grade.id } });
      }
    },
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
      key: 'students',
      label: 'Tələbələr',
      icon: UserPlus,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle students action - will be overridden in component
      }
    },
    {
      key: 'analytics',
      label: 'Analitika',
      icon: BarChart3,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle analytics action - will be overridden in component
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

  // Search configuration
  searchConfig: {
    placeholder: 'Sinif adına və ya ixtisasına görə axtar...',
    searchKey: 'search'
  },

  // Pagination configuration
  paginationConfig: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  },

  // Loading states
  loadingConfig: {
    tableRows: 5,
    showSkeleton: true
  }
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
