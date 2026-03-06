import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
// useEntityManagerV2 handled by GenericManagerV2 internally
import { Student } from '@/services/students';
import { StudentFilters } from './configurations/studentConfig';
import { unifiedStudentConfig, studentCustomLogic } from './configurations/studentConfig';
import { StudentModal } from '@/components/modals/StudentModal';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { EnrollmentModal } from './EnrollmentModal';
// StudentImportExportModal handled by GenericManagerV2
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { gradeService } from '@/services/grades';
import { studentService } from '@/services/students';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
// Icons now handled by GenericManagerV2

interface StudentManagerV2Props {
  className?: string;
}

/**
 * Modern Student Manager using GenericManagerV2
 * 
 * This component represents the optimized student management system that:
 * - Uses the unified backend API
 * - Implements modern React patterns with hooks
 * - Provides role-based filtering and access control
 * - Features enhanced search and filtering capabilities
 * - Maintains consistent error handling and loading states
 * - Follows the same patterns as GradeManager for consistency
 */
export const StudentManagerV2: React.FC<StudentManagerV2Props> = ({ className }) => {
  // Modal states for student-specific operations  
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = React.useState(false);
  const [enrollmentStudent, setEnrollmentStudent] = React.useState<Student | null>(null);
  // Import/Export modal handled by GenericManagerV2
  const [selectedGradeForEnrollment, setSelectedGradeForEnrollment] = React.useState<number | null>(null);

  // Role-based access and filtering
  const { currentUser } = useAuth();
  // QueryClient handling moved to GenericManagerV2

  // Fetch supporting data for filters
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-student-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const { data: gradesResponse } = useQuery({
    queryKey: ['grades', 'for-student-filter'],
    queryFn: () => gradeService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Process available institutions based on user role
  const availableInstitutions = React.useMemo(() => {
    if (!institutionsResponse?.data || !currentUser) return [];
    
    logger.debug('Processing institutions for student filtering', {
      component: 'StudentManagerV2',
      action: 'filterInstitutions',
      data: { userRole: currentUser.role, institutionCount: institutionsResponse.data.length }
    });
    
    const institutions = institutionsResponse.data;
    
    // Role-based institution filtering logic (same as grades)
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

  // Process available grades
  const availableGrades = React.useMemo(() => {
    if (!gradesResponse?.data) return [];
    return gradesResponse.data;
  }, [gradesResponse]);

  // Cache invalidation is now handled by GenericManagerV2 and useEntityManagerV2
  // Removed duplicate mutation logic to eliminate redundancy

  // Simplified configuration - GenericManagerV2 handles most actions automatically
  const enhancedConfig = React.useMemo(() => ({
    ...unifiedStudentConfig,
    
    // Only override student-specific actions that require custom logic
    actions: unifiedStudentConfig.actions.map(action => {
      if (action.key === 'view') {
        return {
          ...action,
          onClick: (student: Student) => {
            logger.debug('Opening student details', { studentId: student.id });
            setSelectedStudent(student);
          }
        };
      }
      if (action.key === 'edit') {
        return {
          ...action,
          onClick: (student: Student) => {
            logger.debug('Opening student edit', { studentId: student.id });
            setEditingStudent(student);
          }
        };
      }
      if (action.key === 'enroll') {
        return {
          ...action,
          onClick: (student: Student) => {
            if (student.status === 'active') {
              toast.warning('Şagird artıq aktivdir');
              return;
            }
            logger.debug('Opening enrollment modal', { studentId: student.id });
            setEnrollmentStudent(student);
            setEnrollmentModalOpen(true);
          }
        };
      }
      // GenericManagerV2 handles soft-delete and hard-delete automatically
      return action;
    })
  }), []);

  // GenericManagerV2 handles create action through manager.setCreateModalOpen()

  // Custom logic with renderCustomModal to connect GenericManagerV2 with UserModal
  const customLogic = React.useMemo(() => ({
    ...studentCustomLogic,
    
    // Override renderCustomModal to connect GenericManagerV2 create button with UserModal
    renderCustomModal: ({ open, onClose, onSave, entity, isLoading }) => {
      console.log('🎯 StudentManagerV2 renderCustomModal called:', { 
        open, 
        hasOnClose: !!onClose, 
        hasOnSave: !!onSave, 
        entity: entity?.id || 'null', 
        isLoading 
      });
      
      return (
        <StudentModal
          open={open}
          onClose={onClose}
          onSave={onSave}
          student={entity}
        />
      );
    },
    
    // Enhanced custom filters rendering with available data
    renderCustomFilters: () => (
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Custom filter implementation can be added here */}
        <div className="text-sm text-muted-foreground">
          {availableInstitutions.length} müəssisə, {availableGrades.length} sinif mövcuddur
        </div>
      </div>
    )
  }), [availableInstitutions, availableGrades]);

  // Handle close modals
  const handleCloseModals = React.useCallback(() => {
    setCreateModalOpen(false);
    setSelectedStudent(null);
    setEditingStudent(null);
    setEnrollmentModalOpen(false);
    setEnrollmentStudent(null);
    // Import/Export modal closed by GenericManagerV2
    setSelectedGradeForEnrollment(null);
  }, []);

  // Save handler removed - using manager.handleCreate and manager.handleUpdate directly

  // Simplified enrollment handler
  const handleEnrollment = React.useCallback(async (enrollmentData: any) => {
    try {
      logger.debug('Processing student enrollment', {
        studentId: enrollmentStudent?.id,
        enrollmentData: Object.keys(enrollmentData)
      });
      
      if (enrollmentStudent) {
        await studentService.update(enrollmentStudent.id, {
          status: 'active',
          ...enrollmentData
        });
        toast.success(`${enrollmentStudent.first_name} ${enrollmentStudent.last_name} uğurla qeydiyyatdan keçirildi`);
        
        // GenericManagerV2 will handle cache invalidation automatically
      }
      
      handleCloseModals();
      
    } catch (error) {
      logger.error('Failed to enroll student', error);
      toast.error('Qeydiyyat əməliyyatı uğursuz oldu');
      throw error;
    }
  }, [enrollmentStudent, handleCloseModals]);

  // Utility functions for student-specific dialogs
  const utilityFunctions = React.useMemo(() => ({
    getStatusText: (status: string) => {
      const statusMap: Record<string, string> = {
        'active': 'Aktiv',
        'inactive': 'Passiv',
        'transferred': 'Köçürülmüş',
        'graduated': 'Məzun',
        'dropped': 'Tərk etmiş',
        'expelled': 'İxrac'
      };
      return statusMap[status] || status;
    },
    
    getStatusColor: (status: string) => {
      const colorMap: Record<string, string> = {
        'active': 'bg-green-100 text-green-800',
        'inactive': 'bg-red-100 text-red-800',
        'transferred': 'bg-blue-100 text-blue-800',
        'graduated': 'bg-purple-100 text-purple-800',
        'dropped': 'bg-yellow-100 text-yellow-800',
        'expelled': 'bg-red-100 text-red-800'
      };
      return colorMap[status] || 'bg-gray-100 text-gray-800';
    },
    
    getGenderText: (gender: string) => {
      const genderMap: Record<string, string> = {
        'male': 'Kişi',
        'female': 'Qadın',
        'other': 'Digər'
      };
      return genderMap[gender] || gender;
    },
    
    getGradeLevelText: (level: string | number) => `${level}-ci sinif`,
  }), []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Generic Manager with integrated modal */}
      <GenericManagerV2
        config={enhancedConfig}
        customLogic={customLogic}
      />
      
      {/* Student-specific Modals - separate from GenericManagerV2 create modal */}

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={!!selectedStudent && !enrollmentModalOpen}
        onClose={handleCloseModals}
        onEdit={(student) => {
          setEditingStudent(student);
          setSelectedStudent(null);
        }}
        onEnroll={(student) => {
          setEnrollmentStudent(student);
          setEnrollmentModalOpen(true);
          setSelectedStudent(null);
        }}
        {...utilityFunctions}
      />

      <EnrollmentModal
        isOpen={enrollmentModalOpen}
        onClose={handleCloseModals}
        student={enrollmentStudent}
        classes={availableGrades} // Using grades as classes
        selectedGradeForEnrollment={selectedGradeForEnrollment}
        setSelectedGradeForEnrollment={setSelectedGradeForEnrollment}
        onEnroll={handleEnrollment}
        isEnrolling={false}
        getGradeLevelText={utilityFunctions.getGradeLevelText}
      />

      {/* Import/Export modal handled by GenericManagerV2 */}
    </div>
  );
};

export default StudentManagerV2;