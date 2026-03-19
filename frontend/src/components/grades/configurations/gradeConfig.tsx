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
import { Label } from '@/components/ui/label';
import { logger } from '@/utils/logger';
import {
  Users,
  UserCheck,
  School,
  Settings,
  BookOpen,
  Edit,
  UserPlus,
  BarChart3,
  Trash2,
  Archive,
  Copy,
  CheckCircle
} from 'lucide-react';

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
  
  // Feature configuration - disable default create button
  features: {
    create: false,  // Disable default create button since we use headerActions
    tabs: true,     // Enable tabs
    filters: true,  // Enable filters
    bulk: false,    // Bulk operations not yet configured
    stats: false,   // Stats rendered separately in GradeManager using statistics API
  },

  // Tab configuration
  serverSide: {
    pagination: true,
    filtering: true,
  },

  tabs: [
    {
      key: 'all',
      label: 'Bütün Siniflər',
      filter: (grades: Grade[]) => grades,
      serverFilters: {
        is_active: undefined,
      },
    },
    {
      key: 'active',
      label: 'Aktiv Siniflər',
      filter: (grades: Grade[]) => grades.filter(g => g.is_active),
      serverFilters: {
        is_active: true,
      },
    },
    {
      key: 'inactive',
      label: 'Deaktiv Siniflər',
      filter: (grades: Grade[]) => grades.filter(g => !g.is_active),
      serverFilters: {
        is_active: false,
      },
    }
  ],
  
  // Table configuration
  columns: [
    {
      key: 'name',
      label: 'Sinif',
      width: '120px',
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
      key: 'specialty',
      label: 'İxtisas',
      width: '110px',
      render: (grade: Grade) => grade.specialty ? (
        <Badge variant="outline" className="text-xs py-0.5">
          {grade.specialty}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs italic">-</span>
      )
    },
    {
      key: 'student_count',
      label: 'Tələbələr',
      width: '120px',
      sortable: true,
      render: (grade: Grade) => {
        const maleCount = grade.male_student_count || 0;
        const femaleCount = grade.female_student_count || 0;
        const totalCount = grade.student_count || 0;
        const hasGenderData = maleCount > 0 || femaleCount > 0;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{totalCount}</span>
            </div>
            {hasGenderData && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <span className="text-blue-600 font-medium">{maleCount}</span> oğlan
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="text-pink-600 font-medium">{femaleCount}</span> qız
                </span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'teaching_shift',
      label: 'Növbə',
      width: '90px',
      render: (grade: Grade) => {
        const teachingShift = grade.teaching_shift;
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
      key: 'homeroom_teacher',
      label: 'Sinif Rəhbəri',
      width: '160px',
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
      width: '110px',
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
      key: 'capacity_status',
      label: 'Tutum',
      width: '140px',
      render: (grade: Grade) => getCapacityStatusBadge(grade.capacity_status, grade.utilization_rate)
    },
    {
      key: 'institution',
      label: 'Məktəb',
      width: '200px',
      // Hide for SchoolAdmin, SektorAdmin and below - they already know their institution
      isVisible: (_grade: Grade, userRole?: string) => {
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
      label: 'Kurikulum',
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
      onClick: (_grade: Grade) => {
        // onClick will be overridden in GradeManager component
      }
    },
    {
      key: 'students',
      label: 'Tələbələr',
      icon: UserPlus,
      variant: 'ghost' as const,
      onClick: (_grade: Grade) => {
        // onClick will be overridden in GradeManager component
      }
    },
    {
      key: 'analytics',
      label: 'Analitika',
      icon: BarChart3,
      variant: 'ghost' as const,
      onClick: (_grade: Grade) => {
        // onClick will be overridden in GradeManager component
      }
    },
    {
      key: 'soft-delete',
      label: 'Deaktiv Et',
      icon: Archive,
      variant: 'ghost' as const,
      onClick: (_grade: Grade) => {
        // onClick will be overridden in GradeManager component
      },
      isVisible: (grade: Grade) => grade.is_active
    },
    {
      key: 'activate',
      label: 'Aktivləşdir',
      icon: CheckCircle,
      variant: 'ghost' as const,
      onClick: (_grade: Grade) => {
        // onClick will be overridden in GradeManager component
      },
      isVisible: (grade: Grade) => !grade.is_active
    },
    {
      key: 'hard-delete',
      label: 'Sil',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: (_grade: Grade) => {
        // onClick will be overridden in GradeManager component
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
        case 'name':
          return grade?.name && typeof grade.name === 'string' ? grade.name.toLowerCase() : '';
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
      logger.error('getSortValue failed', { error, gradeId: grade?.id, key });
      return '';
    }
  }
};

// Enhanced filter component for grades
export const GradeFiltersComponent: React.FC<{
  filters: GradeFilters;
  onFiltersChange: (filters: GradeFilters) => void;
  availableInstitutions?: Array<{id: number; name: string}>;
  availableAcademicYears?: Array<{id: number; name: string; is_active: boolean}>;
}> = ({ 
  filters, 
  onFiltersChange,
  availableInstitutions = [],
  availableAcademicYears = []
}) => {
  const ALL = '__all__';
  const currentFilters = filters || {};

  const applyFilterChange = (patch: Partial<GradeFilters>, options?: { resetPage?: boolean }) => {
    const nextFilters: GradeFilters = { ...currentFilters, ...patch };
    if (options?.resetPage !== false) nextFilters.page = 1;
    onFiltersChange(nextFilters);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
      {/* Institution Filter */}
      {availableInstitutions.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">Məktəb</Label>
          <Select
            value={currentFilters.institution_id?.toString() ?? ALL}
            onValueChange={(val) =>
              applyFilterChange({ institution_id: val === ALL ? undefined : parseInt(val, 10) })
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Bütün məktəblər" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Bütün məktəblər</SelectItem>
              {availableInstitutions.map(inst => (
                <SelectItem key={inst.id} value={inst.id.toString()}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Class Level Filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Sinif Səviyyəsi</Label>
        <Select
          value={currentFilters.class_level?.toString() ?? ALL}
          onValueChange={(val) =>
            applyFilterChange({ class_level: val === ALL ? undefined : parseInt(val, 10) })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Bütün səviyyələr" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Bütün səviyyələr</SelectItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(level => (
              <SelectItem key={level} value={level.toString()}>{level}. sinif</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Academic Year Filter */}
      {availableAcademicYears.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">Təhsil İli</Label>
          <Select
            value={currentFilters.academic_year_id?.toString() ?? ALL}
            onValueChange={(val) =>
              applyFilterChange({ academic_year_id: val === ALL ? undefined : parseInt(val, 10) })
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Bütün təhsil illəri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Bütün təhsil illəri</SelectItem>
              {availableAcademicYears.map(year => (
                <SelectItem key={year.id} value={year.id.toString()}>
                  {year.name}{year.is_active ? ' (Aktiv)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Capacity Status Filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Tutum Vəziyyəti</Label>
        <Select
          value={currentFilters.capacity_status ?? ALL}
          onValueChange={(val) =>
            applyFilterChange({ capacity_status: val === ALL ? undefined : val })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Bütün statuslar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Bütün statuslar</SelectItem>
            <SelectItem value="available">Müsait</SelectItem>
            <SelectItem value="near_capacity">Dolmağa Yaxın</SelectItem>
            <SelectItem value="full">Dolu</SelectItem>
            <SelectItem value="over_capacity">Həddindən Çox</SelectItem>
            <SelectItem value="no_room">Otaq Yoxdur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teacher Assignment Filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Müəllim Təyinatı</Label>
        <Select
          value={currentFilters.has_teacher !== undefined ? currentFilters.has_teacher.toString() : ALL}
          onValueChange={(val) =>
            applyFilterChange({ has_teacher: val === ALL ? undefined : val === 'true' })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Hamısı" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Hamısı</SelectItem>
            <SelectItem value="true">Müəllimi var</SelectItem>
            <SelectItem value="false">Müəllimi yoxdur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Room Assignment Filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Otaq Təyinatı</Label>
        <Select
          value={currentFilters.has_room !== undefined ? currentFilters.has_room.toString() : ALL}
          onValueChange={(val) =>
            applyFilterChange({ has_room: val === ALL ? undefined : val === 'true' })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Hamısı" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Hamısı</SelectItem>
            <SelectItem value="true">Otağı var</SelectItem>
            <SelectItem value="false">Otağı yoxdur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Status Filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Status</Label>
        <Select
          value={currentFilters.is_active !== undefined ? currentFilters.is_active.toString() : 'true'}
          onValueChange={(val) =>
            applyFilterChange({ is_active: val === ALL ? undefined : val === 'true' })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Aktiv</SelectItem>
            <SelectItem value="false">Deaktiv</SelectItem>
            <SelectItem value={ALL}>Hamısı</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      <div className="flex flex-col gap-1.5">
        <Label className="invisible text-sm font-medium">Təmizlə</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            applyFilterChange(
              {
                institution_id: undefined,
                class_level: undefined,
                academic_year_id: undefined,
                capacity_status: undefined,
                has_teacher: undefined,
                has_room: undefined,
                is_active: true,
              },
              { resetPage: true }
            )
          }
          className="h-9"
        >
          <Settings className="h-4 w-4 mr-2" />
          Filtrləri Sıfırla
        </Button>
      </div>
    </div>
  );
};
