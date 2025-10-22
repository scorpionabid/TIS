import React from 'react';
import { Grade, GradeFilters, gradeService } from '@/services/grades';
// TODO: import { GradeFilters as GradeFiltersComponent } from './GradeFilters';
import { EntityConfig } from '@/components/generic/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    bulk: true     // Enable bulk selection
  },

  // Tab configuration
  tabs: [
    {
      key: 'all',
      label: 'Bütün Siniflər',
      filter: (grades: Grade[]) => grades
    },
    {
      key: 'active',
      label: 'Aktiv Siniflər',
      filter: (grades: Grade[]) => grades.filter(g => g.is_active)
    },
    {
      key: 'inactive',
      label: 'Deaktiv Siniflər',
      filter: (grades: Grade[]) => grades.filter(g => !g.is_active)
    }
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
      key: 'specialty',
      label: 'İxtisas',
      width: 110,
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
      width: 100,
      sortable: true,
      render: (grade: Grade) => {
        const utilizationRate = grade.utilization_rate || 0;
        const statusColor = utilizationRate > 100 ? 'text-red-600' : utilizationRate > 85 ? 'text-yellow-600' : 'text-green-600';

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={`font-semibold ${statusColor}`}>{grade.student_count}</span>
              {grade.room?.capacity && (
                <span className="text-xs text-muted-foreground">/ {grade.room.capacity}</span>
              )}
            </div>
            {utilizationRate > 0 && (
              <span className="text-xs text-muted-foreground">{utilizationRate.toFixed(0)}% doluluk</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'room',
      label: 'Otaq',
      width: 90,
      render: (grade: Grade) => grade.room ? (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{grade.room.name}</span>
        </div>
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
      width: 100,
      render: (grade: Grade) => grade.academic_year ? (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{grade.academic_year.name}</span>
        </div>
      ) : <span className="text-muted-foreground text-xs italic">-</span>
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
    },
    {
      key: 'is_active',
      label: 'Status',
      width: 70,
      render: (grade: Grade) => (
        <Badge variant={grade.is_active ? 'default' : 'secondary'} className="text-xs py-0.5">
          {grade.is_active ? 'Aktiv' : 'Deaktiv'}
        </Badge>
      )
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
        console.log('View grade:', grade.id);
      }
    },
    {
      key: 'edit',
      label: 'Redaktə Et',
      icon: Edit,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle edit action - will be overridden in component
        console.log('Edit grade:', grade.id);
      }
    },
    {
      key: 'duplicate',
      label: 'Kopyala',
      icon: Copy,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle duplicate action - will be overridden in component
        console.log('Duplicate grade:', grade.id);
      }
    },
    {
      key: 'students',
      label: 'Tələbələr',
      icon: UserPlus,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle students action - will be overridden in component
        console.log('Manage students for grade:', grade.id);
      }
    },
    {
      key: 'analytics',
      label: 'Analitika',
      icon: BarChart3,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle analytics action - will be overridden in component
        console.log('View analytics for grade:', grade.id);
      }
    },
    {
      key: 'soft-delete',
      label: 'Deaktiv Et',
      icon: Archive,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle soft delete action - will be overridden in component
        console.log('Soft delete grade:', grade.id);
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
        console.log('Hard delete grade:', grade.id);
      }
    }
  ],

  // Default filter values
  defaultFilters: {
    is_active: true,
    per_page: 20
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
    console.log('🔍 getSortValue DEBUG:', {
      gradeId: grade?.id,
      key,
      grade_name: grade?.name,
      grade_name_type: typeof grade?.name,
      full_grade_object: grade
    });

    try {
      switch (key) {
        case 'name': {
          const name = grade?.name;
          console.log('🔍 Processing name:', { name, type: typeof name, isNull: name === null, isUndefined: name === undefined });
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
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
      {/* Institution Filter */}
      {availableInstitutions.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Məktəb</label>
          <select
            value={filters.institution_id || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              institution_id: e.target.value ? parseInt(e.target.value) : undefined
            })}
            className="px-3 py-2 border border-input rounded-md text-sm bg-background"
          >
            <option value="">Bütün məktəblər</option>
            {availableInstitutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Class Level Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Sinif Səviyyəsi</label>
        <select
          value={filters.class_level || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            class_level: e.target.value ? parseInt(e.target.value) : undefined
          })}
          className="px-3 py-2 border border-input rounded-md text-sm bg-background"
        >
          <option value="">Bütün səviyyələr</option>
          {Array.from({length: 12}, (_, i) => i + 1).map(level => (
            <option key={level} value={level}>{level}. sinif</option>
          ))}
        </select>
      </div>

      {/* Academic Year Filter */}
      {availableAcademicYears.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Təhsil İli</label>
          <select
            value={filters.academic_year_id || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              academic_year_id: e.target.value ? parseInt(e.target.value) : undefined
            })}
            className="px-3 py-2 border border-input rounded-md text-sm bg-background"
          >
            <option value="">Bütün təhsil illəri</option>
            {availableAcademicYears.map(year => (
              <option key={year.id} value={year.id}>
                {year.name} {year.is_active && '(Aktiv)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Capacity Status Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Tutum Vəziyyəti</label>
        <select
          value={filters.capacity_status || ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            capacity_status: e.target.value || undefined
          })}
          className="px-3 py-2 border border-input rounded-md text-sm bg-background"
        >
          <option value="">Bütün statuslar</option>
          <option value="available">Müsait</option>
          <option value="near_capacity">Dolmağa Yaxın</option>
          <option value="full">Dolu</option>
          <option value="over_capacity">Həddindən Çox</option>
          <option value="no_room">Otaq Yoxdur</option>
        </select>
      </div>

      {/* Teacher Assignment Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Müəllim Təyinatı</label>
        <select
          value={filters.has_teacher !== undefined ? filters.has_teacher.toString() : ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            has_teacher: e.target.value === '' ? undefined : e.target.value === 'true'
          })}
          className="px-3 py-2 border border-input rounded-md text-sm bg-background"
        >
          <option value="">Hamısı</option>
          <option value="true">Müəllimi var</option>
          <option value="false">Müəllimi yoxdur</option>
        </select>
      </div>

      {/* Room Assignment Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Otaq Təyinatı</label>
        <select
          value={filters.has_room !== undefined ? filters.has_room.toString() : ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            has_room: e.target.value === '' ? undefined : e.target.value === 'true'
          })}
          className="px-3 py-2 border border-input rounded-md text-sm bg-background"
        >
          <option value="">Hamısı</option>
          <option value="true">Otağı var</option>
          <option value="false">Otağı yoxdur</option>
        </select>
      </div>

      {/* Active Status Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Status</label>
        <select
          value={filters.is_active !== undefined ? filters.is_active.toString() : 'true'}
          onChange={(e) => onFiltersChange({
            ...filters,
            is_active: e.target.value === '' ? undefined : e.target.value === 'true'
          })}
          className="px-3 py-2 border border-input rounded-md text-sm bg-background"
        >
          <option value="true">Aktiv</option>
          <option value="false">Deaktiv</option>
          <option value="">Hamısı</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium invisible">Təmizlə</label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersChange({ is_active: true, per_page: 20 })}
          className="px-4"
        >
          <Settings className="h-4 w-4 mr-2" />
          Filtrləri Təmizlə
        </Button>
      </div>
    </div>
  );
};
