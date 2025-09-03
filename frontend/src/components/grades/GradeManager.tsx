import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { Grade, GradeFilters } from '@/services/grades';
import { gradeEntityConfig, gradeCustomLogic, GradeFiltersComponent } from './configurations/gradeConfig';
import { GradeCreateDialog } from './GradeCreateDialog';
import { GradeDetailsDialog } from './GradeDetailsDialog';
import { GradeStudentsDialog } from './GradeStudentsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { academicYearService } from '@/services/academicYears';
import { logger } from '@/utils/logger';

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
  const [studentsModalOpen, setStudentsModalOpen] = React.useState(false);
  const [studentsGrade, setStudentsGrade] = React.useState<Grade | null>(null);

  // Role-based access and filtering
  const { currentUser } = useAuth();

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
    if (!institutionsResponse?.data?.data || !currentUser) return [];
    
    logger.debug('Processing institutions for grade filtering', {
      component: 'GradeManager',
      action: 'filterInstitutions',
      data: { userRole: currentUser.role, institutionCount: institutionsResponse.data.data.length }
    });
    
    const institutions = institutionsResponse.data.data;
    
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
    if (!academicYearsResponse?.data?.data) return [];
    return academicYearsResponse.data.data;
  }, [academicYearsResponse]);

  // Enhanced configuration with grade-specific modal handlers
  const enhancedConfig = React.useMemo(() => ({
    ...gradeEntityConfig,
    
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
          case 'students':
            setStudentsGrade(grade);
            setStudentsModalOpen(true);
            break;
          case 'analytics':
            // TODO: Implement analytics modal or navigate to analytics page
            logger.info('Analytics not yet implemented', { gradeId: grade.id });
            break;
          default:
            logger.warn('Unknown action', { action: action.key });
        }
      }
    }))
  }), []);

  // Handle create action
  const handleCreate = React.useCallback(() => {
    logger.debug('Opening grade creation dialog', {
      component: 'GradeManager',
      action: 'handleCreate'
    });
    setCreateModalOpen(true);
  }, []);

  // Handle close modals
  const handleCloseModals = React.useCallback(() => {
    setCreateModalOpen(false);
    setSelectedGrade(null);
    setEditingGrade(null);
    setStudentsModalOpen(false);
    setStudentsGrade(null);
  }, []);

  return (
    <>
      <GenericManagerV2<Grade, GradeFilters>
        config={enhancedConfig}
        className={className}
        onCreateClick={handleCreate}
        customFilters={(filters, onFiltersChange) => (
          <GradeFiltersComponent
            filters={filters}
            onFiltersChange={onFiltersChange}
            availableInstitutions={availableInstitutions}
            availableAcademicYears={availableAcademicYears}
          />
        )}
      />

      {/* Grade Creation Modal */}
      <GradeCreateDialog
        open={createModalOpen}
        onClose={handleCloseModals}
        availableInstitutions={availableInstitutions}
        availableAcademicYears={availableAcademicYears}
      />

      {/* Grade Details Modal */}
      {selectedGrade && (
        <GradeDetailsDialog
          grade={selectedGrade}
          onClose={handleCloseModals}
          onEdit={(grade) => {
            setSelectedGrade(null);
            setEditingGrade(grade);
          }}
          onManageStudents={(grade) => {
            setSelectedGrade(null);
            setStudentsGrade(grade);
            setStudentsModalOpen(true);
          }}
        />
      )}

      {/* Grade Edit Modal */}
      {editingGrade && (
        <GradeCreateDialog
          open={!!editingGrade}
          onClose={handleCloseModals}
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
    </>
  );
};