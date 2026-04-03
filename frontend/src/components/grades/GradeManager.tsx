import React from 'react';
import {
  Plus,
  Loader2,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  UserX,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { Grade, GradeFilters } from '@/services/grades';
import { gradeEntityConfig, GradeFiltersComponent } from './configurations/gradeConfig';
import { EntityConfig } from '@/components/generic/types';
import { GradeCreateDialogSimplified as GradeCreateDialog } from './GradeCreateDialogSimplified';
import { GradeDetailsDialogWithTabs } from './GradeDetailsDialogWithTabs';
import { GradeStudentsDialog } from './GradeStudentsDialog';
import { GradeAnalyticsModal } from './GradeAnalyticsModal';
import { GradeDuplicateModal } from './GradeDuplicateModal';
import { GradeImportExportModal } from './modals/GradeImportExportModal';
import { gradeBookService } from '@/services/gradeBook';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { academicYearService } from '@/services/academicYears';
import { gradeService } from '@/services/grades';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
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
import type { StatsConfig } from '@/components/generic/types';

interface GradeManagerProps {
  className?: string;
  baseConfig?: EntityConfig<Grade, GradeFilters, any>;
  onAfterCreate?: () => void;
  initialFilters?: Partial<GradeFilters>;
  masterPlan?: any;
  categoryLimits?: Record<number, any>;
  isLocked?: boolean;
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
export const GradeManager: React.FC<GradeManagerProps> = ({ 
  className, 
  baseConfig, 
  onAfterCreate, 
  initialFilters,
  masterPlan,
  categoryLimits,
  isLocked = false
}) => {
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
  const [syncModalOpen, setSyncModalOpen] = React.useState(false);
  const [syncPreview, setSyncPreview] = React.useState<{
    orphaned_count: number;
    missing_count: number;
  } | null>(null);
  const [softDeleteReason, setSoftDeleteReason] = React.useState('');
  const [importExportModalOpen, setImportExportModalOpen] = React.useState(false);

  // Role-based access and filtering
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

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

  const institutionFilter = currentUser && !['superadmin', 'regionadmin'].includes(currentUser.role)
    ? currentUser.institution?.id
    : undefined;

  const invalidateGrades = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['grades'] });
  }, [queryClient]);  // also invalidates ['grades', 'statistics', ...]

  // Soft delete mutation (deactivate)
  const softDeleteMutation = useMutation({
    mutationFn: ({ gradeId, reason }: { gradeId: number; reason?: string }) =>
      gradeService.deactivate(gradeId, reason),
    onSuccess: () => {
      toast.success('Sinif deaktiv edildi');
      invalidateGrades();
    },
    onError: (error: any) => {
      logger.error('Soft delete failed', { error });
      const message = error?.response?.data?.message || 'Sinif deaktiv edilə bilmədi';
      toast.error(message);
    },
  });

  // Activate mutation (reactivate deactivated grade)
  const activateMutation = useMutation({
    mutationFn: (gradeId: number) => gradeService.update(gradeId, { is_active: true }),
    onSuccess: () => {
      toast.success('Sinif aktivləşdirildi');
      invalidateGrades();
    },
    onError: (error: any) => {
      logger.error('Activate failed', { error });
      const message = error?.response?.data?.message || 'Sinif aktivləşdirilə bilmədi';
      toast.error(message);
    },
  });

  // Hard delete mutation (permanent delete)
  const hardDeleteMutation = useMutation({
    mutationFn: (gradeId: number) => gradeService.delete(gradeId),
    onSuccess: () => {
      toast.success('Sinif tamamilə silindi');
      invalidateGrades();
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

    // Merge explicitly provided initial filters (these should take priority)
    if (initialFilters) {
      Object.assign(defaultFilters, initialFilters);
    }

    const effectiveConfig = baseConfig ?? gradeEntityConfig;

    return {
      ...effectiveConfig,

      // Override defaultFilters with role-based institution filtering
      defaultFilters,

      // Filter columns based on user role
      columns: effectiveConfig.columns.filter(column => {
        // Check if column has visibility condition
        const col = column as any;
        if (col.isVisible && typeof col.isVisible === 'function') {
          return col.isVisible({} as Grade, currentUser?.role);
        }
        return true; // Show column by default
      }),

      // Override actions to connect with local modal handlers
      actions: effectiveConfig.actions.map(action => ({
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
            case 'activate':
              activateMutation.mutate(grade.id);
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
  }, [currentUser, softDeleteMutation, hardDeleteMutation, baseConfig]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => gradeBookService.sync({
      institution_id: currentUser?.institution?.id,
    }),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      setSyncModalOpen(false);
      setSyncPreview(null);
    },
    onError: (error: any) => {
      logger.error('Sync failed', { error });
      const message = error?.response?.data?.message || 'Sinxronizasiya zamanı xəta baş verdi';
      toast.error(message);
    },
  });

  // Check sync status
  const checkSyncStatus = React.useCallback(async () => {
    try {
      const [orphanedResult, gradesResult] = await Promise.all([
        gradeBookService.findOrphaned({ institution_id: currentUser?.institution?.id }),
        gradeService.get({ institution_id: currentUser?.institution?.id, include: 'subjects' }),
      ]);

      const orphanedCount = orphanedResult.data?.orphaned_count || 0;
      
      // Calculate missing grade books
      let missingCount = 0;
      if (gradesResult.items) {
        gradesResult.items.forEach((grade: Grade) => {
          const subjects = grade.grade_subjects || [];
          const teachingSubjects = subjects.filter(s => s.is_teaching_activity);
          const withoutGradeBook = teachingSubjects.filter(s => !s.has_grade_book).length;
          missingCount += withoutGradeBook;
        });
      }

      setSyncPreview({
        orphaned_count: orphanedCount,
        missing_count: missingCount,
      });
      setSyncModalOpen(true);
    } catch (error) {
      logger.error('Failed to check sync status', { error });
      toast.error('Sinxronizasiya statusu yoxlanarkən xəta baş verdi');
    }
  }, [currentUser?.institution?.id]);

  // Handle create action
  const handleCreate = React.useCallback(() => {
    logger.debug('Opening grade creation dialog', {
      component: 'GradeManager',
      action: 'handleCreate'
    });
    setCreateModalOpen(true);
  }, []);

  // Handle sync action
  const handleSync = React.useCallback(() => {
    logger.debug('Opening sync dialog', {
      component: 'GradeManager',
      action: 'handleSync'
    });
    checkSyncStatus();
  }, [checkSyncStatus]);

  // Custom logic with create handler
  const customLogic = React.useMemo(() => ({
    onCreateClick: handleCreate,
    onImportClick: () => setImportExportModalOpen(true),
    onExportClick: () => setImportExportModalOpen(true),
    onTemplateClick: () => gradeService.downloadTemplate(),
    headerActions: [
      ...(!isLocked && enhancedConfig.headerConfig?.showRefresh !== false ? [
        {
          key: 'sync-grade-books',
          label: 'Jurnalları Sinxronlaşdır',
          icon: RefreshCw as any,
          onClick: handleSync,
          variant: 'outline' as const
        }
      ] : [])
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
    setSyncModalOpen(false);
    setSyncPreview(null);
    setImportExportModalOpen(false);
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
        readOnly={isLocked}
      />

      {/* Grade Creation Modal */}
      <GradeCreateDialog
        open={createModalOpen}
        onClose={handleCloseModals}
        currentUser={currentUser}
        availableInstitutions={availableInstitutions}
        availableAcademicYears={availableAcademicYears}
        onAfterCreate={onAfterCreate}
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

      {/* Import/Export Modal */}
      <GradeImportExportModal
        isOpen={importExportModalOpen}
        onClose={handleCloseModals}
      />

      <AlertDialog
        open={syncModalOpen}
        onOpenChange={(open) => {
          if (!open && !syncMutation.isPending) {
            setSyncModalOpen(false);
            setSyncPreview(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Jurnalları Sinxronlaşdır
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {syncPreview ? (
                <>
                  <p>Sinxronizasiya statusu:</p>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Çatışmayan jurnallar:</span>
                      <span className="font-medium text-green-600">
                        {syncPreview.missing_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fənn silinmiş jurnallar:</span>
                      <span className="font-medium text-orange-600">
                        {syncPreview.orphaned_count}
                      </span>
                    </div>
                  </div>
                  {syncPreview.missing_count === 0 && syncPreview.orphaned_count === 0 ? (
                    <p className="text-green-600 font-medium">
                      ✅ Bütün jurnallar sinxronizasiya edilib!
                    </p>
                  ) : (
                    <p>
                      {syncPreview.missing_count > 0 && `${syncPreview.missing_count} yeni jurnal yaradılacaq. `}
                      {syncPreview.orphaned_count > 0 && `${syncPreview.orphaned_count} yetim jurnal təmizlənəcək.`}
                    </p>
                  )}
                </>
              ) : (
                <p>Status yoxlanılır...</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={syncMutation.isPending}
              onClick={() => {
                setSyncModalOpen(false);
                setSyncPreview(null);
              }}
            >
              Bağla
            </AlertDialogCancel>
            {syncPreview && (syncPreview.missing_count > 0 || syncPreview.orphaned_count > 0) && (
              <AlertDialogAction asChild>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sinxronlaşdırılır...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sinxronlaşdır
                    </>
                  )}
                </Button>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
