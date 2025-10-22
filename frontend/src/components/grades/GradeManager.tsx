import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { Grade, GradeFilters } from '@/services/grades';
import { gradeEntityConfig, gradeCustomLogic, GradeFiltersComponent } from './configurations/gradeConfig';
import { GradeCreateDialogSimplified as GradeCreateDialog } from './GradeCreateDialogSimplified';
import { GradeDetailsDialog } from './GradeDetailsDialog';
import { GradeDetailsDialogWithTabs } from './GradeDetailsDialogWithTabs';
import { GradeStudentsDialog } from './GradeStudentsDialog';
import { GradeAnalyticsModal } from './GradeAnalyticsModal';
import { GradeDuplicateModal } from './GradeDuplicateModal';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { academicYearService } from '@/services/academicYears';
import { gradeService } from '@/services/grades';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

interface GradeManagerProps {
  className?: string;
}

/**
 * Modern Grade Manager using GenericManagerV2
 * 
 * This component represents the optimized grade management system that:
 * - Uses the unified backend API
 * - Implements modern React patterns with hooks
 * - Provides role-based filtering and access control
 * - Features enhanced search and filtering capabilities
 * - Maintains consistent error handling and loading states
 */
export const GradeManager: React.FC<GradeManagerProps> = ({ className }) => {
  // Modal states for grade-specific operations
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedGrade, setSelectedGrade] = React.useState<Grade | null>(null);
  const [editingGrade, setEditingGrade] = React.useState<Grade | null>(null);
  const [duplicatingGrade, setDuplicatingGrade] = React.useState<Grade | null>(null);
  const [studentsModalOpen, setStudentsModalOpen] = React.useState(false);
  const [studentsGrade, setStudentsGrade] = React.useState<Grade | null>(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = React.useState(false);
  const [analyticsGrade, setAnalyticsGrade] = React.useState<Grade | null>(null);

  // Role-based access and filtering
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch supporting data for filters
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-grade-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const { data: academicYearsResponse } = useQuery({
    queryKey: ['academic-years', 'for-grade-filter'],
    queryFn: () => academicYearService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Process available institutions based on user role
  const availableInstitutions = React.useMemo(() => {
    if (!institutionsResponse?.data || !currentUser) return [];
    
    logger.debug('Processing institutions for grade filtering', {
      component: 'GradeManager',
      action: 'filterInstitutions',
      data: { userRole: currentUser.role, institutionCount: institutionsResponse.data.length }
    });
    
    const institutions = institutionsResponse.data;
    
    // Role-based institution filtering logic
    switch (currentUser.role) {
      case 'superadmin':
        return institutions.filter((inst: any) => inst.level && inst.level >= 3);
        
      case 'regionadmin':
        return institutions.filter((inst: any) => 
          inst.id === currentUser.institution_id || (inst.level && inst.level >= 3)
        );
        
      case 'sektoradmin':
        return institutions.filter((inst: any) => 
          inst.id === currentUser.institution_id || inst.level === 4
        );
        
      default:
        return institutions.filter((inst: any) => inst.id === currentUser.institution_id);
    }
  }, [institutionsResponse, currentUser]);

  // Process available academic years
  const availableAcademicYears = React.useMemo(() => {
    if (!academicYearsResponse?.data) return [];
    return academicYearsResponse.data;
  }, [academicYearsResponse]);

  // Soft delete mutation
  const softDeleteMutation = useMutation({
    mutationFn: (gradeId: number) => gradeService.update(gradeId, { is_active: false }),
    onSuccess: () => {
      toast.success('Sinif deaktiv edildi');
      // Invalidate all grade-related queries with more specific patterns
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'grades' || 
        (Array.isArray(query.queryKey) && query.queryKey.includes('grades'))
      });
      // Force refetch to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: ['grades'] });
    },
    onError: (error) => {
      logger.error('Soft delete failed', { error });
      toast.error('Sinif deaktiv edilə bilmədi');
    },
  });

  // Hard delete mutation
  const hardDeleteMutation = useMutation({
    mutationFn: (gradeId: number) => gradeService.delete(gradeId),
    onSuccess: () => {
      toast.success('Sinif silindi');
      // Invalidate all grade-related queries with more specific patterns
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'grades' || 
        (Array.isArray(query.queryKey) && query.queryKey.includes('grades'))
      });
      // Force refetch to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: ['grades'] });
    },
    onError: (error) => {
      logger.error('Hard delete failed', { error });
      toast.error('Sinif silinə bilmədi');
    },
  });

  // Enhanced configuration with grade-specific modal handlers
  const enhancedConfig = React.useMemo(() => ({
    ...gradeEntityConfig,

    // Filter columns based on user role
    columns: gradeEntityConfig.columns.filter(column => {
      // Check if column has visibility condition
      if (column.isVisible && typeof column.isVisible === 'function') {
        return column.isVisible({} as Grade, currentUser?.role);
      }
      return true; // Show column by default
    }),

    // Override actions to connect with local modal handlers
    actions: gradeEntityConfig.actions.map(action => ({
      ...action,
      onClick: (grade: Grade) => {
        logger.debug(`Grade action triggered: ${action.key}`, {
          component: 'GradeManager',
          action: `handle${action.key}`,
          data: { 
            gradeId: grade.id, 
            gradeName: grade.name,
            classLevel: grade.class_level
          }
        });

        switch (action.key) {
          case 'view':
            setSelectedGrade(grade);
            break;
          case 'edit':
            setEditingGrade(grade);
            break;
          case 'duplicate':
            setDuplicatingGrade(grade);
            break;
          case 'students':
            setStudentsGrade(grade);
            setStudentsModalOpen(true);
            break;
          case 'analytics':
            setAnalyticsGrade(grade);
            setAnalyticsModalOpen(true);
            break;
          case 'soft-delete':
            if (confirm(`"${grade.name}" sinfini deaktiv etmək istədiyinizə əminsiniz?`)) {
              softDeleteMutation.mutate(grade.id);
            }
            break;
          case 'hard-delete':
            if (confirm(`"${grade.name}" sinfini tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`)) {
              hardDeleteMutation.mutate(grade.id);
            }
            break;
          default:
            logger.warn('Unknown action', { action: action.key });
        }
      }
    }))
  }), [currentUser?.role, softDeleteMutation, hardDeleteMutation]);

  // Handle create action
  const handleCreate = React.useCallback(() => {
    logger.debug('Opening grade creation dialog', {
      component: 'GradeManager',
      action: 'handleCreate'
    });
    setCreateModalOpen(true);
  }, []);

  // Custom logic with create handler
  const customLogic = React.useMemo(() => ({
    headerActions: [
      {
        key: 'create-grade',
        label: 'Yeni Sinif',
        icon: () => React.createElement('svg', { 
          className: 'h-4 w-4', 
          fill: 'none', 
          stroke: 'currentColor', 
          viewBox: '0 0 24 24' 
        }, React.createElement('path', { 
          strokeLinecap: 'round', 
          strokeLinejoin: 'round', 
          strokeWidth: 2, 
          d: 'M12 4v16m8-8H4' 
        })),
        onClick: handleCreate,
        variant: 'default' as const
      }
    ],
    renderCustomFilters: () => (
      <GradeFiltersComponent
        filters={{}}
        onFiltersChange={() => {}}
        availableInstitutions={availableInstitutions}
        availableAcademicYears={availableAcademicYears}
      />
    )
  }), [handleCreate, availableInstitutions, availableAcademicYears]);

  // Handle close modals
  const handleCloseModals = React.useCallback(() => {
    setCreateModalOpen(false);
    setSelectedGrade(null);
    setEditingGrade(null);
    setDuplicatingGrade(null);
    setStudentsModalOpen(false);
    setStudentsGrade(null);
    setAnalyticsModalOpen(false);
    setAnalyticsGrade(null);
  }, []);

  // TypeScript generic komponent
  const GenericManager = GenericManagerV2<Grade, GradeFilters>;
  
  return (
    <>
      <GenericManager
        config={enhancedConfig}
        customLogic={customLogic}
        className={className}
      />

      {/* Grade Creation Modal */}
      <GradeCreateDialog
        open={createModalOpen}
        onClose={handleCloseModals}
        currentUser={currentUser}
        availableInstitutions={availableInstitutions}
        availableAcademicYears={availableAcademicYears}
      />

      {/* Grade Curriculum Modal */}
      {selectedGrade && (
        <GradeDetailsDialogWithTabs
          grade={selectedGrade}
          onClose={handleCloseModals}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['grades'] });
          }}
        />
      )}

      {/* Grade Edit Modal */}
      {editingGrade && (
        <GradeCreateDialog
          open={!!editingGrade}
          onClose={handleCloseModals}
          currentUser={currentUser}
          editingGrade={editingGrade}
          availableInstitutions={availableInstitutions}
          availableAcademicYears={availableAcademicYears}
        />
      )}

      {/* Students Management Modal */}
      {studentsModalOpen && studentsGrade && (
        <GradeStudentsDialog
          grade={studentsGrade}
          open={studentsModalOpen}
          onClose={handleCloseModals}
        />
      )}

      {/* Analytics Modal */}
      {analyticsModalOpen && analyticsGrade && (
        <GradeAnalyticsModal
          grade={analyticsGrade}
          open={analyticsModalOpen}
          onClose={handleCloseModals}
        />
      )}

      {/* Duplicate Modal */}
      {duplicatingGrade && (
        <GradeDuplicateModal
          grade={duplicatingGrade}
          open={!!duplicatingGrade}
          onClose={handleCloseModals}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['grades'] });
          }}
        />
      )}
    </>
  );
};