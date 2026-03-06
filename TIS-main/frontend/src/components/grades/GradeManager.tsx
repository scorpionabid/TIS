import React from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { Grade, GradeFilters } from '@/services/grades';
import { gradeEntityConfig, gradeCustomLogic, GradeFiltersComponent } from './configurations/gradeConfig';
import { GradeCreateDialogSimplified as GradeCreateDialog } from './GradeCreateDialogSimplified';
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
import { useEntityManagerV2 } from '@/hooks/useEntityManagerV2';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

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
  const [softDeleteTarget, setSoftDeleteTarget] = React.useState<Grade | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = React.useState<Grade | null>(null);
  const [softDeleteReason, setSoftDeleteReason] = React.useState('');

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
    const userInstitutionId = currentUser.institution?.id;

    switch (currentUser.role) {
      case 'superadmin':
        return institutions.filter((inst: any) => inst.level && inst.level >= 3);

      case 'regionadmin':
        return institutions.filter((inst: any) =>
          inst.id === userInstitutionId || (inst.level && inst.level >= 3)
        );

      case 'sektoradmin':
        return institutions.filter((inst: any) =>
          inst.id === userInstitutionId || inst.level === 4
        );

      default:
        return institutions.filter((inst: any) => inst.id === userInstitutionId);
    }
  }, [institutionsResponse, currentUser]);

  // Process available academic years
  const availableAcademicYears = React.useMemo(() => {
    if (!academicYearsResponse?.data) return [];
    return academicYearsResponse.data;
  }, [academicYearsResponse]);

  // Soft delete mutation (deactivate)
  const softDeleteMutation = useMutation({
    mutationFn: ({ gradeId, reason }: { gradeId: number; reason?: string }) =>
      gradeService.deactivate(gradeId, reason),
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
    onError: (error: any) => {
      logger.error('Soft delete failed', { error });
      const message = error?.response?.data?.message || 'Sinif deaktiv edilə bilmədi';
      toast.error(message);
    },
  });

  // Hard delete mutation (permanent delete)
  const hardDeleteMutation = useMutation({
    mutationFn: (gradeId: number) => gradeService.delete(gradeId),
    onSuccess: () => {
      toast.success('Sinif tamamilə silindi');
      // Invalidate all grade-related queries with more specific patterns
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ predicate: (query) =>
        query.queryKey[0] === 'grades' ||
        (Array.isArray(query.queryKey) && query.queryKey.includes('grades'))
      });
      // Force refetch to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: ['grades'] });
    },
    onError: (error: any) => {
      logger.error('Hard delete failed', { error });
      const message = error?.response?.data?.message || 'Sinif silinə bilmədi';
      toast.error(message);
    },
  });

  // Enhanced configuration with grade-specific modal handlers
  const enhancedConfig = React.useMemo(() => {
    // Build default filters based on user role
    const defaultFilters: Partial<GradeFilters> = {
      is_active: true,
      per_page: 100, // Increased from 20 to show all classes for schools with many grades
    };

    // Add institution_id filter for non-admin roles
    if (currentUser && !['superadmin', 'regionadmin'].includes(currentUser.role) && currentUser.institution?.id) {
      defaultFilters.institution_id = currentUser.institution.id;
    }

    return {
      ...gradeEntityConfig,

      // Override defaultFilters with role-based institution filtering
      defaultFilters,

      // Filter columns based on user role
      columns: gradeEntityConfig.columns.filter(column => {
        // Check if column has visibility condition
        const col = column as any;
        if (col.isVisible && typeof col.isVisible === 'function') {
          return col.isVisible({} as Grade, currentUser?.role);
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
              setSoftDeleteTarget(grade);
              setSoftDeleteReason('');
              break;
            case 'hard-delete':
              setHardDeleteTarget(grade);
              break;
            default:
              logger.warn('Unknown action', { action: action.key });
          }
        }
      }))
    };
  }, [currentUser, softDeleteMutation, hardDeleteMutation]);

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
        icon: Plus as any,
        onClick: handleCreate,
        variant: 'default' as const
      }
    ],
    renderCustomFilters: (manager: any) => {
      logger.debug('Rendering custom filters with manager state', {
        component: 'GradeManager',
        action: 'renderCustomFilters',
        data: {
          currentFilters: manager.filters,
          hasSetFilters: !!manager.setFilters
        }
      });

      return (
        <GradeFiltersComponent
          filters={manager.filters || {}}
          onFiltersChange={(newFilters) => {
            logger.debug('Filter change requested', {
              component: 'GradeManager',
              action: 'onFiltersChange',
              data: { newFilters }
            });
            manager.setFilters(newFilters);
          }}
          availableInstitutions={availableInstitutions}
          availableAcademicYears={availableAcademicYears}
        />
      );
    }
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
    if (!softDeleteMutation.isPending) {
      setSoftDeleteTarget(null);
      setSoftDeleteReason('');
    }
    if (!hardDeleteMutation.isPending) {
      setHardDeleteTarget(null);
    }
  }, [softDeleteMutation.isPending, hardDeleteMutation.isPending]);

  const handleSoftDeleteConfirm = React.useCallback(() => {
    if (!softDeleteTarget) return;
    softDeleteMutation.mutate(
      {
        gradeId: softDeleteTarget.id,
        reason: softDeleteReason.trim() || undefined,
      },
      {
        onSettled: () => {
          setSoftDeleteTarget(null);
          setSoftDeleteReason('');
        },
      }
    );
  }, [softDeleteMutation, softDeleteTarget, softDeleteReason]);

  const handleHardDeleteConfirm = React.useCallback(() => {
    if (!hardDeleteTarget) return;
    hardDeleteMutation.mutate(hardDeleteTarget.id, {
      onSettled: () => {
        setHardDeleteTarget(null);
      },
    });
  }, [hardDeleteTarget, hardDeleteMutation]);

  // Debug logging for institution filter
  React.useEffect(() => {
    logger.debug('GradeManager render state', {
      component: 'GradeManager',
      data: {
        hasUser: !!currentUser,
        userRole: currentUser?.role,
        institutionId: currentUser?.institution?.id,
        institutionName: currentUser?.institution?.name,
      }
    });
  }, [currentUser]);

  return (
    <>
      <GenericManagerV2
        key={`grade-manager-${currentUser?.institution?.id || 'no-institution'}`}
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

      <AlertDialog
        open={!!softDeleteTarget}
        onOpenChange={(open) => {
          if (!open && !softDeleteMutation.isPending) {
            setSoftDeleteTarget(null);
            setSoftDeleteReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sinifi deaktiv et</AlertDialogTitle>
            <AlertDialogDescription>
              "{softDeleteTarget?.full_name || softDeleteTarget?.name}" sinfini deaktiv etmək istəyirsiniz? Bu sinif şablonlarda görünməyəcək, lakin məlumatları saxlanacaq.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Səbəb (opsional)
            </label>
            <Textarea
              value={softDeleteReason}
              onChange={(e) => setSoftDeleteReason(e.target.value)}
              placeholder="Məsələn: sinif yeni tədris ili üçün bağlandı"
              rows={3}
              disabled={softDeleteMutation.isPending}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={softDeleteMutation.isPending}>
              Ləğv et
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleSoftDeleteConfirm}
                disabled={softDeleteMutation.isPending}
              >
                {softDeleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Deaktiv et
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => {
          if (!open && !hardDeleteMutation.isPending) {
            setHardDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sinifi tamamilə sil</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                "{hardDeleteTarget?.full_name || hardDeleteTarget?.name}" sinfini silmək geri qaytarıla bilməz. Müəllim, şagird və plan məlumatları da silinə bilər.
              </p>
              <p className="font-semibold text-red-600">
                Təsdiqləmədən əvvəl ehtiyat nüsxə olduğuna əmin olun.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hardDeleteMutation.isPending}>
              Ləğv et
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleHardDeleteConfirm}
                disabled={hardDeleteMutation.isPending}
              >
                {hardDeleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Tamamilə sil
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
