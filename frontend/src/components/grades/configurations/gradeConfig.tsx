import React from 'react';
import { Grade, GradeFilters, gradeService } from '@/services/grades';
import { GradeFilters as GradeFiltersComponent } from './GradeFilters';
import { EntityConfig } from '@/components/generic/GenericManagerV2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MapPin, 
  UserCheck, 
  Calendar,
  School,
  Settings,
  Eye,
  Edit,
  UserPlus,
  BarChart3
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
export const gradeEntityConfig: EntityConfig<Grade, GradeFilters> = {
  // Service configuration
  service: gradeService,
  queryKey: 'grades',
  
  // Display configuration
  title: 'Sinif İdarəetməsi',
  description: 'Məktəb siniflərinin idarə edilməsi və tələbə yazılışları',
  
  // Table configuration
  columns: [
    {
      key: 'name',
      label: 'Sinif Adı',
      width: 150,
      render: (grade: Grade) => (
        <div className="flex flex-col">
          <span className="font-medium">{grade.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {grade.class_level}. sinif
          </span>
        </div>
      )
    },
    {
      key: 'specialty',
      label: 'İxtisas',
      width: 120,
      render: (grade: Grade) => grade.specialty ? (
        <Badge variant="outline" className="text-xs">
          {grade.specialty}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">Ümumi</span>
      )
    },
    {
      key: 'student_count',
      label: 'Tələbə Sayı',
      width: 120,
      sortable: true,
      render: (grade: Grade) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{grade.student_count}</span>
          {grade.room?.capacity && (
            <span className="text-xs text-muted-foreground">
              / {grade.room.capacity}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'capacity_status',
      label: 'Tutum Vəziyyəti',
      width: 150,
      render: (grade: Grade) => getCapacityStatusBadge(
        grade.capacity_status, 
        grade.utilization_rate
      )
    },
    {
      key: 'room',
      label: 'Otaq',
      width: 120,
      render: (grade: Grade) => grade.room ? (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{grade.room.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">Otaq təyin edilməyib</span>
      )
    },
    {
      key: 'homeroom_teacher',
      label: 'Sinif Rəhbəri',
      width: 180,
      render: (grade: Grade) => grade.homeroom_teacher ? (
        <div className="flex items-center gap-1 text-sm">
          <UserCheck className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{grade.homeroom_teacher.full_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">Müəllim təyin edilməyib</span>
      )
    },
    {
      key: 'academic_year',
      label: 'Təhsil İli',
      width: 120,
      render: (grade: Grade) => grade.academic_year ? (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span>{grade.academic_year.name}</span>
          {grade.academic_year.is_active && (
            <Badge variant="default" className="text-xs ml-1">Aktiv</Badge>
          )}
        </div>
      ) : null
    },
    {
      key: 'institution',
      label: 'Məktəb',
      width: 200,
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
      width: 80,
      render: (grade: Grade) => (
        <Badge variant={grade.is_active ? 'default' : 'secondary'} className="text-xs">
          {grade.is_active ? 'Aktiv' : 'Deaktiv'}
        </Badge>
      )
    }
  ],

  // Action configuration
  actions: [
    {
      key: 'view',
      label: 'Ətraflı',
      icon: <Eye className="h-4 w-4" />,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle view action - will be overridden in component
        console.log('View grade:', grade.id);
      }
    },
    {
      key: 'edit',
      label: 'Redaktə Et',
      icon: <Edit className="h-4 w-4" />,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle edit action - will be overridden in component
        console.log('Edit grade:', grade.id);
      }
    },
    {
      key: 'students',
      label: 'Tələbələr',
      icon: <UserPlus className="h-4 w-4" />,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle students action - will be overridden in component
        console.log('Manage students for grade:', grade.id);
      }
    },
    {
      key: 'analytics',
      label: 'Analitika',
      icon: <BarChart3 className="h-4 w-4" />,
      variant: 'ghost' as const,
      onClick: (grade: Grade) => {
        // Handle analytics action - will be overridden in component
        console.log('View analytics for grade:', grade.id);
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
    switch (key) {
      case 'name':
        return grade.name.toLowerCase();
      case 'class_level':
        return grade.class_level;
      case 'student_count':
        return grade.student_count;
      case 'utilization_rate':
        return grade.utilization_rate;
      case 'created_at':
        return new Date(grade.created_at).getTime();
      default:
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